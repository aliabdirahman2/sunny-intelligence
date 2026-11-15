// Outcome measurement — shared by seed (historical outcomes) and timeline advance (live demo outcome).
// Never claims causation: outcomes record observed before/after changes plus limitations.

import { VITALS, VITAL_FIELD, type Vital, round1 } from "./domain";

type SnapshotLike = {
  id: string;
  weekIndex: number;
  confidenceLevel: string;
  respondentCount: number;
  supportedScore: number | null;
  energizedScore: number | null;
  alignedScore: number | null;
  recognizedScore: number | null;
  safeScore: number | null;
};

export type ScoreChanges = Record<Vital, { before: number | null; after: number | null; delta: number | null }>;

export function computeOutcome(params: {
  interventionName: string;
  targetVital: Vital;
  secondaryVitals: Vital[];
  before: SnapshotLike;
  after: SnapshotLike;
}) {
  const scoreChanges = {} as ScoreChanges;
  for (const v of VITALS) {
    const b = params.before[VITAL_FIELD[v]];
    const a = params.after[VITAL_FIELD[v]];
    scoreChanges[v] = { before: b, after: a, delta: a !== null && b !== null ? round1(a - b) : null };
  }
  const t = scoreChanges[params.targetVital];
  const delta = t.delta ?? 0;
  const lowConfidence = params.before.confidenceLevel === "LOW" || params.after.confidenceLevel === "LOW";
  let confidence: string;
  let headline: string;
  if (t.delta === null) {
    confidence = "INSUFFICIENT DATA";
    headline = `${params.targetVital} could not be compared because one snapshot was suppressed (fewer than 5 respondents).`;
  } else if (Math.abs(delta) < 3) {
    confidence = "INCONCLUSIVE";
    headline = `${params.targetVital} was essentially unchanged (${delta >= 0 ? "+" : ""}${delta} points).`;
  } else if (delta > 0) {
    confidence = lowConfidence ? "LOW" : "MODERATE";
    headline = `${params.targetVital} improved from ${t.before} to ${t.after} (+${delta} points) between the pre-intervention and follow-up snapshots.`;
  } else {
    confidence = lowConfidence ? "LOW" : "MODERATE";
    headline = `${params.targetVital} declined from ${t.before} to ${t.after} (${delta} points) after the intervention.`;
  }
  const outcomeNotes =
    `${headline} This is an observed before/after change, not proof that “${params.interventionName}” caused it: ` +
    `other factors (project phase, seasonality, team changes, response composition) may also contribute, and there is no comparison group.`;
  return { scoreChanges, confidence, outcomeNotes };
}

