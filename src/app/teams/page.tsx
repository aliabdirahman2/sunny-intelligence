import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Shield, Users } from "lucide-react";
import { getDemoContext, getOrgOverviewData } from "@/lib/analytics";
import { VITALS } from "@/lib/domain";

export default async function TeamsIndexPage() {
  const ctx = await getDemoContext();
  const data = await getOrgOverviewData(ctx.maxWeek);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
              Eight Teams · Five-Vital Benchmark Methodology
            </div>
            <h1 className="mt-1 text-xl font-semibold text-[#1f2421]">
              Teams at Northstar Community Services
            </h1>
            <p className="mt-1 text-xs text-[#4b524e]">
              Aggregate Team Vitals are displayed only when at least <strong>n ≥ {data.privacyThreshold}</strong> employees
              submit valid responses. Benchmark A compares each team against its own Weeks 2–5 internal baseline; Benchmark B
              compares against the organization mean; Benchmark C (External Norm) is disabled until validated cohort data is supplied.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#c8d8ce] bg-[#eaf2ed] px-3 py-1.5 text-xs font-medium text-[#2f5741]">
            <Shield className="h-3.5 w-3.5" />
            Individual answers never exposed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.teamSummaries.map((t) => {
          const snap = t.latestSnapshot;
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-5 shadow-xs ${
                t.id === "t-outreach"
                  ? "border-[#d9c59a] bg-[#fffcf5]"
                  : "border-[#dfd9cc] bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/teams/${t.id}`} className="text-base font-semibold text-[#1f2421] hover:underline">
                      {t.name}
                    </Link>
                    {t.needsAttention ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f8e9c8] px-2 py-0.5 text-[11px] font-medium text-[#8a570d]">
                        <AlertTriangle className="h-3 w-3" />
                        Support opportunity
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf2ed] px-2 py-0.5 text-[11px] font-medium text-[#2f5741]">
                        <CheckCircle2 className="h-3 w-3" />
                        Stable
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#5a625d]">
                    {t.department} · {t.memberCount} members · {t.projectCount} active projects
                  </p>
                </div>

                <Link
                  href={`/teams/${t.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#3d6b52] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#315843]"
                >
                  Inspect Team
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <p className="mt-2 text-xs text-[#4b524e]">{t.description}</p>

              <div className="mt-4 grid grid-cols-5 gap-2 border-t border-[#eee9dd] pt-3">
                {VITALS.map((v) => {
                  const cur = t.current[v];
                  const dBase = t.deltaVsBaseline[v];
                  const dOrg = t.deltaVsOrg[v];
                  return (
                    <div key={v} className="rounded-lg bg-[#faf8f3] p-2">
                      <div className="text-[10px] font-semibold uppercase text-[#5a625d]">{v}</div>
                      <div className="mt-0.5 text-base font-semibold text-[#1f2421]">{cur ?? "—"}</div>
                      <div className="text-[10px] text-[#5a625d]">
                        Base: {dBase !== null ? (dBase >= 0 ? `+${dBase}` : dBase) : "—"}
                      </div>
                      <div className="text-[10px] text-[#5a625d]">
                        Org: {dOrg !== null ? (dOrg >= 0 ? `+${dOrg}` : dOrg) : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5a625d]">
                <span>
                  Respondents: {snap ? `${snap.respondentCount}/${t.memberCount} (${Math.round(snap.responseRate * 100)}%)` : "—"}
                </span>
                <span>Confidence: {snap?.confidenceLevel ?? "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

