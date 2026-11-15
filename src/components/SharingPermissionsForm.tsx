"use client";

import React, { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { updateSharingPermissionAction } from "@/lib/actions";

export function SharingPermissionsForm(props: {
  employeeId: string;
  initialShareManager: boolean;
  initialShareTeam: boolean;
  canEdit: boolean;
}) {
  const [shareMgr, setShareMgr] = useState(props.initialShareManager);
  const [shareTeam, setShareTeam] = useState(props.initialShareTeam);
  const [isPending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      await updateSharingPermissionAction({
        employeeId: props.employeeId,
        shareWithManager: shareMgr,
        shareWithTeam: shareTeam,
      });
      setSavedMsg("Sharing permissions updated.");
      setTimeout(() => setSavedMsg(null), 2500);
    });
  };

  return (
    <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#3d6b52]" />
        <h2 className="text-sm font-semibold text-[#1f2421]">
          Energy Profile Sharing Permissions (Employee-Controlled)
        </h2>
      </div>
      <p className="mt-1 text-xs text-[#5a625d]">
        Employees control who can view their working-preference profile. Weekly pulse survey answers are always private
        and never shared individually regardless of these toggles.
      </p>

      <div className="mt-4 space-y-2.5 text-xs">
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={shareMgr}
            disabled={!props.canEdit || isPending}
            onChange={(e) => setShareMgr(e.target.checked)}
            className="accent-[#3d6b52]"
          />
          <span>
            Share working, collaboration &amp; communication preferences with my manager (allows personalized 1:1 guidance)
          </span>
        </label>
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={shareTeam}
            disabled={!props.canEdit || isPending}
            onChange={(e) => setShareTeam(e.target.checked)}
            className="accent-[#3d6b52]"
          />
          <span>Share working &amp; collaboration preferences with teammates</span>
        </label>
      </div>

      {props.canEdit ? (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="rounded-lg bg-[#3d6b52] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#315843] disabled:opacity-50"
          >
            Save My Sharing Preferences
          </button>
          {savedMsg && <span className="text-xs font-medium text-[#2f5741]">{savedMsg}</span>}
        </div>
      ) : (
        <p className="mt-3 rounded bg-[#faf8f3] p-2 text-[11px] text-[#5a625d]">
          Switch the top-bar viewer to <strong>Employee · Jordan Ellis</strong> to edit Jordan&apos;s own sharing controls.
        </p>
      )}
    </div>
  );
}
