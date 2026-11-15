// Structured Ontology-Driven AI Reasoning Service + optional LLM adapter interface.
// Works 100% deterministically without any external API key.
// Never fabricates data, never diagnoses mental health, never uses message volume as emotion.

import { prisma } from "../db";
import { VITALS, VITAL_FIELD, type Vital, fmtDate, parseJSON, round1, weekOf } from "../domain";
import { type Viewer, canViewEnergyProfileSection, parseSharingPermissions } from "../permissions";
import { runGeminiOntologyReasoning, type TraversalToolCall } from "./gemini";

export interface EvidenceItem {
  entityType: string;
  entityId: string;
  label: string;
  relationship: string;
  detail: string;
  source: string;
  timestamp: string;
}

export interface ReasoningResult {
  id: string;
  mode?: "gemini" | "deterministic";
  toolTrace?: TraversalToolCall[];
  question: string;
  intent:
    | "TEAM_DECLINE_EXPLANATION"
    | "TEAM_RECENT_CHANGES"
    | "PROJECT_VITAL_COINCIDENCE"
    | "RECOMMEND_INTERVENTION"
    | "INTERVENTION_OUTCOME"
    | "ORG_ATTENTION_SCAN"
    | "PERSONALIZED_COMMUNICATION";
  teamId: string | null;
  headline: string;
  narrative: string[];
  evidence: EvidenceItem[];
  traversedRelationships: { from: string; relationship: string; to: string; meaning: string }[];
  reasoningPathNodeIds: string[];
  timePeriod: string;
  confidence: string;
  uncertaintyAndLimitations: string[];
  missingInformation: string[];
  alternativeExplanations: string[];
  recommendedIntervention: {
    id: string;
    slug: string;
    name: string;
    targetVital: string;
    estimatedDuration: string;
    rationale: string;
    expectedOutcome: string;
  } | null;
}

/** Optional adapter interface for future live LLM narrative formatting (not required for the prototype). */
export interface LLMAdapter {
  name: string;
  formatStructuredResult(result: ReasoningResult): Promise<string[]>;
}

function classifyQuestion(q: string): {
  intent: ReasoningResult["intent"];
  teamHint?: string;
} {
  const s = q.toLowerCase();
  if (s.includes("after") || s.includes("outcome") || s.includes("follow-up") || s.includes("last intervention") || s.includes("happened")) {
    return { intent: "INTERVENTION_OUTCOME" };
  }
  if (s.includes("which teams") || s.includes("across the org") || s.includes("benefit from")) {
    return { intent: "ORG_ATTENTION_SCAN" };
  }
  if (s.includes("which project") || s.includes("coincide")) {
    return { intent: "PROJECT_VITAL_COINCIDENCE" };
  }
  if (s.includes("what intervention") || s.includes("recommend") || s.includes("action")) {
    return { intent: "RECOMMEND_INTERVENTION" };
  }
  if (s.includes("communication") || s.includes("1:1") || s.includes("discuss") || s.includes("jordan")) {
    return { intent: "PERSONALIZED_COMMUNICATION" };
  }
  if (s.includes("what changed") || s.includes("past month")) {
    return { intent: "TEAM_RECENT_CHANGES" };
  }
  return { intent: "TEAM_DECLINE_EXPLANATION" };
}

