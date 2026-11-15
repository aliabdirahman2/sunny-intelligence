// Live Gemini Ontology-Traversal Adapter (zero extra dependencies — uses native fetch).
// Gives Gemini typed ontology tools backed by Prisma, with RBAC & privacy enforced inside each tool.
// Falls back cleanly if GEMINI_API_KEY is not set.

import { prisma } from "../db";
import { VITALS, VITAL_FIELD, type Vital, fmtDate, parseJSON, round1, weekOf } from "../domain";
import { type Viewer, canViewCheckIn, canViewEnergyProfileSection, parseSharingPermissions } from "../permissions";

export interface TraversalToolCall {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || null;
}

const ONTOLOGY_TOOL_DECLARATIONS = [
  {
    name: "list_teams_summary",
    description:
      "List all teams in Northstar Community Services with their latest Team Vitals (Supported, Energized, Aligned, Recognized, Safe) and change vs. internal baseline (Weeks 2-5). Privacy threshold n>=5 is enforced.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "traverse_team_context",
    description:
      "Traverse a Team's ontology relationships: HAS_VITAL_SNAPSHOT (weekly scores), WORKS_ON (projects & responsibilities), HAS_EVENT (organizational events), RELATES_TO (aggregate workplace observations), and RECEIVES (interventions & outcomes).",
    parameters: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID such as t-outreach, t-program, t-youth, t-finance, etc." },
      },
      required: ["teamId"],
    },
  },
  {
    name: "get_intervention_library",
    description: "List available Sunny Connect Guides / intervention templates, target vitals, duration, and instructions.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_employee_shared_preferences",
    description:
      "Check an employee's EnergyProfile working/collaboration/communication preferences, strictly enforcing RBAC sharing permissions for the current viewer.",
    parameters: {
      type: "object",
      properties: {
        employeeId: { type: "string", description: "Employee ID, e.g. e-jordan-ellis" },
      },
      required: ["employeeId"],
    },
  },
];

