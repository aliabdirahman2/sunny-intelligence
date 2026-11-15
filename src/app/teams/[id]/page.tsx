import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  GitBranch,
  HeartHandshake,
  Lock,
  Sparkles,
} from "lucide-react";
import { getDemoContext, getOrgOverviewData } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { VITALS, VITAL_FIELD, type Vital, fmtDate, parseJSON } from "@/lib/domain";
import { canViewEnergyProfileSection, parseSharingPermissions } from "@/lib/permissions";
import { VitalTrendsChart } from "@/components/VitalTrendsChart";

export default async function TeamDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const ctx = await getDemoContext();
  const overview = await getOrgOverviewData(ctx.maxWeek);

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: { profiles: { where: { isCurrent: true } } },
        orderBy: { name: "asc" },
      },
      projects: { include: { responsibilities: true } },
      snapshots: { where: { weekIndex: { lte: ctx.maxWeek } }, orderBy: { weekIndex: "asc" } },
      executions: {
        include: { intervention: true, outcome: true, actions: { orderBy: { timestamp: "asc" } } },
        orderBy: { createdAt: "desc" },
      },
      observations: { where: { weekIndex: { lte: ctx.maxWeek }, deletedAt: null }, orderBy: { observedAt: "desc" } },
    },
  });

  if (!team) notFound();

  const summary = overview.teamSummaries.find((s) => s.id === team.id)!;
  const events = await prisma.organizationalEvent.findMany({
    where: { teamId: team.id, weekIndex: { lte: ctx.maxWeek } },
    orderBy: { occurredAt: "desc" },
  });

  const chartData = team.snapshots.map((s) => ({
    weekIndex: s.weekIndex,
    label: `Wk ${s.weekIndex}`,
    Supported: s.suppressed ? null : s.supportedScore,
    Energized: s.suppressed ? null : s.energizedScore,
    Aligned: s.suppressed ? null : s.alignedScore,
    Recognized: s.suppressed ? null : s.recognizedScore,
    Safe: s.suppressed ? null : s.safeScore,
  }));

  const suppressedWeeks = team.snapshots.filter((s) => s.suppressed);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/teams" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3b6491] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          All Teams
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/graph?team=${team.id}&highlight=reasoning`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#1f2421] hover:bg-[#f2efe8]"
          >
            <GitBranch className="h-3.5 w-3.5 text-[#3b6491]" />
            View in Ontology Graph
          </Link>
          <Link
            href={`/insights?team=${team.id}&q=${encodeURIComponent(`Why has the ${team.name}'s support score declined?`)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b6491] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#31547b]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask AI About {team.name}
          </Link>
          <Link
            href={`/interventions?team=${team.id}&select=clarify-responsibilities`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6b52] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#315843]"
          >
            <HeartHandshake className="h-3.5 w-3.5" />
            Preview &amp; Approve Intervention
          </Link>
        </div>
      </div>

      {/* Header card */}
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
              Scene 2 · Team Detail &amp; Three-Tier Benchmark Comparison
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-[#1f2421]">{team.name}</h1>
            <p className="mt-1 text-xs text-[#4b524e]">
              {team.department} · {team.description}
            </p>
          </div>
          <div className="rounded-lg border border-[#ece7dc] bg-[#faf8f3] p-3 text-xs">
            <div className="font-semibold text-[#1f2421]">Aggregation &amp; Confidence</div>
            <div className="mt-0.5 text-[#5a625d]">
              Latest: {summary.latestSnapshot?.respondentCount}/{team.members.length} respondents (
              {Math.round((summary.latestSnapshot?.responseRate ?? 0) * 100)}%) · Confidence:{" "}
              <strong>{summary.latestSnapshot?.confidenceLevel}</strong>
            </div>
            <div className="text-[11px] text-[#5a625d]">
              Privacy rule: n ≥ 5 required; individual pulse answers are never displayed.
            </div>
          </div>
        </div>

        {/* Five Vitals with Benchmark A (Internal Baseline), Benchmark B (Org Mean), Benchmark C (External Disabled) */}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
          {VITALS.map((v) => {
            const cur = summary.current[v];
            const base = summary.baseline[v];
            const dBase = summary.deltaVsBaseline[v];
            const dOrg = summary.deltaVsOrg[v];
            const w12 = summary.week12Snapshot?.[VITAL_FIELD[v]];
            return (
              <div key={v} className="rounded-xl border border-[#e6e2d8] bg-[#faf8f3] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#454c47]">{v}</span>
                  {dBase !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        dBase <= -8
                          ? "bg-[#f8e9c8] text-[#8a570d]"
                          : dBase >= 4
                            ? "bg-[#eaf2ed] text-[#2f5741]"
                            : "bg-[#ece7dc] text-[#5a625d]"
                      }`}
                    >
                      {dBase >= 0 ? `+${dBase}` : dBase} vs Base
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-[#1f2421]">{cur ?? "Suppressed"}</span>
                  {ctx.maxWeek > 12 && w12 !== null && (
                    <span className="text-[11px] text-[#2f5741]">(Wk 12: {w12})</span>
                  )}
                </div>
                <div className="mt-2 space-y-0.5 border-t border-[#e8e3d7] pt-2 text-[11px] text-[#5a625d]">
                  <div>A · Internal Baseline (Wks 2–5): <strong>{base ?? "—"}</strong></div>
                  <div>
                    B · vs. Organization Mean ({overview.latestOrg[v] ?? "—"}):{" "}
                    <strong>{dOrg !== null ? (dOrg >= 0 ? `+${dOrg}` : dOrg) : "—"}</strong>
                  </div>
                  <div className="text-[10px] text-[#7a827d]">C · External Benchmark: Disabled (awaiting validated norms)</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {suppressedWeeks.length > 0 && (
        <div className="rounded-xl border border-[#d9c59a] bg-[#fffcf5] p-4 text-xs text-[#8a570d]">
          <strong>Privacy Suppression Enforced:</strong> Week(s){" "}
          {suppressedWeeks.map((s) => `${s.weekIndex} (n=${s.respondentCount})`).join(", ")} had fewer than 5 valid
          respondents and are suppressed across charts and historical drill-downs so individual responses cannot be inferred.
        </div>
      )}

      {/* Historical Vital Trend Chart */}
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <h2 className="text-base font-semibold text-[#1f2421]">
          {team.name} — Five Team Vitals Over Time (Weeks 1–{ctx.maxWeek})
        </h2>
        <p className="mb-3 text-xs text-[#5a625d]">
          Normalized 0–100 scale (`((response - 1) / 4) * 100`) calculated identically across all reporting weeks.
        </p>
        <VitalTrendsChart
          data={chartData}
          height={310}
          projectStartWeek={team.id === "t-outreach" ? 6 : undefined}
          interventionWeek={team.id === "t-outreach" && ctx.maxWeek >= 13 ? 12 : undefined}
        />
      </section>

      {/* Connected Projects + Responsibilities + Events */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
          <h2 className="text-base font-semibold text-[#1f2421]">
            Connected Projects &amp; Responsibilities ({team.projects.length})
          </h2>
          <p className="text-xs text-[#5a625d]">
            Ontology relationship: <code>Team WORKS_ON Project HAS_RESPONSIBILITY Responsibility</code>
          </p>
          <div className="mt-4 space-y-4">
            {team.projects.map((p) => {
              const unowned = p.responsibilities.filter((r) => r.ownership !== "ASSIGNED");
              return (
                <div key={p.id} className="rounded-lg border border-[#ece7dc] bg-[#faf8f3] p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1f2421]">{p.name}</span>
                    <span className="rounded bg-[#f8e9c8] px-2 py-0.5 text-[10px] font-semibold text-[#8a570d]">
                      {p.priority} · Due {fmtDate(p.endDate)}
                    </span>
                  </div>
                  <p className="mt-1 text-[#4b524e]">{p.description}</p>
                  <div className="mt-2 text-[11px] text-[#5a625d]">
                    Start: {fmtDate(p.startDate)} · {p.responsibilities.length} responsibilities ({unowned.length} shared or unassigned)
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {p.responsibilities.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded border border-[#e6e2d8] bg-white px-2.5 py-1.5">
                        <span className="truncate font-medium text-[#1f2421]">{r.title}</span>
                        <span
                          className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            r.ownership === "ASSIGNED"
                              ? "bg-[#eaf2ed] text-[#2f5741]"
                              : "bg-[#f8e9c8] text-[#8a570d]"
                          }`}
                        >
                          {r.ownership}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
          <h2 className="text-base font-semibold text-[#1f2421]">
            Coinciding Organizational Events &amp; Workplace Observations
          </h2>
          <p className="text-xs text-[#5a625d]">
            Team- and project-level context only — no message content or individual activity monitoring.
          </p>
          <div className="mt-4 space-y-2.5">
            {events.map((ev) => (
              <div key={ev.id} className="rounded-lg border border-[#ece7dc] bg-[#faf8f3] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1f2421]">
                    Wk {ev.weekIndex} · {ev.title}
                  </span>
                  <span className="text-[11px] text-[#5a625d]">{ev.eventType}</span>
                </div>
                <p className="mt-1 text-[#4b524e]">{ev.description}</p>
              </div>
            ))}
            {team.observations.map((ob) => (
              <div key={ob.id} className="rounded-lg border border-[#e6eef7] bg-[#f6f9fc] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1f2421]">{ob.summary}</span>
                  <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-[#3b6491]">
                    {ob.source} · {ob.permissionScope}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#5a625d]">Purpose: {ob.purpose}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Members & Permission-Aware Working Preferences */}
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#1f2421]">
              Team Members &amp; Voluntarily Shared Working Preferences ({team.members.length})
            </h2>
            <p className="text-xs text-[#5a625d]">
              Viewing as <strong>{ctx.viewer.name} ({ctx.viewer.systemRole})</strong>. Working preferences are shown only
              when the employee has granted sharing permission to the current viewer role.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {team.members.map((m) => {
            const prof = m.profiles[0];
            const sharing = prof ? parseSharingPermissions(prof.sharingPermissions) : { manager: [], team: [] };
            const workAcc = prof
              ? canViewEnergyProfileSection(ctx.viewer, m, sharing, "working")
              : { allowed: false, reason: "No profile" };
            const commAcc = prof
              ? canViewEnergyProfileSection(ctx.viewer, m, sharing, "communication")
              : { allowed: false, reason: "No profile" };
            const workPrefs = prof && workAcc.allowed ? parseJSON<string[]>(prof.workingPreferences, []) : [];
            const commPrefs = prof && commAcc.allowed ? parseJSON<string[]>(prof.communicationPreferences, []) : [];

            return (
              <div key={m.id} className="rounded-lg border border-[#ece7dc] bg-[#faf8f3] p-3.5 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/people/${m.id}`} className="font-semibold text-[#1f2421] hover:text-[#3d6b52] hover:underline">
                      {m.name}
                    </Link>
                    <div className="text-[11px] text-[#5a625d]">{m.role}</div>
                  </div>
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-[#5a625d]">
                    {m.systemRole}
                  </span>
                </div>

                {workAcc.allowed || commAcc.allowed ? (
                  <div className="mt-2.5 space-y-1 text-[11px] text-[#3f4642]">
                    {workPrefs.map((p) => (
                      <div key={p}>• {p}</div>
                    ))}
                    {commPrefs.slice(0, 1).map((p) => (
                      <div key={p} className="text-[#3b6491]">• {p}</div>
                    ))}
                    <div className="pt-1 text-[10px] text-[#5a625d]">{workAcc.reason}</div>
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-center gap-1.5 rounded bg-[#f2efe8] p-2 text-[11px] text-[#5a625d]">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>{workAcc.reason}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
