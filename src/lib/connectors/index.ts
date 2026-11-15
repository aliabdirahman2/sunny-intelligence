// Mock connectors + normalization layer.
// Connectors emit SYNTHETIC raw payloads shaped like the source system. The normalizer maps
// them into canonical ontology records (WorkplaceObservation / OrganizationalEvent).
// No OAuth, no real accounts, no message content: only aggregate metadata.

export type ConnectorKind = "slack" | "teams" | "project_mgmt" | "hris" | "pulse";

export interface ConnectorDefinition {
  id: string;
  kind: ConnectorKind;
  name: string;
  description: string;
  scopes: string[];
  excluded: string[];
}

export const CONNECTORS: ConnectorDefinition[] = [
  {
    id: "conn-slack",
    kind: "slack",
    name: "Slack (simulated)",
    description: "Delivers daily check-in prompts and provides team-level channel metadata.",
    scopes: ["Check-in prompt responses (employee-submitted)", "Team-level count of coordination channels", "Voluntary support requests"],
    excluded: ["Message content", "Direct messages", "Individual message volume", "Reactions / presence / online status"],
  },
  {
    id: "conn-teams",
    kind: "teams",
    name: "Microsoft Teams (simulated)",
    description: "Provides team-level meeting cadence metadata from shared team calendars.",
    scopes: ["Team-level recurring meeting count", "Average team meeting hours per week"],
    excluded: ["Meeting content or transcripts", "Individual calendars", "Attendance per person", "Chat content"],
  },
  {
    id: "conn-pm",
    kind: "project_mgmt",
    name: "Project Management (simulated)",
    description: "Provides project lifecycle events, responsibilities, deadlines, and team-level task counts.",
    scopes: ["Project created / updated", "Due-date changes", "Responsibilities added", "Team-level open task counts"],
    excluded: ["Per-person task completion speed", "Individual productivity metrics"],
  },
  {
    id: "conn-hris",
    kind: "hris",
    name: "HRIS / Directory (simulated)",
    description: "Provides the employee directory, reporting lines, and team structure changes.",
    scopes: ["Name, role, team, manager, start date", "Reporting-line changes", "Team reorganizations"],
    excluded: ["Compensation", "Performance ratings", "Health or leave reasons", "Demographics"],
  },
  {
    id: "conn-pulse",
    kind: "pulse",
    name: "Sunny-style Pulse Checks (simulated)",
    description: "Weekly pulse responses (private) aggregated to Team Vitals; optional 'what would help' tags aggregated at team level.",
    scopes: ["Weekly 15-item pulse (synthetic items)", "Optional 'what would help most' tag selections (aggregate only, n ≥ 5)"],
    excluded: ["Individual responses in any manager or HR view", "Free-text sentiment scoring"],
  },
];

export interface RawEvent {
  connectorId: string;
  type: string;
  at: Date;
  payload: Record<string, unknown>;
}

export interface CanonicalObservation {
  kind: "observation";
  connectorId: string;
  source: ConnectorKind;
  observationType: string;
  observedAt: Date;
  teamId?: string;
  projectId?: string;
  employeeId?: string;
  summary: string;
  metadata: Record<string, unknown>;
  permissionScope: "TEAM_AGGREGATE" | "PROJECT" | "ORG_AGGREGATE" | "SELF_REPORTED_SHARED";
  purpose: string;
  retentionPolicy: string;
  confidence: number;
  notable: boolean;
}

export interface CanonicalEvent {
  kind: "event";
  connectorId: string;
  source: ConnectorKind;
  eventType: string;
  title: string;
  description: string;
  occurredAt: Date;
  relatedEntityType: string;
  relatedEntityId: string;
  teamId?: string;
  projectId?: string;
  metadata: Record<string, unknown>;
}

export type CanonicalRecord = CanonicalObservation | CanonicalEvent;