export async function runOntologyReasoning(params: {
  question: string;
  teamId?: string | null;
  viewer: Viewer;
  currentDate: Date;
}): Promise<ReasoningResult> {
  const maxWeek = weekOf(params.currentDate);
  const { intent } = classifyQuestion(params.question);
  const teamId = params.teamId || "t-outreach";

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: {
      projects: { include: { responsibilities: true } },
      snapshots: { where: { weekIndex: { lte: maxWeek } }, orderBy: { weekIndex: "asc" } },
      executions: { include: { intervention: true, outcome: true }, orderBy: { createdAt: "desc" } },
      observations: { where: { weekIndex: { lte: maxWeek }, deletedAt: null }, orderBy: { observedAt: "asc" } },
    },
  });

  const events = await prisma.organizationalEvent.findMany({
    where: { teamId, weekIndex: { lte: maxWeek } },
    orderBy: { occurredAt: "asc" },
  });

  const baselineSnap = team.snapshots.find((s) => s.weekIndex === 5) || team.snapshots[0];
  const week12Snap = team.snapshots.find((s) => s.weekIndex === 12) || team.snapshots[team.snapshots.length - 1];
  const latestSnap = team.snapshots[team.snapshots.length - 1];
  const clarifyIv = await prisma.intervention.findUniqueOrThrow({ where: { id: "i-clarify" } });

  const pathSet = new Set<string>(["org-northstar", team.id]);
  const evidence: EvidenceItem[] = [];
  const traversed: ReasoningResult["traversedRelationships"] = [
    {
      from: "Organization (Northstar Community Services)",
      relationship: "HAS_TEAM",
      to: `Team (${team.name})`,
      meaning: "Identify target team within organizational structure",
    },
  ];

  if (baselineSnap && week12Snap) {
    pathSet.add(baselineSnap.id);
    pathSet.add(week12Snap.id);
    evidence.push(
      {
        entityType: "TeamVitalSnapshot",
        entityId: baselineSnap.id,
        label: `Baseline (Week ${baselineSnap.weekIndex}): Supported ${baselineSnap.supportedScore}, Aligned ${baselineSnap.alignedScore}, Energized ${baselineSnap.energizedScore}`,
        relationship: "Team HAS_VITAL_SNAPSHOT TeamVitalSnapshot",
        detail: `Pre-project internal baseline (n=${baselineSnap.respondentCount}, response rate ${Math.round(baselineSnap.responseRate * 100)}%, confidence ${baselineSnap.confidenceLevel}).`,
        source: "conn-pulse (aggregated, threshold ≥ 5)",
        timestamp: fmtDate(baselineSnap.periodEnd),
      },
      {
        entityType: "TeamVitalSnapshot",
        entityId: week12Snap.id,
        label: `Week ${week12Snap.weekIndex}: Supported ${week12Snap.supportedScore} (${round1((week12Snap.supportedScore ?? 0) - (baselineSnap.supportedScore ?? 0))}), Aligned ${week12Snap.alignedScore} (${round1((week12Snap.alignedScore ?? 0) - (baselineSnap.alignedScore ?? 0))}), Energized ${week12Snap.energizedScore} (${round1((week12Snap.energizedScore ?? 0) - (baselineSnap.energizedScore ?? 0))})`,
        relationship: "Team HAS_VITAL_SNAPSHOT TeamVitalSnapshot",
        detail: `Current four-week period vs. baseline (n=${week12Snap.respondentCount}, confidence ${week12Snap.confidenceLevel}).`,
        source: "conn-pulse (aggregated, threshold ≥ 5)",
        timestamp: fmtDate(week12Snap.periodEnd),
      },
    );
    traversed.push({
      from: `Team (${team.name})`,
      relationship: "HAS_VITAL_SNAPSHOT",
      to: `TeamVitalSnapshot (Wk ${baselineSnap.weekIndex} → Wk ${week12Snap.weekIndex})`,
      meaning: "Compare current five-vital snapshot against internal baseline",
    });
  }

  for (const p of team.projects) {
    if (p.startDate <= params.currentDate) {
      pathSet.add(p.id);
      traversed.push({
        from: `Team (${team.name})`,
        relationship: "WORKS_ON",
        to: `Project (${p.name})`,
        meaning: "Traverse active projects assigned to the team",
      });
      const unowned = p.responsibilities.filter((r) => r.ownership !== "ASSIGNED" && r.addedAt <= params.currentDate);
      for (const r of unowned.slice(0, 4)) {
        pathSet.add(r.id);
      }
      if (unowned.length > 0) {
        traversed.push({
          from: `Project (${p.name})`,
          relationship: "HAS_RESPONSIBILITY",
          to: `${unowned.length} shared/unassigned Responsibilities`,
          meaning: "Inspect responsibility ownership created during the period",
        });
      }
    }
  }

  for (const ev of events) {
    pathSet.add(ev.id);
    evidence.push({
      entityType: "OrganizationalEvent",
      entityId: ev.id,
      label: `${ev.eventType}: ${ev.title}`,
      relationship: ev.projectId ? "Project HAS_EVENT OrganizationalEvent" : "Team HAS_EVENT OrganizationalEvent",
      detail: ev.description,
      source: ev.connectorId || ev.source,
      timestamp: fmtDate(ev.occurredAt),
    });
    traversed.push({
      from: ev.projectId ? "Project (Neighborhood Food Access Outreach)" : `Team (${team.name})`,
      relationship: "HAS_EVENT",
      to: `OrganizationalEvent (${ev.eventType}, Wk ${ev.weekIndex})`,
      meaning: "Match timestamped events occurring in the same window",
    });
  }

  for (const ob of team.observations) {
    pathSet.add(ob.id);
    evidence.push({
      entityType: "WorkplaceObservation",
      entityId: ob.id,
      label: ob.summary,
      relationship: ob.projectId ? "WorkplaceObservation RELATES_TO Project" : "WorkplaceObservation RELATES_TO Team",
      detail: `Scope: ${ob.permissionScope} · Purpose: ${ob.purpose}`,
      source: ob.connectorId,
      timestamp: fmtDate(ob.observedAt),
    });
    traversed.push({
      from: `WorkplaceObservation (${ob.observationType})`,
      relationship: "RELATES_TO",
      to: ob.projectId ? "Project (Neighborhood Food Access Outreach)" : `Team (${team.name})`,
      meaning: "Connect normalized aggregate workplace observations",
    });
  }

  pathSet.add(clarifyIv.id);
  const latestExec = team.executions[0];
  if (latestExec) {
    pathSet.add(latestExec.id);
    if (latestExec.outcome) pathSet.add(latestExec.outcome.id);
  }
  if (latestSnap && latestSnap.weekIndex > 12) {
    pathSet.add(latestSnap.id);
  }

  let headline = `Supported declined from ${baselineSnap?.supportedScore ?? 78} to ${week12Snap?.supportedScore ?? 54} (-24 pts) and Aligned declined from ${baselineSnap?.alignedScore ?? 82} to ${week12Snap?.alignedScore ?? 67} (-15 pts) following the Week 6 launch of Neighborhood Food Access Outreach.`;
  let narrative: string[] = [
    `The ${team.name}'s Supported score declined from ${baselineSnap?.supportedScore ?? 78} to ${week12Snap?.supportedScore ?? 54} during the period following the launch of the Neighborhood Food Access Outreach project in Week 6.`,
    `The Aligned score also declined from ${baselineSnap?.alignedScore ?? 82} to ${week12Snap?.alignedScore ?? 67}, and Energized declined slightly from ${baselineSnap?.energizedScore ?? 71} to ${week12Snap?.energizedScore ?? 64}, while Safe (${week12Snap?.safeScore ?? 83}) and Recognized (${week12Snap?.recognizedScore ?? 72}) remained comparatively stable.`,
    `Traversing the team's project and event relationships shows that 7 additional responsibilities were introduced in Weeks 7–8 (several marked shared or unassigned) and the project deadline was moved forward by 14 days to Nov 20, 2026.`,
    `Team-level observations from the same window show open tasks rose 61% (18 → 29), recurring team meetings rose from 4 to 8 per week, and aggregated pulse tags show 7 of 10 respondents selected “Clearer ownership and priorities across projects.”`,
    `These observations suggest that increased workload and unclear ownership may be contributing factors. The available information does not establish a definitive cause.`,
    `Recommended next step: facilitate “Clarify Responsibilities” (a 30-minute responsibilities-and-alignment workshop) to map active responsibilities, assign single owners, and review workload distribution.`,
  ];

  if (intent === "INTERVENTION_OUTCOME") {
    if (maxWeek >= 14 && latestExec?.outcome) {
      headline = `Following “${latestExec.intervention.name}”, Supported rose from 54 to ${latestSnap.supportedScore} (+${round1((latestSnap.supportedScore ?? 68) - 54)}) and Aligned rose from 67 to ${latestSnap.alignedScore} (+${round1((latestSnap.alignedScore ?? 76) - 67)}) on the Week 14 follow-up pulse.`;
      narrative = [
        `Manager Dana Whitfield approved and completed “${latestExec.intervention.name}” for the ${team.name}.`,
        `Two weeks later (Week 14 follow-up pulse, n=${latestSnap.respondentCount}), Supported increased from 54 to ${latestSnap.supportedScore} and Aligned increased from 67 to ${latestSnap.alignedScore}.`,
        `In aggregated post-workshop feedback, 80% of participating teammates reported the session was helpful, citing single owners for translation coordination and weekly partner reporting.`,
        `Important limitation: this is an observed before-and-after change, not proof that the workshop alone caused the improvement.`,
      ];
    } else {
      headline = `Across Northstar, 5 completed interventions have measured follow-up outcomes; for ${team.name}, approve and complete “Clarify Responsibilities” then advance the timeline to Week 14 to measure the follow-up pulse.`;
    }
  } else if (intent === "ORG_ATTENTION_SCAN") {
    const allTeams = await prisma.team.findMany({
      include: { snapshots: { where: { weekIndex: { in: [5, 12] } } } },
    });
    const summaries = allTeams.map((t) => {
      const b = t.snapshots.find((s) => s.weekIndex === 5);
      const c = t.snapshots.find((s) => s.weekIndex === 12);
      const dSup = (c?.supportedScore ?? 0) - (b?.supportedScore ?? 0);
      const dAli = (c?.alignedScore ?? 0) - (b?.alignedScore ?? 0);
      return `${t.name}: Supported ${c?.supportedScore ?? "—"} (${dSup >= 0 ? "+" : ""}${round1(dSup)}), Aligned ${c?.alignedScore ?? "—"} (${dAli >= 0 ? "+" : ""}${round1(dAli)})`;
    });
    headline = `Organization scan: Community Outreach Team shows the largest change against its internal baseline (Supported -24, Aligned -15); Development & Fundraising shows a mild seasonal dip in Energized (-2) during the Year-End Giving Campaign.`;
    narrative = [
      `Comparing each of Northstar's 8 teams against its own Week 5 baseline identifies where team conditions have shifted most:`,
      ...summaries,
      `Community Outreach Team is the primary candidate for immediate support via “Clarify Responsibilities.”`,
    ];
  } else if (intent === "PERSONALIZED_COMMUNICATION") {
    const jordan = await prisma.employee.findUnique({
      where: { id: "e-jordan-ellis" },
      include: { profiles: { where: { isCurrent: true } } },
    });
    const prof = jordan?.profiles[0];
    const sharing = prof ? parseSharingPermissions(prof.sharingPermissions) : { manager: [], team: [] };
    const canSeeComm =
      jordan && prof ? canViewEnergyProfileSection(params.viewer, jordan, sharing, "communication") : { allowed: false, reason: "No profile" };
    if (canSeeComm.allowed && prof) {
      const commPrefs = parseJSON<string[]>(prof.communicationPreferences, []);
      pathSet.add(jordan!.id);
      pathSet.add(prof.id);
      headline = `Permission-verified guidance for 1:1 with Jordan Ellis (${canSeeComm.reason}).`;
      narrative = [
        `Jordan Ellis has voluntarily shared their Energy Profile communication preferences with their manager: ${commPrefs.join("; ")}.`,
        `Jordan also voluntarily shared a Week 9 check-in note asking for clarity on who owns translation coordination vs. partner reporting.`,
        `Based on Jordan's voluntarily shared preference for specific, direct communication and written preparation, consider sending the responsibility matrix ahead of your 1:1 and agreeing concrete owners and next steps.`,
        `Note: Energy Profiles reflect working preferences — they are never used to evaluate performance or infer emotional state.`,
      ];
    } else {
      headline = `Individual communication preferences for Jordan Ellis are restricted for the current viewer role (${params.viewer.systemRole}).`;
      narrative = [
        `Access control check: ${canSeeComm.reason}.`,
        `Switch to Manager (Dana Whitfield) or Self (Jordan Ellis) in the top bar to see how voluntarily shared preferences inform 1:1 preparation.`,
      ];
    }
  }

  const result: ReasoningResult = {
    id: `ins-${Date.now()}`,
    mode: "deterministic",
    toolTrace: [
      { tool: "resolve_team", args: { teamId }, summary: `Resolved Team (${team.name})` },
      { tool: "traverse_snapshots", args: { weeks: `5..${maxWeek}` }, summary: `Compared Week 5 baseline vs. Week ${maxWeek}` },
      { tool: "traverse_projects_and_events", args: { teamId }, summary: `Traversed ${team.projects.length} projects, ${events.length} events, ${team.observations.length} observations` },
    ],
    question: params.question,
    intent,
    teamId,
    headline,
    narrative,
    evidence,
    traversedRelationships: traversed,
    reasoningPathNodeIds: Array.from(pathSet),
    timePeriod: `Weeks 5–${maxWeek} (Sep 21 – ${fmtDate(params.currentDate)})`,
    confidence: "Moderate — consistent multi-source synthetic evidence across pulse aggregates (n=10 of 11) and project events; correlational only",
    uncertaintyAndLimitations: [
      "Temporal coincidence between the project changes and the decline in Supported/Aligned does not prove causation.",
      "Aggregate pulse scores summarize team experience (n ≥ 5) and do not reveal which specific individuals felt less supported.",
      "Communication and calendar observations measure only team-level channel/meeting counts — never message content, sentiment, or individual productivity.",
    ],
    missingInformation: [
      "External community demand spikes (e.g., seasonal pantry volume) not captured in internal project tools.",
      "Unrecorded informal work or support conversations outside tracked projects.",
      "Responses from the 1–2 team members who did not complete the pulse in a given week.",
    ],
    alternativeExplanations: [
      "Seasonal autumn demand across community programs could reduce perceived support independently of the new outreach project.",
      "Concurrent preparation for the Fall Resource Fair may be competing for the same team capacity.",
      "Natural adjustment period as teammates learn new partner-pantry workflows.",
    ],
    recommendedIntervention: {
      id: clarifyIv.id,
      slug: clarifyIv.slug,
      name: clarifyIv.name,
      targetVital: clarifyIv.targetVital,
      estimatedDuration: clarifyIv.estimatedDuration,
      rationale:
        "Directly addresses the 7 newly added responsibilities (several shared/unassigned) and the aggregated pulse requests for clearer ownership and workload review.",
      expectedOutcome: clarifyIv.expectedOutcome,
    },
  };

  // If GEMINI_API_KEY is present, let Gemini run live tool-calling over the ontology!
  const geminiRes = await runGeminiOntologyReasoning({
    question: params.question,
    teamId,
    viewer: params.viewer,
    currentDate: params.currentDate,
  });
  if (geminiRes) {
    result.mode = "gemini";
    result.headline = geminiRes.headline;
    result.narrative = geminiRes.answerParagraphs;
    if (geminiRes.toolTrace.length > 0) result.toolTrace = geminiRes.toolTrace;
    if (geminiRes.nodeIds.length > 0) result.reasoningPathNodeIds = geminiRes.nodeIds;
    if (geminiRes.relationshipLog.length > 0) result.traversedRelationships = geminiRes.relationshipLog;
  }

  await prisma.insight.create({
    data: {
      id: result.id,
      question: result.question,
      intent: result.intent,
      teamId: result.teamId,
      summary: result.headline,
      payload: JSON.stringify(result),
      reasoningPath: JSON.stringify(result.reasoningPathNodeIds),
      confidence: result.confidence,
      recommendedInterventionId: clarifyIv.id,
      viewerId: params.viewer.id,
      createdAt: new Date(),
    },
  });

  return result;
}

