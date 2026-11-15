# Organizational Ontology Specification (`ONTOLOGY.md`)

The Sunny Workplace Intelligence prototype models an organization as a **typed semantic graph** persisted in a canonical relational database (`prisma/schema.prisma`) and traversed by both the interactive React Flow explorer (`src/lib/ontology/service.ts`) and the structured AI reasoning engine (`src/lib/ai/reasoning.ts`).

---

## 1. Core Ontology Entity Types

| Entity Type | Persistence Table | Purpose & Key Properties |
|---|---|---|
| `Organization` | `Organization` | Represents the employer (`Northstar Community Services`, `industry`, `createdAt`). |
| `Team` | `Team` | Organizational unit (`name`, `department`, `managerId`, `organizationId`). |
| `Employee` | `Employee` | Individual employee (`name`, `email`, `role`, `department`, `employmentStatus`, `managerId`, `joinedAt`, `systemRole`, `privacySettings`). Access-controlled by RBAC. |
| `Project` | `Project` | Team deliverable (`name`, `description`, `status`, `startDate`, `endDate`, `priority`, `teamId`). |
| `Responsibility` | `Responsibility` | Team-level responsibility within a project (`title`, `addedAt`, `ownership`: `ASSIGNED` \| `SHARED` \| `UNASSIGNED`, `source`). |
| `EnergyProfile` | `EnergyProfile` | Employee-facing, permission-controlled working-preferences profile (`assessmentType`, `assessmentVersion`, `assessedAt`, `workingPreferences`, `collaborationPreferences`, `communicationPreferences`, `sharingPermissions`). Never rewritten from Slack activity; distinct from daily energy and from any Big Five model. |
| `EnergyCheckIn` | `EnergyCheckIn` | Time-dependent self-reported check-in (`timestamp`, `reportedEnergy`, `reportedSupport`, `optionalContext`, `source`, `visibility`: `PRIVATE` \| `SHARED_WITH_MANAGER`). |
| `TeamVitalSnapshot` | `TeamVitalSnapshot` | Weekly aggregated scores for the five Team Vitals (`Supported`, `Energized`, `Aligned`, `Recognized`, `Safe`, `respondentCount`, `responseRate`, `suppressed`, `confidenceLevel`, `methodologyVersion`). |
| `WorkplaceObservation` | `WorkplaceObservation` | Authorized aggregate observation (`source`, `connectorId`, `observationType`, `observedAt`, `summary`, `permissionScope`, `purpose`, `retentionPolicy`, `confidence`). |
| `OrganizationalEvent` | `OrganizationalEvent` | Timestamped change (`ProjectStarted`, `ResponsibilitiesAdded`, `DeadlineChanged`, `ManagerChanged`, `TeamReorganized`, `TeamInterventionCompleted`). |
| `Intervention` | `Intervention` | Configurable workplace action template (`name`, `targetVital`, `secondaryVitals`, `recommendedAudience`, `estimatedDuration`, `instructions`, `expectedOutcome`, `followUpMeasurement`). |
| `InterventionExecution` | `InterventionExecution` | Manager-approved execution (`interventionId`, `teamId`, `managerId`, `status`, `approvedAt`, `completedAt`, `followUpDate`, `announcementText`). |
| `InterventionOutcome` | `InterventionOutcome` | Pre/post comparison (`beforeSnapshotId`, `afterSnapshotId`, `scoreChanges`, `employeeFeedback`, `outcomeNotes`, `confidence`). |

---

## 2. Typed Semantic Relationships

Every edge in the ontology has an explicit type, semantic meaning, and provenance source (`RELATIONSHIP_SEMANTICS` in `src/lib/ontology/service.ts`):

- `Organization HAS_TEAM Team`
- `Organization EMPLOYS Employee`
- `Employee BELONGS_TO Team`
- `Employee REPORTS_TO Employee`
- `Employee HAS_PROFILE EnergyProfile`
- `EnergyCheckIn SUBMITTED_BY Employee`
- `Team WORKS_ON Project`
- `Project HAS_RESPONSIBILITY Responsibility`
- `Project HAS_EVENT OrganizationalEvent`
- `Team HAS_EVENT OrganizationalEvent`
- `Team HAS_VITAL_SNAPSHOT TeamVitalSnapshot`
- `WorkplaceObservation RELATES_TO Project`
- `WorkplaceObservation RELATES_TO Team`
- `WorkplaceObservation RELATES_TO Employee` (only when voluntarily shared by the employee)
- `Team RECEIVES InterventionExecution`
- `InterventionExecution USES Intervention`
- `InterventionExecution PRODUCES InterventionOutcome`
- `InterventionOutcome MEASURED_BY TeamVitalSnapshot`

---

## 3. How the AI Reasoning Engine Traverses the Ontology

Given a question (e.g., *"Why has the Community Outreach Team's support score declined?"*), `runOntologyReasoning()`:
1. Resolves the target `Team` (`t-outreach`).
2. Traverses `HAS_VITAL_SNAPSHOT` to compare the pre-project baseline (`snap-t-outreach-w5`) against the current snapshot (`snap-t-outreach-w12`).
3. Traverses `WORKS_ON` to active `Project` records (`p-food-access`) and `HAS_RESPONSIBILITY` to inspect newly added shared/unassigned responsibilities.
4. Traverses `HAS_EVENT` and `RELATES_TO` to collect coinciding `OrganizationalEvent` and `WorkplaceObservation` nodes in Weeks 6–12.
5. Matches the observed signals (`RESPONSIBILITIES_ADDED`, `DEADLINE_CHANGED`, `PULSE_THEME_CLARITY`) against the `Intervention` library to recommend `Clarify Responsibilities` (`i-clarify`).
6. Returns the exact `reasoningPathNodeIds` so the UI can highlight the traversed subgraph in React Flow.
