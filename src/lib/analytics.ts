// Server-side data queries & benchmarks. Every screen reads from this single source of truth.

import { prisma } from "./db";
import { DISCOVERY_DATE, PRIVACY_THRESHOLD, VITALS, VITAL_FIELD, type Vital, parseJSON, round1, weekOf } from "./domain";
import { PERSONAS } from "./seed/scenario";
import { type Viewer } from "./permissions";
import { pooledMean } from "./scoring";

export async function getDemoContext(): Promise<{
  currentDate: Date;
  phase: "DISCOVERY" | "FOLLOW_UP";
  maxWeek: number;
  viewer: Viewer;
  personas: { id: string; name: string; role: string; systemRole: string; label: string }[];
}> {
  let state = await prisma.demoState.findUnique({ where: { id: 1 } });
  if (!state) {
    state = await prisma.demoState.create({
      data: { id: 1, currentDate: DISCOVERY_DATE, phase: "DISCOVERY", viewerId: PERSONAS.manager.id, updatedAt: new Date() },
    });
  }
  const emp =
    (await prisma.employee.findUnique({ where: { id: state.viewerId } })) ??
    (await prisma.employee.findFirstOrThrow({ where: { id: PERSONAS.manager.id } }));

  const personaRecords = await prisma.employee.findMany({
    where: { id: { in: [PERSONAS.manager.id, PERSONAS.employee.id, PERSONAS.hr.id] } },
  });

  const labelMap: Record<string, string> = {
    [PERSONAS.manager.id]: "Manager · Dana Whitfield (Community Outreach)",
    [PERSONAS.employee.id]: "Employee · Jordan Ellis (Community Outreach)",
    [PERSONAS.hr.id]: "HR / Org Admin · Priya Raman (People & Operations)",
  };

  return {
    currentDate: state.currentDate,
    phase: state.phase as "DISCOVERY" | "FOLLOW_UP",
    maxWeek: weekOf(state.currentDate),
    viewer: {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      systemRole: emp.systemRole as Viewer["systemRole"],
      teamId: emp.teamId,
    },
    personas: [PERSONAS.manager.id, PERSONAS.employee.id, PERSONAS.hr.id]
      .map((id) => personaRecords.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        systemRole: p.systemRole,
        label: labelMap[p.id] || p.name,
      })),
  };
}

export async function getOrgOverviewData(maxWeek: number) {
  const org = await prisma.organization.findFirstOrThrow();
  const teams = await prisma.team.findMany({
    include: {
      members: true,
      projects: { include: { responsibilities: true } },
      snapshots: { where: { weekIndex: { lte: maxWeek } }, orderBy: { weekIndex: "asc" } },
      executions: { include: { intervention: true, outcome: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });

  // Weekly org-wide pooled vitals across weeks 1..maxWeek
  const orgWeekly: { weekIndex: number; Supported: number | null; Energized: number | null; Aligned: number | null; Recognized: number | null; Safe: number | null; respondents: number }[] = [];
  for (let w = 1; w <= maxWeek; w++) {
    const row: any = { weekIndex: w, respondents: 0 };
    for (const v of VITALS) {
      const parts = teams.map((t) => {
        const s = t.snapshots.find((sn) => sn.weekIndex === w);
        const vr = s ? parseJSON<Record<Vital, number>>(s.vitalRespondents, {} as any)[v] ?? s.respondentCount : 0;
        return { score: s ? s[VITAL_FIELD[v]] : null, n: s && !s.suppressed ? vr : 0 };
      });
      const pooled = pooledMean(parts);
      row[v] = pooled.score;
      if (v === "Supported") row.respondents = pooled.n;
    }
    orgWeekly.push(row);
  }

  const latestOrg = orgWeekly[orgWeekly.length - 1];
  const baselineOrg = orgWeekly.find((w) => w.weekIndex === 5) || orgWeekly[0];

  // Team summaries with internal baseline (Weeks 2–5 mean) vs latest
  const teamSummaries = teams.map((t) => {
    const latest = t.snapshots[t.snapshots.length - 1];
    const week12 = t.snapshots.find((s) => s.weekIndex === 12) || latest;
    const baseWindow = t.snapshots.filter((s) => s.weekIndex >= 2 && s.weekIndex <= 5 && !s.suppressed);
    const baseline = {} as Record<Vital, number | null>;
    const current = {} as Record<Vital, number | null>;
    const deltaVsBaseline = {} as Record<Vital, number | null>;
    const deltaVsOrg = {} as Record<Vital, number | null>;

    for (const v of VITALS) {
      const f = VITAL_FIELD[v];
      const bVals = baseWindow.map((s) => s[f]).filter((x): x is number => x !== null);
      baseline[v] = bVals.length ? round1(bVals.reduce((a, b) => a + b, 0) / bVals.length) : null;
      current[v] = latest && !latest.suppressed ? latest[f] : null;
      deltaVsBaseline[v] =
        current[v] !== null && baseline[v] !== null ? round1(current[v]! - baseline[v]!) : null;
      deltaVsOrg[v] =
        current[v] !== null && latestOrg[v] !== null ? round1(current[v]! - latestOrg[v]!) : null;
    }

    const needsAttention =
      (deltaVsBaseline.Supported !== null && deltaVsBaseline.Supported <= -8) ||
      (deltaVsBaseline.Aligned !== null && deltaVsBaseline.Aligned <= -8);

    return {
      id: t.id,
      name: t.name,
      department: t.department,
      description: t.description,
      memberCount: t.members.length,
      projectCount: t.projects.length,
      latestSnapshot: latest,
      week12Snapshot: week12,
      baseline,
      current,
      deltaVsBaseline,
      deltaVsOrg,
      needsAttention,
      executions: t.executions,
    };
  });

  const events = await prisma.organizationalEvent.findMany({
    where: { weekIndex: { lte: maxWeek } },
    orderBy: { occurredAt: "desc" },
  });

  const observations = await prisma.workplaceObservation.findMany({
    where: { weekIndex: { lte: maxWeek }, deletedAt: null },
    orderBy: { observedAt: "desc" },
  });

  const executions = await prisma.interventionExecution.findMany({
    include: { intervention: true, team: true, outcome: true, actions: { orderBy: { timestamp: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    org,
    orgWeekly,
    latestOrg,
    baselineOrg,
    teamSummaries,
    events,
    observations,
    executions,
     privacyThreshold: PRIVACY_THRESHOLD,
  };
}

