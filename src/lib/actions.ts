"use server";

// Server actions for role switching, timeline advancement, demo reset,
// AI reasoning queries, intervention approval/completion, and permission updates.

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { DISCOVERY_DATE, FOLLOW_UP_DATE } from "./domain";
import { advanceTimelineToFollowUp, seedDatabase } from "./seed/generate";
import { getDemoContext } from "./analytics";
import { canApproveIntervention } from "./permissions";
import { runOntologyReasoning } from "./ai/reasoning";
import { runEmployeeCoach } from "./ai/gemini";

export async function switchViewerAction(viewerId: string) {
  await prisma.demoState.update({
    where: { id: 1 },
    data: { viewerId, updatedAt: new Date() },
  });
  revalidatePath("/", "layout");
}

export async function advanceTimelineAction() {
  await advanceTimelineToFollowUp(prisma);
  revalidatePath("/", "layout");
}

export async function resetDemoAction() {
  await seedDatabase(prisma);
  revalidatePath("/", "layout");
}

export async function askOntologyAIAction(question: string, teamId?: string | null) {
  const ctx = await getDemoContext();
  const res = await runOntologyReasoning({
    question,
    teamId: teamId || "t-outreach",
    viewer: ctx.viewer,
    currentDate: ctx.currentDate,
  });
  revalidatePath("/insights");
  return res;
}

export async function approveAndCompleteInterventionAction(params: {
  interventionId: string;
  teamId: string;
  announcementText: string;
  scheduledFor: string;
  markCompletedImmediately: boolean;
  notes?: string;
}) {
  const ctx = await getDemoContext();
  const team = await prisma.team.findUniqueOrThrow({ where: { id: params.teamId } });
  const iv = await prisma.intervention.findUniqueOrThrow({ where: { id: params.interventionId } });

  if (!canApproveIntervention(ctx.viewer, team.id, team.managerId)) {
    throw new Error("Current viewer role does not have permission to approve a team intervention.");
  }

  const now = ctx.currentDate;
  const followUp = FOLLOW_UP_DATE;
  const execId = `exec-${team.id}-${iv.slug}`;
  const status = params.markCompletedImmediately ? "COMPLETED" : "APPROVED";

  await prisma.interventionExecution.upsert({
    where: { id: execId },
    update: {
      status,
      approvedAt: now,
      approvedById: ctx.viewer.id,
      scheduledFor: new Date(params.scheduledFor || now.toISOString()),
      completedAt: params.markCompletedImmediately ? now : null,
      followUpDate: followUp,
      announcementText: params.announcementText,
      notes: params.notes || "Facilitated responsibilities-and-alignment workshop; mapped 10 project responsibilities and assigned single owners.",
    },
    create: {
      id: execId,
      interventionId: iv.id,
      teamId: team.id,
      managerId: ctx.viewer.id,
      status,
      approvedAt: now,
      approvedById: ctx.viewer.id,
      scheduledFor: new Date(params.scheduledFor || now.toISOString()),
      completedAt: params.markCompletedImmediately ? now : null,
      followUpDate: followUp,
      announcementText: params.announcementText,
      notes: params.notes || "Facilitated responsibilities-and-alignment workshop; mapped 10 project responsibilities and assigned single owners.",
      createdAt: now,
    },
  });

  await prisma.actionLog.deleteMany({ where: { executionId: execId } });
  await prisma.actionLog.createMany({
    data: [
      {
        id: `al-${execId}-approve`,
        executionId: execId,
        action: "APPROVED",
        actorId: ctx.viewer.id,
        actorRole: ctx.viewer.systemRole,
        approvalState: "APPROVED",
        targetEntityType: "Team",
        targetEntityId: team.id,
        timestamp: now,
        details: `Approved “${iv.name}” targeting ${iv.targetVital}.`,
      },
      {
        id: `al-${execId}-announce`,
        executionId: execId,
        action: "ANNOUNCEMENT_GENERATED",
        actorId: ctx.viewer.id,
        actorRole: ctx.viewer.systemRole,
        approvalState: "SIMULATED",
        targetEntityType: "Team",
        targetEntityId: team.id,
        timestamp: now,
        details: `Simulated announcement prepared (not sent to external Slack/email).`,
      },
      {
        id: `al-${execId}-schedule`,
        executionId: execId,
        action: "SCHEDULED",
        actorId: ctx.viewer.id,
        actorRole: ctx.viewer.systemRole,
        approvalState: "SCHEDULED",
        targetEntityType: "Team",
        targetEntityId: team.id,
        timestamp: now,
        details: `Scheduled in simulated calendar; follow-up pulse set for Week 14 (Dec 2, 2026).`,
      },
      ...(params.markCompletedImmediately
        ? [
            {
              id: `al-${execId}-complete`,
              executionId: execId,
              action: "COMPLETED",
              actorId: ctx.viewer.id,
              actorRole: ctx.viewer.systemRole,
              approvalState: "COMPLETED",
              targetEntityType: "Team",
              targetEntityId: team.id,
              timestamp: now,
              details: `Marked completed; single owners assigned for previously unowned responsibilities.`,
            },
          ]
        : []),
    ],
  });

  // Also record an OrganizationalEvent so the ontology graph reflects the completed intervention
  await prisma.organizationalEvent.upsert({
    where: { id: `ev-intervention-${execId}` },
    update: {
      title: `Intervention ${params.markCompletedImmediately ? "completed" : "approved"}: ${iv.name}`,
      description: `${ctx.viewer.name} ${params.markCompletedImmediately ? "completed" : "approved"} “${iv.name}” for ${team.name}.`,
      occurredAt: now,
    },
    create: {
      id: `ev-intervention-${execId}`,
      eventType: "TeamInterventionCompleted",
      title: `Intervention ${params.markCompletedImmediately ? "completed" : "approved"}: ${iv.name}`,
      description: `${ctx.viewer.name} ${params.markCompletedImmediately ? "completed" : "approved"} “${iv.name}” for ${team.name}.`,
      occurredAt: now,
      weekIndex: 12,
      source: "action_system",
      connectorId: "action_system",
      relatedEntityType: "Team",
      relatedEntityId: team.id,
      teamId: team.id,
      metadata: JSON.stringify({ executionId: execId, interventionId: iv.id }),
      synthetic: true,
    },
  });

  revalidatePath("/", "layout");
  return { executionId: execId, status };
}

