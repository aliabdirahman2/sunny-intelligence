# Sunny Workplace Intelligence Layer — Organizational Ontology Prototype

> **Independent Technical Demonstration (100% Synthetic Data).**
> This repository is an interactive prototype built around **Northstar Community Services** (72 synthetic employees, 8 teams, 12 projects, 12+ weeks of historical data). It is not an official Sunny product implementation or a reproduction of Sunny's proprietary assessments or content.

---

## 1. Mission & Positioning

> **Work should be somewhere people feel supported, connected, recognized, safe, and comfortable being themselves — not somewhere they simply survive.**

The central concept of this system is an **organizational ontology**: a shared semantic model of the organization that defines its entities, properties, typed relationships, timestamped events, and employer actions.

- **Not surveillance:** The system never ingests private message content, never scores individual communication volume, never diagnoses mental health or emotional conditions, and never exposes individual weekly pulse survey answers to managers or HR.
- **Action-oriented:** The technical centerpiece is the ontology that connects team health signals to organizational context; the emotional centerpiece is the employer taking a meaningful action (`Clarify Responsibilities`) and measuring whether team conditions improve.

---

## 2. Logical Architecture

```text
                 ORGANIZATIONAL SYSTEMS
             ┌────────┬─────────┬──────────┐
             │ Slack  │ Teams   │ Projects │
             └────┬───┴────┬────┴────┬─────┘
                  │        │         │
                  ▼        ▼         ▼
              CONNECTOR / NORMALIZATION LAYER  (src/lib/connectors/index.ts)
                         │
                         ▼
                 CANONICAL DATA MODEL          (prisma/schema.prisma)
                         │
                         ▼
                  ORGANIZATIONAL ONTOLOGY      (src/lib/ontology/service.ts)
            ┌────────────┼─────────────┐
            │            │             │
         EMPLOYEES      TEAMS        PROJECTS
            │            │             │
            └────────────┼─────────────┘
                         │
                  EVENTS / RELATIONSHIPS
                         │
                         ▼
                   AI REASONING LAYER          (src/lib/ai/reasoning.ts)
                         │
             ┌───────────┴───────────┐
             │                       │
         INSIGHTS              RECOMMENDATIONS
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
                  APPROVED ACTIONS             (src/lib/actions.ts)
                         │
                         ▼
                INTERVENTION OUTCOMES          (src/lib/outcomes.ts)
                         │
                         └──────► FEEDBACK LOOP
```

### Tech Stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Lucide icons, `@xyflow/react` (React Flow ontology graph), `recharts` (five-vital visualizations).
- **Backend:** Next.js Server Actions & Server Components, TypeScript domain services, Prisma ORM, SQLite (`prisma/dev.db` locally; bundled `prisma/demo.db` copied to `/tmp/sunny.db` on read-only serverless platforms such as Vercel).
- **AI Layer:** Deterministic ontology-traversal reasoning engine (`src/lib/ai/reasoning.ts`) that works out of the box with zero external API keys, plus an optional `LLMAdapter` interface.

---

## 3. Running Locally & Resetting the Demo

```bash
# Install dependencies
npm install

# Generate Prisma client, push schema, and seed the deterministic dataset
npm run setup

# Start the local development server on http://localhost:3000
npm run dev
```

### Resetting or Advancing the Demo
- **In the UI:** Use the top-right header controls to switch RBAC roles (`Manager · Dana Whitfield`, `Employee · Jordan Ellis`, `HR / Org Admin · Priya Raman`), click **Advance +2 Weeks (Follow-Up Pulse)** to generate Week 13–14 follow-up snapshots and outcomes, or click **Reset Demo** to restore the initial Week 12 discovery state.
- **Via CLI:**
  ```bash
  npm run db:reset
  ```

---

## 4. Deploying Lightweight to Vercel

This project is pre-configured for zero-config deployment to **Vercel** even though it uses SQLite:
1. A pre-seeded `prisma/demo.db` is committed and included via `outputFileTracingIncludes` in `next.config.ts`.
2. When running on Vercel (`process.env.VERCEL`), `src/lib/db.ts` automatically copies `prisma/demo.db` into `/tmp/sunny.db` so Server Actions (approving interventions, advancing the timeline, resetting the demo, switching roles) remain fully interactive.

---

## 5. Companion Technical Documents
- [ONTOLOGY.md](./ONTOLOGY.md) — Semantic entity definitions, properties, typed relationships, and event provenance.
- [BENCHMARK_METHODOLOGY.md](./BENCHMARK_METHODOLOGY.md) — Five-vital normalization, missing-data rules, privacy thresholds (`n >= 5`), three benchmark tiers, confidence indicators, and validation roadmap.
