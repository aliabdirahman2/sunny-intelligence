// Northstar Community Services — synthetic scenario definition.
// Every number shown anywhere in the app is derived from data generated from this file.
// ALL CONTENT IS SYNTHETIC AND FICTIONAL.

import type { Vital } from "../domain";

export const ORG = {
  id: "org-northstar",
  name: "Northstar Community Services",
  industry: "Nonprofit · Community & Social Services",
};

export interface TeamSpec {
  id: string;
  name: string;
  department: string;
  description: string;
  size: number;
  responseRate: number;
  managerName: string;
  managerRole: string;
  /** Keyframes [week, value] per vital, linearly interpolated over weeks 1..14 */
  trajectory: Record<Vital, [number, number][]>;
  /** Alternative keyframes used for follow-up weeks if the recommended intervention was completed */
  followUpIfIntervention?: Partial<Record<Vital, [number, number][]>>;
  noise: number;
}

const flat = (v: number): [number, number][] => [[1, v], [14, v]];

export const MAIN_TEAM_ID = "t-outreach";
export const MAIN_PROJECT_ID = "p-food-access";

export const TEAMS: TeamSpec[] = [
  {
    id: MAIN_TEAM_ID,
    name: "Community Outreach Team",
    department: "Programs",
    description: "Connects residents with food, housing, and benefits resources through neighborhood outreach.",
    size: 11,
    responseRate: 0.88,
    managerName: "Dana Whitfield",
    managerRole: "Community Outreach Manager",
    noise: 0,
    trajectory: {
      Supported: [[1, 78], [5, 78], [6, 76], [7, 72], [8, 67], [9, 62], [10, 58], [11, 56], [12, 54], [13, 54], [14, 55]],
      Energized: [[1, 71], [5, 71], [6, 71], [7, 70], [8, 68], [9, 66], [10, 65], [11, 64], [12, 64], [13, 63], [14, 63]],
      Aligned: [[1, 82], [5, 82], [6, 80], [7, 77], [8, 73], [9, 70], [10, 68], [11, 67], [12, 67], [13, 66], [14, 67]],
      Recognized: [[1, 74], [5, 74], [6, 74], [7, 73], [8, 73], [9, 72], [12, 72], [14, 72]],
      Safe: [[1, 86], [5, 86], [6, 86], [7, 85], [8, 85], [9, 84], [10, 83], [12, 83], [14, 83]],
    },
    followUpIfIntervention: {
      Supported: [[12, 54], [13, 62], [14, 68]],
      Aligned: [[12, 67], [13, 72], [14, 76]],
      Energized: [[12, 64], [13, 65], [14, 66]],
      Recognized: [[12, 72], [13, 73], [14, 74]],
      Safe: [[12, 83], [13, 84], [14, 84]],
    },
  },
  {
    id: "t-program",
    name: "Program Delivery",
    department: "Programs",
    description: "Runs case management and direct-service programs for families.",
    size: 10,
    responseRate: 0.86,
    managerName: "Marcus Oyelaran",
    managerRole: "Program Delivery Manager",
    noise: 1.2,
    trajectory: {
      Supported: flat(72),
      Energized: [[1, 64], [5, 62], [6, 66], [7, 69], [14, 70]],
      Aligned: flat(74),
      Recognized: flat(70),
      Safe: flat(78),
    },
  },
  {
    id: "t-youth",
    name: "Youth Services",
    department: "Programs",
    description: "Delivers after-school mentoring and youth leadership programs.",
    size: 10,
    responseRate: 0.85,
    managerName: "Elena Vasquez",
    managerRole: "Youth Services Manager",
    noise: 1.2,
    trajectory: {
      Supported: flat(75),
      Energized: flat(74),
      Aligned: flat(76),
      Recognized: [[1, 62], [3, 61], [4, 66], [5, 70], [14, 71]],
      Safe: flat(80),
    },
  },
  {
    id: "t-volunteer",
    name: "Volunteer Coordination",
    department: "Community Engagement",
    description: "Recruits, onboards, and supports Northstar's volunteer network.",
    size: 9,
    responseRate: 0.86,
    managerName: "Samuel Achebe",
    managerRole: "Volunteer Coordination Manager",
    noise: 1.2,
    trajectory: {
      Supported: flat(74),
      Energized: flat(72),
      Aligned: [[1, 67], [4, 66], [5, 71], [6, 75], [14, 76]],
      Recognized: flat(73),
      Safe: flat(81),
    },
  },
  {
    id: "t-development",
    name: "Development & Fundraising",
    department: "Development",
    description: "Leads donor relations, campaigns, and institutional giving.",
    size: 9,
    responseRate: 0.84,
    managerName: "Hannah Lindqvist",
    managerRole: "Director of Development",
    noise: 1.2,
    trajectory: {
      Supported: flat(70),
      Energized: [[1, 66], [7, 66], [8, 64], [9, 63], [10, 64], [11, 64], [14, 65]],
      Aligned: flat(72),
      Recognized: flat(68),
      Safe: flat(77),
    },
  },
  {
    id: "t-operations",
    name: "People & Operations",
    department: "Operations",
    description: "HR, facilities, IT, and organization-wide operations.",
    size: 8,
    responseRate: 0.9,
    managerName: "Tomás Herrera",
    managerRole: "Operations Manager",
    noise: 1.2,
    trajectory: {
      Supported: flat(76),
      Energized: flat(70),
      Aligned: [[1, 75], [3, 75], [4, 70], [6, 72], [14, 74]],
      Recognized: flat(72),
      Safe: flat(82),
    },
  },
  {
    id: "t-comms",
    name: "Communications",
    department: "Community Engagement",
    description: "Storytelling, media relations, and digital channels.",
    size: 9,
    responseRate: 0.85,
    managerName: "Aisha Rahman",
    managerRole: "Communications Manager",
    noise: 1.2,
    trajectory: {
      Supported: flat(73),
      Energized: flat(71),
      Aligned: flat(75),
      Recognized: flat(72),
      Safe: [[1, 77], [5, 76], [6, 71], [7, 70], [8, 71], [9, 76], [14, 77]],
    },
  },
  {
    id: "t-finance",
    name: "Finance & Grants",
    department: "Finance",
    description: "Budgeting, grant compliance, and financial reporting.",
    size: 6,
    responseRate: 0.78,
    managerName: "Robert Kim",
    managerRole: "Finance Director",
    noise: 1.2,
    trajectory: {
      Supported: flat(71),
      Energized: flat(68),
      Aligned: flat(79),
      Recognized: flat(66),
      Safe: flat(80),
    },
  },
];

