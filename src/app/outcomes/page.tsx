import Link from "next/link";
import { AlertCircle, CheckCircle2, HeartHandshake, TrendingUp } from "lucide-react";
import { getDemoContext } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { VITALS, type Vital, fmtDate, parseJSON } from "@/lib/domain";

const FEEDBACK_LOOP_STAGES = [
  "1. OBSERVE (Normalized Context)",
  "2. MEASURE TEAM HEALTH (5 Vitals)",
  "3. CONNECT ONTOLOGY CONTEXT",
  "4. GENERATE INSIGHT",
  "5. RECOMMEND INTERVENTION",
  "6. MANAGER APPROVES ACTION",
  "7. INTERVENTION COMPLETED",
  "8. FOLLOW-UP PULSE CHECK",
  "9. MEASURE OUTCOME",
  "10. UPDATE UNDERSTANDING",
];

export default async function OutcomesPage() {
  const ctx = await getDemoContext();

  const executions = await prisma.interventionExecution.findMany({
    include: {
      intervention: true,
      team: true,
      outcome: true,
      actions: { orderBy: { timestamp: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const completedCount = executions.filter((e) => e.status === "COMPLETED" || e.status === "MEASURED").length;
  const completionRate = executions.length ? Math.round((completedCount / executions.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header + 10-Stage Feedback Loop */}
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
              Scene 6 · Closed-Loop Outcomes &amp; Correlational Evidence
            </div>
            <h1 className="mt-1 text-xl font-semibold text-[#1f2421]">
              Intervention Outcomes &amp; Organizational Learning Loop
            </h1>
            <p className="mt-1 max-w-3xl text-xs text-[#4b524e]">
              Every approved intervention is linked to a pre-intervention TeamVitalSnapshot and a follow-up snapshot two
              weeks later. Score changes are reported as <strong>observed before/after differences</strong> — never as
              automatic proof of causation.
            </p>
          </div>
          <div className="rounded-lg bg-[#faf8f3] px-3.5 py-2 text-xs">
            <div className="text-[#5a625d]">Intervention Completion Rate</div>
            <div className="text-lg font-semibold text-[#2f5741]">
              {completedCount}/{executions.length} ({completionRate}%)
            </div>
          </div>
        </div>

        {/* Visual 10-stage feedback loop */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 border-t border-[#eee9dd] pt-4 sm:grid-cols-5">
          {FEEDBACK_LOOP_STAGES.map((stage) => (
            <div key={stage} className="rounded-lg bg-[#eaf2ed] px-2.5 py-2 text-[11px] font-medium text-[#2f5741]">
              {stage}
            </div>
          ))}
        </div>
      </section>

      {ctx.phase === "DISCOVERY" && (
        <div className="rounded-xl border border-[#d9c59a] bg-[#fffcf5] p-4 text-xs text-[#8a570d]">
          <strong>Tip for Scene 5 → Scene 6:</strong> Approve &amp; complete{" "}
          <Link href="/interventions?select=clarify-responsibilities" className="font-semibold underline">
            Clarify Responsibilities
          </Link>{" "}
          for the Community Outreach Team, then click <strong>Advance +2 Weeks (Follow-Up Pulse)</strong> in the top bar
          to generate Week 14 follow-up outcomes (Supported 54 → 68, Aligned 67 → 76).
        </div>
      )}

      {/* Outcome cards */}
      <div className="space-y-4">
        {executions.map((ex) => {
          const out = ex.outcome;
          const scoreChanges = out
            ? parseJSON<Record<Vital, { before: number | null; after: number | null; delta: number | null }>>(
                out.scoreChanges,
                {} as any,
              )
            : null;
          const feedback = out
            ? parseJSON<{ participants: number; helpfulPct: number; themes: string[] }>(out.employeeFeedback, {
                participants: 0,
                helpfulPct: 0,
                themes: [],
              })
            : null;

          return (
            <div
              key={ex.id}
              className={`rounded-xl border p-5 shadow-xs ${
                ex.teamId === "t-outreach" ? "border-[#3d6b52] bg-[#f8fbf9]" : "border-[#dfd9cc] bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eee9dd] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-[#1f2421]">{ex.intervention.name}</span>
                    <span className="rounded bg-[#eaf2ed] px-2 py-0.5 text-[11px] font-semibold text-[#2f5741]">
                      {ex.team.name}
                    </span>
                    <span className="rounded bg-[#f2efe8] px-2 py-0.5 text-[10px] font-medium text-[#454c47]">
                      Status: {ex.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5a625d]">
                    Target Vital: <strong>{ex.intervention.targetVital}</strong> · Completed{" "}
                    {fmtDate(ex.completedAt || ex.approvedAt)} · Follow-up: {fmtDate(ex.followUpDate)}
                  </p>
                </div>

                {out && (
                  <span className="rounded-lg border border-[#c8d8ce] bg-white px-3 py-1 text-xs font-medium text-[#2f5741]">
                    Confidence: {out.confidence}
                  </span>
                )}
              </div>

              {out && scoreChanges ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                    {VITALS.map((v) => {
                      const sc = scoreChanges[v];
                      const isTarget = v === ex.intervention.targetVital;
                      return (
                        <div
                          key={v}
                          className={`rounded-lg border p-3 text-xs ${
                            isTarget ? "border-[#3d6b52] bg-white" : "border-[#ece7dc] bg-[#faf8f3]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#1f2421]">{v}</span>
                            {isTarget && (
                              <span className="rounded bg-[#3d6b52] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                Target
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[#1f2421]">
                            {sc?.before ?? "—"} → {sc?.after ?? "—"}
                          </div>
                          <div
                            className={`text-[11px] font-medium ${
                              (sc?.delta ?? 0) > 0 ? "text-[#2f5741]" : "text-[#5a625d]"
                            }`}
                          >
                            {sc?.delta !== null && sc?.delta !== undefined
                              ? `${sc.delta >= 0 ? "+" : ""}${sc.delta} pts`
                              : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-[#faf8f3] p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#1f2421]">
                        <AlertCircle className="h-3.5 w-3.5 text-[#8a570d]" />
                        Outcome Interpretation &amp; Non-Causation Note
                      </div>
                      <p className="mt-1 text-[#4b524e]">{out.outcomeNotes}</p>
                    </div>
                    {feedback && (
                      <div className="rounded-lg bg-[#faf8f3] p-3 text-xs">
                        <div className="font-semibold text-[#1f2421]">
                          Aggregated Anonymous Participant Feedback (n={feedback.participants}, {feedback.helpfulPct}%
                          found helpful)
                        </div>
                        <ul className="mt-1 space-y-1 text-[#4b524e]">
                          {feedback.themes.map((th) => (
                            <li key={th}>• {th}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-3 rounded-lg bg-[#faf8f3] p-3 text-xs text-[#5a625d]">
                  Intervention is recorded ({ex.status}). Click <strong>Advance +2 Weeks (Follow-Up Pulse)</strong> in
                  the top bar to compute the Week 14 follow-up snapshot and outcome comparison.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
