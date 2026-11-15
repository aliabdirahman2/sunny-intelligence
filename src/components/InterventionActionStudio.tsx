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
  Sparkles,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
          Scene 5 · Employer Action System &amp; Intervention Library (10 Templates)
        </div>
        <h1 className="mt-1 text-xl font-semibold text-[#1f2421]">
          From Insight to Constructive Workplace Action
        </h1>
        <p className="mt-1 text-xs text-[#4b524e]">
          Select an intervention template below to preview manager instructions, supporting evidence, affected team
          members, simulated team announcement, calendar scheduling, and follow-up pulse measurement. (Generic prototype
          interventions — no actual Slack or email messages are sent.)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: 10 Intervention Templates */}
        <div className="space-y-2.5 lg:col-span-5">
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
                className={`w-full rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-[#3d6b52] bg-[#eaf2ed]/70 shadow-xs"
                    : "border-[#dfd9cc] bg-white hover:bg-[#faf8f3]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#1f2421]">{iv.name}</span>
                  <div className="flex items-center gap-1.5">
                    {isRecommended && (
                      <span className="rounded-full bg-[#3d6b52] px-2 py-0.5 text-[10px] font-semibold text-white">
                        AI Recommended
                      </span>
                    )}
                    <span className="rounded bg-[#f2efe8] px-2 py-0.5 text-[10px] font-semibold text-[#454c47]">
                      {iv.targetVital}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-[#4b524e]">{iv.description}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-[#5a625d]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {iv.estimatedDuration} ({iv.format})
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {iv.recommendedAudience}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Action Approval Studio */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#eee9dd] pb-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
                  Targets Vital: {selected.targetVital}{" "}
                  {selected.secondaryVitals.length > 0 && `(Secondary: ${selected.secondaryVitals.join(", ")})`}
                </div>
                <h2 className="mt-0.5 text-lg font-semibold text-[#1f2421]">{selected.name}</h2>
                <p className="text-xs text-[#5a625d]">
                  Target Entity: <strong>{props.team.name}</strong> ({props.team.memberCount} members) · Duration:{" "}
                  {selected.estimatedDuration}
                </p>
              </div>
              <span className="rounded-lg bg-[#faf8f3] px-2.5 py-1 text-xs font-medium text-[#454c47]">
                Format: {selected.format}
              </span>
            </div>

            {/* Step-by-step manager instructions */}
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5a625d]">
                Manager Facilitation Instructions
              </h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs text-[#2f3632]">
                {selected.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-[#faf8f3] p-3 text-xs">
                <div className="font-semibold text-[#1f2421]">Expected Outcome</div>
                <p className="mt-1 text-[#4b524e]">{selected.expectedOutcome}</p>
              </div>
              <div className="rounded-lg bg-[#faf8f3] p-3 text-xs">
                <div className="font-semibold text-[#1f2421]">Follow-Up Measurement</div>
                <p className="mt-1 text-[#4b524e]">{selected.followUpMeasurement}</p>
              </div>
            </div>

            {/* Simulated Announcement & Calendar Scheduling */}
            <div className="mt-4 space-y-3 border-t border-[#eee9dd] pt-4 text-xs">
              <div>
                <label className="flex items-center gap-1.5 font-semibold text-[#1f2421]">
                  <MessageSquare className="h-3.5 w-3.5 text-[#3d6b52]" />
                  Simulated Team Announcement (Stored Locally — Never Sent Externally)
                </label>
                <textarea
                  rows={4}
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#dfd9cc] bg-[#faf8f3] p-2.5 text-xs text-[#1f2421]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="flex items-center gap-1.5 font-semibold text-[#1f2421]">
                    <Calendar className="h-3.5 w-3.5 text-[#3b6491]" />
                    Simulated Calendar Slot
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#dfd9cc] bg-[#faf8f3] px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 rounded-lg bg-[#faf8f3] p-2.5">
                    <input
                      type="checkbox"
                      checked={markComplete}
                      onChange={(e) => setMarkComplete(e.target.checked)}
                      className="accent-[#3d6b52]"
                    />
                    <span>Record workshop completion &amp; schedule Week 14 follow-up pulse</span>
                  </label>
                </div>
              </div>

              {props.canApprove ? (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleApprove}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#3d6b52] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#315843] disabled:opacity-50"
                  >
                    <HeartHandshake className="h-4 w-4" />
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
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#3b6491] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#31547b] disabled:opacity-50"
                    >
                      <FastForward className="h-4 w-4" />
                      Approve, Complete &amp; Advance +2 Weeks to See Outcome
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-[#f4f1ea] p-3 text-xs text-[#5a625d]">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>
                    Current viewer <strong>{props.viewerName} ({props.viewerRole})</strong> cannot approve manager
                    interventions. Switch to <strong>Manager · Dana Whitfield</strong> in the top bar.
                  </span>
                </div>
              )}

              {confirmation && (
                <div className="rounded-lg border border-[#c8d8ce] bg-[#eaf2ed] p-3 text-xs text-[#2f5741]">
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

            {/* Audit log of recorded employer actions */}
            {props.existingExecution && (
              <div className="mt-5 border-t border-[#eee9dd] pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1f2421]">
                    Recorded Action Audit Trail ({props.existingExecution.status})
                  </span>
                  <Link href="/outcomes" className="font-medium text-[#3b6491] hover:underline">
                    View Measured Outcome →
                  </Link>
                </div>
                <div className="mt-2 space-y-1.5">
                  {props.existingExecution.actions.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded bg-[#faf8f3] px-3 py-1.5">
                      <div>
                        <span className="font-mono text-[10px] font-semibold text-[#3d6b52]">{a.action}</span> ·{" "}
                        <span>{a.details}</span>
                      </div>
                      <span className="text-[10px] text-[#5a625d]">{a.actorRole}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