// Named personas used by the role switcher.
export const PERSONAS = {
  manager: { id: "e-dana-whitfield", name: "Dana Whitfield" },
  employee: { id: "e-jordan-ellis", name: "Jordan Ellis" },
  hr: { id: "e-priya-raman", name: "Priya Raman" },
};

export interface ProjectSpec {
  id: string;
  name: string;
  description: string;
  teamId: string;
  startWeek: number;
  endDate: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  responsibilities: { title: string; week: number; ownership: "ASSIGNED" | "SHARED" | "UNASSIGNED" }[];
}

export const PROJECTS: ProjectSpec[] = [
  {
    id: MAIN_PROJECT_ID,
    name: "Neighborhood Food Access Outreach",
    description: "Door-to-door and partner-pantry outreach to connect 1,200 households with food assistance before winter.",
    teamId: MAIN_TEAM_ID,
    startWeek: 6,
    endDate: "2026-11-20",
    priority: "HIGH",
    responsibilities: [
      { title: "Outreach route planning", week: 6, ownership: "ASSIGNED" },
      { title: "Partner pantry coordination", week: 6, ownership: "ASSIGNED" },
      { title: "Volunteer shift scheduling", week: 6, ownership: "ASSIGNED" },
      { title: "Door-to-door survey logistics", week: 7, ownership: "SHARED" },
      { title: "Translation coordination", week: 7, ownership: "UNASSIGNED" },
      { title: "Intake form data entry", week: 7, ownership: "SHARED" },
      { title: "Weekly partner reporting", week: 7, ownership: "UNASSIGNED" },
      { title: "Mobile pantry pilot", week: 8, ownership: "SHARED" },
      { title: "City council briefing preparation", week: 8, ownership: "UNASSIGNED" },
      { title: "Media outreach support", week: 8, ownership: "SHARED" },
    ],
  },
  {
    id: "p-resource-fair",
    name: "Fall Resource Fair",
    description: "Annual community resource fair with 40 partner organizations.",
    teamId: MAIN_TEAM_ID,
    startWeek: 1,
    endDate: "2026-12-12",
    priority: "MEDIUM",
    responsibilities: [
      { title: "Partner booth logistics", week: 1, ownership: "ASSIGNED" },
      { title: "Venue coordination", week: 1, ownership: "ASSIGNED" },
    ],
  },
  {
    id: "p-case-mgmt",
    name: "Case Management Modernization",
    description: "Streamline intake and case notes for family services.",
    teamId: "t-program",
    startWeek: 1,
    endDate: "2027-03-31",
    priority: "HIGH",
    responsibilities: [
      { title: "Intake workflow redesign", week: 1, ownership: "ASSIGNED" },
      { title: "Caseload rebalancing", week: 5, ownership: "ASSIGNED" },
    ],
  },
  {
    id: "p-afterschool",
    name: "After-School Mentoring Expansion",
    description: "Expand mentoring to two additional schools.",
    teamId: "t-youth",
    startWeek: 1,
    endDate: "2027-06-15",
    priority: "MEDIUM",
    responsibilities: [
      { title: "School partnership agreements", week: 1, ownership: "ASSIGNED" },
      { title: "Mentor training schedule", week: 2, ownership: "ASSIGNED" },
    ],
  },
  {
    id: "p-volunteer-portal",
    name: "Volunteer Onboarding Redesign",
    description: "Simplify volunteer onboarding and orientation.",
    teamId: "t-volunteer",
    startWeek: 2,
    endDate: "2027-01-31",
    priority: "MEDIUM",
    responsibilities: [
      { title: "Orientation content refresh", week: 2, ownership: "ASSIGNED" },
      { title: "Background-check workflow", week: 3, ownership: "SHARED" },
    ],
  },
  {
    id: "p-year-end",
    name: "Year-End Giving Campaign",
    description: "December individual-giving campaign.",
    teamId: "t-development",
    startWeek: 8,
    endDate: "2026-12-31",
    priority: "HIGH",
    responsibilities: [
      { title: "Donor segmentation", week: 8, ownership: "ASSIGNED" },
      { title: "Campaign event planning", week: 9, ownership: "ASSIGNED" },
    ],
  },
  {
    id: "p-hris",
    name: "HRIS Migration",
    description: "Migrate employee directory and benefits administration to a new HRIS.",
    teamId: "t-operations",
    startWeek: 2,
    endDate: "2027-02-28",
    priority: "MEDIUM",
    responsibilities: [
      { title: "Data mapping", week: 2, ownership: "ASSIGNED" },
      { title: "Benefits enrollment testing", week: 6, ownership: "ASSIGNED" },
    ],
  },
  {
    id: "p-office",
    name: "Office Accessibility Upgrade",
    description: "Improve physical accessibility of the main community office.",
    teamId: "t-operations",
    startWeek: 4,
    endDate: "2027-01-15",
    priority: "LOW",
    responsibilities: [{ title: "Contractor coordination", week: 4, ownership: "ASSIGNED" }],
  },
  {
    id: "p-annual-report",
    name: "Annual Impact Report",
    description: "Produce the annual community impact report.",
    teamId: "t-comms",
    startWeek: 3,
    endDate: "2027-01-30",
    priority: "MEDIUM",
    responsibilities: [
      { title: "Impact data collection", week: 3, ownership: "ASSIGNED" },
      { title: "Design and layout", week: 6, ownership: "ASSIGNED" },
    ],
  },
  {
    id: "p-storytelling",
    name: "Community Storytelling Series",
    description: "Monthly resident story features across channels.",
    teamId: "t-comms",
    startWeek: 1,
    endDate: null,
    priority: "LOW",
    responsibilities: [{ title: "Interview scheduling", week: 1, ownership: "ASSIGNED" }],
  },
  {
    id: "p-grant-renewal",
    name: "State Grant Renewal",
    description: "Renewal application for the state family-services grant.",
    teamId: "t-finance",
    startWeek: 5,
    endDate: "2026-12-15",
    priority: "HIGH",
    responsibilities: [
      { title: "Budget narrative", week: 5, ownership: "ASSIGNED" },
      { title: "Outcome reporting", week: 6, ownership: "ASSIGNED" },
    ],
  },
  {
    id: "p-audit",
    name: "FY26 Audit Preparation",
    description: "Prepare documentation for the annual financial audit.",
    teamId: "t-finance",
    startWeek: 9,
    endDate: "2027-02-15",
    priority: "MEDIUM",
    responsibilities: [{ title: "Reconciliation schedules", week: 9, ownership: "ASSIGNED" }],
  },
];

