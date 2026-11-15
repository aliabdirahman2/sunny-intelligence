"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  HeartHandshake,
  HelpCircle,
  Layers,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { askOntologyAIAction } from "@/lib/actions";
import type { ReasoningResult } from "@/lib/ai/reasoning";

const EXAMPLE_QUESTIONS = [
  "Why has the Community Outreach Team's support score declined?",
  "What changed in this team over the past month?",
  "Which projects coincide with changes in Team Vitals?",
  "What intervention would be appropriate?",
  "What happened after the last intervention?",
  "Which teams could benefit from more clarity or support?",
  "How should I approach talking to Jordan Ellis based on their Energy Profile?",
];

export function InsightsWorkbench(props: {
  initialResult: ReasoningResult;
  teams: { id: string; name: string }[];
  initialTeamId: string;
}) {
  const [result, setResult] = useState<ReasoningResult>(props.initialResult);
  const [question, setQuestion] = useState<string>(props.initialResult.question);
  const [teamId, setTeamId] = useState<string>(props.initialTeamId);
  const [isPending, startTransition] = useTransition();

  const runQuery = (q: string, tId = teamId) => {
    setQuestion(q);
    startTransition(async () => {
      const next = await askOntologyAIAction(q, tId);
      setResult(next);
    });
  };

  return (
    <div className="space-y-6">
      {/* Query bar + example questions */}
      <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
              Scene 4 · Structured Ontology Reasoning Engine (No API Key Required)
            </div>
            <h1 className="mt-1 text-xl font-semibold text-[#1f2421]">
              Ask Sunny Intelligence — Evidence-Backed Organizational Reasoning
            </h1>
          </div>
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              runQuery(question, e.target.value);
            }}
            className="rounded-lg border border-[#dfd9cc] bg-[#faf8f3] px-3 py-1.5 text-xs font-medium"
          >
            {props.teams.map((t) => (
              <option key={t.id} value={t.id}>
                Context: {t.name}
              </option>
            ))}
          </select>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) runQuery(question.trim());
          }}
          className="mt-3 flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about team vitals, projects, events, or interventions..."
            className="flex-1 rounded-lg border border-[#dfd9cc] bg-[#faf8f3] px-3.5 py-2 text-xs text-[#1f2421] focus:border-[#3d6b52] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6b52] px-4 py-2 text-xs font-medium text-white hover:bg-[#315843] disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {isPending ? "Traversing Ontology..." : "Reason Across Ontology"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isPending}
              onClick={() => runQuery(q)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                result.question === q
                  ? "border-[#3d6b52] bg-[#eaf2ed] text-[#2f5741]"
                  : "border-[#e6e2d8] bg-[#faf8f3] text-[#454c47] hover:bg-[#ece7dc]"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Main reasoning output + Evidence Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: AI Narrative + Recommended Action */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee9dd] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#3d6b52]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
                  {result.mode === "gemini"
                    ? "Live Gemini + Ontology Tools"
                    : `Deterministic Ontology Engine · ${result.intent}`}
                </span>
              </div>
              <span className="rounded bg-[#f4f1ea] px-2 py-0.5 text-[11px] text-[#5a625d]">
                Window: {result.timePeriod}
              </span>
            </div>

            {result.toolTrace && result.toolTrace.length > 0 && (
              <div className="mt-3 rounded-xl border border-[#e7e3da] bg-[#faf8f3] p-3 text-[11px]">
                <div className="font-semibold text-[#1f2421]">
                  Live Ontology Traversal Steps ({result.toolTrace.length})
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.toolTrace.map((t, idx) => (
                    <span key={idx} className="rounded-lg border border-[#dfd9cc] bg-white px-2 py-1 text-[#2f3632]">
                      <span className="font-mono font-semibold text-[#3d6b52]">{idx + 1}. {t.tool}</span> — {t.summary}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <h2 className="mt-3 text-base font-semibold text-[#1f2421]">{result.headline}</h2>

            <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#2f3632]">
              {result.narrative.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {/* Recommended intervention card */}
            {result.recommendedIntervention && (
              <div className="mt-5 rounded-xl border border-[#c8d8ce] bg-[#eaf2ed] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#2f5741]">
                      Recommended Team-Level Action · Targets {result.recommendedIntervention.targetVital}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-[#1f2421]">
                      {result.recommendedIntervention.name} ({result.recommendedIntervention.estimatedDuration})
                    </div>
                  </div>
                  <Link
                    href={`/interventions?team=${result.teamId ?? "t-outreach"}&select=${result.recommendedIntervention.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6b52] px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#315843]"
                  >
                    <HeartHandshake className="h-3.5 w-3.5" />
                    Preview &amp; Approve Intervention
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <p className="mt-2 text-xs text-[#2f3632]">{result.recommendedIntervention.rationale}</p>
              </div>
            )}

            {/* Traverse path list */}
            <div className="mt-5 border-t border-[#eee9dd] pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5a625d]">
                  Ontology Relationships Traversed ({result.traversedRelationships.length})
                </h3>
                <Link
                  href={`/graph?team=${result.teamId ?? "t-outreach"}&highlight=reasoning`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#3b6491] hover:underline"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  Visualize Reasoning Path in Graph →
                </Link>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {result.traversedRelationships.map((tr, i) => (
                  <div key={i} className="rounded-lg bg-[#faf8f3] px-3 py-2 text-xs">
                    <div className="font-mono text-[11px] text-[#1f2421]">
                      {tr.from} <span className="font-bold text-[#3d6b52]">—[{tr.relationship}]→</span> {tr.to}
                    </div>
                    <div className="text-[11px] text-[#5a625d]">{tr.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Structured Evidence Panel (Required by Spec Section 9) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#eee9dd] pb-3">
              <Layers className="h-4 w-4 text-[#3b6491]" />
              <h2 className="text-sm font-semibold text-[#1f2421]">
                Structured Evidence, Confidence &amp; Uncertainty Panel
              </h2>
            </div>

            <div className="mt-3 rounded-lg bg-[#faf8f3] p-3 text-xs">
              <div className="font-semibold text-[#1f2421]">Evidence Strength &amp; Confidence</div>
              <p className="mt-0.5 text-[#4b524e]">{result.confidence}</p>
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5a625d]">
                Ontology Objects &amp; Sources Used ({result.evidence.length})
              </h3>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                {result.evidence.map((ev) => (
                  <div key={ev.entityId} className="rounded-lg border border-[#ece7dc] bg-[#faf8f3] p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-semibold text-[#3d6b52]">{ev.entityType}</span>
                      <span className="text-[10px] text-[#5a625d]">{ev.timestamp}</span>
                    </div>
                    <div className="mt-0.5 font-semibold text-[#1f2421]">{ev.label}</div>
                    <div className="mt-0.5 text-[11px] text-[#4b524e]">{ev.detail}</div>
                    <div className="mt-1 text-[10px] text-[#5a625d]">
                      Relationship: <code>{ev.relationship}</code> · Source: <code>{ev.source}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3 border-t border-[#eee9dd] pt-3 text-xs">
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-[#8a570d]">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Uncertainty &amp; Epistemic Limitations
                </div>
                <ul className="mt-1 space-y-1 text-[#4b524e]">
                  {result.uncertaintyAndLimitations.map((u) => (
                    <li key={u}>• {u}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-1.5 font-semibold text-[#3b6491]">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Alternative Explanations Considered
                </div>
                <ul className="mt-1 space-y-1 text-[#4b524e]">
                  {result.alternativeExplanations.map((a) => (
                    <li key={a}>• {a}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-1.5 font-semibold text-[#454c47]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Missing Information
                </div>
                <ul className="mt-1 space-y-1 text-[#4b524e]">
                  {result.missingInformation.map((m) => (
                    <li key={m}>• {m}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

