import { getDemoContext } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { buildOntologyGraph } from "@/lib/ontology/service";
import { runOntologyReasoning } from "@/lib/ai/reasoning";
import { OntologyGraphExplorer } from "@/components/OntologyGraphExplorer";

export default async function OrganizationGraphPage(props: {
  searchParams: Promise<{ team?: string; highlight?: string }>;
}) {
  const sp = await props.searchParams;
  const ctx = await getDemoContext();
  const graph = await buildOntologyGraph({
    viewer: ctx.viewer,
    currentDate: ctx.currentDate,
    focusTeamId: null,
  });
  const reasoning = await runOntologyReasoning({
    question: "Why has the Community Outreach Team's support score declined?",
    teamId: "t-outreach",
    viewer: ctx.viewer,
    currentDate: ctx.currentDate,
  });
  const teams = await prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
          Scene 3 · Interactive Organizational Ontology Graph
        </div>
        <h1 className="mt-1 text-xl font-semibold text-[#1f2421]">
          Semantic Model: Entities, Typed Relationships &amp; AI Reasoning Path
        </h1>
        <p className="mt-1 text-xs text-[#4b524e]">
          Every node and edge below is rendered directly from the relational persistence layer. Click any entity to
          inspect its properties, source provenance, and typed relationships, or toggle{" "}
          <strong>Highlight AI Reasoning Path</strong> to see the exact graph traversal behind the Community Outreach insight.
        </p>
      </div>

      <OntologyGraphExplorer
        nodes={graph.nodes}
        edges={graph.edges}
        reasoningPathIds={reasoning.reasoningPathNodeIds}
        teams={teams}
        initialTeam={sp.team || "t-outreach"}
        initialHighlightReasoning={sp.highlight === "reasoning" || true}
      />
    </div>
  );
}