export async function updateSharingPermissionAction(params: {
  employeeId: string;
  shareWithManager: boolean;
  shareWithTeam: boolean;
}) {
  const ctx = await getDemoContext();
  if (ctx.viewer.id !== params.employeeId) {
    throw new Error("Only the employee themselves can modify their Energy Profile sharing permissions.");
  }
  const prof = await prisma.energyProfile.findFirstOrThrow({
    where: { employeeId: params.employeeId, isCurrent: true },
  });
  await prisma.energyProfile.update({
    where: { id: prof.id },
    data: {
      sharingPermissions: JSON.stringify({
        manager: params.shareWithManager ? ["working", "collaboration", "communication"] : [],
        team: params.shareWithTeam ? ["working", "collaboration"] : [],
      }),
    },
  });
  await prisma.employee.update({
    where: { id: params.employeeId },
    data: {
      privacySettings: JSON.stringify({
        shareProfileWithManager: params.shareWithManager,
        shareProfileWithTeam: params.shareWithTeam,
        shareCheckInsWithManager: params.shareWithManager,
      }),
    },
  });
  revalidatePath("/", "layout");
}

export async function submitEnergyCheckInAction(params: {
  energyBand: string;
  reportedEnergy: number;
  reportedSupport: number;
  reason: string;
  mood: string;
  shareWithManager: boolean;
}) {
  const ctx = await getDemoContext();
  await prisma.energyCheckIn.create({
    data: {
      id: `ci-${ctx.viewer.id}-${Date.now()}`,
      employeeId: ctx.viewer.id,
      projectId: ctx.viewer.teamId === "t-outreach" ? "p-food-access" : null,
      timestamp: ctx.currentDate,
      reportedEnergy: params.reportedEnergy,
      reportedSupport: params.reportedSupport,
      optionalContext: `[${params.energyBand} · Mood: ${params.mood}] ${params.reason}`,
      source: "slack_prompt",
      visibility: params.shareWithManager ? "SHARED_WITH_MANAGER" : "PRIVATE",
    },
  });
  revalidatePath("/", "layout");
}

export async function askEmployeeCoachAction(question: string) {
  const ctx = await getDemoContext();
  return runEmployeeCoach({
    question,
    viewer: ctx.viewer,
    currentDate: ctx.currentDate,
  });
}