async function executeOntologyTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { viewer: Viewer; currentDate: Date },
): Promise<{ result: unknown; nodeIds: string[]; relationshipLog: { from: string; relationship: string; to: string; meaning: string }[]; summary: string }> {
  const maxWeek = weekOf(ctx.currentDate);

  if (name === "list_teams_summary") {
    const teams = await prisma.team.findMany({
      include: { snapshots: { where: { weekIndex: { lte: maxWeek } }, orderBy: { weekIndex: "asc" } } },
      orderBy: { name: "asc" },
    });
    const out = teams.map((t) => {
      const latest = t.snapshots[t.snapshots.length - 1];
      const base = t.snapshots.find((s) => s.weekIndex === 5);
      const vitals: Record<string, unknown> = {};
      for (const v of VITALS) {
        const f = VITAL_FIELD[v];
        const cur = latest && !latest.suppressed ? latest[f] : null;
        const b = base && !base.suppressed ? base[f] : null;
        vitals[v] = {
          current: cur,
          baselineWk5: b,
          delta: cur !== null && b !== null ? round1(cur - b) : null,
        };
      }
      return {
        teamId: t.id,
        name: t.name,
        department: t.department,
        suppressed: latest?.suppressed ?? false,
        respondentCount: latest?.respondentCount ?? 0,
        vitals,
      };
    });
    return {
      result: out,
      nodeIds: ["org-northstar", ...teams.map((t) => t.id)],
      relationshipLog: [
        {
          from: "Organization (Northstar Community Services)",
          relationship: "HAS_TEAM",
          to: `${teams.length} Teams`,
          meaning: "Scanned all teams and their privacy-thresholded TeamVitalSnapshots",
        },
      ],
      summary: `Scanned ${teams.length} teams (through Week ${maxWeek})`,
    };
  }

  if (name === "traverse_team_context") {
    const teamId = String(args.teamId || "t-outreach");
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        projects: { include: { responsibilities: true } },
        snapshots: { where: { weekIndex: { lte: maxWeek } }, orderBy: { weekIndex: "asc" } },
        observations: { where: { weekIndex: { lte: maxWeek }, deletedAt: null }, orderBy: { observedAt: "asc" } },
        executions: { include: { intervention: true, outcome: true } },
      },
    });
    if (!team) {
      return { result: { error: `Team ${teamId} not found` }, nodeIds: [], relationshipLog: [], summary: `Team ${teamId} not found` };
    }
    const events = await prisma.organizationalEvent.findMany({
      where: { teamId: team.id, weekIndex: { lte: maxWeek } },
      orderBy: { occurredAt: "asc" },
    });
    const nodeIds = [
      "org-northstar",
      team.id,
      ...team.projects.map((p) => p.id),
      ...team.projects.flatMap((p) => p.responsibilities.filter((r) => r.ownership !== "ASSIGNED").map((r) => r.id)),
      ...events.map((e) => e.id),
      ...team.observations.map((o) => o.id),
      ...team.snapshots.filter((s) => s.weekIndex === 5 || s.weekIndex === 12 || s.weekIndex === maxWeek).map((s) => s.id),
      ...team.executions.map((ex) => ex.id),
    ];
    return {
      result: {
        team: { id: team.id, name: team.name, department: team.department },
        snapshots: team.snapshots.map((s) => ({
          week: s.weekIndex,
          suppressed: s.suppressed,
          respondentCount: s.respondentCount,
          confidence: s.confidenceLevel,
          Supported: s.suppressed ? null : s.supportedScore,
          Energized: s.suppressed ? null : s.energizedScore,
          Aligned: s.suppressed ? null : s.alignedScore,
          Recognized: s.suppressed ? null : s.recognizedScore,
          Safe: s.suppressed ? null : s.safeScore,
        })),
        projects: team.projects.map((p) => ({
          id: p.id,
          name: p.name,
          priority: p.priority,
          startDate: fmtDate(p.startDate),
          endDate: fmtDate(p.endDate),
          responsibilities: p.responsibilities.map((r) => ({ title: r.title, ownership: r.ownership })),
        })),
        events: events.map((e) => ({ week: e.weekIndex, type: e.eventType, title: e.title, description: e.description, source: e.source })),
        observations: team.observations.map((o) => ({
          week: o.weekIndex,
          type: o.observationType,
          summary: o.summary,
          scope: o.permissionScope,
          source: o.connectorId,
        })),
        interventions: team.executions.map((ex) => ({
          name: ex.intervention.name,
          status: ex.status,
          targetVital: ex.intervention.targetVital,
          outcome: ex.outcome?.outcomeNotes ?? null,
        })),
      },
      nodeIds,
      relationshipLog: [
        { from: `Team (${team.name})`, relationship: "HAS_VITAL_SNAPSHOT", to: `${team.snapshots.length} weekly snapshots`, meaning: "Retrieve historical Team Vitals" },
        { from: `Team (${team.name})`, relationship: "WORKS_ON", to: `${team.projects.length} active projects`, meaning: "Inspect connected projects and responsibilities" },
        { from: `Team / Projects`, relationship: "HAS_EVENT", to: `${events.length} organizational events`, meaning: "Correlate timestamped changes" },
      ],
      summary: `Traversed ${team.name}: ${team.snapshots.length} snapshots, ${team.projects.length} projects, ${events.length} events`,
    };
  }

  if (name === "get_intervention_library") {
    const ivs = await prisma.intervention.findMany({ orderBy: { id: "asc" } });
    return {
      result: ivs.map((i) => ({
        id: i.id,
        slug: i.slug,
        name: i.name,
        targetVital: i.targetVital,
        duration: i.estimatedDuration,
        description: i.description,
      })),
      nodeIds: ivs.slice(0, 1).map((i) => i.id),
      relationshipLog: [
        { from: "AI Reasoning Layer", relationship: "USES", to: "Intervention Library (10 Connect Guides)", meaning: "Match observed signals to constructive team actions" },
      ],
      summary: `Consulted ${ivs.length} Connect Guide templates`,
    };
  }

  if (name === "get_employee_shared_preferences") {
    const employeeId = String(args.employeeId || "e-jordan-ellis");
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { profiles: { where: { isCurrent: true } } },
    });
    if (!emp || !emp.profiles[0]) {
      return { result: { error: "Employee or profile not found" }, nodeIds: [], relationshipLog: [], summary: "Employee not found" };
    }
    const prof = emp.profiles[0];
    const sharing = parseSharingPermissions(prof.sharingPermissions);
    const work = canViewEnergyProfileSection(ctx.viewer, emp, sharing, "working");
    const comm = canViewEnergyProfileSection(ctx.viewer, emp, sharing, "communication");
    return {
      result: {
        employee: emp.name,
        role: emp.role,
        workingPreferences: work.allowed ? parseJSON<string[]>(prof.workingPreferences, []) : `RESTRICTED: ${work.reason}`,
        communicationPreferences: comm.allowed ? parseJSON<string[]>(prof.communicationPreferences, []) : `RESTRICTED: ${comm.reason}`,
      },
      nodeIds: work.allowed || comm.allowed ? [emp.id, prof.id] : [emp.id],
      relationshipLog: [
        { from: `Employee (${emp.name})`, relationship: "HAS_PROFILE", to: "EnergyProfile (RBAC-checked)", meaning: work.allowed ? work.reason : "Access restricted by employee settings" },
      ],
      summary: `Checked RBAC permissions for ${emp.name}'s EnergyProfile`,
    };
  }

  return { result: { error: "Unknown tool" }, nodeIds: [], relationshipLog: [], summary: `Unknown tool ${name}` };
}

