// Core domain constants shared by seed, analytics, ontology, AI and UI.

export const VITALS = ["Supported", "Energized", "Aligned", "Recognized", "Safe"] as const;
export type Vital = (typeof VITALS)[number];

export const VITAL_FIELD: Record<Vital, "supportedScore" | "energizedScore" | "alignedScore" | "recognizedScore" | "safeScore"> = {
  Supported: "supportedScore",
  Energized: "energizedScore",
  Aligned: "alignedScore",
  Recognized: "recognizedScore",
  Safe: "safeScore",
};

/** Working definitions for the prototype — NOT Sunny's official assessment wording. */
export const VITAL_DEFINITIONS: Record<Vital, string> = {
  Supported: "Employees feel they have the resources, assistance, and support needed to succeed.",
  Energized: "Employees feel motivated, engaged, and able to sustain their work.",
  Aligned: "Employees understand shared goals, priorities, expectations, and responsibilities.",
  Recognized: "Employees feel their contributions and efforts are acknowledged and valued.",
  Safe: "Employees feel comfortable expressing ideas, concerns, questions, and differing perspectives.",
};

export const VITAL_COLORS: Record<Vital, string> = {
  Supported: "#4f7d63",
  Energized: "#c08a2e",
  Aligned: "#4a74a8",
  Recognized: "#9a6aa8",
  Safe: "#3f8f8a",
};

export const METHODOLOGY_VERSION = "synthetic-v1.0";
/** Minimum valid respondents before an aggregate is displayed. */
export const PRIVACY_THRESHOLD = 5;
/** Minimum valid items (of 3) an employee must answer for their vital score to count. */
export const MIN_VALID_ITEMS_PER_VITAL = 2;
/** A change of at least this many points vs. internal baseline is flagged as notable. */
export const NOTABLE_CHANGE = 8;

// ---- Demo timeline -----------------------------------------------------------
// Week 1 starts Monday 2026-08-24. Weeks 1–12 are history. Weeks 13–14 are the follow-up.
export const WEEK1_START = Date.UTC(2026, 7, 24);
export const DAY = 24 * 60 * 60 * 1000;
export const HISTORY_WEEKS = 12;
export const FOLLOW_UP_WEEKS = [13, 14];
export const DISCOVERY_DATE = new Date(Date.UTC(2026, 10, 16, 9)); // Mon 16 Nov 2026
export const FOLLOW_UP_DATE = new Date(Date.UTC(2026, 11, 2, 9)); // Wed 2 Dec 2026

export function weekStart(week: number): Date {
  return new Date(WEEK1_START + (week - 1) * 7 * DAY);
}
export function weekEnd(week: number): Date {
  return new Date(WEEK1_START + week * 7 * DAY - 1000);
}
export function dateInWeek(week: number, dayOffset: number, hour = 10): Date {
  return new Date(WEEK1_START + (week - 1) * 7 * DAY + dayOffset * DAY + hour * 3600 * 1000);
}
export function weekOf(date: Date): number {
  return Math.floor((date.getTime() - WEEK1_START) / (7 * DAY)) + 1;
}

export function fmtDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}
export function fmtWeek(week: number) {
  return `Wk ${week} · ${fmtDate(weekStart(week), { month: "short", day: "numeric" })}`;
}

export type SystemRole = "EMPLOYEE" | "MANAGER" | "HR_ADMIN";

export function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

