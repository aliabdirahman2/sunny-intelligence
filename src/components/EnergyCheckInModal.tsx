"use client";

import React, { useState, useTransition } from "react";
import { CheckCircle2, Lock, Smile, X } from "lucide-react";
import { submitEnergyCheckInAction } from "@/lib/actions";

const BANDS = [
  { label: "0%–20%", energy: 1, dot: "#d9534f" },
  { label: "21%–40%", energy: 2, dot: "#e69d35" },
  { label: "41%–70%", energy: 3, dot: "#49a86c" },
  { label: "71%–100%", energy: 5, dot: "#2d8a56" },
];

const REASONS = [
  "Unclear project priorities or ownership",
  "Heavy meeting or coordination cadence",
  "Deep focus / steady progress",
  "Energizing team collaboration",
  "Manageable workload & good support",
];

const MOODS = [
  { label: "Drained", emoji: "😔", support: 2 },
  { label: "Stretched", emoji: "😕", support: 2 },
  { label: "Steady", emoji: "😐", support: 3 },
  { label: "Supported", emoji: "🙂", support: 4 },
  { label: "Energized", emoji: "😊", support: 5 },
];

export function EnergyCheckInModal(props: {
  open: boolean;
  onClose: () => void;
  viewerName: string;
}) {
  const [band, setBand] = useState(BANDS[2]);
  const [reason, setReason] = useState(REASONS[0]);
  const [mood, setMood] = useState(MOODS[2]);
  const [shareWithManager, setShareWithManager] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (!props.open) return null;

  const submit = () => {
    startTransition(async () => {
      await submitEnergyCheckInAction({
        energyBand: band.label,
        reportedEnergy: band.energy,
        reportedSupport: mood.support,
        reason,
        mood: mood.label,
        shareWithManager,
      });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        props.onClose();
      }, 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#e4dfd3] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#eee9dd] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f6d54a] text-[#1c1e1d]">
              <Smile className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1c1e1d]">Your energy check-in</h2>
              <p className="text-[11px] text-[#5c635f]">Simulated Slack / Microsoft Teams daily prompt</p>
            </div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg p-1 text-[#5c635f] hover:bg-[#f2efe8]"
            aria-label="Close check-in modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5 text-xs">
          <p className="text-[#4b524e]">
            Good morning <strong>{props.viewerName}</strong>, time for your check-in.
          </p>

          {/* Q1: Social Energy */}
          <div>
            <div className="font-semibold text-[#1c1e1d]">How much Social Energy do you have right now?</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {BANDS.map((b) => {
                const active = b.label === band.label;
                return (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => setBand(b)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 font-medium transition ${
                      active
                        ? "border-[#1c1e1d] bg-[#faf8f3] text-[#1c1e1d] shadow-xs"
                        : "border-[#e2ddd2] bg-white text-[#4b524e] hover:bg-[#faf8f3]"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.dot }} />
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q2: Biggest reason */}
          <div>
            <div className="font-semibold text-[#1c1e1d]">
              Which of these is the biggest reason for your social battery level?
            </div>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#e2ddd2] bg-[#faf8f3] px-3 py-2 text-xs text-[#1c1e1d]"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Q3: Mood */}
          <div>
            <div className="font-semibold text-[#1c1e1d]">How do you feel about your energy level?</div>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {MOODS.map((m) => {
                const active = m.label === mood.label;
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`flex flex-col items-center rounded-lg border py-2 transition ${
                      active
                        ? "border-[#1c1e1d] bg-[#fef9e2] shadow-xs"
                        : "border-[#e2ddd2] bg-white hover:bg-[#faf8f3]"
                    }`}
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span className="mt-0.5 text-[10px] font-medium text-[#4b524e]">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy consent toggle */}
          <label className="flex items-start gap-2 rounded-lg border border-[#e7e3da] bg-[#faf8f3] p-3">
            <input
              type="checkbox"
              checked={shareWithManager}
              onChange={(e) => setShareWithManager(e.target.checked)}
              className="mt-0.5 accent-[#2e6b4e]"
            />
            <div className="text-[11px] text-[#4b524e]">
              <span className="font-semibold text-[#1c1e1d]">
                Voluntarily share this check-in note with my manager
              </span>
              <div className="mt-0.5 flex items-center gap-1 text-[#5c635f]">
                <Lock className="h-3 w-3" />
                By default, check-ins stay PRIVATE and only contribute to n≥5 team aggregates.
              </div>
            </div>
          </label>

          {done && (
            <div className="flex items-center gap-2 rounded-lg bg-[#eaf2ed] p-2.5 text-xs font-medium text-[#2e6b4e]">
              <CheckCircle2 className="h-4 w-4" />
              Check-in recorded in SQLite ({shareWithManager ? "SHARED_WITH_MANAGER" : "PRIVATE"}).
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#eee9dd] bg-[#faf8f3] px-5 py-3">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg border border-[#dcd7cb] bg-white px-3.5 py-1.5 text-xs font-medium text-[#4b524e] hover:bg-[#f2efe8]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={submit}
            className="rounded-lg bg-[#161716] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#2c2f2d] disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Submit Check-In"}
          </button>
        </div>
      </div>
    </div>
  );
}