// ---- Synthetic demonstration survey items (NOT Sunny assessment items) -------
export const ASSESSMENT_ITEMS: { id: string; vital: Vital; text: string }[] = [
  { id: "item-sup-1", vital: "Supported", text: "I have the resources I need to do my work." },
  { id: "item-sup-2", vital: "Supported", text: "I can get help when I encounter difficulties." },
  { id: "item-sup-3", vital: "Supported", text: "I feel supported by the people I work with." },
  { id: "item-ene-1", vital: "Energized", text: "I feel motivated by the work I am doing." },
  { id: "item-ene-2", vital: "Energized", text: "My work gives me a sense of positive energy." },
  { id: "item-ene-3", vital: "Energized", text: "I can sustain my current work demands." },
  { id: "item-ali-1", vital: "Aligned", text: "I understand the priorities of my team." },
  { id: "item-ali-2", vital: "Aligned", text: "I understand how my work contributes to our shared goals." },
  { id: "item-ali-3", vital: "Aligned", text: "Expectations and responsibilities are clear." },
  { id: "item-rec-1", vital: "Recognized", text: "My contributions are appreciated." },
  { id: "item-rec-2", vital: "Recognized", text: "People notice the effort I put into my work." },
  { id: "item-rec-3", vital: "Recognized", text: "I receive useful acknowledgment when I do good work." },
  { id: "item-saf-1", vital: "Safe", text: "I can express a different opinion without fear of negative consequences." },
  { id: "item-saf-2", vital: "Safe", text: "I feel comfortable asking questions." },
  { id: "item-saf-3", vital: "Safe", text: "I can raise concerns openly." },
];

