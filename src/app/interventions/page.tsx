import { getDemoContext } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { fmtDate, parseJSON } from "@/lib/domain";
import { canApproveIntervention } from "@/lib/permissions";
import { InterventionActionStudio } from "@/components/InterventionActionStudio";

export default async function InterventionsPage(props: {
  searchParams: Promise<{ select?: string; team?: string }>;
}) {
  const sp = await props.searchParams;
  const ctx = await getDemoContext();
  const teamId = sp.team || "t-outreach";

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { members: true },
  });

  const rawInterventions = await prisma.intervention.findMany({ orderBy: { id: "asc" } });
  const interventions = rawInterventions.map((iv) => ({
    id: iv.id,
    slug: iv.slug,
    name: iv.name,
    description: iv.description,
    targetVital: iv.targetVital,
    secondaryVitals: parseJSON<string[]>(iv.secondaryVitals, []),
    recommendedAudience: iv.recommendedAudience,
    estimatedDuration: iv.estimatedDuration,
    format: iv.format,
    instructions: parseJSON<string[]>(iv.instructions, []),
    expectedOutcome: iv.expectedOutcome,
    followUpMeasurement: iv.followUpMeasurement,
  }));

  const existing = await prisma.interventionExecution.findFirst({
    where: { teamId: team.id },
    include: { actions: { orderBy: { timestamp: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <InterventionActionStudio
      interventions={interventions}
      initialSlug={sp.select || "clarify-responsibilities"}
      team={{ id: team.id, name: team.name, memberCount: team.members.length }}
      canApprove={canApproveIntervention(ctx.viewer, team.id, team.managerId)}
      viewerName={ctx.viewer.name}
      viewerRole={ctx.viewer.systemRole}
      phase={ctx.phase}
      existingExecution={
        existing
          ? {
              id: existing.id,
              status: existing.status,
              approvedAt: existing.approvedAt ? fmtDate(existing.approvedAt) : null,
              completedAt: existing.completedAt ? fmtDate(existing.completedAt) : null,
              announcementText: existing.announcementText,
              notes: existing.notes,
              actions: existing.actions.map((a) => ({
                id: a.id,
                action: a.action,
                timestamp: fmtDate(a.timestamp),
                details: a.details,
                actorRole: a.actorRole,
              })),
            }
          : null
      }
    />
  );
}

