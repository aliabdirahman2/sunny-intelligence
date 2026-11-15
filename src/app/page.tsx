import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  HeartHandshake,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { getDemoContext, getOrgOverviewData } from "@/lib/analytics";
import { VITALS, VITAL_DEFINITIONS, fmtDate } from "@/lib/domain";
import { VitalTrendsChart } from "@/components/VitalTrendsChart";

export default async function OrganizationOverviewPage() {
  const ctx = await getDemoContext();
  const data = await getOrgOverviewData(ctx.maxWeek);
  const outreach = data.teamSummaries.find((t) => t.id === "t-outreach")!;

  return (
    <div className="space-y-6">
      {/* Hero Banner: Story & Ontology framing */}
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eaf2ed] px-3 py-1 text-xs font-medium text-[#2f5741]">
              <Layers className="h-3.5 w-3.5" />
              Scene 1 · Organizational System &amp; Shared Semantic Ontology
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1f2421]">
              {data.org.name} — Workplace Intelligence Overview
            </h1>
            <p className="text-sm leading-relaxed text-[#4b524e]">
              Sunny connects teams, projects, responsibilities, timestamped organizational events, permission-controlled
              Energy Profiles, and aggregated five-vital pulse checks into a single <strong>organizational ontology</strong>.
              Instead of monitoring individuals, the system helps employers see where workplace conditions shifted and take
              constructive action.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/teams/t-outreach"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6b52] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#315843]"
            >
              Inspect Community Outreach Team
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/graph?team=t-outreach&highlight=reasoning"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfd9cc] bg-[#faf8f3] px-3.5 py-2 text-xs font-medium text-[#1f2421] hover:bg-[#efeae0]"
            >
              <GitBranch className="h-3.5 w-3.5 text-[#3b6491]" />
              Explore Ontology Graph
            </Link>
          </div>
        </div>

        {/* High-level entity counts from the live ontology */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#eee9dd] pt-4 sm:grid-cols-6">
          <div className="rounded-lg bg-[#faf8f3] p-3">
            <div className="text-xs text-[#5a625d]">Employees</div>
            <div className="text-lg font-semibold text-[#1f2421]">72</div>
            <div className="text-[11px] text-[#5a625d]">8 managers · 64 members</div>
          </div>
          <div className="rounded-lg bg-[#faf8f3] p-3">
            <div className="text-xs text-[#5a625d]">Teams</div>
            <div className="text-lg font-semibold text-[#1f2421]">{data.teamSummaries.length}</div>
            <div className="text-[11px] text-[#5a625d]">Min n≥{data.privacyThreshold} privacy threshold</div>
          </div>
          <div className="rounded-lg bg-[#faf8f3] p-3">
            <div className="text-xs text-[#5a625d]">Active Projects</div>
            <div className="text-lg font-semibold text-[#1f2421]">12</div>
            <div className="text-[11px] text-[#5a625d]">Connected to teams &amp; events</div>
          </div>
          <div className="rounded-lg bg-[#faf8f3] p-3">
            <div className="text-xs text-[#5a625d]">Energy Profiles</div>
            <div className="text-lg font-semibold text-[#1f2421]">72</div>
            <div className="text-[11px] text-[#5a625d]">Permission-controlled</div>
          </div>
          <div className="rounded-lg bg-[#faf8f3] p-3">
            <div className="text-xs text-[#5a625d]">Pulse History</div>
            <div className="text-lg font-semibold text-[#1f2421]">{ctx.maxWeek} weeks</div>
            <div className="text-[11px] text-[#5a625d]">5 Team Vitals · 0–100 scale</div>
          </div>
          <div className="rounded-lg bg-[#faf8f3] p-3">
            <div className="text-xs text-[#5a625d]">Interventions Logged</div>
            <div className="text-lg font-semibold text-[#1f2421]">{data.executions.length}</div>
            <div className="text-[11px] text-[#5a625d]">With follow-up outcomes</div>
          </div>
        </div>
      </section>

      {/* Five Organization-Wide Team Vitals */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {VITALS.map((vital) => {
          const score = data.latestOrg[vital];
          const base = data.baselineOrg[vital];
          const delta = score !== null && base !== null ? Math.round((score - base) * 10) / 10 : null;
          return (
            <div key={vital} className="rounded-xl border border-[#dfd9cc] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5a625d]">{vital}</span>
                {delta !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      delta < -3
                        ? "bg-[#fbf1df] text-[#946012]"
                        : delta > 2
                          ? "bg-[#eaf2ed] text-[#2f5741]"
                          : "bg-[#f2efe8] text-[#5a625d]"
                    }`}
                  >
                    {delta >= 0 ? `+${delta}` : delta} vs Wk 5
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-[#1f2421]">{score ?? "—"}</span>
                <span className="text-xs text-[#5a625d]">/ 100 org mean</span>
              </div>
              <p className="mt-2 text-xs leading-snug text-[#5a625d]">{VITAL_DEFINITIONS[vital]}</p>
            </div>
          );
        })}
      </section>

      {/* Main Spotlight Card: Community Outreach Team Story + AI Reasoning CTA */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#d9c59a] bg-[#fffcf5] p-5 shadow-xs lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8e9c8] px-2.5 py-0.5 text-xs font-medium text-[#8a570d]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Team Context Signal · Coinciding Project Changes
            </span>
            <span className="text-xs text-[#5a625d]">Confidence: Moderate</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-[#1f2421]">
            Community Outreach Team: Supported (78 → {outreach.current.Supported}) &amp; Aligned (82 → {outreach.current.Aligned})
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#4b524e]">
            {ctx.phase === "DISCOVERY" ? (
              <>
                Following the Week 6 launch of <strong>Neighborhood Food Access Outreach</strong>, 7 new responsibilities
                were added (several shared or unassigned) and the deadline moved 14 days earlier. Over Weeks 6–12,{" "}
                <strong>Supported</strong> declined 24 points (78 → 54) and <strong>Aligned</strong> declined 15 points
                (82 → 67).
              </>
            ) : (
              <>
                After Manager Dana Whitfield facilitated <strong>Clarify Responsibilities</strong> in Week 12 and single
                owners were agreed for unowned tasks, the Week 14 follow-up pulse recorded{" "}
                <strong>Supported at {outreach.current.Supported}</strong> (up from 54) and{" "}
                <strong>Aligned at {outreach.current.Aligned}</strong> (up from 67).
              </>
            )}
          </p>

          <div className="mt-4 rounded-lg border border-[#ead9b5] bg-white p-3 text-xs">
            <div className="font-medium text-[#1f2421]">Ontology Traverse Summary</div>
            <ul className="mt-1.5 space-y-1 text-[#4b524e]">
              <li>• <code>Team (Community Outreach)</code> → <code>WORKS_ON</code> → <code>Project (Neighborhood Food Access Outreach)</code></li>
              <li>• <code>Project</code> → <code>HAS_EVENT</code> → <code>ResponsibilitiesAdded (+7)</code> &amp; <code>DeadlineChanged (-14d)</code></li>
              <li>• <code>WorkplaceObservation</code> → 7/10 pulse respondents requested clearer ownership &amp; priorities</li>
              <li>• <strong>Note:</strong> Temporal association does not prove causation.</li>
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/teams/t-outreach"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6b52] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#315843]"
            >
              Open Team Vitals &amp; Context
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/insights?q=Why%20has%20the%20Community%20Outreach%20Team%27s%20support%20score%20declined%3F"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f2421] hover:bg-[#f4f1ea]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#3b6491]" />
              Ask AI Why Support Declined
            </Link>
            <Link
              href="/interventions?select=clarify-responsibilities"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f2421] hover:bg-[#f4f1ea]"
            >
              <HeartHandshake className="h-3.5 w-3.5 text-[#3d6b52]" />
              Preview “Clarify Responsibilities”
            </Link>
          </div>
        </div>

        {/* Organization-Wide Vital Trends Chart */}
        <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs lg:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#1f2421]">
                Organization-Wide Five Team Vitals (Weeks 1–{ctx.maxWeek})
              </h2>
              <p className="text-xs text-[#5a625d]">
                Pooled mean across all reporting employees in teams meeting the n≥{data.privacyThreshold} privacy threshold.
              </p>
            </div>
            <span className="rounded bg-[#f4f1ea] px-2.5 py-1 text-[11px] text-[#5a625d]">
              Methodology: synthetic-v1.0
            </span>
          </div>
          <VitalTrendsChart data={data.orgWeekly} projectStartWeek={6} interventionWeek={ctx.maxWeek >= 13 ? 12 : undefined} />
        </div>
      </section>

      {/* All 8 Teams Matrix with Internal Baseline & Org Comparison */}
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#1f2421]">
              Teams Across Northstar Community Services (Internal Baseline vs. Current)
            </h2>
            <p className="text-xs text-[#5a625d]">
              Benchmark A compares each team against its own Weeks 2–5 internal baseline. Benchmark B compares against the organization mean.
            </p>
          </div>
          <Link href="/teams" className="text-xs font-medium text-[#3b6491] hover:underline">
            View detailed team comparisons →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6e2d8] text-[11px] uppercase tracking-wider text-[#5a625d]">
                <th className="py-2.5 pr-4">Team</th>
                <th className="px-3 py-2.5">Supported</th>
                <th className="px-3 py-2.5">Energized</th>
                <th className="px-3 py-2.5">Aligned</th>
                <th className="px-3 py-2.5">Recognized</th>
                <th className="px-3 py-2.5">Safe</th>
                <th className="px-3 py-2.5">Respondents</th>
                <th className="px-3 py-2.5">Confidence</th>
                <th className="py-2.5 pl-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece2]">
              {data.teamSummaries.map((t) => {
                const snap = t.latestSnapshot;
                return (
                  <tr key={t.id} className={t.id === "t-outreach" ? "bg-[#fffcf5]" : "hover:bg-[#faf8f3]"}>
                    <td className="py-3 pr-4">
                      <Link href={`/teams/${t.id}`} className="font-semibold text-[#1f2421] hover:text-[#3d6b52] hover:underline">
                        {t.name}
                      </Link>
                      <div className="text-[11px] text-[#5a625d]">
                        {t.department} · {t.memberCount} members · {t.projectCount} projects
                      </div>
                    </td>
                    {VITALS.map((v) => {
                      const val = t.current[v];
                      const delta = t.deltaVsBaseline[v];
                      return (
                        <td key={v} className="px-3 py-3">
                          <div className="font-semibold text-[#1f2421]">{val ?? "Suppressed"}</div>
                          {delta !== null && (
                            <div
                              className={`text-[11px] ${
                                delta <= -8
                                  ? "font-medium text-[#946012]"
                                  : delta >= 5
                                    ? "font-medium text-[#2f5741]"
                                    : "text-[#5a625d]"
                              }`}
                            >
                              {delta >= 0 ? `+${delta}` : delta} vs baseline
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-[#454c47]">
                      {snap ? `${snap.respondentCount}/${t.memberCount} (${Math.round(snap.responseRate * 100)}%)` : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-[#f2efe8] px-2 py-0.5 text-[11px] font-medium text-[#454c47]">
                        {snap?.confidenceLevel ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 pl-3">
                      {t.needsAttention ? (
                        <Link
                          href={`/teams/${t.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[#f8e9c8] px-2.5 py-0.5 text-[11px] font-medium text-[#8a570d]"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Support opportunity
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf2ed] px-2.5 py-0.5 text-[11px] font-medium text-[#2f5741]">
                          <CheckCircle2 className="h-3 w-3" />
                          Stable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom grid: Organizational Health Timeline + Completed Interventions */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
          <h2 className="text-base font-semibold text-[#1f2421]">Organizational Health Timeline (Events &amp; Context)</h2>
          <p className="text-xs text-[#5a625d]">
            Normalized events from simulated project, HRIS, and action connectors.
          </p>
          <div className="mt-4 space-y-3">
            {data.events.slice(0, 7).map((ev) => (
              <div key={ev.id} className="flex items-start justify-between gap-3 rounded-lg border border-[#eee9dd] bg-[#faf8f3] p-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#e6eef7] px-1.5 py-0.5 text-[10px] font-semibold text-[#3b6491]">
                      Wk {ev.weekIndex} · {ev.eventType}
                    </span>
                    <span className="font-semibold text-[#1f2421]">{ev.title}</span>
                  </div>
                  <p className="mt-1 text-[#4b524e]">{ev.description}</p>
                </div>
                <span className="shrink-0 text-[11px] text-[#5a625d]">{fmtDate(ev.occurredAt, { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1f2421]">Recent Interventions &amp; Outcomes</h2>
              <p className="text-xs text-[#5a625d]">
                Closed-loop tracking from recommendation to manager approval and follow-up pulse.
              </p>
            </div>
            <Link href="/outcomes" className="text-xs font-medium text-[#3b6491] hover:underline">
              All outcomes →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.executions.slice(0, 5).map((ex) => (
              <div key={ex.id} className="rounded-lg border border-[#eee9dd] bg-[#faf8f3] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1f2421]">
                    {ex.intervention.name} · <span className="text-[#3d6b52]">{ex.team.name}</span>
                  </span>
                  <span className="rounded bg-[#eaf2ed] px-2 py-0.5 text-[10px] font-medium text-[#2f5741]">
                    {ex.status}
                  </span>
                </div>
                <p className="mt-1 text-[#4b524e]">
                  Target Vital: <strong>{ex.intervention.targetVital}</strong> · {ex.notes}
                </p>
                {ex.outcome && (
                  <p className="mt-1 text-[11px] text-[#5a625d]">{ex.outcome.outcomeNotes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