// ---- Generic working preferences (NOT Sunny Social Battery categories) -------
export const PREFERENCE_POOL = {
  working: [
    "Prefers independent focus time",
    "Prefers clear ownership and expectations",
    "Prefers time to reflect before decisions",
    "Prefers a predictable weekly rhythm",
    "Prefers variety across tasks",
  ],
  collaboration: [
    "Prefers collaborative brainstorming",
    "Prefers small-group working sessions",
    "Prefers asynchronous collaboration",
    "Prefers pairing on complex problems",
  ],
  communication: [
    "Prefers written preparation before meetings",
    "Prefers direct and specific feedback",
    "Prefers concrete examples and clear next steps",
    "Prefers check-ins in a one-to-one setting",
  ],
};

// ---- Intervention library (generic prototype interventions) ------------------
export interface InterventionSpec {
  id: string;
  slug: string;
  name: string;
  description: string;
  targetVital: Vital;
  secondaryVitals: Vital[];
  recommendedAudience: string;
  estimatedDuration: string;
  format: "ACTIVITY" | "WORKSHOP" | "GUIDE";
  instructions: string[];
  expectedOutcome: string;
  followUpMeasurement: string;
  triggerSignals: string[];
}

export const INTERVENTIONS: InterventionSpec[] = [
  {
    id: "i-clarify",
    slug: "clarify-responsibilities",
    name: "Clarify Responsibilities",
    description: "A 30-minute responsibilities-and-alignment workshop in which the team maps current work, agrees owners, and reviews workload distribution.",
    targetVital: "Aligned",
    secondaryVitals: ["Supported"],
    recommendedAudience: "Whole team, facilitated by the manager",
    estimatedDuration: "30 minutes",
    format: "WORKSHOP",
    instructions: [
      "Share the current project list and recent changes (new responsibilities, deadline moves) in writing 24 hours ahead.",
      "Open by naming the purpose: making ownership and priorities clearer — not evaluating anyone.",
      "List every active responsibility on a shared board; mark each as owned, shared, or unowned.",
      "Agree a single owner (and a backup) for each unowned or ambiguous item.",
      "Review workload distribution together; identify anything to pause, defer, or get help with.",
      "Agree the top three team priorities for the next two weeks.",
      "Close by confirming how people can ask for help, and send a written summary afterwards.",
    ],
    expectedOutcome: "Clearer ownership and shared priorities; reduced ambiguity about who is responsible for what.",
    followUpMeasurement: "Team pulse two weeks later — Aligned and Supported vitals compared with the pre-intervention snapshot.",
    triggerSignals: ["RESPONSIBILITIES_ADDED", "PULSE_THEME_CLARITY", "DEADLINE_CHANGED", "COORDINATION_INCREASED"],
  },
  {
    id: "i-workload",
    slug: "team-workload-reset",
    name: "Team Workload Reset",
    description: "A structured review of commitments to rebalance or defer work when demands outpace capacity.",
    targetVital: "Supported",
    secondaryVitals: ["Energized"],
    recommendedAudience: "Whole team",
    estimatedDuration: "30 minutes",
    format: "WORKSHOP",
    instructions: [
      "Collect the team's current commitments at the team level (no individual productivity metrics).",
      "Identify work that can be paused, deferred, or delegated.",
      "Agree on what 'enough' looks like for the next sprint.",
      "Escalate resourcing needs to leadership where appropriate.",
    ],
    expectedOutcome: "More sustainable workload and clearer access to help.",
    followUpMeasurement: "Supported and Energized vitals two weeks later.",
    triggerSignals: ["TASKS_ASSIGNED_INCREASED", "MEETING_FREQUENCY_INCREASED", "PULSE_THEME_WORKLOAD"],
  },
  {
    id: "i-recognition",
    slug: "recognition-round",
    name: "Recognition Round",
    description: "A 10-minute round in which teammates acknowledge specific contributions from the past weeks.",
    targetVital: "Recognized",
    secondaryVitals: ["Energized"],
    recommendedAudience: "Whole team",
    estimatedDuration: "10 minutes",
    format: "ACTIVITY",
    instructions: [
      "Invite each person to name one specific contribution by a colleague and its impact.",
      "Model specificity: what they did, and why it mattered.",
      "Keep it voluntary; never put anyone on the spot.",
    ],
    expectedOutcome: "Contributions are more visible and acknowledged.",
    followUpMeasurement: "Recognized vital two weeks later.",
    triggerSignals: ["PULSE_THEME_RECOGNITION", "MILESTONE_COMPLETED"],
  },
  {
    id: "i-connection",
    slug: "team-connection-exercise",
    name: "Team Connection Exercise",
    description: "A short, low-pressure activity that helps teammates connect beyond tasks.",
    targetVital: "Energized",
    secondaryVitals: ["Safe"],
    recommendedAudience: "Whole team",
    estimatedDuration: "10 minutes",
    format: "ACTIVITY",
    instructions: [
      "Open a meeting with a light prompt (e.g., 'something that gave you energy this week').",
      "Offer pass options; participation is always voluntary.",
    ],
    expectedOutcome: "Stronger sense of connection and shared energy.",
    followUpMeasurement: "Energized vital two weeks later.",
    triggerSignals: ["TEAM_REORGANIZED", "PULSE_THEME_CONNECTION"],
  },
  {
    id: "i-expectations",
    slug: "expectations-alignment",
    name: "Expectations Alignment",
    description: "A 10-minute check that everyone shares the same understanding of 'done' for current priorities.",
    targetVital: "Aligned",
    secondaryVitals: [],
    recommendedAudience: "Whole team",
    estimatedDuration: "10 minutes",
    format: "ACTIVITY",
    instructions: [
      "Pick one current priority and ask everyone to write what 'done' means.",
      "Compare answers and agree a shared definition.",
    ],
    expectedOutcome: "Shared definition of success for current work.",
    followUpMeasurement: "Aligned vital two weeks later.",
    triggerSignals: ["PULSE_THEME_CLARITY"],
  },
  {
    id: "i-safety",
    slug: "psychological-safety-discussion",
    name: "Psychological Safety Discussion",
    description: "A 40-minute facilitated workshop on how the team raises concerns and handles disagreement.",
    targetVital: "Safe",
    secondaryVitals: ["Supported"],
    recommendedAudience: "Whole team, optionally with a neutral facilitator",
    estimatedDuration: "40 minutes",
    format: "WORKSHOP",
    instructions: [
      "Set norms for the conversation; share that there are no wrong answers.",
      "Discuss anonymously-collected prompts about raising concerns.",
      "Agree one or two concrete team practices.",
    ],
    expectedOutcome: "Agreed norms for raising concerns and disagreeing constructively.",
    followUpMeasurement: "Safe vital two weeks later.",
    triggerSignals: ["MANAGER_CHANGED", "PULSE_THEME_SAFETY"],
  },
  {
    id: "i-checkin-guide",
    slug: "manager-check-in-guide",
    name: "Manager Check-In Guide",
    description: "A guide for supportive one-to-one conversations that respects each person's voluntarily shared preferences.",
    targetVital: "Supported",
    secondaryVitals: ["Recognized"],
    recommendedAudience: "Manager, in 1:1s",
    estimatedDuration: "15 minutes per conversation",
    format: "GUIDE",
    instructions: [
      "Ask open questions about what support would help; avoid diagnosing.",
      "Where an employee has shared communication preferences, adapt your approach.",
      "Agree one concrete follow-up.",
    ],
    expectedOutcome: "Employees know how to access support from their manager.",
    followUpMeasurement: "Supported vital two weeks later.",
    triggerSignals: ["SUPPORT_REQUESTED", "PULSE_THEME_SUPPORT"],
  },
  {
    id: "i-listening",
    slug: "team-listening-session",
    name: "Team Listening Session",
    description: "A 40-minute session where the manager mainly listens to what is helping and what is getting in the way.",
    targetVital: "Safe",
    secondaryVitals: ["Supported"],
    recommendedAudience: "Whole team",
    estimatedDuration: "40 minutes",
    format: "WORKSHOP",
    instructions: [
      "Ask: what is helping, what is getting in the way, what should we try?",
      "Summarize back what you heard without defending.",
      "Commit to one change and report back.",
    ],
    expectedOutcome: "Team concerns heard and acted on.",
    followUpMeasurement: "Safe and Supported vitals two weeks later.",
    triggerSignals: ["PULSE_THEME_SUPPORT", "MANAGER_CHANGED"],
  },
  {
    id: "i-problem-solving",
    slug: "collaborative-problem-solving",
    name: "Collaborative Problem-Solving",
    description: "A 30-minute session to tackle one shared obstacle together.",
    targetVital: "Energized",
    secondaryVitals: ["Supported"],
    recommendedAudience: "Whole team",
    estimatedDuration: "30 minutes",
    format: "WORKSHOP",
    instructions: [
      "Pick one obstacle the team experiences in common.",
      "Brainstorm options; vote on one to try for two weeks.",
    ],
    expectedOutcome: "A shared obstacle reduced through collective action.",
    followUpMeasurement: "Energized and Supported vitals two weeks later.",
    triggerSignals: ["COORDINATION_INCREASED", "TASKS_ASSIGNED_INCREASED"],
  },
  {
    id: "i-priority-review",
    slug: "project-priority-review",
    name: "Project Priority Review",
    description: "A 20-minute review of project priorities after scope or deadline changes.",
    targetVital: "Aligned",
    secondaryVitals: ["Energized"],
    recommendedAudience: "Team and project sponsor",
    estimatedDuration: "20 minutes",
    format: "ACTIVITY",
    instructions: [
      "Review what changed in scope and timeline.",
      "Re-rank priorities and explicitly name what will not be done.",
    ],
    expectedOutcome: "Priorities re-agreed after changes.",
    followUpMeasurement: "Aligned vital two weeks later.",
    triggerSignals: ["DEADLINE_CHANGED"],
  },
];

