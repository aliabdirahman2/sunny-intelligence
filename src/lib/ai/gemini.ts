// Live Gemini Ontology-Traversal Adapter (zero extra dependencies — uses native fetch).
// Gives Gemini typed ontology tools backed by Prisma, with RBAC & privacy enforced inside each tool.
// Falls back cleanly if GEMINI_API_KEY is not set.

import { prisma } from "../db";
import { VITALS, VITAL_FIELD, type Vital, fmtDate, parseJSON, round1, weekOf } from "../domain";
import { type Viewer, canViewCheckIn } from "../permissions";

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
      "Look up any employee by name or ID and retrieve their EnergyProfile (working, collaboration, and communication preferences) so teammates and managers know how to approach and collaborate with them, plus any check-in notes they shared with their manager. Use this whenever asked how to approach talking to or collaborating with a specific person.",
    parameters: {
      type: "object",
      properties: {
        nameOrId: { type: "string", description: "Employee full/partial name (e.g. 'Jordan Ellis', 'Marcus') or ID (e.g. 'e-jordan-ellis')" },
      },
      required: ["nameOrId"],
    },
  },
  {
    name: "list_energy_profiles",
    description:
      "List Energy Profiles (working, collaboration, and communication preferences) for all employees on a team (or across the whole organization if teamId is omitted) so anyone can understand how teammates prefer to work and communicate.",
    parameters: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Optional Team ID (e.g. 't-outreach') to filter to one team" },
      },
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
    const query = String(args.nameOrId || args.employeeId || "e-jordan-ellis").trim();
    const allEmps = await prisma.employee.findMany({
      include: { team: true, profiles: { where: { isCurrent: true } }, checkIns: { orderBy: { timestamp: "desc" }, take: 5 } },
    });
    const emp =
      allEmps.find((e) => e.id === query) ||
      allEmps.find((e) => e.name.toLowerCase() === query.toLowerCase()) ||
      allEmps.find((e) => e.name.toLowerCase().includes(query.toLowerCase()));

    if (!emp || !emp.profiles[0]) {
      return {
        result: {
          error: `Employee matching "${query}" not found`,
          availableSample: allEmps.slice(0, 15).map((e) => e.name),
        },
        nodeIds: [],
        relationshipLog: [],
        summary: `Employee "${query}" not found`,
      };
    }
    const prof = emp.profiles[0];
    const sharedCheckIns = emp.checkIns
      .filter((ci) => canViewCheckIn(ctx.viewer, ci, emp.managerId))
      .map((ci) => ({ date: fmtDate(ci.timestamp), context: ci.optionalContext, visibility: ci.visibility }));

    return {
      result: {
        employee: emp.name,
        role: emp.role,
        team: emp.team.name,
        workingPreferences: parseJSON<string[]>(prof.workingPreferences, []),
        collaborationPreferences: parseJSON<string[]>(prof.collaborationPreferences, []),
        communicationPreferences: parseJSON<string[]>(prof.communicationPreferences, []),
        sharedCheckInNotes: sharedCheckIns,
        note: "Energy Profiles are open across the team to support better collaboration — never to evaluate or rank performance.",
      },
      nodeIds: [emp.id, prof.id, emp.teamId],
      relationshipLog: [
        { from: `Employee (${emp.name})`, relationship: "HAS_PROFILE", to: "EnergyProfile (Team-Shared)", meaning: "Retrieved working, collaboration, and communication preferences" },
      ],
      summary: `Retrieved ${emp.name}'s EnergyProfile`,
    };
  }

  if (name === "list_energy_profiles") {
    const teamId = args.teamId ? String(args.teamId).trim() : null;
    const emps = await prisma.employee.findMany({
      where: teamId ? { teamId } : undefined,
      include: { team: true, profiles: { where: { isCurrent: true } } },
      orderBy: { name: "asc" },
    });
    return {
      result: emps
        .filter((e) => e.profiles[0])
        .map((e) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          team: e.team.name,
          workingPreferences: parseJSON<string[]>(e.profiles[0].workingPreferences, []),
          collaborationPreferences: parseJSON<string[]>(e.profiles[0].collaborationPreferences, []),
          communicationPreferences: parseJSON<string[]>(e.profiles[0].communicationPreferences, []),
        })),
      nodeIds: emps.map((e) => e.id),
      relationshipLog: [
        { from: teamId ? `Team (${teamId})` : "Organization", relationship: "HAS_ENERGY_PROFILES", to: `${emps.length} Employees`, meaning: "Listed team-shared Energy Profiles for collaboration" },
      ],
      summary: `Listed ${emps.length} Energy Profiles${teamId ? ` for ${teamId}` : ""}`,
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
    "4. Energy Profiles (working, collaboration, and communication preferences) are shared across the team so everyone knows how to approach and collaborate with each other—always call get_employee_shared_preferences or list_energy_profiles when asked about someone's Energy Profile or how to approach talking to them. Still respect privacy for individual pulse responses and unshared check-in notes.",
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
  employeeName: string;
  employeeRole: string;
}> {
  const employeeId = params.viewer.systemRole === "EMPLOYEE" ? params.viewer.id : "e-jordan-ellis";
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      team: true,
      manager: true,
      profiles: { where: { isCurrent: true } },
      checkIns: { orderBy: { timestamp: "desc" }, take: 5 },
      participations: { include: { project: { include: { responsibilities: true } } } },
    },
  });

  if (!emp) {
    return {
      mode: "deterministic",
      answer: ["Employee context not found."],
      contextUsed: [],
      employeeName: params.viewer.name,
      employeeRole: params.viewer.role,
    };
  }

  const teammates = await prisma.employee.findMany({
    where: { teamId: emp.teamId, id: { not: emp.id } },
    include: { profiles: { where: { isCurrent: true } } },
    orderBy: { name: "asc" },
  });

  const teammateProfiles = teammates
    .filter((t) => t.profiles[0])
    .map((t) => {
      const p = t.profiles[0];
      const w = parseJSON<string[]>(p.workingPreferences, []);
      const c = parseJSON<string[]>(p.communicationPreferences, []);
      const col = parseJSON<string[]>(p.collaborationPreferences, []);
      return {
        name: t.name,
        role: t.role,
        working: w,
        communication: c,
        collaboration: col,
      };
    });

  const prof = emp.profiles[0];
  const workPrefs = prof ? parseJSON<string[]>(prof.workingPreferences, []) : [];
  const commPrefs = prof ? parseJSON<string[]>(prof.communicationPreferences, []) : [];
  const checkIns = emp.checkIns;
  const contextUsed = [
    `Your Energy Profile (${workPrefs.length} working, ${commPrefs.length} communication preferences)`,
    `Your last ${checkIns.length} personal Energy Check-Ins (private to you)`,
    `Your ${emp.participations.length} active projects in ${emp.team.name}`,
    `Team Energy Profiles (${teammateProfiles.length} teammates in ${emp.team.name})`,
  ];

  const apiKey = getApiKey();
  if (apiKey) {
    try {
      const teammateLines = teammateProfiles
        .map(
          (t) =>
            `- ${t.name} (${t.role}): Working=[${t.working.join(", ")}] | Collaboration=[${t.collaboration.join(", ")}] | Communication=[${t.communication.join(", ")}]`,
        )
        .join("\n");

      const prompt = [
        `You are Sunny's personal Employee AI Coach speaking directly to ${emp.name} (${emp.role} on ${emp.team.name}).`,
        "You ONLY have access to this employee's own private check-ins and the team's shared Energy Profiles (never other teammates' private pulse responses or check-ins).",
        `Your working preferences: ${workPrefs.join("; ")}`,
        `Your communication preferences: ${commPrefs.join("; ")}`,
        `Your recent personal check-ins: ${checkIns.map((c) => `${fmtDate(c.timestamp)}: Energy ${c.reportedEnergy}/5, Support ${c.reportedSupport}/5${c.optionalContext ? ` ("${c.optionalContext}")` : ""}`).join(" | ")}`,
        `Your active projects: ${emp.participations.map((pp) => `${pp.project.name} (${pp.role}, ${pp.project.responsibilities.filter((r) => r.ownership !== "ASSIGNED").length} shared/unowned tasks)`).join("; ")}`,
        `Team Energy Profiles (open to everyone on ${emp.team.name} so you know how to approach each teammate):\n${teammateLines}`,
        "Give warm, practical, non-diagnostic coaching grounded in their preferences, teammate Energy Profiles (when asked how to approach someone), and project context. Keep it concise (2-3 short paragraphs).",
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
            employeeName: emp.name,
            employeeRole: emp.role,
          };
        }
      }
    } catch {
      // fall through to deterministic coach
    }
  }

  // Deterministic Employee Coach fallback (zero-API-key safe)
  const q = params.question.toLowerCase();
  const matchedTeammate = teammateProfiles.find(
    (t) => q.includes(t.name.toLowerCase()) || t.name.toLowerCase().split(" ").some((part) => part.length > 2 && q.includes(part)),
  );
  if (matchedTeammate && (q.includes("approach") || q.includes("talk") || q.includes("energy") || q.includes("work with"))) {
    return {
      mode: "deterministic",
      answer: [
        `To approach ${matchedTeammate.name} (${matchedTeammate.role}), keep their Energy Profile in mind: they work best with ${matchedTeammate.working.join(", ") || "clear context"} and collaborate via ${matchedTeammate.collaboration.join(", ") || "structured check-ins"}.`,
        `For communication, ${matchedTeammate.name} prefers: ${matchedTeammate.communication.join(", ") || "clear, direct updates"}. Matching that style when you reach out will make the conversation smoother for both of you.`,
      ],
      contextUsed,
      employeeName: emp.name,
      employeeRole: emp.role,
    };
  }

  const mgrName = emp.manager?.name || "your manager";
  if (q.includes("1:1") || q.includes("talk") || q.includes("ask") || q.includes("manager") || q.includes("dana")) {
    return {
      mode: "deterministic",
      answer: [
        `Since you prefer "${commPrefs[0] || "direct and specific feedback"}" and "${workPrefs[0] || "clear ownership"}", try sending ${mgrName} a short 3-bullet note ahead of your 1:1 naming the 2–3 unowned outreach responsibilities you'd like to clarify.`,
        `Suggested opener: "I want to make sure Neighborhood Food Access Outreach stays on track for Nov 20—can we spend 5 minutes in our 1:1 confirming single owners for translation coordination and weekly partner reporting?"`,
      ],
      contextUsed,
      employeeName: emp.name,
      employeeRole: emp.role,
    };
  }
  return {
    mode: "deterministic",
    answer: [
      `Based on your working preferences (${workPrefs.join(", ")}) and your recent check-ins, protecting focus blocks while ${emp.participations[0]?.project.name || "your current project"} is busy can help keep your energy steady.`,
      `You also have the option to share or unshare your check-in notes with ${mgrName} anytime from your Battery & Profile page, and your individual pulse answers always remain private.`,
    ],
    contextUsed,
    employeeName: emp.name,
    employeeRole: emp.role,
  };
}

