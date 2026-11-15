// Deterministic synthetic dataset generator for Northstar Community Services.
// Generates 1 org, 8 teams, 8 managers, 72 employees, 12 projects, 72 EnergyProfiles,
// 12 weeks of PulseResponses + TeamVitalSnapshots, daily/weekly EnergyCheckIns,
// normalized WorkplaceObservations & OrganizationalEvents via simulated connectors,
// 10 Intervention templates, and 5 historical InterventionExecutions + Outcomes.

import type { PrismaClient } from "@prisma/client";
import {
  DISCOVERY_DATE,
  FOLLOW_UP_DATE,
  HISTORY_WEEKS,
  METHODOLOGY_VERSION,
  VITALS,
  type Vital,
  dateInWeek,
  weekEnd,
  weekStart,
} from "../domain";
import { aggregateTeamWeek, confidenceIndicator } from "../scoring";
import { CONNECTORS, type RawEvent, normalize as normalizeRawEvent } from "../connectors";
import { computeOutcome } from "../outcomes";
import { pick, rngFor, sample } from "./random";
import {
  ASSESSMENT_ITEMS,
  INTERVENTIONS,
  MAIN_PROJECT_ID,
  MAIN_TEAM_ID,
  ORG,
  PAST_EXECUTIONS,
  PERSONAS,
  PREFERENCE_POOL,
  PROJECTS,
  TEAMS,
  type TeamSpec,
} from "./scenario";

const FIRST_NAMES = [
  "Jordan", "Priya", "Mateo", "Lin", "Nadia", "Devin", "Sora", "Kwame",
  "Camila", "Rowan", "Tariq", "Mei", "Avery", "Kofi", "Zoe", "Haruto",
  "Leila", "Noah", "Amara", "Elias", "Fatima", "Caleb", "Ines", "Soren",
  "Yuki", "Mina", "Andre", "Clara", "Omar", "Tessa", "Ravi", "Noor",
  "Julian", "Anya", "Malik", "Freya", "Diego", "Hana", "Leo", "Zainab",
  "Maya", "Idris", "Chloe", "Kenji", "Sana", "Ezra", "Lucia", "Bram",
  "Nia", "Hugo", "Daria", "Samir", "Iris", "Taj", "Vera", "Kian",
  "Alma", "imani", "Nico", "Yara", "Zane", "Rhea", "Otis", "Lina",
];

const LAST_NAMES = [
  "Ellis", "Raman", "Solis", "Park", "abbasi", "Brooks", "Takahashi", "Mensah",
  "Delgado", "Mercer", "Al-Mansoor", "Chen", "Kerr", "Boateng", "Vance", "Sato",
  "Haddad", "patel", "Okeke", "Lindholm", "Farah", "Walsh", "Moreau", "Berg",
  "Tanaka", "Cho", "Silva", "Novak", "hassan", "Bauer", "Nair", "Bakr",
  "Reyes", "Kowalski", "Diallo", "Strand", "Molina", "Ito", "Costa", "Qureshi",
  "Shah", "bello", "Dupont", "Watanabe", "Mirza", "levy", "Rossi", "de Vries",
  "Kamau", "lefevre", "popov", "Aziz", "fischer", "kapoor", "orlov", "mori",
  "santos", "adebayo", "conti", "khoury", "hale", "sullivan", "falk", "ortega",
];

