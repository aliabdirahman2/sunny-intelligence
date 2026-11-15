// Explicit Organizational Ontology Layer.
// Defines ontology object types, typed semantic relationships, source provenance,
// and graph traversal backed directly by the Prisma relational store.
// Every node and edge in the React Flow visualization and AI reasoning engine comes from here.

import { prisma } from "../db";
import { VITALS, type Vital, fmtDate, parseJSON, weekOf } from "../domain";
import { type Viewer, canViewEnergyProfileSection, parseSharingPermissions } from "../permissions";

export type OntologyEntityType =
  | "Organization"
  | "Team"
  | "Employee"
  | "Project"
  | "Responsibility"
  | "EnergyProfile"
  | "EnergyCheckIn"
  | "TeamVitalSnapshot"
  | "WorkplaceObservation"
  | "OrganizationalEvent"
  | "Intervention"
  | "InterventionExecution"
  | "InterventionOutcome"
  | "Insight";

export type RelationshipType =
  | "HAS_TEAM"
  | "EMPLOYS"
  | "OPERATES_PROJECT"
  | "BELONGS_TO"
  | "REPORTS_TO"
  | "HAS_PROFILE"
  | "SUBMITTED_BY"
  | "PARTICIPATES_IN"
  | "WORKS_ON"
  | "HAS_RESPONSIBILITY"
  | "HAS_EVENT"
  | "HAS_VITAL_SNAPSHOT"
  | "RELATES_TO_TEAM"
  | "RELATES_TO_PROJECT"
  | "RELATES_TO_EMPLOYEE"
  | "RECEIVES"
  | "USES"
  | "PRODUCES"
  | "MEASURED_BY"
  | "EVIDENCES";

export const RELATIONSHIP_SEMANTICS: Record<RelationshipType, { label: string; meaning: string; inverse: string }> = {
  HAS_TEAM: {
    label: "HAS_TEAM",
    meaning: "Organization structures work through this Team.",
    inverse: "PART_OF_ORG",
  },
  EMPLOYS: {
    label: "EMPLOYS",
    meaning: "Organization employs this person.",
    inverse: "EMPLOYED_BY",
  },
  OPERATES_PROJECT: {
    label: "OPERATES_PROJECT",
    meaning: "Organization sponsors or operates this Project.",
    inverse: "SPONSORED_BY",
  },
  BELONGS_TO: {
    label: "BELONGS_TO",
    meaning: "Employee is a member of this Team.",
    inverse: "HAS_MEMBER",
  },
  REPORTS_TO: {
    label: "REPORTS_TO",
    meaning: "Employee reports to this Manager.",
    inverse: "MANAGES",
  },
  HAS_PROFILE: {
    label: "HAS_PROFILE",
    meaning: "Employee has a permission-controlled Energy Profile of working preferences.",
    inverse: "PROFILE_OF",
  },
  SUBMITTED_BY: {
    label: "SUBMITTED_BY",
    meaning: "EnergyCheckIn was voluntarily submitted by this Employee.",
    inverse: "HAS_CHECK_IN",
  },
  PARTICIPATES_IN: {
    label: "PARTICIPATES_IN",
    meaning: "Employee contributes to this Project.",
    inverse: "HAS_PARTICIPANT",
  },
  WORKS_ON: {
    label: "WORKS_ON",
    meaning: "Team is responsible for delivering this Project.",
    inverse: "ASSIGNED_TO",
  },
  HAS_RESPONSIBILITY: {
    label: "HAS_RESPONSIBILITY",
    meaning: "Project includes this team-level deliverable or responsibility.",
    inverse: "PART_OF_PROJECT",
  },
  HAS_EVENT: {
    label: "HAS_EVENT",
    meaning: "Entity experienced this timestamped OrganizationalEvent.",
    inverse: "AFFECTS",
  },
  HAS_VITAL_SNAPSHOT: {
    label: "HAS_VITAL_SNAPSHOT",
    meaning: "Team's five Team Vitals were measured in this weekly snapshot (privacy-thresholded).",
    inverse: "MEASURES_TEAM",
  },
  RELATES_TO_TEAM: {
    label: "RELATES_TO",
    meaning: "Aggregate workplace observation relates to this Team.",
    inverse: "OBSERVED_IN",
  },
  RELATES_TO_PROJECT: {
    label: "RELATES_TO",
    meaning: "Workplace observation relates to this Project.",
    inverse: "OBSERVED_ON",
  },
  RELATES_TO_EMPLOYEE: {
    label: "RELATES_TO",
    meaning: "Employee voluntarily shared this observation.",
    inverse: "SHARED_OBSERVATION",
  },
  RECEIVES: {
    label: "RECEIVES",
    meaning: "Team receives this approved InterventionExecution.",
    inverse: "TARGETS_TEAM",
  },
  USES: {
    label: "USES",
    meaning: "InterventionExecution instantiates this Intervention template.",
    inverse: "EXECUTED_AS",
  },
  PRODUCES: {
    label: "PRODUCES",
    meaning: "InterventionExecution has a measured before/after InterventionOutcome.",
    inverse: "OUTCOME_OF",
  },
  MEASURED_BY: {
    label: "MEASURED_BY",
    meaning: "InterventionOutcome compares these pre- and post-intervention TeamVitalSnapshots.",
    inverse: "INFORMS_OUTCOME",
  },
  EVIDENCES: {
    label: "EVIDENCES",
    meaning: "Ontology object was traversed as evidence for this AI Insight.",
    inverse: "SUPPORTED_BY",
  },
};