export async function runGeminiOntologyReasoning(params: {
  question: string;
  teamId?: string | null;
  viewer: Viewer;
  currentDate: Date;
}): Promise<{
  answerParagraphs: string[];
  headline: string;
  toolTrace: TraversalToolCall[];
  nodeIds: string[];
  relationshipLog: { from: string; relationship: string; to: string; meaning: string }[];
  recommendedSlug: string;
} | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const systemPrompt = [
    "You are Sunny Workplace Intelligence, an ontology-driven organizational assistant for Northstar Community Services (a 100% synthetic demo dataset).",
    `Current viewer: ${params.viewer.name} (role: ${params.viewer.systemRole}, team: ${params.viewer.teamId}).`,
    `Current demo date: ${fmtDate(params.currentDate)} (Week ${weekOf(params.currentDate)}).`,
    "RULES:",
    "1. Always call the ontology tools before answering—never guess or invent scores, dates, or events.",
    "2. Never claim causation from temporal correlation; state uncertainty and alternative explanations clearly.",
    "3. Never diagnose mental health, rank employees by personality, or infer emotion from message volume.",
    "4. Respect RBAC restrictions returned by tools.",
    "5. End with a clear, constructive team-level recommendation from the Connect Guide library when relevant.",
  ].join("\n");

  const contents: any[] = [
    {
      role: "user",
      parts: [
        {
          text: `Default focus teamId: ${params.teamId || "t-outreach"}. User question: ${params.question}`,
        },
      ],
    },
  ];

  const toolTrace: TraversalToolCall[] = [];
  const nodeIdSet = new Set<string>(["org-northstar"]);
  const relationshipLog: { from: string; relationship: string; to: string; meaning: string }[] = [];

  try {
    for (let step = 0; step < 4; step++) {
      const resp = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          tools: [{ functionDeclarations: ONTOLOGY_TOOL_DECLARATIONS }],
          generationConfig: { temperature: 0.2 },
        }),
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      const candidate = json.candidates?.[0]?.content;
      if (!candidate?.parts) return null;

      contents.push(candidate);
      const fnCalls = candidate.parts.filter((p: any) => p.functionCall);
      if (fnCalls.length === 0) {
        const text = candidate.parts
          .map((p: any) => p.text)
          .filter(Boolean)
          .join("\n")
          .trim();
        if (!text) return null;
        const paragraphs = text
          .split(/\n{2,}/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        return {
          headline: paragraphs[0] || text,
          answerParagraphs: paragraphs,
          toolTrace,
          nodeIds: Array.from(nodeIdSet),
          relationshipLog,
          recommendedSlug: "clarify-responsibilities",
        };
      }

      const fnResponses: any[] = [];
      for (const part of fnCalls) {
        const fc = part.functionCall;
        const exec = await executeOntologyTool(fc.name, fc.args || {}, {
          viewer: params.viewer,
          currentDate: params.currentDate,
        });
        toolTrace.push({ tool: fc.name, args: fc.args || {}, summary: exec.summary });
        exec.nodeIds.forEach((id) => nodeIdSet.add(id));
        relationshipLog.push(...exec.relationshipLog);
        fnResponses.push({
          functionResponse: {
            name: fc.name,
            response: { result: exec.result },
          },
        });
      }
      contents.push({ role: "user", parts: fnResponses });
    }
  } catch {
    return null;
  }
  return null;
}

