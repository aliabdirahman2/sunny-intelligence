"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FastForward,
  GitBranch,
  HeartHandshake,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  advanceTimelineAction,
  approveAndCompleteInterventionAction,
  resetDemoAction,
} from "@/lib/actions";
import { VitalTrendsChart, type VitalChartPoint } from "./VitalTrendsChart";

export function AhaStoryPanel(props: {
  phase: "DISCOVERY" | "FOLLOW_UP";
  supportedNow: number | null;
  alignedNow: number | null;
  energizedNow: number | null;
  outreachTrend: VitalChartPoint[];
  canApprove: boolean;
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOneClickAction = () => {
    startTransition(async () => {
      await approveAndCompleteInterventionAction({
        interventionId: "i-clarify",
        teamId: "t-outreach",
        announcementText:
          "Hi Community Outreach Team — let's take 30 minutes on Wednesday for Clarify Responsibilities so every new outreach task has a single clear owner and we agree our top 3 priorities.",
        scheduledFor: "2026-11-18T14:00",
        markCompletedImmediately: true,
      });
      await advanceTimelineAction();
    });
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[#ecece9] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      {/* Signature Sunny top accent bar */}
      <div className="h-1.5 sunny-frame-gradient" />

      <div className="p-7">
        {/* Top row: Clear narrative + 1-click Aha controls */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f3] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#3f4441]">
              <span className="h-2 w-2 rounded-full bg-[#3eb489]" />
              {props.phase === "DISCOVERY"
                ? "LIVE ONTOLOGY DEMO · COMMUNITY OUTREACH TEAM (WEEK 12)"
                : "FOLLOW-UP MEASURED · TWO WEEKS AFTER ACTION (WEEK 14)"}
            </div>
            <h1 className="mt-3 font-editorial text-3xl font-normal tracking-tight text-[#141514]">
              {props.phase === "DISCOVERY" ? (
                <>
                  Support dropped from <span className="font-semibold">78 → 54</span>. Here is what changed around the team.
                </>
              ) : (
                <>
                  After clarifying ownership, Support rose <span className="font-semibold text-[#237a57]">54 → {props.supportedNow}</span> &amp; Aligned <span className="font-semibold text-[#237a57]">67 → {props.alignedNow}</span>.
                </>
              )}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#5c635f]">
              {props.phase === "DISCOVERY"
                ? "Instead of guessing or reading private messages, Sunny’s organizational ontology connects the team’s Team Vitals to new project responsibilities, a moved deadline, and aggregated pulse themes — then recommends a 30-minute Connect Guide."
                : "Manager Dana Whitfield ran the 30-minute Clarify Responsibilities Connect Guide. Two weeks later, the Week 14 follow-up pulse shows recovery across Supported and Aligned (correlational observation, not proof of causation)."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {props.phase === "DISCOVERY" ? (
              <button
                type="button"
                disabled={isPending || !props.canApprove}
                onClick={handleOneClickAction}
                className="inline-flex items-center gap-2 rounded-full bg-[#161716] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2b2d2b] disabled:opacity-50"
                title={!props.canApprove ? "Switch to Manager (Dana Whitfield) to approve" : undefined}
              >
                <HeartHandshake className="h-4 w-4 text-[#f6d54a]" />
                {isPending ? "Running Workshop & Advancing +2 Wks..." : "Run “Clarify Responsibilities” & See +2 Wk Outcome"}
                <FastForward className="h-3.5 w-3.5 text-[#8ee3be]" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => resetDemoAction())}
                className="inline-flex items-center gap-2 rounded-full border border-[#e2e2df] bg-white px-4 py-2 text-xs font-semibold text-[#161716] transition hover:bg-[#f5f5f3] disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Replay From Week 12
              </button>
            )}
          </div>
        </div>

        {/* Connected Ontology Chain + Live Trend Chart */}
        <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-12">
          {/* Left 5 cols: Visual Ontology Chain */}
          <div className="space-y-3 lg:col-span-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#7c837e]">
              Connected Ontology Context (4 Linked Nodes)
            </div>

            <div className="space-y-2.5">
              <div className="rounded-2xl border border-[#ededeb] bg-[#fafafa] p-3.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#3b6491]">1. PROJECT LAUNCHED (WK 6)</span>
                  <span className="text-[#7c837e]">WORKS_ON</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-[#141514]">
                  Neighborhood Food Access Outreach
                </div>
                <div className="mt-0.5 text-xs text-[#5c635f]">
                  7 new responsibilities added (several unowned) · Deadline moved 14 days earlier
                </div>
              </div>

              <div className="rounded-2xl border border-[#ededeb] bg-[#fafafa] p-3.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#946012]">2. TEAM-LEVEL SIGNALS (WKS 9–11)</span>
                  <span className="text-[#7c837e]">RELATES_TO</span>
                </div>
                <div className="mt-0.5 text-sm font-semibold text-[#141514]">
                  Workload &amp; Clarity Shift (Aggregate Only)
                </div>
                <div className="mt-0.5 text-xs text-[#5c635f]">
                  Open tasks +61% · Team meetings 4 → 8/wk · 7/10 pulse: “Need clearer ownership”
                </div>
              </div>

              <div className="rounded-2xl border border-[#ededeb] bg-[#fafafa] p-3.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#237a57]">3. TEAM VITALS SNAPSHOT</span>
                  <span className="text-[#7c837e]">HAS_VITAL_SNAPSHOT</span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs">
                  <div>
                    Supported:{" "}
                    <strong className="text-sm text-[#141514]">
                      {props.phase === "DISCOVERY" ? "78 → 54" : `54 → ${props.supportedNow}`}
                    </strong>
                  </div>
                  <div>
                    Aligned:{" "}
                    <strong className="text-sm text-[#141514]">
                      {props.phase === "DISCOVERY" ? "82 → 67" : `67 → ${props.alignedNow}`}
                    </strong>
                  </div>
                  <div>
                    Energized:{" "}
                    <strong className="text-sm text-[#141514]">
                      {props.phase === "DISCOVERY" ? "71 → 64" : `64 → ${props.energizedNow}`}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="sunny-guide-gradient rounded-2xl p-4">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#2f3632]">
                  <span>4. AI RECOMMENDED CONNECT GUIDE</span>
                  <span>30 MIN WORKSHOP</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-editorial text-lg font-medium text-[#141514]">
                    Clarify Responsibilities
                  </span>
                  <Link
                    href="/interventions?select=clarify-responsibilities"
                    className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-[#141514] transition hover:bg-white"
                  >
                    Open Guide <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowReasoning((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e2df] bg-white px-3.5 py-1.5 text-xs font-medium text-[#141514] transition hover:bg-[#f5f5f3]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#3b6491]" />
                {showReasoning ? "Hide AI Reasoning & Uncertainty" : "See AI Reasoning & Uncertainty"}
              </button>
              <Link
                href="/graph?team=t-outreach&highlight=reasoning"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e2df] bg-white px-3.5 py-1.5 text-xs font-medium text-[#141514] transition hover:bg-[#f5f5f3]"
              >
                <GitBranch className="h-3.5 w-3.5 text-[#237a57]" />
                Explore Live Ontology Graph
              </Link>
            </div>
          </div>

          {/* Right 7 cols: Community Outreach Team Live Trajectory */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#ededeb] bg-[#fafafa] p-5 lg:col-span-7">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#141514]">
                  Community Outreach Team — Five Team Vitals
                </h2>
                <p className="text-xs text-[#5c635f]">
                  {props.phase === "DISCOVERY"
                    ? "Weeks 1–12 · Notice Supported & Aligned dipping after the Week 6 project launch."
                    : "Weeks 1–14 · Week 14 follow-up pulse reflects recovery after Week 12 workshop."}
                </p>
              </div>
              <Link href="/teams/t-outreach" className="text-xs font-semibold text-[#237a57] hover:underline">
                Full Team Benchmarks →
              </Link>
            </div>

            <VitalTrendsChart
              data={props.outreachTrend}
              height={280}
              projectStartWeek={6}
              interventionWeek={props.phase === "FOLLOW_UP" ? 12 : undefined}
              highlightVitals={["Supported", "Aligned", "Energized"]}
            />
          </div>
        </div>

        {/* Inline Expandable AI Reasoning & Epistemic Uncertainty */}
        {showReasoning && (
          <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-[#ededeb] bg-[#fafafa] p-5 text-xs md:grid-cols-3">
            <div>
              <div className="font-semibold text-[#141514]">AI Explanation (Deterministic Ontology)</div>
              <p className="mt-1 leading-relaxed text-[#4b524e]">
                Supported (78 → 54) and Aligned (82 → 67) declined after 7 responsibilities were added to{" "}
                <em>Neighborhood Food Access Outreach</em> and the deadline moved 14 days earlier. Aggregated pulse tags
                (7/10) requested clearer ownership.
              </p>
            </div>
            <div>
              <div className="font-semibold text-[#141514]">Confidence &amp; Uncertainty</div>
              <p className="mt-1 leading-relaxed text-[#4b524e]">
                <strong>Moderate</strong> (n=10/11 respondents). Temporal coincidence does not prove causation;
                seasonal community demand or Fall Resource Fair prep may also contribute.
              </p>
            </div>
            <div>
              <div className="font-semibold text-[#141514]">Privacy &amp; Non-Surveillance</div>
              <p className="mt-1 leading-relaxed text-[#4b524e]">
                Zero message bodies read, zero individual productivity scores, and all pulse answers remain strictly
                private (aggregated at n≥5).
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