export interface OntologyNode {
  id: string;
  entityType: OntologyEntityType;
  label: string;
  subtitle: string;
  source: string;
  timestamp?: string;
  weekIndex?: number;
  teamId?: string;
  properties: Record<string, unknown>;
}

export interface OntologyEdge {
  id: string;
  source: string;
  target: string;
  relationship: RelationshipType;
  meaning: string;
  provenance: string;
}

export interface OntologyGraphData {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
}

/**
 * Build the live ontology graph directly from Prisma records, scoped to the current demo date
 * and the viewer's role/permissions.
 */
export async function buildOntologyGraph(opts: {
  viewer: Viewer;
  currentDate: Date;
  focusTeamId?: string | null;
  includeAllEmployees?: boolean;
}): Promise<OntologyGraphData> {
  const maxWeek = weekOf(opts.currentDate);
  const nodes: OntologyNode[] = [];
  const edges: OntologyEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (n: OntologyNode) => {
    if (!nodeIds.has(n.id)) {
      nodeIds.add(n.id);
      nodes.push(n);
    }
  };
  const addEdge = (source: string, target: string, relationship: RelationshipType, provenance: string) => {
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;
    const id = `${source}--${relationship}--${target}`;
    if (!edges.some((e) => e.id === id)) {
      edges.push({
        id,
        source,
        target,
        relationship,
        meaning: RELATIONSHIP_SEMANTICS[relationship].meaning,
        provenance,
      });
    }
  };

  const org = await prisma.organization.findFirstOrThrow();
  addNode({
    id: org.id,
    entityType: "Organization",
    label: org.name,
    subtitle: org.industry,
    source: "conn-hris",
    properties: { industry: org.industry, synthetic: true },
  });

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  const focusTeam = opts.focusTeamId || "t-outreach";

  for (const t of teams) {
    if (opts.focusTeamId && t.id !== opts.focusTeamId) continue;
    addNode({
      id: t.id,
      entityType: "Team",
      label: t.name,
      subtitle: `${t.department} department`,
      source: "conn-hris",
      teamId: t.id,
      properties: { department: t.department, description: t.description, managerId: t.managerId },
    });
    addEdge(org.id, t.id, "HAS_TEAM", "HRIS team hierarchy");
  }

  // Employees: show full roster for focused team (or managers + representative members across org)
  const employees = await prisma.employee.findMany({
    include: { profiles: { where: { isCurrent: true } } },
    orderBy: { name: "asc" },
  });

  for (const emp of employees) {
    if (opts.focusTeamId && emp.teamId !== opts.focusTeamId) continue;
    const includeEmp =
      opts.includeAllEmployees ||
      emp.teamId === focusTeam ||
      emp.systemRole === "MANAGER" ||
      emp.id === opts.viewer.id;
    if (!includeEmp) continue;

    addNode({
      id: emp.id,
      entityType: "Employee",
      label: emp.name,
      subtitle: emp.role,
      source: "conn-hris",
      teamId: emp.teamId,
      properties: {
        role: emp.role,
        department: emp.department,
        email: emp.email,
        joinedAt: fmtDate(emp.joinedAt),
        systemRole: emp.systemRole,
        synthetic: true,
      },
    });
    addEdge(emp.id, emp.teamId, "BELONGS_TO", "HRIS membership record");

    // EnergyProfile node for focused team members where viewer has permission (or self)
    const prof = emp.profiles[0];
    if (prof && (emp.teamId === focusTeam || emp.id === opts.viewer.id)) {
      const sharing = parseSharingPermissions(prof.sharingPermissions);
      const workAccess = canViewEnergyProfileSection(opts.viewer, emp, sharing, "working");
      const commAccess = canViewEnergyProfileSection(opts.viewer, emp, sharing, "communication");
      if (workAccess.allowed || commAccess.allowed) {
        const working = workAccess.allowed ? parseJSON<string[]>(prof.workingPreferences, []) : ["(Restricted by employee sharing settings)"];
        const comm = commAccess.allowed ? parseJSON<string[]>(prof.communicationPreferences, []) : ["(Restricted by employee sharing settings)"];
        addNode({
          id: prof.id,
          entityType: "EnergyProfile",
          label: `${emp.name.split(" ")[0]}'s Energy Profile`,
          subtitle: `${prof.assessmentVersion} · Working preferences`,
          source: "Synthetic Working-Preferences Inventory",
          timestamp: fmtDate(prof.assessedAt),
          teamId: emp.teamId,
          properties: {
            assessmentType: prof.assessmentType,
            assessmentVersion: prof.assessmentVersion,
            assessedAt: fmtDate(prof.assessedAt),
            workingPreferences: working,
            communicationPreferences: comm,
            accessBasis: workAccess.reason,
          },
        });
        addEdge(emp.id, prof.id, "HAS_PROFILE", workAccess.reason);
      }
    }
  }

  // REPORTS_TO edges
  for (const emp of employees) {
    if (emp.managerId && nodeIds.has(emp.id) && nodeIds.has(emp.managerId)) {
      addEdge(emp.id, emp.managerId, "REPORTS_TO", "HRIS reporting line");
    }
  }

  // Projects & Responsibilities
  const projects = await prisma.project.findMany({
    where: { startDate: { lte: opts.currentDate } },
    include: { responsibilities: true },
  });
  for (const p of projects) {
    if (opts.focusTeamId && p.teamId !== opts.focusTeamId) continue;
    addNode({
      id: p.id,
      entityType: "Project",
      label: p.name,
      subtitle: `${p.priority} priority · Due ${fmtDate(p.endDate)}`,
      source: "conn-pm",
      timestamp: fmtDate(p.startDate),
      teamId: p.teamId,
      properties: {
        description: p.description,
        status: p.status,
        priority: p.priority,
        startDate: fmtDate(p.startDate),
        endDate: fmtDate(p.endDate),
        responsibilityCount: p.responsibilities.length,
        unownedCount: p.responsibilities.filter((r) => r.ownership !== "ASSIGNED").length,
      },
    });
    addEdge(p.teamId, p.id, "WORKS_ON", "Project management assignment");

    if (p.teamId === focusTeam) {
      for (const r of p.responsibilities) {
        if (r.addedAt > opts.currentDate) continue;
        addNode({
          id: r.id,
          entityType: "Responsibility",
          label: r.title,
          subtitle: `Ownership: ${r.ownership}`,
          source: r.source,
          timestamp: fmtDate(r.addedAt),
          teamId: p.teamId,
          properties: {
            title: r.title,
            ownership: r.ownership,
            addedAt: fmtDate(r.addedAt),
          },
        });
        addEdge(p.id, r.id, "HAS_RESPONSIBILITY", "Project task registry");
      }
    }
  }

  // TeamVitalSnapshots: baseline (W5), latest (W12), and follow-up (W14 if in follow-up phase) for focused team, plus latest for others
  const snapshots = await prisma.teamVitalSnapshot.findMany({
    where: { weekIndex: { lte: maxWeek } },
    orderBy: { weekIndex: "asc" },
  });
  const keyWeeksForFocus = new Set([5, 8, 12, maxWeek]);
  for (const s of snapshots) {
    if (opts.focusTeamId && s.teamId !== opts.focusTeamId) continue;
    const isFocus = s.teamId === focusTeam;
    const keep = isFocus ? keyWeeksForFocus.has(s.weekIndex) : s.weekIndex === maxWeek;
    if (!keep) continue;
    addNode({
      id: s.id,
      entityType: "TeamVitalSnapshot",
      label: `Week ${s.weekIndex} Vitals (${s.teamId.replace("t-", "")})`,
      subtitle: s.suppressed
        ? "Suppressed (n < 5)"
        : `Supported ${s.supportedScore} · Aligned ${s.alignedScore} · Energized ${s.energizedScore}`,
      source: "conn-pulse",
      timestamp: fmtDate(s.periodEnd),
      weekIndex: s.weekIndex,
      teamId: s.teamId,
      properties: {
        weekIndex: s.weekIndex,
        period: `${fmtDate(s.periodStart)} – ${fmtDate(s.periodEnd)}`,
        Supported: s.supportedScore,
        Energized: s.energizedScore,
        Aligned: s.alignedScore,
        Recognized: s.recognizedScore,
        Safe: s.safeScore,
        respondentCount: s.respondentCount,
        responseRate: `${Math.round(s.responseRate * 100)}%`,
        confidenceLevel: s.confidenceLevel,
        methodologyVersion: s.methodologyVersion,
      },
    });
    addEdge(s.teamId, s.id, "HAS_VITAL_SNAPSHOT", `Aggregated pulse (n=${s.respondentCount}, threshold≥5)`);
  }

  // OrganizationalEvents
  const events = await prisma.organizationalEvent.findMany({
    where: { weekIndex: { lte: maxWeek } },
    orderBy: { occurredAt: "asc" },
  });
  for (const ev of events) {
    if (opts.focusTeamId && ev.teamId !== opts.focusTeamId) continue;
    addNode({
      id: ev.id,
      entityType: "OrganizationalEvent",
      label: ev.title,
      subtitle: `${ev.eventType} · Wk ${ev.weekIndex}`,
      source: ev.connectorId || ev.source,
      timestamp: fmtDate(ev.occurredAt),
      weekIndex: ev.weekIndex,
      teamId: ev.teamId ?? undefined,
      properties: {
        eventType: ev.eventType,
        description: ev.description,
        occurredAt: fmtDate(ev.occurredAt),
        weekIndex: ev.weekIndex,
        source: ev.source,
      },
    });
    if (ev.projectId && nodeIds.has(ev.projectId)) {
      addEdge(ev.projectId, ev.id, "HAS_EVENT", `Connector ${ev.connectorId || ev.source}`);
    } else if (ev.teamId && nodeIds.has(ev.teamId)) {
      addEdge(ev.teamId, ev.id, "HAS_EVENT", `Connector ${ev.connectorId || ev.source}`);
    }
  }

  // WorkplaceObservations
  const observations = await prisma.workplaceObservation.findMany({
    where: { weekIndex: { lte: maxWeek }, deletedAt: null },
    orderBy: { observedAt: "asc" },
  });
  for (const ob of observations) {
    if (opts.focusTeamId && ob.teamId !== opts.focusTeamId) continue;
    addNode({
      id: ob.id,
      entityType: "WorkplaceObservation",
      label: ob.summary,
      subtitle: `${ob.observationType} · ${ob.source} · Wk ${ob.weekIndex}`,
      source: ob.connectorId,
      timestamp: fmtDate(ob.observedAt),
      weekIndex: ob.weekIndex,
      teamId: ob.teamId ?? undefined,
      properties: {
        observationType: ob.observationType,
        summary: ob.summary,
        source: ob.source,
        permissionScope: ob.permissionScope,
        purpose: ob.purpose,
        retentionPolicy: ob.retentionPolicy,
        confidence: ob.confidence,
      },
    });
    if (ob.projectId && nodeIds.has(ob.projectId)) {
      addEdge(ob.id, ob.projectId, "RELATES_TO_PROJECT", `Normalized from ${ob.connectorId}`);
    }
    if (ob.teamId && nodeIds.has(ob.teamId)) {
      addEdge(ob.id, ob.teamId, "RELATES_TO_TEAM", `Normalized from ${ob.connectorId}`);
    }
    if (ob.employeeId && nodeIds.has(ob.employeeId)) {
      addEdge(ob.id, ob.employeeId, "RELATES_TO_EMPLOYEE", "Voluntarily shared by employee");
    }
  }

  // Interventions, Executions, Outcomes
  const executions = await prisma.interventionExecution.findMany({
    include: { intervention: true, outcome: true },
  });
  for (const ex of executions) {
    if (opts.focusTeamId && ex.teamId !== opts.focusTeamId) continue;
    const iv = ex.intervention;
    addNode({
      id: iv.id,
      entityType: "Intervention",
      label: iv.name,
      subtitle: `Targets ${iv.targetVital} · ${iv.estimatedDuration}`,
      source: "Intervention Library",
      teamId: ex.teamId,
      properties: {
        targetVital: iv.targetVital,
        format: iv.format,
        estimatedDuration: iv.estimatedDuration,
        expectedOutcome: iv.expectedOutcome,
      },
    });
    addNode({
      id: ex.id,
      entityType: "InterventionExecution",
      label: `${iv.name} (${ex.status})`,
      subtitle: fmtDate(ex.completedAt || ex.approvedAt || ex.createdAt),
      source: "Employer Action System",
      timestamp: fmtDate(ex.completedAt || ex.approvedAt || ex.createdAt),
      teamId: ex.teamId,
      properties: {
        status: ex.status,
        approvedAt: fmtDate(ex.approvedAt),
        completedAt: fmtDate(ex.completedAt),
        followUpDate: fmtDate(ex.followUpDate),
        notes: ex.notes,
      },
    });
    addEdge(ex.teamId, ex.id, "RECEIVES", "Manager-approved action");
    addEdge(ex.id, iv.id, "USES", "Intervention template");

    if (ex.outcome && (maxWeek >= 14 || ex.teamId !== "t-outreach")) {
      const sc = parseJSON<Record<Vital, { before: number; after: number; delta: number }>>(
        ex.outcome.scoreChanges,
        {} as any,
      );
      const targetChange = sc[iv.targetVital as Vital];
      addNode({
        id: ex.outcome.id,
        entityType: "InterventionOutcome",
        label: `Outcome: ${iv.targetVital} ${targetChange?.before ?? "—"} → ${targetChange?.after ?? "—"}`,
        subtitle: `Confidence: ${ex.outcome.confidence} (correlational)`,
        source: "Follow-Up Pulse Comparison",
        timestamp: fmtDate(ex.outcome.measuredAt),
        teamId: ex.teamId,
        properties: {
          measuredAt: fmtDate(ex.outcome.measuredAt),
          confidence: ex.outcome.confidence,
          outcomeNotes: ex.outcome.outcomeNotes,
          scoreChanges: sc,
        },
      });
      addEdge(ex.id, ex.outcome.id, "PRODUCES", "Pre/post snapshot comparison");
      if (nodeIds.has(ex.outcome.beforeSnapshotId)) {
        addEdge(ex.outcome.id, ex.outcome.beforeSnapshotId, "MEASURED_BY", "Pre-intervention snapshot");
      }
      if (nodeIds.has(ex.outcome.afterSnapshotId)) {
        addEdge(ex.outcome.id, ex.outcome.afterSnapshotId, "MEASURED_BY", "Follow-up snapshot");
      }
    }
  }

  return { nodes, edges };
}