const ROLE_TITLES: Record<string, string[]> = {
  "t-outreach": ["Outreach Specialist", "Neighborhood Coordinator", "Community Navigator", "Pantry Liaison"],
  "t-program": ["Caseworker", "Family Advocate", "Intake Specialist", "Program Coordinator"],
  "t-youth": ["Youth Mentor", "After-School Coordinator", "Program Facilitator"],
  "t-volunteer": ["Volunteer Coordinator", "Onboarding Specialist", "Community Scheduler"],
  "t-development": ["Grants Writer", "Major Gifts Officer", "Donor Relations Specialist"],
  "t-operations": ["HR Generalist", "People Partner", "IT & Facilities Coordinator"],
  "t-comms": ["Content Producer", "Communications Specialist", "Digital Coordinator"],
  "t-finance": ["Staff Accountant", "Grants Compliance Analyst", "Budget Analyst"],
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function interpKeyframes(kf: [number, number][], week: number): number {
  if (week <= kf[0][0]) return kf[0][1];
  if (week >= kf[kf.length - 1][0]) return kf[kf.length - 1][1];
  for (let i = 0; i < kf.length - 1; i++) {
    const [w0, v0] = kf[i];
    const [w1, v1] = kf[i + 1];
    if (week >= w0 && week <= w1) {
      if (w1 === w0) return v1;
      return v0 + ((v1 - v0) * (week - w0)) / (w1 - w0);
    }
  }
  return kf[0][1];
}

/**
 * Generate integer 1..5 item responses for `nRespondents` employees (3 items per vital)
 * whose mean normalized score `(r-1)/4*100` equals `round(targetScore)` to 0.1 precision.
 */
function buildResponsesForVital(
  targetScore: number,
  employeeIds: string[],
  itemIds: string[],
  rng: () => number,
): { employeeId: string; itemId: string; value: number | null }[] {
  const n = employeeIds.length;
  const totalSlots = n * itemIds.length;
  // Each slot integer 1..5 contributes (v-1) quarters of 100/totalSlots.
  // Mean normalized = (sum(v - 1) / (4 * totalSlots)) * 100 = (Q / (4 * totalSlots)) * 100
  const targetQ = Math.round((targetScore / 100) * 4 * totalSlots);
  const baseQ = Math.floor(targetQ / totalSlots);
  let rem = targetQ - baseQ * totalSlots;

  const slots: number[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const add = rem > 0 ? 1 : 0;
    if (rem > 0) rem--;
    slots.push(Math.max(1, Math.min(5, 1 + baseQ + add)));
  }
  // Introduce slight realistic spread by swapping +1/-1 pairs while keeping sum invariant
  const swaps = Math.min(8, Math.floor(totalSlots / 4));
  for (let s = 0; s < swaps; s++) {
    const a = Math.floor(rng() * totalSlots);
    const b = Math.floor(rng() * totalSlots);
    if (a !== b && slots[a] < 5 && slots[b] > 1) {
      slots[a] += 1;
      slots[b] -= 1;
    }
  }

  const out: { employeeId: string; itemId: string; value: number | null }[] = [];
  let idx = 0;
  for (const empId of employeeIds) {
    for (const itemId of itemIds) {
      out.push({ employeeId: empId, itemId, value: slots[idx++] });
    }
  }
  return out;
}

export async function generateTeamWeek(
  prisma: PrismaClient,
  team: TeamSpec,
  memberIds: string[],
  week: number,
  opts: { useInterventionFollowUp?: boolean; isFollowUp?: boolean } = {},
) {
  const rng = rngFor(`pulse:${team.id}:w${week}:${opts.useInterventionFollowUp ? "int" : "base"}`);
  const itemVital: Record<string, Vital> = {};
  const itemsByVital: Record<Vital, string[]> = {
    Supported: [],
    Energized: [],
    Aligned: [],
    Recognized: [],
    Safe: [],
  };
  for (const it of ASSESSMENT_ITEMS) {
    itemVital[it.id] = it.vital;
    itemsByVital[it.vital].push(it.id);
  }

  // Deterministic respondent subset for this team-week
  let targetRespondents = Math.max(5, Math.round(memberIds.length * team.responseRate));
  // Finance & Grants (size 6) dips to 4 respondents in week 4 to demonstrate privacy suppression (<5)
  if (team.id === "t-finance" && week === 4) {
    targetRespondents = 4;
  }
  const respondents = sample(rng, memberIds, Math.min(memberIds.length, targetRespondents));

  const rows: { employeeId: string; itemId: string; value: number | null }[] = [];
  for (const v of VITALS) {
    const kf =
      opts.useInterventionFollowUp && team.followUpIfIntervention?.[v]
        ? team.followUpIfIntervention[v]!
        : team.trajectory[v];
    const baseTarget = interpKeyframes(kf, week);
    const jitter = team.noise ? Math.round((rng() - 0.5) * 2 * team.noise) : 0;
    const target = Math.max(30, Math.min(95, Math.round(baseTarget + jitter)));
    const vitalRows = buildResponsesForVital(target, respondents, itemsByVital[v], rng);
    rows.push(...vitalRows);
  }

  // Persist PulseResponses
  const pStart = weekStart(week);
  const pEnd = weekEnd(week);
  await prisma.pulseResponse.deleteMany({ where: { teamId: team.id, weekIndex: week } });
  await prisma.pulseResponse.createMany({
    data: rows.map((r, idx) => ({
      id: `pr-${team.id}-w${week}-${idx}`,
      employeeId: r.employeeId,
      teamId: team.id,
      itemId: r.itemId,
      weekIndex: week,
      periodStart: pStart,
      value: r.value,
      visibility: "PRIVATE",
    })),
  });

  // Aggregate using the canonical scoring module
  const agg = aggregateTeamWeek(rows, itemVital, memberIds.length);
  const meanStd =
    VITALS.reduce((a, v) => a + agg.stdDev[v], 0) / VITALS.length;
  const conf = confidenceIndicator({
    respondents: agg.respondentCount,
    responseRate: agg.responseRate,
    periodsObserved: Math.min(week, 4),
    meanStdDev: meanStd,
    methodologyStable: true,
  });

  const snapId = `snap-${team.id}-w${week}`;
  await prisma.teamVitalSnapshot.upsert({
    where: { teamId_weekIndex: { teamId: team.id, weekIndex: week } },
    update: {
      periodStart: pStart,
      periodEnd: pEnd,
      supportedScore: agg.scores.Supported,
      energizedScore: agg.scores.Energized,
      alignedScore: agg.scores.Aligned,
      recognizedScore: agg.scores.Recognized,
      safeScore: agg.scores.Safe,
      vitalRespondents: JSON.stringify(agg.vitalRespondents),
      respondentCount: agg.respondentCount,
      teamSize: memberIds.length,
      responseRate: Math.round(agg.responseRate * 100) / 100,
      suppressed: agg.suppressed,
      confidenceLevel: conf.level,
      confidenceScore: conf.score,
      methodologyVersion: METHODOLOGY_VERSION,
      isFollowUp: Boolean(opts.isFollowUp),
    },
    create: {
      id: snapId,
      teamId: team.id,
      weekIndex: week,
      periodStart: pStart,
      periodEnd: pEnd,
      supportedScore: agg.scores.Supported,
      energizedScore: agg.scores.Energized,
      alignedScore: agg.scores.Aligned,
      recognizedScore: agg.scores.Recognized,
      safeScore: agg.scores.Safe,
      vitalRespondents: JSON.stringify(agg.vitalRespondents),
      respondentCount: agg.respondentCount,
      teamSize: memberIds.length,
      responseRate: Math.round(agg.responseRate * 100) / 100,
      suppressed: agg.suppressed,
      confidenceLevel: conf.level,
      confidenceScore: conf.score,
      methodologyVersion: METHODOLOGY_VERSION,
      isFollowUp: Boolean(opts.isFollowUp),
    },
  });
}

export async function seedDatabase(prisma: PrismaClient) {
  // Clear in dependency order
  await prisma.actionLog.deleteMany();
  await prisma.interventionOutcome.deleteMany();
  await prisma.interventionExecution.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.workplaceObservation.deleteMany();
  await prisma.organizationalEvent.deleteMany();
  await prisma.teamVitalSnapshot.deleteMany();
  await prisma.pulseResponse.deleteMany();
  await prisma.assessmentItem.deleteMany();
  await prisma.energyCheckIn.deleteMany();
  await prisma.energyProfile.deleteMany();
  await prisma.projectParticipation.deleteMany();
  await prisma.responsibility.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employee.updateMany({ data: { managerId: null } });
  await prisma.team.updateMany({ data: { managerId: null } });
  await prisma.employee.deleteMany();
  await prisma.team.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.dataSource.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.demoState.deleteMany();

  // 1. Organization
  await prisma.organization.create({
    data: {
      id: ORG.id,
      name: ORG.name,
      industry: ORG.industry,
      createdAt: new Date(Date.UTC(2019, 3, 1)),
      synthetic: true,
    },
  });

  // 2. Assessment items
  await prisma.assessmentItem.createMany({
    data: ASSESSMENT_ITEMS.map((it) => ({
      id: it.id,
      vital: it.vital,
      text: it.text,
      methodologyVersion: METHODOLOGY_VERSION,
      active: true,
      synthetic: true,
    })),
  });

  // 3. Teams
  for (const t of TEAMS) {
    await prisma.team.create({
      data: {
        id: t.id,
        name: t.name,
        department: t.department,
        description: t.description,
        organizationId: ORG.id,
      },
    });
  }

  // 4. Employees (72 total: 8 managers + 64 team members)
  const rngEmp = rngFor("employees");
  const teamMembersMap: Record<string, string[]> = {};
  const managerByTeam: Record<string, string> = {};
  let nameIdx = 0;

  for (const t of TEAMS) {
    teamMembersMap[t.id] = [];
    const mgrId =
      t.id === MAIN_TEAM_ID
        ? PERSONAS.manager.id
        : `e-mgr-${t.id.replace("t-", "")}`;
    managerByTeam[t.id] = mgrId;
    const mgrEmail = `${t.managerName.toLowerCase().replace(/[^a-z]+/g, ".")}@northstar-synthetic.org`;
    await prisma.employee.create({
      data: {
        id: mgrId,
        name: t.managerName,
        email: mgrEmail,
        role: t.managerRole,
        department: t.department,
        employmentStatus: "FULL_TIME",
        teamId: t.id,
        organizationId: ORG.id,
        joinedAt: new Date(Date.UTC(2022, Math.floor(rngEmp() * 12), 1 + Math.floor(rngEmp() * 20))),
        systemRole: "MANAGER",
        privacySettings: JSON.stringify({
          shareProfileWithManager: true,
          shareProfileWithTeam: true,
          shareCheckInsWithManager: false,
        }),
        synthetic: true,
      },
    });
    await prisma.team.update({ where: { id: t.id }, data: { managerId: mgrId } });
    teamMembersMap[t.id].push(mgrId);

    const memberCount = t.size - 1;
    for (let m = 0; m < memberCount; m++) {
      let empId: string;
      let fullName: string;
      let sysRole: "EMPLOYEE" | "HR_ADMIN" = "EMPLOYEE";
      if (t.id === MAIN_TEAM_ID && m === 0) {
        empId = PERSONAS.employee.id;
        fullName = PERSONAS.employee.name;
      } else if (t.id === "t-operations" && m === 0) {
        empId = PERSONAS.hr.id;
        fullName = PERSONAS.hr.name;
        sysRole = "HR_ADMIN";
      } else {
        const fn = cap(FIRST_NAMES[nameIdx % FIRST_NAMES.length]);
        const ln = cap(LAST_NAMES[nameIdx % LAST_NAMES.length]);
        fullName = `${fn} ${ln}`;
        empId = `e-${fn.toLowerCase()}-${ln.toLowerCase().replace(/[^a-z]/g, "")}-${nameIdx}`;
      }
      nameIdx++;
      const roles = ROLE_TITLES[t.id] || ["Program Associate"];
      const role = sysRole === "HR_ADMIN" ? "People & Culture Lead (HR Admin)" : roles[m % roles.length];
      const shareProfileMgr = m % 4 !== 3; // 75% share working preferences with manager
      const shareCheckInMgr = m === 0; // Jordan Ellis shares selected check-ins
      await prisma.employee.create({
        data: {
          id: empId,
          name: fullName,
          email: `${fullName.toLowerCase().replace(/[^a-z]+/g, ".")}@northstar-synthetic.org`,
          role,
          department: t.department,
          employmentStatus: "FULL_TIME",
          managerId: mgrId,
          teamId: t.id,
          organizationId: ORG.id,
          joinedAt: new Date(Date.UTC(2023 + (m % 3), (m * 2) % 12, 5 + (m % 20))),
          systemRole: sysRole,
          privacySettings: JSON.stringify({
            shareProfileWithManager: shareProfileMgr,
            shareProfileWithTeam: m % 2 === 0,
            shareCheckInsWithManager: shareCheckInMgr,
          }),
          synthetic: true,
        },
      });
      teamMembersMap[t.id].push(empId);
    }
  }

  // 5. Energy Profiles (72 current profiles + reassessment history for Jordan Ellis)
  const allEmployees = await prisma.employee.findMany();
  for (const emp of allEmployees) {
    const rngP = rngFor(`profile:${emp.id}`);
    const priv = JSON.parse(emp.privacySettings);
    const isJordan = emp.id === PERSONAS.employee.id;
    const working = isJordan
      ? ["Prefers clear ownership and expectations", "Prefers independent focus time"]
      : sample(rngP, PREFERENCE_POOL.working, 2);
    const collab = isJordan
      ? ["Prefers small-group working sessions", "Prefers collaborative brainstorming"]
      : sample(rngP, PREFERENCE_POOL.collaboration, 2);
    const comm = isJordan
      ? ["Prefers direct and specific feedback", "Prefers written preparation before meetings", "Prefers concrete examples and clear next steps"]
      : sample(rngP, PREFERENCE_POOL.communication, 2);

    await prisma.energyProfile.create({
      data: {
        id: `ep-${emp.id}`,
        employeeId: emp.id,
        assessmentType: "Synthetic Working-Preferences Inventory (Demo)",
        assessmentVersion: "demo-1.1",
        assessedAt: new Date(Date.UTC(2026, 7, 15)),
        isCurrent: true,
        workingPreferences: JSON.stringify(working),
        collaborationPreferences: JSON.stringify(collab),
        communicationPreferences: JSON.stringify(comm),
        sharingPermissions: JSON.stringify({
          manager: priv.shareProfileWithManager ? ["working", "collaboration", "communication"] : [],
          team: priv.shareProfileWithTeam ? ["working", "collaboration"] : [],
        }),
        synthetic: true,
      },
    });

    if (isJordan) {
      await prisma.energyProfile.create({
        data: {
          id: `ep-${emp.id}-v1`,
          employeeId: emp.id,
          assessmentType: "Synthetic Working-Preferences Inventory (Demo)",
          assessmentVersion: "demo-1.0",
          assessedAt: new Date(Date.UTC(2026, 1, 10)),
          isCurrent: false,
          workingPreferences: JSON.stringify(["Prefers a predictable weekly rhythm"]),
          collaborationPreferences: JSON.stringify(["Prefers collaborative brainstorming"]),
          communicationPreferences: JSON.stringify(["Prefers written preparation before meetings"]),
          sharingPermissions: JSON.stringify({ manager: ["working", "collaboration", "communication"], team: ["working"] }),
          synthetic: true,
        },
      });
    }
  }

  // 6. Projects, Responsibilities, Participations
  for (const p of PROJECTS) {
    await prisma.project.create({
      data: {
        id: p.id,
        name: p.name,
        description: p.description,
        status: "ACTIVE",
        startDate: weekStart(p.startWeek),
        endDate: p.endDate ? new Date(`${p.endDate}T00:00:00Z`) : null,
        priority: p.priority,
        teamId: p.teamId,
        organizationId: ORG.id,
      },
    });
    for (let i = 0; i < p.responsibilities.length; i++) {
      const r = p.responsibilities[i];
      await prisma.responsibility.create({
        data: {
          id: `resp-${p.id}-${i + 1}`,
          projectId: p.id,
          title: r.title,
          addedAt: dateInWeek(r.week, 1),
          ownership: r.ownership,
          source: "conn-pm",
        },
      });
    }
    const members = teamMembersMap[p.teamId] || [];
    for (let i = 0; i < members.length; i++) {
      await prisma.projectParticipation.create({
        data: {
          id: `pp-${p.id}-${i}`,
          employeeId: members[i],
          projectId: p.id,
          role: i === 0 ? "Project Lead" : "Contributor",
        },
      });
    }
  }

  // 7. 12 weeks of PulseResponses & TeamVitalSnapshots for all 8 teams
  for (const t of TEAMS) {
    const memberIds = teamMembersMap[t.id];
    for (let w = 1; w <= HISTORY_WEEKS; w++) {
      await generateTeamWeek(prisma, t, memberIds, w);
    }
  }

  // 8. EnergyCheckIns (self-reported, mostly PRIVATE, a few voluntarily shared)
  const outreachMembers = teamMembersMap[MAIN_TEAM_ID];
  for (let w = 1; w <= HISTORY_WEEKS; w++) {
    for (let i = 0; i < outreachMembers.length; i++) {
      const empId = outreachMembers[i];
      const rngC = rngFor(`checkin:${empId}:w${w}`);
      const isDeclinePeriod = w >= 7;
      const energy = isDeclinePeriod ? (i % 3 === 0 ? 2 : 3) : 4;
      const support = isDeclinePeriod ? (i % 2 === 0 ? 2 : 3) : 4;
      const isShared = empId === PERSONAS.employee.id && (w === 9 || w === 11);
      await prisma.energyCheckIn.create({
        data: {
          id: `ci-${empId}-w${w}`,
          employeeId: empId,
          projectId: w >= 6 ? MAIN_PROJECT_ID : "p-resource-fair",
          timestamp: dateInWeek(w, 2, 9),
          reportedEnergy: energy,
          reportedSupport: support,
          optionalContext: isShared
            ? w === 9
              ? "Would appreciate clarity on who owns translation coordination vs. partner reporting for the food-access launch."
              : "Checking in on priority order between the council briefing and mobile pantry pilot."
            : rngC() > 0.6
              ? "Private reflection note (visible only to employee)."
              : null,
          source: i % 2 === 0 ? "slack_prompt" : "teams_prompt",
          visibility: isShared ? "SHARED_WITH_MANAGER" : "PRIVATE",
        },
      });
    }
  }

  // 9. Simulated Connector Events → Normalized Observations & OrganizationalEvents
  const rawEvents: RawEvent[] = [
    // Main scenario: Community Outreach Team & Neighborhood Food Access Outreach
    {
      connectorId: "conn-pm",
      type: "project.created",
      at: dateInWeek(6, 0, 10),
      payload: {
        projectId: MAIN_PROJECT_ID,
        projectName: "Neighborhood Food Access Outreach",
        teamId: MAIN_TEAM_ID,
        description: "Door-to-door and partner-pantry outreach to connect 1,200 households with food assistance before winter.",
      },
    },
    {
      connectorId: "conn-pm",
      type: "responsibility.added",
      at: dateInWeek(7, 1, 14),
      payload: {
        projectId: MAIN_PROJECT_ID,
        projectName: "Neighborhood Food Access Outreach",
        teamId: MAIN_TEAM_ID,
        titles: [
          "Door-to-door survey logistics",
          "Translation coordination",
          "Intake form data entry",
          "Weekly partner reporting",
        ],
        unowned: 4,
      },
    },
    {
      connectorId: "conn-pm",
      type: "responsibility.added",
      at: dateInWeek(8, 1, 11),
      payload: {
        projectId: MAIN_PROJECT_ID,
        projectName: "Neighborhood Food Access Outreach",
        teamId: MAIN_TEAM_ID,
        titles: ["Mobile pantry pilot", "City council briefing preparation", "Media outreach support"],
        unowned: 3,
      },
    },
    {
      connectorId: "conn-pm",
      type: "project.due_date_changed",
      at: dateInWeek(8, 3, 15),
      payload: {
        projectId: MAIN_PROJECT_ID,
        projectName: "Neighborhood Food Access Outreach",
        teamId: MAIN_TEAM_ID,
        from: "2026-12-04",
        to: "2026-11-20",
        daysEarlier: 14,
      },
    },
    {
      connectorId: "conn-pm",
      type: "project.tasks_summary",
      at: dateInWeek(9, 2, 12),
      payload: {
        projectId: MAIN_PROJECT_ID,
        teamId: MAIN_TEAM_ID,
        previous: 18,
        openTasks: 29,
        changePct: 61,
      },
    },
    {
      connectorId: "conn-teams",
      type: "calendar.team_meeting_summary",
      at: dateInWeek(9, 4, 16),
      payload: {
        teamId: MAIN_TEAM_ID,
        previousMeetings: 4,
        meetingsPerWeek: 8,
        avgHours: 6.5,
      },
    },
    {
      connectorId: "conn-slack",
      type: "channel.coordination_summary",
      at: dateInWeek(9, 4, 17),
      payload: {
        teamId: MAIN_TEAM_ID,
        projectId: MAIN_PROJECT_ID,
        newChannels: 3,
      },
    },
    {
      connectorId: "conn-pulse",
      type: "pulse.aggregate_tags",
      at: dateInWeek(10, 4, 17),
      payload: {
        teamId: MAIN_TEAM_ID,
        theme: "PULSE_THEME_CLARITY",
        tag: "Clearer ownership and priorities across projects",
        count: 7,
        respondents: 10,
      },
    },
    {
      connectorId: "conn-pulse",
      type: "pulse.aggregate_tags",
      at: dateInWeek(11, 4, 17),
      payload: {
        teamId: MAIN_TEAM_ID,
        theme: "PULSE_THEME_SUPPORT",
        tag: "Help balancing new outreach responsibilities",
        count: 6,
        respondents: 10,
      },
    },
    {
      connectorId: "conn-slack",
      type: "prompt.support_request",
      at: dateInWeek(11, 2, 11),
      payload: {
        teamId: MAIN_TEAM_ID,
        employeeId: PERSONAS.employee.id,
      },
    },
    // Other teams' events
    {
      connectorId: "conn-hris",
      type: "hris.manager_changed",
      at: dateInWeek(6, 0, 9),
      payload: {
        teamId: "t-comms",
        teamName: "Communications",
        newManager: "Aisha Rahman",
      },
    },
    {
      connectorId: "conn-hris",
      type: "hris.team_reorganized",
      at: dateInWeek(4, 1, 10),
      payload: {
        teamId: "t-operations",
        teamName: "People & Operations",
        description: "Combined IT support and facilities coordination under People & Operations.",
      },
    },
    {
      connectorId: "conn-pm",
      type: "project.created",
      at: dateInWeek(8, 0, 10),
      payload: {
        projectId: "p-year-end",
        projectName: "Year-End Giving Campaign",
        teamId: "t-development",
        description: "December individual-giving campaign launched.",
      },
    },
  ];

  let evIdx = 1;
  let obsIdx = 1;
  for (const raw of rawEvents) {
    const records = normalizeRawEvent(raw);
    const w = Math.max(1, Math.min(14, Math.floor((raw.at.getTime() - weekStart(1).getTime()) / (7 * 86400000)) + 1));
    for (const rec of records) {
      if (rec.kind === "event") {
        await prisma.organizationalEvent.create({
          data: {
            id: `ev-${evIdx++}`,
            eventType: rec.eventType,
            title: rec.title,
            description: rec.description,
            occurredAt: rec.occurredAt,
            weekIndex: w,
            source: rec.source,
            connectorId: rec.connectorId,
            relatedEntityType: rec.relatedEntityType,
            relatedEntityId: rec.relatedEntityId,
            teamId: rec.teamId ?? null,
            projectId: rec.projectId ?? null,
            metadata: JSON.stringify(rec.metadata),
            synthetic: true,
          },
        });
      } else {
        await prisma.workplaceObservation.create({
          data: {
            id: `obs-${obsIdx++}`,
            employeeId: rec.employeeId ?? null,
            teamId: rec.teamId ?? null,
            projectId: rec.projectId ?? null,
            source: rec.source,
            connectorId: rec.connectorId,
            observationType: rec.observationType,
            observedAt: rec.observedAt,
            weekIndex: w,
            summary: rec.summary,
            metadata: JSON.stringify(rec.metadata),
            permissionScope: rec.permissionScope,
            purpose: rec.purpose,
            retentionPolicy: rec.retentionPolicy,
            confidence: rec.confidence,
            synthetic: true,
          },
        });
      }
    }
  }

  // 10. Interventions library (10 templates)
  for (const iv of INTERVENTIONS) {
    await prisma.intervention.create({
      data: {
        id: iv.id,
        slug: iv.slug,
        name: iv.name,
        description: iv.description,
        targetVital: iv.targetVital,
        secondaryVitals: JSON.stringify(iv.secondaryVitals),
        recommendedAudience: iv.recommendedAudience,
        estimatedDuration: iv.estimatedDuration,
        format: iv.format,
        instructions: JSON.stringify(iv.instructions),
        expectedOutcome: iv.expectedOutcome,
        followUpMeasurement: iv.followUpMeasurement,
        triggerSignals: JSON.stringify(iv.triggerSignals),
        interventionVersion: "demo-1.0",
      },
    });
  }

  // 11. Historical InterventionExecutions & Outcomes (5 past executions)
  for (const px of PAST_EXECUTIONS) {
    const iv = INTERVENTIONS.find((i) => i.id === px.interventionId)!;
    const mgrId = managerByTeam[px.teamId];
    const approvedAt = dateInWeek(px.completedWeek, 0, 10);
    const completedAt = dateInWeek(px.completedWeek, 2, 15);
    const followUpDate = dateInWeek(px.afterWeek, 4, 16);

    await prisma.interventionExecution.create({
      data: {
        id: px.id,
        interventionId: px.interventionId,
        teamId: px.teamId,
        managerId: mgrId,
        status: "MEASURED",
        approvedAt,
        approvedById: mgrId,
        scheduledFor: completedAt,
        completedAt,
        followUpDate,
        notes: px.notes,
        announcementText: `Team — we'll spend ${iv.estimatedDuration} on “${iv.name}” this week so we can make sure everyone has what they need.`,
        createdAt: approvedAt,
      },
    });

    await prisma.actionLog.createMany({
      data: [
        {
          id: `al-${px.id}-1`,
          executionId: px.id,
          action: "APPROVED",
          actorId: mgrId,
          actorRole: "MANAGER",
          approvalState: "APPROVED",
          targetEntityType: "Team",
          targetEntityId: px.teamId,
          timestamp: approvedAt,
          details: `Approved ${iv.name}`,
        },
        {
          id: `al-${px.id}-2`,
          executionId: px.id,
          action: "COMPLETED",
          actorId: mgrId,
          actorRole: "MANAGER",
          approvalState: "COMPLETED",
          targetEntityType: "Team",
          targetEntityId: px.teamId,
          timestamp: completedAt,
          details: px.notes,
        },
      ],
    });

    const beforeSnap = await prisma.teamVitalSnapshot.findUniqueOrThrow({
      where: { teamId_weekIndex: { teamId: px.teamId, weekIndex: px.beforeWeek } },
    });
    const afterSnap = await prisma.teamVitalSnapshot.findUniqueOrThrow({
      where: { teamId_weekIndex: { teamId: px.teamId, weekIndex: px.afterWeek } },
    });
    const out = computeOutcome({
      interventionName: iv.name,
      targetVital: iv.targetVital,
      secondaryVitals: iv.secondaryVitals,
      before: beforeSnap,
      after: afterSnap,
    });
    await prisma.interventionOutcome.create({
      data: {
        id: `out-${px.id}`,
        interventionExecutionId: px.id,
        measuredAt: followUpDate,
        beforeSnapshotId: beforeSnap.id,
        afterSnapshotId: afterSnap.id,
        scoreChanges: JSON.stringify(out.scoreChanges),
        employeeFeedback: JSON.stringify(px.feedback),
        outcomeNotes: out.outcomeNotes,
        confidence: out.confidence,
      },
    });
  }

  // 12. Data sources metadata
  for (const c of CONNECTORS) {
    const count =
      c.kind === "pulse"
        ? await prisma.pulseResponse.count()
        : c.kind === "hris"
          ? await prisma.employee.count()
          : await prisma.workplaceObservation.count({ where: { connectorId: c.id } });
    await prisma.dataSource.create({
      data: {
        id: c.id,
        kind: c.kind,
        name: c.name,
        status: "CONNECTED_SIMULATED",
        lastSyncAt: DISCOVERY_DATE,
        recordsIngested: count,
        scopes: JSON.stringify(c.scopes),
        excluded: JSON.stringify(c.excluded),
        synthetic: true,
      },
    });
  }

  // 13. Initial DemoState (Discovery phase, viewing as Manager Dana Whitfield)
  await prisma.demoState.create({
    data: {
      id: 1,
      currentDate: DISCOVERY_DATE,
      phase: "DISCOVERY",
      viewerId: PERSONAS.manager.id,
      updatedAt: new Date(),
    },
  });
}

export async function advanceTimelineToFollowUp(prisma: PrismaClient) {
  const exec = await prisma.interventionExecution.findFirst({
    where: { teamId: MAIN_TEAM_ID },
    include: { intervention: true },
    orderBy: { createdAt: "desc" },
  });
  const interventionCompleted = Boolean(exec && (exec.status === "COMPLETED" || exec.status === "FOLLOW_UP_SCHEDULED" || exec.status === "MEASURED"));

  const allEmps = await prisma.employee.findMany();
  const byTeam: Record<string, string[]> = {};
  for (const e of allEmps) {
    (byTeam[e.teamId] ||= []).push(e.id);
  }
  for (const t of TEAMS) {
    for (const w of [13, 14]) {
      await generateTeamWeek(prisma, t, byTeam[t.id] || [], w, {
        useInterventionFollowUp: t.id === MAIN_TEAM_ID && interventionCompleted,
        isFollowUp: true,
      });
    }
  }

  if (exec && interventionCompleted) {
    const beforeSnap = await prisma.teamVitalSnapshot.findUniqueOrThrow({
      where: { teamId_weekIndex: { teamId: MAIN_TEAM_ID, weekIndex: 12 } },
    });
    const afterSnap = await prisma.teamVitalSnapshot.findUniqueOrThrow({
      where: { teamId_weekIndex: { teamId: MAIN_TEAM_ID, weekIndex: 14 } },
    });
    const out = computeOutcome({
      interventionName: exec.intervention.name,
      targetVital: exec.intervention.targetVital as Vital,
      secondaryVitals: JSON.parse(exec.intervention.secondaryVitals),
      before: beforeSnap,
      after: afterSnap,
    });
    await prisma.interventionOutcome.upsert({
      where: { interventionExecutionId: exec.id },
      update: {
        measuredAt: FOLLOW_UP_DATE,
        beforeSnapshotId: beforeSnap.id,
        afterSnapshotId: afterSnap.id,
        scoreChanges: JSON.stringify(out.scoreChanges),
        employeeFeedback: JSON.stringify({
          participants: 10,
          helpfulPct: 80,
          themes: [
            "Single owners assigned for translation coordination and weekly partner reporting",
            "Top three priorities for the next two weeks are clear",
            "Helpful to review workload together without individual blame",
          ],
        }),
        outcomeNotes: out.outcomeNotes,
        confidence: out.confidence,
      },
      create: {
        id: `out-${exec.id}`,
        interventionExecutionId: exec.id,
        measuredAt: FOLLOW_UP_DATE,
        beforeSnapshotId: beforeSnap.id,
        afterSnapshotId: afterSnap.id,
        scoreChanges: JSON.stringify(out.scoreChanges),
        employeeFeedback: JSON.stringify({
          participants: 10,
          helpfulPct: 80,
          themes: [
            "Single owners assigned for translation coordination and weekly partner reporting",
            "Top three priorities for the next two weeks are clear",
            "Helpful to review workload together without individual blame",
          ],
        }),
        outcomeNotes: out.outcomeNotes,
        confidence: out.confidence,
      },
    });
    await prisma.interventionExecution.update({
      where: { id: exec.id },
      data: { status: "MEASURED", followUpDate: FOLLOW_UP_DATE },
    });
    await prisma.actionLog.upsert({
      where: { id: `al-${exec.id}-measured` },
      update: { timestamp: FOLLOW_UP_DATE },
      create: {
        id: `al-${exec.id}-measured`,
        executionId: exec.id,
        action: "OUTCOME_MEASURED",
        actorId: exec.managerId,
        actorRole: "MANAGER",
        approvalState: "MEASURED",
        targetEntityType: "Team",
        targetEntityId: MAIN_TEAM_ID,
        timestamp: FOLLOW_UP_DATE,
        details: "Follow-up pulse check completed (Week 14); Supported 54 → 68, Aligned 67 → 76.",
      },
    });
  }

  await prisma.demoState.update({
    where: { id: 1 },
    data: { currentDate: FOLLOW_UP_DATE, phase: "FOLLOW_UP", updatedAt: new Date() },
  });
}

