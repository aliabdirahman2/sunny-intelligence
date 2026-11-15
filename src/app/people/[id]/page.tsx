import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Eye, Lock, MessageSquare, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import { getDemoContext } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { fmtDate, parseJSON } from "@/lib/domain";
import {
  canViewCheckIn,
  canViewEnergyProfileSection,
  parsePrivacySettings,
  parseSharingPermissions,
} from "@/lib/permissions";
import { SharingPermissionsForm } from "@/components/SharingPermissionsForm";

export default async function EmployeeDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const ctx = await getDemoContext();

  const emp = await prisma.employee.findUnique({
    where: { id },
    include: {
      team: true,
      manager: true,
      profiles: { orderBy: { assessedAt: "desc" } },
      checkIns: { orderBy: { timestamp: "desc" } },
      participations: { include: { project: true } },
    },
  });

  if (!emp) notFound();

  const currentProfile = emp.profiles.find((p) => p.isCurrent) || emp.profiles[0];
  const pastProfiles = emp.profiles.filter((p) => !p.isCurrent);
  const sharing = currentProfile
    ? parseSharingPermissions(currentProfile.sharingPermissions)
    : { manager: [], team: [] };
  const privacy = parsePrivacySettings(emp.privacySettings);

  const workAccess = currentProfile
    ? canViewEnergyProfileSection(ctx.viewer, emp, sharing, "working")
    : { allowed: false, reason: "No profile" };
  const collabAccess = currentProfile
    ? canViewEnergyProfileSection(ctx.viewer, emp, sharing, "collaboration")
    : { allowed: false, reason: "No profile" };
  const commAccess = currentProfile
    ? canViewEnergyProfileSection(ctx.viewer, emp, sharing, "communication")
    : { allowed: false, reason: "No profile" };

  const visibleCheckIns = emp.checkIns.filter((ci) => canViewCheckIn(ctx.viewer, ci, emp.managerId));
  const hiddenCheckInCount = emp.checkIns.length - visibleCheckIns.length;

  const workItems = currentProfile ? parseJSON<string[]>(currentProfile.workingPreferences, []) : [];
  const collabItems = currentProfile ? parseJSON<string[]>(currentProfile.collaborationPreferences, []) : [];
  const commItems = currentProfile ? parseJSON<string[]>(currentProfile.communicationPreferences, []) : [];

  const initials = emp.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pillars = [
    {
      letter: "W",
      kicker: "WORKING STYLE",
      title: workItems[0]?.replace("Prefers ", "") || "Focused & Structured",
      access: workAccess,
      items: workItems,
      strength: "Brings steady focus and clear ownership to complex deliverables when priorities are visible.",
      watchOut: "Multiple unassigned or shifting priorities can drain focus when ownership is unclear.",
      border: "#a5d6c5",
    },
    {
      letter: "C",
      kicker: "COLLABORATION",
      title: collabItems[0]?.replace("Prefers ", "") || "Purposeful Group Work",
      access: collabAccess,
      items: collabItems,
      strength: "Contributes thoughtfully in small-group working sessions and structured brainstorming.",
      watchOut: "Back-to-back unscheduled coordination meetings can crowd out deep execution time.",
      border: "#b8c7f5",
    },
    {
      letter: "M",
      kicker: "COMMUNICATION",
      title: commItems[0]?.replace("Prefers ", "") || "Direct & Prepared",
      access: commAccess,
      items: commItems,
      strength: "Responds well to written context ahead of meetings, concrete examples, and clear next steps.",
      watchOut: "Vague verbal expectations make it harder to know what 'done' looks like.",
      border: "#f0d48a",
    },
  ];

  const atYourBestCards = [
    { icon: Target, text: "Conversations are focused and purposeful" },
    { icon: Clock, text: "There's time to reflect before deciding" },
    { icon: MessageSquare, text: "Others communicate with clarity and intention" },
    { icon: Users, text: "Expectations and ownership are clear" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/people" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3b6491] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Team Directory
        </Link>
        <span className="rounded-full border border-[#dfd9cc] bg-white px-3 py-1 text-xs font-medium text-[#1c1e1d]">
          Viewing as: <strong>{ctx.viewer.name}</strong> ({ctx.viewer.systemRole})
        </span>
      </div>

      {/* Screenshot 1-inspired Dark Charcoal Profile Hero + Sunny Accent */}
      <section className="overflow-hidden rounded-2xl border border-[#2a2d2b] bg-[#242625] text-white shadow-sm">
        <div className="h-2 sunny-frame-gradient" />
        <div className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/25 bg-gradient-to-br from-[#d9c8f7] via-[#b8d8ff] to-[#f6d54a] font-editorial text-xl font-semibold text-[#161716]">
              {initials}
            </div>
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#f6d54a]">
                Synthetic Working-Preferences Profile · Not Sunny&apos;s Proprietary Social Battery
              </div>
              <h1 className="mt-1 font-editorial text-2xl font-semibold text-white">{emp.name}</h1>
              <p className="mt-0.5 text-xs text-[#c7ccc8]">
                {emp.role} ·{" "}
                <Link href={`/teams/${emp.teamId}`} className="font-semibold text-[#8ee3be] hover:underline">
                  {emp.team.name}
                </Link>{" "}
                · Joined {fmtDate(emp.joinedAt)}
                {emp.manager && (
                  <>
                    {" · "}Reports to{" "}
                    <Link href={`/people/${emp.manager.id}`} className="underline">
                      {emp.manager.name}
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-2.5 text-xs leading-relaxed text-[#e1e5e2]">
                {workAccess.allowed
                  ? `You bring steady, thoughtful energy to ${emp.team.name}. Protecting clear ownership and written preparation helps you stay engaged without overextending.`
                  : "Profile summary details are permission-controlled by the employee."}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[11px] text-[#d5dad6]">
            <div className="font-semibold text-white">Privacy &amp; Behavioral Guardrails</div>
            <div className="mt-1">• Weekly pulse answers: Always Private</div>
            <div>• Never auto-rewritten from Slack volume</div>
            <div>• Big Five not merged into Team Vitals</div>
          </div>
        </div>
      </section>

      {/* Screenshot 1-inspired 3-Column Working / Collaboration / Communication Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {pillars.map((p) => (
          <div
            key={p.letter}
            className="rounded-2xl border bg-white p-5 shadow-xs"
            style={{ borderColor: p.border }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#161716] text-sm font-bold text-white">
                {p.letter}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7c837e]">{p.kicker}</div>
                <h2 className="font-editorial text-lg font-semibold capitalize text-[#1c1e1d]">
                  {p.access.allowed ? p.title : "Restricted"}
                </h2>
              </div>
            </div>

            {p.access.allowed ? (
              <div className="mt-4 space-y-3 text-xs">
                <ul className="space-y-1 text-[#1c1e1d]">
                  {p.items.map((it) => (
                    <li key={it} className="font-medium">
                      • {it}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-[#f0ece2] pt-2.5">
                  <div className="flex items-center gap-1 font-semibold text-[#2e6b4e]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Strengths
                  </div>
                  <p className="mt-1 text-[#4b524e]">{p.strength}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 font-semibold text-[#946012]">
                    <Eye className="h-3.5 w-3.5" />
                    Watch Out For
                  </div>
                  <p className="mt-1 text-[#4b524e]">{p.watchOut}</p>
                </div>

                <div className="text-[10px] text-[#5c635f]">{p.access.reason}</div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f4f1ea] p-3 text-xs text-[#5c635f]">
                <Lock className="h-4 w-4 shrink-0" />
                <span>{p.access.reason}</span>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Screenshot 2-inspired "How you work best" + "You're at your best when:" */}
      {workAccess.allowed && (
        <section className="rounded-2xl border border-[#e6e2d8] bg-white p-6 shadow-xs">
          <h2 className="font-editorial text-xl font-semibold text-[#1c1e1d]">How you work best</h2>
          <p className="mt-1 text-xs text-[#5c635f]">
            {currentProfile?.assessmentType} · Version {currentProfile?.assessmentVersion} · Assessed{" "}
            {fmtDate(currentProfile?.assessedAt)}
          </p>

          {commAccess.allowed && currentProfile && (
            <div className="mt-4 rounded-xl border border-[#c8e0d2] bg-[#eef6f1] p-4 text-xs text-[#1c1e1d]">
              <div className="flex items-center gap-1.5 font-semibold text-[#2e6b4e]">
                <Sparkles className="h-4 w-4" />
                Permission-Authorized 1:1 Support Suggestion
              </div>
              <p className="mt-1 text-[#2f3632]">
                Based on {emp.name.split(" ")[0]}&apos;s voluntarily shared preference for{" "}
                <strong>{commItems[0]?.toLowerCase()}</strong>, consider sharing the responsibility matrix in writing
                ahead of your 1:1 and agreeing concrete owners and next steps. (Never used to evaluate performance.)
              </p>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-[#ece7dc] bg-[#faf8f3] p-4">
            <div className="text-center font-editorial text-base font-semibold text-[#1c1e1d]">
              You&apos;re at your best when:
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {atYourBestCards.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.text} className="flex flex-col items-center rounded-xl border border-[#e7e3da] bg-white p-3.5 text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6d54a] text-[#161716]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-[#1c1e1d]">{c.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {pastProfiles.length > 0 && (
            <div className="mt-4 border-t border-[#f0ece2] pt-3 text-xs text-[#5c635f]">
              <span className="font-semibold text-[#1c1e1d]">Reassessment History:</span>{" "}
              {pastProfiles.map((pp) => (
                <span key={pp.id}>
                  {pp.assessmentVersion} ({fmtDate(pp.assessedAt)}): {parseJSON<string[]>(pp.workingPreferences, []).join(", ")}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sharing Permissions & Project Participation */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SharingPermissionsForm
            employeeId={emp.id}
            initialShareManager={privacy.shareProfileWithManager}
            initialShareTeam={privacy.shareProfileWithTeam}
            canEdit={ctx.viewer.id === emp.id}
          />
        </div>

        <div className="rounded-2xl border border-[#e6e2d8] bg-white p-5 shadow-xs lg:col-span-5">
          <h2 className="text-sm font-semibold text-[#1c1e1d]">
            Project Participation ({emp.participations.length})
          </h2>
          <div className="mt-3 space-y-2 text-xs">
            {emp.participations.map((pp) => (
              <div key={pp.id} className="flex items-center justify-between rounded-xl bg-[#faf8f3] p-3">
                <div>
                  <div className="font-semibold text-[#1c1e1d]">{pp.project.name}</div>
                  <div className="text-[11px] text-[#5c635f]">{pp.role}</div>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium text-[#5c635f]">
                  {pp.project.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personal Energy Check-In History */}
      <section className="rounded-2xl border border-[#e6e2d8] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#1c1e1d]">
              Personal Energy Check-Ins (Visible to Current Viewer: {visibleCheckIns.length})
            </h2>
            <p className="text-xs text-[#5c635f]">
              {hiddenCheckInCount > 0
                ? `${hiddenCheckInCount} private check-ins are hidden because ${ctx.viewer.name} is not the employee and those check-ins were marked PRIVATE.`
                : "Showing all check-ins accessible to this viewer."}
            </p>
          </div>
        </div>

        {visibleCheckIns.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {visibleCheckIns.map((ci) => (
              <div key={ci.id} className="rounded-xl border border-[#ece7dc] bg-[#faf8f3] p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1c1e1d]">{fmtDate(ci.timestamp)}</span>
                  <span className="rounded-full bg-[#eaf2ed] px-2 py-0.5 text-[10px] font-medium text-[#2e6b4e]">
                    {ci.visibility}
                  </span>
                </div>
                <div className="mt-1.5 text-[#3f4642]">
                  Reported Support: <strong>{ci.reportedSupport}/5</strong> · Reported Energy:{" "}
                  <strong>{ci.reportedEnergy}/5</strong>
                </div>
                {ci.optionalContext && <p className="mt-1.5 italic text-[#4b524e]">&ldquo;{ci.optionalContext}&rdquo;</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#faf8f3] p-4 text-xs text-[#5c635f]">
            <Lock className="h-4 w-4" />
            <span>
              No personal check-ins are visible to <strong>{ctx.viewer.name} ({ctx.viewer.systemRole})</strong> for{" "}
              {emp.name}. Switch to <strong>Employee · Jordan Ellis</strong> to view Jordan&apos;s private check-in history.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
