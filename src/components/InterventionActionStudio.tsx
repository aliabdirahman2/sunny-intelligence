"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FastForward,
  HeartHandshake,
  Lock,
  MessageSquare,
  Users,
} from "lucide-react";
import { advanceTimelineAction, approveAndCompleteInterventionAction } from "@/lib/actions";

export interface InterventionItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  targetVital: string;
  secondaryVitals: string[];
  recommendedAudience: string;
  estimatedDuration: string;
  format: string;
  instructions: string[];
  expectedOutcome: string;
  followUpMeasurement: string;
}

export function InterventionActionStudio(props: {
  interventions: InterventionItem[];
  initialSlug: string;
  team: { id: string; name: string; memberCount: number };
  canApprove: boolean;
  viewerName: string;
  viewerRole: string;
  phase: "DISCOVERY" | "FOLLOW_UP";
  existingExecution: {
    id: string;
    status: string;
    approvedAt: string | null;
    completedAt: string | null;
    announcementText: string | null;
    notes: string | null;
    actions: { id: string; action: string; timestamp: string; details: string; actorRole: string }[];
  } | null;
}) {
  const [selectedSlug, setSelectedSlug] = useState(props.initialSlug || "clarify-responsibilities");
  const selected =
    props.interventions.find((i) => i.slug === selectedSlug) || props.interventions[0];

  const defaultAnnouncement = `Hi ${props.team.name} — with Neighborhood Food Access Outreach ramping up and several new responsibilities added, let's take ${selected.estimatedDuration} on Wednesday for “${selected.name}.” Our goal is to map every active responsibility together, make sure each item has a clear single owner, and agree our top three priorities for the next two weeks. Participation is collaborative and never an individual evaluation.`;

  const [announcement, setAnnouncement] = useState(
    props.existingExecution?.announcementText || defaultAnnouncement,
  );
  const [scheduledDate, setScheduledDate] = useState("2026-11-18T14:00");
  const [markComplete, setMarkComplete] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const handleApprove = () => {
    startTransition(async () => {
      await approveAndCompleteInterventionAction({
        interventionId: selected.id,
        teamId: props.team.id,
        announcementText: announcement,
        scheduledFor: scheduledDate,
        markCompletedImmediately: markComplete,
      });
      setConfirmation(
        `Action recorded in database: “${selected.name}” approved, scheduled, and marked completed for ${props.team.name}. Follow-up pulse scheduled for Dec 2, 2026 (Week 14).`,
      );
    });
  };

  // Group instructions into 3 clean facilitation phases (Screenshot 4 Connect Guide layout)
  const chunkSize = Math.max(1, Math.ceil(selected.instructions.length / 3));
  const phases = [
    {
      num: 1,
      title: "FRAME THE MOMENT",
      steps: selected.instructions.slice(0, chunkSize),
    },
    {
      num: 2,
      title: "FACILITATE TOGETHER",
      steps: selected.instructions.slice(chunkSize, chunkSize * 2),
    },
    {
      num: 3,
      title: "AGREE & FOLLOW THROUGH",
      steps: selected.instructions.slice(chunkSize * 2),
    },
  ].filter((p) => p.steps.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#e6e2d8] bg-white p-5 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#2e6b4e]">
          Scene 5 · Sunny Connect Guides &amp; Employer Action System (10 Templates)
        </div>
        <h1 className="mt-1 font-editorial text-2xl font-semibold text-[#1c1e1d]">
          Connect Guides: From Ontology Insight to Meaningful Team Action
        </h1>
        <p className="mt-1 text-xs text-[#4b524e]">
          Select any Connect Guide below to preview the structured facilitation card, manager instructions, simulated team
          announcement, calendar scheduling, and follow-up pulse measurement. (Generic prototype templates — no actual
          Slack or email messages are sent.)
        </p>
      </div>

      {/* Horizontal / Compact Template Selector */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {props.interventions.map((iv) => {
          const active = iv.slug === selected.slug;
          const isRecommended = iv.slug === "clarify-responsibilities";
          return (
            <button
              key={iv.id}
              type="button"
              onClick={() => {
                setSelectedSlug(iv.slug);
                setAnnouncement(
                  `Hi ${props.team.name} — let's spend ${iv.estimatedDuration} this week on “${iv.name}” so we can support everyone effectively.`,
                );
              }}
              className={`rounded-2xl border p-3.5 text-left transition ${
                active
                  ? "border-[#161716] bg-[#fffdf4] shadow-xs"
                  : "border-[#e6e2d8] bg-white hover:bg-[#faf8f3]"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="rounded-full bg-[#f2efe8] px-2 py-0.5 text-[10px] font-semibold text-[#454c47]">
                  {iv.targetVital}
                </span>
                {isRecommended && (
                  <span className="rounded-full bg-[#f6d54a] px-2 py-0.5 text-[10px] font-bold text-[#161716]">
                    AI Pick
                  </span>
                )}
              </div>
              <div className="mt-2 font-editorial text-sm font-semibold text-[#1c1e1d]">{iv.name}</div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-[#5c635f]">
                <Clock className="h-3 w-3" /> {iv.estimatedDuration}
              </div>
            </button>
          );
        })}
      </div>

      {/* Screenshot 4-inspired Connect Guide Card */}
      <section className="relative overflow-hidden rounded-2xl border border-[#e6e2d8] bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between border-b border-[#f0ece2] pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[#5c635f]">CONNECT GUIDE</span>
            <span className="text-[#9aa19c]">·</span>
            <span className="font-semibold uppercase tracking-wider text-[#2e6b4e]">{selected.targetVital}</span>
          </div>
          <span className="font-editorial text-sm font-semibold text-[#1c1e1d]">Sunny workplace</span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Pastel Lavender-Blue Gradient Card (Screenshot 4) */}
          <div className="sunny-guide-gradient flex flex-col justify-between rounded-2xl p-6 text-[#1c1e1d] lg:col-span-4">
            <div>
              <h2 className="font-editorial text-2xl font-medium leading-tight text-[#161716]">
                {selected.name}
              </h2>
              <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[#2f3632]">
                {selected.format} · LENGTH: {selected.estimatedDuration.toUpperCase()}
              </div>

              <div className="mt-5 space-y-3 text-xs leading-relaxed text-[#252a27]">
                <div>
                  <div className="font-semibold text-[#161716]">When to use:</div>
                  <p className="mt-0.5">{selected.description}</p>
                </div>
                <div>
                  <div className="font-semibold text-[#161716]">Goal:</div>
                  <p className="mt-0.5">{selected.expectedOutcome}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-black/10 pt-3 text-[11px] font-medium text-[#252a27]">
              <Users className="h-3.5 w-3.5" />
              <span>{selected.recommendedAudience}</span>
            </div>
          </div>

          {/* 3 Numbered Step Columns with Orb Badges (Screenshot 4) */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:col-span-8">
            {phases.map((ph) => (
              <div key={ph.num} className="flex flex-col justify-between border-l border-[#f0ece2] pl-4 first:border-l-0 first:pl-0">
                <div>
                  <div className="sunny-orb flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs">
                    {ph.num}
                  </div>
                  <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-[#1c1e1d]">
                    {ph.title}
                  </h3>
                  <ul className="mt-2.5 space-y-2.5 text-xs leading-relaxed text-[#3f4642]">
                    {ph.steps.map((s, idx) => (
                      <li key={idx}>• {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative floating orb (Screenshot 4 touch) */}
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-[#d9c8f7]/45 to-[#9ec5ff]/45 blur-xs" />
      </section>

      {/* Employer Action System: Approve, Announce, Schedule & Measure */}
      <section className="rounded-2xl border border-[#e6e2d8] bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece2] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#1c1e1d]">
              Approve &amp; Record Action for {props.team.name} ({props.team.memberCount} members)
            </h2>
            <p className="text-xs text-[#5c635f]">
              Follow-up measurement: {selected.followUpMeasurement}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <label className="flex items-center gap-1.5 font-semibold text-[#1c1e1d]">
              <MessageSquare className="h-3.5 w-3.5 text-[#2e6b4e]" />
              Simulated Team Announcement (Stored Locally — Never Sent Externally)
            </label>
            <textarea
              rows={3}
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#dfd9cc] bg-[#faf8f3] p-3 text-xs text-[#1c1e1d]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-[#1c1e1d]">
                <Calendar className="h-3.5 w-3.5 text-[#3b6491]" />
                Simulated Calendar Slot
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#dfd9cc] bg-[#faf8f3] px-3 py-2 text-xs"
              />
            </div>
            <div className="flex items-end">
              <label className="flex w-full items-center gap-2 rounded-xl border border-[#ece7dc] bg-[#faf8f3] p-2.5">
                <input
                  type="checkbox"
                  checked={markComplete}
                  onChange={(e) => setMarkComplete(e.target.checked)}
                  className="accent-[#2e6b4e]"
                />
                <span>Record workshop completion &amp; schedule Week 14 follow-up pulse</span>
              </label>
            </div>
          </div>

          {props.canApprove ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={isPending}
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#161716] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#2c2f2d] disabled:opacity-50"
              >
                <HeartHandshake className="h-4 w-4 text-[#f6d54a]" />
                {isPending ? "Recording Action..." : `Approve & Complete “${selected.name}”`}
              </button>

              {props.phase === "DISCOVERY" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await approveAndCompleteInterventionAction({
                        interventionId: selected.id,
                        teamId: props.team.id,
                        announcementText: announcement,
                        scheduledFor: scheduledDate,
                        markCompletedImmediately: true,
                      });
                      await advanceTimelineAction();
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#3eb489] px-5 py-2.5 text-xs font-semibold text-[#0e261c] shadow-xs hover:bg-[#349e77] disabled:opacity-50"
                >
                  <FastForward className="h-4 w-4" />
                  Approve, Complete &amp; Advance +2 Weeks to See Outcome
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-[#f4f1ea] p-3 text-xs text-[#5c635f]">
              <Lock className="h-4 w-4 shrink-0" />
              <span>
                Current viewer <strong>{props.viewerName} ({props.viewerRole})</strong> cannot approve manager
                interventions. Switch to <strong>Manager · Dana Whitfield</strong> in the top bar.
              </span>
            </div>
          )}

          {confirmation && (
            <div className="rounded-xl border border-[#c8d8ce] bg-[#eaf2ed] p-3.5 text-xs text-[#2e6b4e]">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {confirmation}
              </div>
              <div className="mt-1.5">
                <Link href="/outcomes" className="font-semibold underline">
                  Open Outcomes &amp; Feedback Loop →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Audit trail */}
        {props.existingExecution && (
          <div className="mt-5 border-t border-[#f0ece2] pt-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#1c1e1d]">
                Recorded Action Audit Trail ({props.existingExecution.status})
              </span>
              <Link href="/outcomes" className="font-medium text-[#3b6491] hover:underline">
                View Measured Outcome →
              </Link>
            </div>
            <div className="mt-2 space-y-1.5">
              {props.existingExecution.actions.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-[#faf8f3] px-3 py-2">
                  <div>
                    <span className="font-mono text-[10px] font-semibold text-[#2e6b4e]">{a.action}</span> ·{" "}
                    <span>{a.details}</span>
                  </div>
                  <span className="text-[10px] text-[#5c635f]">{a.actorRole}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