export async function runEmployeeCoach(params: {
  question: string;
  viewer: Viewer;
  currentDate: Date;
}): Promise<{
  mode: "gemini" | "deterministic";
  answer: string[];
  contextUsed: string[];
}> {
  const emp = await prisma.employee.findUnique({
    where: { id: params.viewer.id },
    include: {
      team: true,
      manager: true,
      profiles: { where: { isCurrent: true } },
      checkIns: { orderBy: { timestamp: "desc" }, take: 5 },
      participations: { include: { project: { include: { responsibilities: true } } } },
    },
  });

  if (!emp) {
    return { mode: "deterministic", answer: ["Employee context not found."], contextUsed: [] };
  }

  const prof = emp.profiles[0];
  const workPrefs = prof ? parseJSON<string[]>(prof.workingPreferences, []) : [];
  const commPrefs = prof ? parseJSON<string[]>(prof.communicationPreferences, []) : [];
  const checkIns = emp.checkIns.filter((ci) => canViewCheckIn(params.viewer, ci, emp.managerId));
  const contextUsed = [
    `Your Energy Profile (${workPrefs.length} working, ${commPrefs.length} communication preferences)`,
    `Your last ${checkIns.length} personal Energy Check-Ins (private to you)`,
    `Your ${emp.participations.length} active projects in ${emp.team.name}`,
  ];

  const apiKey = getApiKey();
  if (apiKey) {
    try {
      const prompt = [
        `You are Sunny's personal Employee AI Coach speaking directly to ${emp.name} (${emp.role} on ${emp.team.name}).`,
        "You ONLY have access to this employee's own data (never other teammates' private responses).",
        `Working preferences: ${workPrefs.join("; ")}`,
        `Communication preferences: ${commPrefs.join("; ")}`,
        `Recent personal check-ins: ${checkIns.map((c) => `${fmtDate(c.timestamp)}: Energy ${c.reportedEnergy}/5, Support ${c.reportedSupport}/5${c.optionalContext ? ` ("${c.optionalContext}")` : ""}`).join(" | ")}`,
        `Active projects: ${emp.participations.map((pp) => `${pp.project.name} (${pp.role}, ${pp.project.responsibilities.filter((r) => r.ownership !== "ASSIGNED").length} shared/unowned tasks)`).join("; ")}`,
        "Give warm, practical, non-diagnostic coaching grounded in their preferences and project context. Keep it concise (2-3 short paragraphs).",
      ].join("\n");

      const resp = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ role: "user", parts: [{ text: params.question }] }],
          generationConfig: { temperature: 0.3 },
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        const text = json.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join("\n")
          .trim();
        if (text) {
          return {
            mode: "gemini",
            answer: text.split(/\n{2,}/).map((s: string) => s.trim()).filter(Boolean),
            contextUsed,
          };
        }
      }
    } catch {
      // fall through to deterministic coach
    }
  }

  // Deterministic Employee Coach fallback (zero-API-key safe)
  const q = params.question.toLowerCase();
  const mgrName = emp.manager?.name || "your manager";
  if (q.includes("1:1") || q.includes("talk") || q.includes("ask") || q.includes("manager") || q.includes("dana")) {
    return {
      mode: "deterministic",
      answer: [
        `Since you prefer "${commPrefs[0] || "direct and specific feedback"}" and "${workPrefs[0] || "clear ownership"}", try sending ${mgrName} a short 3-bullet note ahead of your 1:1 naming the 2–3 unowned outreach responsibilities you'd like to clarify.`,
        `Suggested opener: "I want to make sure Neighborhood Food Access Outreach stays on track for Nov 20—can we spend 5 minutes in our 1:1 confirming single owners for translation coordination and weekly partner reporting?"`,
      ],
      contextUsed,
    };
  }
  return {
    mode: "deterministic",
    answer: [
      `Based on your working preferences (${workPrefs.join(", ")}) and your recent check-ins, protecting focus blocks while ${emp.participations[0]?.project.name || "your current project"} is busy can help keep your energy steady.`,
      `You also have the option to share or unshare your preferences with ${mgrName} anytime from your Battery & Profile page, and your individual pulse answers always remain private.`,
    ],
    contextUsed,
  };
}