// ---- Past intervention executions (history) ---------------------------------
export const PAST_EXECUTIONS: {
  id: string;
  interventionId: string;
  teamId: string;
  completedWeek: number;
  beforeWeek: number;
  afterWeek: number;
  notes: string;
  feedback: { participants: number; helpfulPct: number; themes: string[] };
}[] = [
  {
    id: "x-youth-recognition",
    interventionId: "i-recognition",
    teamId: "t-youth",
    completedWeek: 3,
    beforeWeek: 3,
    afterWeek: 5,
    notes: "Ran during the weekly team meeting; 8 people shared.",
    feedback: { participants: 9, helpfulPct: 78, themes: ["More visibility of mentoring work", "Would like to repeat monthly"] },
  },
  {
    id: "x-volunteer-clarify",
    interventionId: "i-clarify",
    teamId: "t-volunteer",
    completedWeek: 4,
    beforeWeek: 4,
    afterWeek: 6,
    notes: "Mapped onboarding responsibilities after the portal redesign kicked off.",
    feedback: { participants: 8, helpfulPct: 75, themes: ["Clearer owners for background checks", "Shared priority list helped"] },
  },
  {
    id: "x-program-workload",
    interventionId: "i-workload",
    teamId: "t-program",
    completedWeek: 5,
    beforeWeek: 5,
    afterWeek: 7,
    notes: "Deferred two low-priority reports; rebalanced caseloads at team level.",
    feedback: { participants: 9, helpfulPct: 67, themes: ["Deferring reports helped", "Still busy but more manageable"] },
  },
  {
    id: "x-comms-safety",
    interventionId: "i-safety",
    teamId: "t-comms",
    completedWeek: 7,
    beforeWeek: 7,
    afterWeek: 9,
    notes: "Held after the manager transition; agreed a 'concerns first' agenda item.",
    feedback: { participants: 8, helpfulPct: 71, themes: ["New manager's openness appreciated", "Agenda practice is useful"] },
  },
  {
    id: "x-dev-connection",
    interventionId: "i-connection",
    teamId: "t-development",
    completedWeek: 9,
    beforeWeek: 9,
    afterWeek: 11,
    notes: "Short opener during campaign kickoff.",
    feedback: { participants: 7, helpfulPct: 50, themes: ["Nice, but campaign workload is the main factor"] },
  },
];

