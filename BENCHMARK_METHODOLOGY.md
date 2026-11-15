# Five-Vital Benchmark & Scoring Methodology (`BENCHMARK_METHODOLOGY.md`)

> **Disclaimer:** This document describes a proposed technical methodology (`synthetic-v1.0`) implemented in `src/lib/scoring.ts` for the Sunny Workplace Intelligence prototype. Survey items are synthetic demonstration prompts — not Sunny's proprietary assessment wording or validated psychometric norms.

---

## 1. The Five Team Vitals

| Team Vital | Working Prototype Definition |
|---|---|
| **Supported** | Employees feel they have the resources, assistance, and support needed to succeed. |
| **Energized** | Employees feel motivated, engaged, and able to sustain their work. |
| **Aligned** | Employees understand shared goals, priorities, expectations, and responsibilities. |
| **Recognized** | Employees feel their contributions and efforts are acknowledged and valued. |
| **Safe** | Employees feel comfortable expressing ideas, concerns, questions, and differing perspectives. |

---

## 2. Item-to-Vital Mapping & Normalization (`synthetic-v1.0`)

Each weekly pulse contains 3 configurable items per vital (15 items total, stored in the `AssessmentItem` table) rated on a 1–5 Likert scale (`1 = Strongly disagree` … `5 = Strongly agree`).

1. **Item Normalization (0–100 scale):**
   $$\text{normalizedScore} = \frac{\text{response} - 1}{4} \times 100$$
2. **Employee Vital Score:**
   - Unanswered (`null`) items are excluded from the employee's item average.
   - An employee must answer at least `MIN_VALID_ITEMS_PER_VITAL = 2` of the 3 items for that vital to produce a valid employee vital score; otherwise the employee is excluded from that vital's denominator for that week.
   - Missing responses are **never** treated as negative or zero scores.
3. **Team Vital Snapshot:**
   - The team score for a vital is the arithmetic mean of valid participating employee vital scores in that week, rounded to 0.1.
   - The same formula and weights are applied across all reporting weeks.

---

## 3. Privacy & Aggregation Thresholds

- **Minimum Respondent Threshold (`PRIVACY_THRESHOLD = 5`):** A team vital score is displayed only when at least 5 employees have valid scores for that vital in the period. Smaller groups are suppressed (`suppressed = true`, score set to `null`) — demonstrated in Week 4 of **Finance & Grants** (`n = 4`).
- **No Individual Exposure:** `PulseResponse` rows are marked `PRIVATE` and are never queried or rendered in any manager, team, or HR view.
- **Complementary Suppression:** Organization-wide pooled means (`pooledMean` in `src/lib/scoring.ts`) exclude suppressed team-weeks so small-group values cannot be recovered by subtraction.

---

## 4. Three Benchmark Comparison Tiers

1. **Benchmark A — Internal Baseline (Primary):** Compares a team's current snapshot against its own pre-change baseline window (Weeks 2–5 mean). For **Community Outreach Team**, Supported moves from `78` to `54` (`-24`), Aligned from `82` to `67` (`-15`), and Energized from `71` to `64` (`-7`), then recovers to `68` and `76` in the Week 14 follow-up after the workshop.
2. **Benchmark B — Organization Comparison:** Compares a team's current score against the pooled organization-wide mean for the same week.
3. **Benchmark C — External Benchmark (Disabled in Prototype):** Schema-supported, but explicitly disabled in the UI until validated, consented external cohort norms are supplied.

---

## 5. Data-Quality Confidence Indicator

Each `TeamVitalSnapshot` computes a data-quality indicator (`HIGH` | `MODERATE` | `LOW` | `SUPPRESSED`) from five transparent factors:
- Valid respondent sample size (`35%`)
- Team response rate (`25%`)
- Number of periods observed (`15%`)
- Within-team response consistency / dispersion (`15%`)
- Assessment methodology version stability (`10%`)

This indicator communicates **data completeness and stability**, not psychometric validity.

---

## 6. Ten-Step Psychometric & Benchmark Validation Roadmap

Before deploying production benchmarks, Sunny should:
1. Review and approve official survey items.
2. Map each item to its intended Team Vital in `AssessmentItem`.
3. Lock consistent scoring rules per `methodologyVersion`.
4. Evaluate internal consistency (Cronbach's $\alpha$ / McDonald's $\omega$) across multi-item vitals.
5. Assess test-retest stability across stable periods.
6. Evaluate convergent and discriminant construct validity.
7. Test for response bias and subgroup measurement invariance.
8. Confirm minimum sample thresholds (`n >= 5` vs. `n >= 7` or `10`) for the target threat model.
9. Build an anonymized, consented external benchmark cohort.
10. Version assessment changes and block invalid cross-version comparisons.

