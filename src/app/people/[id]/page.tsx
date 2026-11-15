import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, ShieldCheck, Sparkles } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/people" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3b6491] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          All People
        </Link>
        <span className="rounded-full bg-[#eaf2ed] px-3 py-1 text-xs font-medium text-[#2f5741]">
          Viewing as: {ctx.viewer.name} ({ctx.viewer.systemRole})
        </span>
      </div>

      {/* Employee Header */}
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
              Synthetic Employee Record · Ontology Entity: Employee
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-[#1f2421]">{emp.name}</h1>
            <p className="text-xs text-[#4b524e]">
              {emp.role} ·{" "}
              <Link href={`/teams/${emp.teamId}`} className="font-semibold text-[#3d6b52] hover:underline">
                {emp.team.name}
              </Link>{" "}
              · Joined {fmtDate(emp.joinedAt)}
            </p>
            {emp.manager && (
              <p className="mt-1 text-xs text-[#5a625d]">
                Reports to:{" "}
                <Link href={`/people/${emp.manager.id}`} className="font-medium text-[#1f2421] hover:underline">
                  {emp.manager.name}
                </Link>
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[#ece7dc] bg-[#faf8f3] p-3 text-xs text-[#4b524e]">
            <div className="font-semibold text-[#1f2421]">Guardrails Active</div>
            <div>• Weekly pulse survey answers: <strong>Always Private</strong> (never shown here)</div>
            <div>• Energy Profile: <strong>Working preferences</strong> (not a daily energy score)</div>
            <div>• Big Five personality model: <strong>Not merged into Team Vitals</strong></div>
          </div>
        </div>
      </section>

      {/* Energy Profile (Permission-Controlled) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1f2421]">
                Energy Profile — Working, Collaboration &amp; Communication Preferences
              </h2>
              <p className="text-xs text-[#5a625d]">
                {currentProfile?.assessmentType} · Version {currentProfile?.assessmentVersion} · Assessed{" "}
                {fmtDate(currentProfile?.assessedAt)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                title: "Working Preferences",
                access: workAccess,
                items: currentProfile ? parseJSON<string[]>(currentProfile.workingPreferences, []) : [],
              },
              {
                title: "Collaboration Preferences",
                access: collabAccess,
                items: currentProfile ? parseJSON<string[]>(currentProfile.collaborationPreferences, []) : [],
              },
              {
                title: "Communication Preferences",
                access: commAccess,
                items: currentProfile ? parseJSON<string[]>(currentProfile.communicationPreferences, []) : [],
              },
            ].map((sec) => (
              <div key={sec.title} className="rounded-lg border border-[#ece7dc] bg-[#faf8f3] p-3.5 text-xs">
                <div className="font-semibold text-[#1f2421]">{sec.title}</div>
                {sec.access.allowed ? (
                  <>
                    <ul className="mt-2 space-y-1 text-[#3f4642]">
                      {sec.items.map((it) => (
                        <li key={it}>• {it}</li>
                      ))}
                    </ul>
                    <div className="mt-2 text-[10px] text-[#2f5741]">{sec.access.reason}</div>
                  </>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 rounded bg-[#f2efe8] p-2 text-[11px] text-[#5a625d]">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>{sec.access.reason}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Manager Personalization Guidance when authorized */}
          {commAccess.allowed && currentProfile && (
            <div className="rounded-lg border border-[#c8d8ce] bg-[#eaf2ed] p-3.5 text-xs text-[#1f2421]">
              <div className="flex items-center gap-1.5 font-semibold text-[#2f5741]">
                <Sparkles className="h-3.5 w-3.5" />
                Permission-Authorized 1:1 Support Suggestion
              </div>
              <p className="mt-1 text-[#2f3632]">
                Based on {emp.name.split(" ")[0]}&apos;s voluntarily shared preference for{" "}
                <strong>{parseJSON<string[]>(currentProfile.communicationPreferences, [])[0]?.toLowerCase()}</strong>,
                consider providing concrete examples, written context ahead of time, and clear next steps when discussing
                project responsibilities. (Never used to evaluate performance.)
              </p>
            </div>
          )}

          {/* Version History */}
          {pastProfiles.length > 0 && workAccess.allowed && (
            <div className="border-t border-[#eee9dd] pt-3 text-xs text-[#5a625d]">
              <div className="font-semibold text-[#1f2421]">Reassessment &amp; Version History</div>
              {pastProfiles.map((pp) => (
                <div key={pp.id} className="mt-1">
                  • {pp.assessmentVersion} ({fmtDate(pp.assessedAt)}):{" "}
                  {parseJSON<string[]>(pp.workingPreferences, []).join(", ")}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sharing permissions editor + project participation */}
        <div className="space-y-4 lg:col-span-5">
          <SharingPermissionsForm
            employeeId={emp.id}
            initialShareManager={privacy.shareProfileWithManager}
            initialShareTeam={privacy.shareProfileWithTeam}
            canEdit={ctx.viewer.id === emp.id}
          />

          <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-[#1f2421]">
              Project Participation ({emp.participations.length})
            </h2>
            <div className="mt-3 space-y-2 text-xs">
              {emp.participations.map((pp) => (
                <div key={pp.id} className="flex items-center justify-between rounded-lg bg-[#faf8f3] p-2.5">
                  <div>
                    <div className="font-semibold text-[#1f2421]">{pp.project.name}</div>
                    <div className="text-[11px] text-[#5a625d]">{pp.role}</div>
                  </div>
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-[#5a625d]">
                    {pp.project.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Personal Energy Check-In History (Filtered by Visibility & Viewer Role) */}
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#1f2421]">
              Personal Energy Check-Ins (Visible to Current Viewer: {visibleCheckIns.length})
            </h2>
            <p className="text-xs text-[#5a625d]">
              {hiddenCheckInCount > 0
                ? `${hiddenCheckInCount} private check-ins are hidden because ${ctx.viewer.name} is not the employee and those check-ins were marked PRIVATE.`
                : "Showing all check-ins accessible to this viewer."}
            </p>
          </div>
        </div>

        {visibleCheckIns.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {visibleCheckIns.map((ci) => (
              <div key={ci.id} className="rounded-lg border border-[#ece7dc] bg-[#faf8f3] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1f2421]">{fmtDate(ci.timestamp)}</span>
                  <span className="rounded bg-[#eaf2ed] px-2 py-0.5 text-[10px] font-medium text-[#2f5741]">
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
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#faf8f3] p-4 text-xs text-[#5a625d]">
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
