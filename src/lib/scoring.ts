// Five-vital scoring methodology (proposed, synthetic-v1.0). See BENCHMARK_METHODOLOGY.md.
// Pure functions — used identically by the seed generator, follow-up generator, and verification.

import { MIN_VALID_ITEMS_PER_VITAL, PRIVACY_THRESHOLD, VITALS, type Vital, round1 } from "./domain";

/** normalizedScore = ((response - 1) / 4) * 100 */
export function normalize(response: number): number {
  return ((response - 1) / 4) * 100;
}

/** Mean of an employee's valid mapped items for one vital, or null if insufficient valid responses. */
export function employeeVitalScore(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
  if (valid.length < MIN_VALID_ITEMS_PER_VITAL) return null;
  return valid.reduce((a, v) => a + normalize(v), 0) / valid.length;
}

export interface ResponseRow {
  employeeId: string;
  itemId: string;
  value: number | null;
}

export interface TeamWeekResult {
  scores: Record<Vital, number | null>;
  vitalRespondents: Record<Vital, number>;
  stdDev: Record<Vital, number>;
  respondentCount: number;
  responseRate: number;
  suppressed: boolean;
  employeeScores: Record<Vital, number[]>;
}

/**
 * Aggregate one team-week. Missing responses are never treated as negative;
 * vitals with fewer than PRIVACY_THRESHOLD valid respondents are suppressed (null).
 */
export function aggregateTeamWeek(rows: ResponseRow[], itemVital: Record<string, Vital>, teamSize: number): TeamWeekResult {
  const byEmp = new Map<string, Record<Vital, (number | null)[]>>();
  for (const r of rows) {
    const vital = itemVital[r.itemId];
    if (!vital) continue; // item not mapped in this methodology version
    let e = byEmp.get(r.employeeId);
    if (!e) {
      e = { Supported: [], Energized: [], Aligned: [], Recognized: [], Safe: [] };
      byEmp.set(r.employeeId, e);
    }
    e[vital].push(r.value);
  }
  const respondentCount = byEmp.size;
  const scores = {} as Record<Vital, number | null>;
  const vitalRespondents = {} as Record<Vital, number>;
  const stdDev = {} as Record<Vital, number>;
  const employeeScores = {} as Record<Vital, number[]>;
  for (const v of VITALS) {
    const s: number[] = [];
    for (const e of byEmp.values()) {
      const sc = employeeVitalScore(e[v]);
      if (sc !== null) s.push(sc);
    }
    employeeScores[v] = s;
    vitalRespondents[v] = s.length;
    const mean = s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
    stdDev[v] = s.length > 1 ? Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / (s.length - 1)) : 0;
    scores[v] = s.length >= PRIVACY_THRESHOLD ? round1(mean) : null;
  }
  return {
    scores,
    vitalRespondents,
    stdDev,
    respondentCount,
    responseRate: teamSize ? respondentCount / teamSize : 0,
    suppressed: respondentCount < PRIVACY_THRESHOLD,
    employeeScores,
  };
}

export type ConfidenceLevel = "HIGH" | "MODERATE" | "LOW" | "SUPPRESSED";

/**
 * Data-quality confidence indicator (NOT psychometric validation).
 * Weighted blend of sample size, response rate, periods observed, variability, methodology stability.
 */
export function confidenceIndicator(input: {
  respondents: number;
  responseRate: number;
  periodsObserved: number;
  meanStdDev: number;
  methodologyStable: boolean;
}): { score: number; level: ConfidenceLevel; factors: Record<string, number> } {
  if (input.respondents < PRIVACY_THRESHOLD) {
    return { score: 0, level: "SUPPRESSED", factors: {} };
  }
  const factors = {
    sampleSize: Math.min(1, input.respondents / 10),
    responseRate: Math.min(1, input.responseRate),
    periodsObserved: Math.min(1, input.periodsObserved / 4),
    consistency: 1 - Math.min(1, input.meanStdDev / 35),
    methodologyStability: input.methodologyStable ? 1 : 0.4,
  };
  const score =
    0.35 * factors.sampleSize +
    0.25 * factors.responseRate +
    0.15 * factors.periodsObserved +
    0.15 * factors.consistency +
    0.1 * factors.methodologyStability;
  const level: ConfidenceLevel = score >= 0.8 ? "HIGH" : score >= 0.6 ? "MODERATE" : "LOW";
  return { score: Math.round(score * 100) / 100, level, factors };
}

/** Pooled organization aggregate from team snapshots (exact: team score is mean of employee scores). */
export function pooledMean(parts: { score: number | null; n: number }[]): { score: number | null; n: number } {
  let sum = 0;
  let n = 0;
  for (const p of parts) {
    if (p.score === null || p.n < PRIVACY_THRESHOLD) continue; // complementary suppression
    sum += p.score * p.n;
    n += p.n;
  }
  return { score: n >= PRIVACY_THRESHOLD ? round1(sum / n) : null, n };
}

export function mean(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

