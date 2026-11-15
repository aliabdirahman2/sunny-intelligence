"use client";

import React, { useState, useTransition } from "react";
import { Lock, Send, Sparkles, UserCheck } from "lucide-react";
import { askEmployeeCoachAction } from "@/lib/actions";

const COACH_PROMPTS = [
  "How should I prepare for my 1:1 with Dana to clarify my outreach tasks?",
  "How can I protect my focus time while Neighborhood Food Access Outreach is busy?",
  "What working preferences am I currently sharing with my manager?",
];

export function EmployeeCoachPanel(props: {
  viewerName: string;
  viewerRole: string;
  initialAnswer: string[];
  initialMode: "gemini" | "deterministic";
  contextUsed: string[];
}) {
  const [question, setQuestion] = useState(COACH_PROMPTS[0]);
  const [answer, setAnswer] = useState(props.initialAnswer);
  const [mode, setMode] = useState(props.initialMode);
  const [contextUsed, setContextUsed] = useState(props.contextUsed);
  const [isPending, startTransition] = useTransition();

  const ask = (q: string) => {
    setQuestion(q);
    startTransition(async () => {
      const res = await askEmployeeCoachAction(q);
      setAnswer(res.answer);
      setMode(res.mode);
      setContextUsed(res.contextUsed);
    });
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#ecece9] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="h-1.5 sunny-frame-gradient" />
        <div className="p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f3] px-3 py-1 text-[11px] font-semibold text-[#237a57]">
                <UserCheck className="h-3.5 w-3.5" />
                EMPLOYEE-FACING AI COACH · {props.viewerName} ({props.viewerRole})
              </div>
              <h1 className="mt-2 font-editorial text-2xl font-normal text-[#141514]">
                Personal Workstyle &amp; Energy Coach
              </h1>
              <p className="mt-1 text-xs text-[#5c635f]">
                Scoped strictly to <strong>your own</strong> Energy Profile, private Energy Check-Ins, and active project
                responsibilities. Never accesses other teammates&apos; private responses.
              </p>
            </div>
            <span className="rounded-full border border-[#e2e2df] bg-[#fafafa] px-3 py-1 text-[11px] font-semibold text-[#141514]">
              {mode === "gemini" ? "Live Gemini Coach" : "Deterministic Coach (Zero-Key)"}
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) ask(question.trim());
            }}
            className="mt-5 flex gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask your personal coach about your energy, 1:1s, or working style..."
              className="flex-1 rounded-full border border-[#e2e2df] bg-[#fafafa] px-4 py-2.5 text-xs text-[#141514] focus:border-[#141514] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#161716] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2b2d2b] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5 text-[#f6d54a]" />
              {isPending ? "Thinking..." : "Ask Coach"}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {COACH_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={isPending}
                onClick={() => ask(p)}
                className="rounded-full border border-[#ecece9] bg-[#fafafa] px-3 py-1 text-[11px] font-medium text-[#454c47] hover:bg-[#f0f0ec]"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="rounded-2xl border border-[#ecece9] bg-[#fafafa] p-5 lg:col-span-8">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#237a57]">
                <Sparkles className="h-4 w-4" />
                Personal Guidance
              </div>
              <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#1c1e1d]">
                {answer.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#ecece9] bg-[#fafafa] p-5 lg:col-span-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#141514]">
                <Lock className="h-3.5 w-3.5 text-[#237a57]" />
                Private Context Boundary
              </div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-[#4b524e]">
                {contextUsed.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