const RET_ROUTINE = "Delete after 13 months (rolling)";
const RET_NOTABLE = "Retain 24 months; correctable and deletable on request";
const kindOf = (connectorId: string): ConnectorKind => CONNECTORS.find((c) => c.id === connectorId)!.kind;

/** Normalization layer: raw connector payload → canonical ontology records. */
export function normalize(raw: RawEvent): CanonicalRecord[] {
  const p = raw.payload as Record<string, any>;
  const source = kindOf(raw.connectorId);
  const base = { connectorId: raw.connectorId, source };
  const meta = { raw: { type: raw.type, ...p } };
  switch (raw.type) {
    case "project.created":
      return [
        {
          ...base,
          kind: "event",
          eventType: "ProjectStarted",
          title: `Project started: ${p.projectName}`,
          description: p.description,
          occurredAt: raw.at,
          relatedEntityType: "Project",
          relatedEntityId: p.projectId,
          teamId: p.teamId,
          projectId: p.projectId,
          metadata: meta,
        },
      ];
    case "responsibility.added": {
      const n = (p.titles as string[]).length;
      return [
        {
          ...base,
          kind: "event",
          eventType: "ResponsibilitiesAdded",
          title: `${n} responsibilities added to ${p.projectName}`,
          description: `Added: ${(p.titles as string[]).join(", ")}. ${p.unowned ? `${p.unowned} without a single named owner.` : ""}`.trim(),
          occurredAt: raw.at,
          relatedEntityType: "Project",
          relatedEntityId: p.projectId,
          teamId: p.teamId,
          projectId: p.projectId,
          metadata: meta,
        },
        {
          ...base,
          kind: "observation",
          observationType: "RESPONSIBILITIES_ADDED",
          observedAt: raw.at,
          teamId: p.teamId,
          projectId: p.projectId,
          summary: `${n} new project responsibilities (${p.unowned ?? 0} shared or unassigned)`,
          metadata: { ...meta, added: n, sharedOrUnassigned: p.unowned ?? 0, notable: true },
          permissionScope: "PROJECT",
          purpose: "Understand changes in project scope that affect team workload and clarity",
          retentionPolicy: RET_NOTABLE,
          confidence: 0.95,
          notable: true,
        },
      ];
    }
    case "project.due_date_changed":
      return [
        {
          ...base,
          kind: "event",
          eventType: "DeadlineChanged",
          title: `Deadline moved forward: ${p.projectName}`,
          description: `Due date changed from ${p.from} to ${p.to} (${p.daysEarlier} days earlier).`,
          occurredAt: raw.at,
          relatedEntityType: "Project",
          relatedEntityId: p.projectId,
          teamId: p.teamId,
          projectId: p.projectId,
          metadata: meta,
        },
        {
          ...base,
          kind: "observation",
          observationType: "DEADLINE_CHANGED",
          observedAt: raw.at,
          teamId: p.teamId,
          projectId: p.projectId,
          summary: `Project deadline moved ${p.daysEarlier} days earlier`,
          metadata: { ...meta, daysEarlier: p.daysEarlier, notable: true },
          permissionScope: "PROJECT",
          purpose: "Understand timeline pressure on the team",
          retentionPolicy: RET_NOTABLE,
          confidence: 0.98,
          notable: true,
        },
      ];
    case "project.tasks_summary": {
      const notable = Boolean(p.changePct && p.changePct >= 30);
      return [
        {
          ...base,
          kind: "observation",
          observationType: notable ? "TASKS_ASSIGNED_INCREASED" : "PROJECT_ACTIVITY",
          observedAt: raw.at,
          teamId: p.teamId,
          projectId: p.projectId,
          summary: notable
            ? `Team-level open tasks increased ${p.changePct}% (${p.previous} → ${p.openTasks})`
            : `Team-level open tasks: ${p.openTasks}`,
          metadata: { ...meta, openTasks: p.openTasks, previous: p.previous, changePct: p.changePct, notable },
          permissionScope: "TEAM_AGGREGATE",
          purpose: "Track team-level workload context (never individual productivity)",
          retentionPolicy: RET_ROUTINE,
          confidence: 0.9,
          notable,
        },
      ];
    }
    case "calendar.team_meeting_summary": {
      const notable = Boolean(p.previousMeetings && p.meetingsPerWeek - p.previousMeetings >= 3);
      return [
        {
          ...base,
          kind: "observation",
          observationType: notable ? "MEETING_FREQUENCY_INCREASED" : "MEETING_LOAD",
          observedAt: raw.at,
          teamId: p.teamId,
          summary: notable
            ? `Team meetings increased from ${p.previousMeetings} to ${p.meetingsPerWeek} per week`
            : `Team meetings: ${p.meetingsPerWeek} per week (${p.avgHours}h avg)`,
          metadata: { ...meta, meetingsPerWeek: p.meetingsPerWeek, avgHours: p.avgHours, notable },
          permissionScope: "TEAM_AGGREGATE",
          purpose: "Understand coordination demands at team level",
          retentionPolicy: RET_ROUTINE,
          confidence: 0.85,
          notable,
        },
      ];
    }
    case "channel.coordination_summary":
      return [
        {
          ...base,
          kind: "observation",
          observationType: "COORDINATION_INCREASED",
          observedAt: raw.at,
          teamId: p.teamId,
          projectId: p.projectId,
          summary: `${p.newChannels} new cross-team coordination channels created for the project`,
          metadata: { ...meta, newChannels: p.newChannels, notable: true, note: "Channel counts only — no message content or volume" },
          permissionScope: "TEAM_AGGREGATE",
          purpose: "Understand coordination demands at team level",
          retentionPolicy: RET_NOTABLE,
          confidence: 0.8,
          notable: true,
        },
      ];
    case "pulse.aggregate_tags":
      return [
        {
          ...base,
          kind: "observation",
          observationType: p.theme,
          observedAt: raw.at,
          teamId: p.teamId,
          summary: `${p.count} of ${p.respondents} pulse respondents selected “${p.tag}” as what would help most`,
          metadata: { ...meta, count: p.count, respondents: p.respondents, tag: p.tag, notable: true, aggregationThreshold: 5 },
          permissionScope: "TEAM_AGGREGATE",
          purpose: "Understand what kinds of support the team says would help (aggregate only)",
          retentionPolicy: RET_NOTABLE,
          confidence: 0.85,
          notable: true,
        },
      ];
    case "prompt.support_request":
      return [
        {
          ...base,
          kind: "observation",
          observationType: "SUPPORT_REQUESTED",
          observedAt: raw.at,
          teamId: p.teamId,
          employeeId: p.employeeId,
          summary: "An employee voluntarily requested support via the check-in prompt and chose to share it with their manager",
          metadata: { ...meta, notable: true, sharedByEmployee: true },
          permissionScope: "SELF_REPORTED_SHARED",
          purpose: "Route a voluntary support request to the person the employee chose",
          retentionPolicy: RET_NOTABLE,
          confidence: 1,
          notable: true,
        },
      ];
    case "hris.manager_changed":
      return [
        {
          ...base,
          kind: "event",
          eventType: "ManagerChanged",
          title: `Manager changed: ${p.teamName}`,
          description: `${p.newManager} became manager of ${p.teamName}.`,
          occurredAt: raw.at,
          relatedEntityType: "Team",
          relatedEntityId: p.teamId,
          teamId: p.teamId,
          metadata: meta,
        },
      ];
    case "hris.team_reorganized":
      return [
        {
          ...base,
          kind: "event",
          eventType: "TeamReorganized",
          title: `Team reorganized: ${p.teamName}`,
          description: p.description,
          occurredAt: raw.at,
          relatedEntityType: "Team",
          relatedEntityId: p.teamId,
          teamId: p.teamId,
          metadata: meta,
        },
      ];
    default:
      return [];
  }
}

