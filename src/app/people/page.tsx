import Link from "next/link";
import { Lock, ShieldCheck, UserCheck } from "lucide-react";
import { getDemoContext } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { parseJSON } from "@/lib/domain";
import { canViewEnergyProfileSection, parseSharingPermissions } from "@/lib/permissions";

export default async function PeopleDirectoryPage() {
  const ctx = await getDemoContext();
  const employees = await prisma.employee.findMany({
    include: {
      team: true,
      profiles: { where: { isCurrent: true } },
    },
    orderBy: [{ teamId: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
              72 Synthetic Employees · Role-Based Access Control (RBAC)
            </div>
            <h1 className="mt-1 text-xl font-semibold text-[#1f2421]">
              People &amp; Permission-Controlled Energy Profiles
            </h1>
            <p className="mt-1 text-xs text-[#4b524e]">
              Currently viewing as <strong>{ctx.viewer.name} ({ctx.viewer.systemRole})</strong>. Switch roles in the top
              bar to see how Employee, Manager, and HR/Admin views differ. Highlighted personas:{" "}
              <Link href="/people/e-jordan-ellis" className="font-semibold text-[#3d6b52] underline">
                Jordan Ellis (Outreach Specialist)
              </Link>{" "}
              and{" "}
              <Link href="/people/e-dana-whitfield" className="font-semibold text-[#3d6b52] underline">
                Dana Whitfield (Outreach Manager)
              </Link>
              .
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#c8d8ce] bg-[#eaf2ed] px-3 py-1.5 text-xs font-medium text-[#2f5741]">
            <ShieldCheck className="h-3.5 w-3.5" />
            72 / 72 Synthetic Profiles
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => {
          const prof = emp.profiles[0];
          const sharing = prof ? parseSharingPermissions(prof.sharingPermissions) : { manager: [], team: [] };
          const workAccess = prof
            ? canViewEnergyProfileSection(ctx.viewer, emp, sharing, "working")
            : { allowed: false, reason: "No profile" };
          const prefs = prof && workAccess.allowed ? parseJSON<string[]>(prof.workingPreferences, []) : [];

          return (
            <Link
              key={emp.id}
              href={`/people/${emp.id}`}
              className={`block rounded-xl border p-4 shadow-xs transition hover:border-[#3d6b52] ${
                emp.id === "e-jordan-ellis" || emp.id === "e-dana-whitfield"
                  ? "border-[#d9c59a] bg-[#fffcf5]"
                  : "border-[#dfd9cc] bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-[#3d6b52]" />
                    <span className="text-sm font-semibold text-[#1f2421]">{emp.name}</span>
                  </div>
                  <div className="text-xs text-[#5a625d]">
                    {emp.role} · {emp.team.name}
                  </div>
                </div>
                <span className="rounded bg-[#f2efe8] px-2 py-0.5 text-[10px] font-semibold text-[#454c47]">
                  {emp.systemRole}
                </span>
              </div>

              {workAccess.allowed ? (
                <div className="mt-3 space-y-1 text-xs text-[#3f4642]">
                  {prefs.map((p) => (
                    <div key={p}>• {p}</div>
                  ))}
                  <div className="text-[10px] text-[#2f5741]">{workAccess.reason}</div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-1.5 rounded bg-[#f4f1ea] p-2 text-[11px] text-[#5a625d]">
                  <Lock className="h-3 w-3 shrink-0" />
                  <span className="truncate">{workAccess.reason}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

