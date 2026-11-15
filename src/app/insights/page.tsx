import { getDemoContext } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { runOntologyReasoning } from "@/lib/ai/reasoning";
import { InsightsWorkbench } from "@/components/InsightsWorkbench";

export default async function InsightsPage(props: {
  searchParams: Promise<{ q?: string; team?: string }>;
}) {
  const sp = await props.searchParams;
  const ctx = await getDemoContext();
  const teamId = sp.team || "t-outreach";
  const question = sp.q || "Why has the Community Outreach Team's support score declined?";

  const initialResult = await runOntologyReasoning({
    question,
    teamId,
    viewer: ctx.viewer,
    currentDate: ctx.currentDate,
  });

  const teams = await prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  return <InsightsWorkbench initialResult={initialResult} teams={teams} initialTeamId={teamId} />;
}

