import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getDemoContext, getOrgOverviewData } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { VITALS, VITAL_DEFINITIONS, fmtDate } from "@/lib/domain";
import { canApproveIntervention } from "@/lib/permissions";
import { AhaStoryPanel } from "@/components/AhaStoryPanel";
import { VitalTrendsChart } from "@/components/VitalTrendsChart";

export default async function OrganizationOverviewPage() {
  const ctx = await getDemoContext();
  const data = await getOrgOverviewData(ctx.maxWeek);
  const outreach = data.teamSummaries.find((t) => t.id === "t-outreach")!;

  const outreachTeam = await prisma.team.findUniqueOrThrow({
    where: { id: "t-outreach" },
    include: {
      snapshots: { where: { weekIndex: { lte: ctx.maxWeek } }, orderBy: { weekIndex: "asc" } },
    },
  });

  const outreachTrend = outreachTeam.snapshots.map((s) => ({
    weekIndex: s.weekIndex,
    label: `Wk ${s.weekIndex}`,
    Supported: s.suppressed ? null : s.supportedScore,
    Energized: s.suppressed ? null : s.energizedScore,
    Aligned: s.suppressed ? null : s.alignedScore,
    Recognized: s.suppressed ? null : s.recognizedScore,
    Safe: s.suppressed ? null : s.safeScore,
  }));

  return (
    <div className="space-y-7">
      {/* The Instant Aha Moment: Full Ontology Story + 1-Click Action + +2 Wk Outcome */}
      <AhaStoryPanel
        phase={ctx.phase}
        supportedNow={outreach.current.Supported}
        alignedNow={outreach.current.Aligned}
        energizedNow={outreach.current.Energized}
        outreachTrend={outreachTrend}
        canApprove={canApproveIntervention(ctx.viewer, "t-outreach", "e-dana-whitfield")}
      />

      {/* Organization-Wide Five Team Vitals (Sleek Minimalist Cards) */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {VITALS.map((vital) => {
          const score = data.latestOrg[vital];
          const base = data.baselineOrg[vital];
          const delta = score !== null && base !== null ? Math.round((score - base) * 10) / 10 : null;
          return (
            <div
              key={vital}
              className="rounded-2xl border border-[#ecece9] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7c837e]">{vital}</span>
                {delta !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      delta < -3
                        ? "bg-[#fef4db] text-[#946012]"
                        : delta > 2
                          ? "bg-[#e7f5ee] text-[#237a57]"
                          : "bg-[#f4f4f2] text-[#5c635f]"
                    }`}
                  >
                    {delta >= 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-editorial text-3xl font-medium text-[#141514]">{score ?? "—"}</span>
                <span className="text-xs text-[#7c837e]">/ 100</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#5c635f]">{VITAL_DEFINITIONS[vital]}</p>
            </div>
          );
        })}
      </section>

      {/* Org-Wide Chart + 8-Team Health Matrix */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-[#ecece9] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] lg:col-span-5">
          <h2 className="font-editorial text-xl font-medium text-[#141514]">
            Northstar Organization Vitals
          </h2>
          <p className="mt-1 text-xs text-[#5c635f]">
            72 employees · 8 teams · 12 projects · Pooled mean across teams meeting n≥{data.privacyThreshold}.
          </p>
          <div className="mt-4">
            <VitalTrendsChart
              data={data.orgWeekly}
              height={265}
              projectStartWeek={6}
              interventionWeek={ctx.maxWeek >= 13 ? 12 : undefined}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-[#ecece9] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-editorial text-xl font-medium text-[#141514]">
                All 8 Teams (vs. Internal Baseline)
              </h2>
              <p className="text-xs text-[#5c635f]">
                Click any team to inspect its projects, events, and permission-controlled preferences.
              </p>
            </div>
            <Link href="/teams" className="text-xs font-semibold text-[#237a57] hover:underline">
              All Teams →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#efefec] text-[10px] font-bold uppercase tracking-wider text-[#7c837e]">
                  <th className="py-2.5 pr-3">Team</th>
                  <th className="px-2 py-2.5">Sup</th>
                  <th className="px-2 py-2.5">Ene</th>
                  <th className="px-2 py-2.5">Ali</th>
                  <th className="px-2 py-2.5">Rec</th>
                  <th className="px-2 py-2.5">Saf</th>
                  <th className="py-2.5 pl-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f2]">
                {data.teamSummaries.map((t) => (
                  <tr key={t.id} className="transition hover:bg-[#fafafa]">
                    <td className="py-3 pr-3">
                      <Link href={`/teams/${t.id}`} className="font-semibold text-[#141514] hover:text-[#237a57] hover:underline">
                        {t.name}
                      </Link>
                      <div className="text-[11px] text-[#7c837e]">
                        {t.memberCount} members · {t.projectCount} projects
                      </div>
                    </td>
                    {VITALS.map((v) => {
                      const val = t.current[v];
                      const delta = t.deltaVsBaseline[v];
                      return (
                        <td key={v} className="px-2 py-3">
                          <span className="font-semibold text-[#141514]">{val ?? "—"}</span>
                          {delta !== null && Math.abs(delta) >= 5 && (
                            <span
                              className={`ml-1 text-[10px] font-semibold ${
                                delta <= -8 ? "text-[#946012]" : "text-[#237a57]"
                              }`}
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 pl-2">
                      {t.needsAttention ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fef4db] px-2.5 py-0.5 text-[11px] font-medium text-[#946012]">
                          <AlertTriangle className="h-3 w-3" />
                          Needs support
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f5ee] px-2.5 py-0.5 text-[11px] font-medium text-[#237a57]">
                          <CheckCircle2 className="h-3 w-3" />
                          Steady
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Recent Events & Closed-Loop Outcomes */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#ecece9] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <h2 className="font-editorial text-xl font-medium text-[#141514]">Recent Organizational Events</h2>
          <p className="text-xs text-[#5c635f]">Normalized from simulated project, HRIS, and action connectors.</p>
          <div className="mt-4 space-y-2.5">
            {data.events.slice(0, 5).map((ev) => (
              <div key={ev.id} className="flex items-start justify-between gap-3 rounded-2xl bg-[#fafafa] p-3.5 text-xs">
                <div>
                  <span className="font-semibold text-[#141514]">Wk {ev.weekIndex} · {ev.title}</span>
                  <p className="mt-0.5 text-[#5c635f]">{ev.description}</p>
                </div>
                <span className="shrink-0 text-[11px] text-[#7c837e]">
                  {fmtDate(ev.occurredAt, { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#ecece9] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-editorial text-xl font-medium text-[#141514]">Intervention Outcomes</h2>
              <p className="text-xs text-[#5c635f]">Pre/post Team Vital comparisons two weeks after action.</p>
            </div>
            <Link href="/outcomes" className="text-xs font-semibold text-[#237a57] hover:underline">
              All Outcomes →
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {data.executions.slice(0, 4).map((ex) => (
              <div key={ex.id} className="rounded-2xl bg-[#fafafa] p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#141514]">
                    {ex.intervention.name} · <span className="text-[#237a57]">{ex.team.name}</span>
                  </span>
                  <span className="rounded-full bg-[#e7f5ee] px-2.5 py-0.5 text-[10px] font-semibold text-[#237a57]">
                    {ex.status}
                  </span>
                </div>
                {ex.outcome && <p className="mt-1 text-[#5c635f]">{ex.outcome.outcomeNotes}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
