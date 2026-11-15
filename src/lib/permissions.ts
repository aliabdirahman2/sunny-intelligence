// Role-based access control & privacy enforcement.
// Employee, Manager, and HR/Admin views differ. Individual pulse responses are NEVER exposed.

import type { SystemRole } from "./domain";
import { parseJSON } from "./domain";

export interface Viewer {
  id: string;
  name: string;
  role: string;
  systemRole: SystemRole;
  teamId: string;
}

export interface PrivacySettings {
  shareProfileWithManager: boolean;
  shareProfileWithTeam: boolean;
  shareCheckInsWithManager: boolean;
}

export interface SharingPermissions {
  manager: ("working" | "collaboration" | "communication")[];
  team: ("working" | "collaboration" | "communication")[];
}

export function canViewEnergyProfileSection(
  viewer: Viewer,
  subject: { id: string; teamId: string; managerId: string | null },
  sharing: SharingPermissions,
  section: "working" | "collaboration" | "communication",
): { allowed: boolean; reason: string } {
  if (viewer.id === subject.id) {
    return { allowed: true, reason: "Self-view (employee owns their profile and sharing permissions)" };
  }
  if (viewer.systemRole === "MANAGER" && subject.managerId === viewer.id) {
    const ok = sharing.manager?.includes(section);
    return ok
      ? { allowed: true, reason: "Voluntarily shared by employee with their manager" }
      : { allowed: false, reason: "Employee has not enabled manager sharing for this section" };
  }
  if (viewer.teamId === subject.teamId) {
    const ok = sharing.team?.includes(section);
    return ok
      ? { allowed: true, reason: "Voluntarily shared by employee with teammates" }
      : { allowed: false, reason: "Not shared with teammates" };
  }
  return {
    allowed: false,
    reason:
      viewer.systemRole === "HR_ADMIN"
        ? "HR / Organization Administrators view aggregate trends; individual working-preference profiles require explicit sharing"
        : "Outside viewer's team and not shared",
  };
}

export function canViewCheckIn(
  viewer: Viewer,
  checkIn: { employeeId: string; visibility: string },
  subjectManagerId: string | null,
): boolean {
  if (viewer.id === checkIn.employeeId) return true;
  if (
    checkIn.visibility === "SHARED_WITH_MANAGER" &&
    viewer.systemRole === "MANAGER" &&
    subjectManagerId === viewer.id
  ) {
    return true;
  }
  return false;
}

export function canApproveIntervention(viewer: Viewer, teamId: string, teamManagerId: string | null): boolean {
  if (viewer.systemRole === "HR_ADMIN") return true;
  if (viewer.systemRole === "MANAGER" && (viewer.id === teamManagerId || viewer.teamId === teamId)) return true;
  return false;
}

export function parsePrivacySettings(raw: string): PrivacySettings {
  return parseJSON<PrivacySettings>(raw, {
    shareProfileWithManager: false,
    shareProfileWithTeam: false,
    shareCheckInsWithManager: false,
  });
}

export function parseSharingPermissions(raw: string): SharingPermissions {
  return parseJSON<SharingPermissions>(raw, { manager: [], team: [] });
}
