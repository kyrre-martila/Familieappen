# Helseplan: backend, API and persistence

This document records the Run 1 persistence foundation and the Run 2 API/service boundary for **Helseplan**. There is no UI, notification job, dashboard integration, measurement model, plan-copying feature, occurrence generator, or medical decision logic. The NestJS module is named `health-plans` to avoid confusion with the existing system `/health` endpoint.

## Domain shape

The fixed hierarchy is:

`HealthPlan -> HealthPlanLevel -> HealthPlanStep -> HealthPlanSchedule -> HealthPlanAction`

A plan belongs to one `Family` and one `FamilyMember`. The composite foreign key `(familyMemberId, familyId)` proves at database level that the subject belongs to the same family. API code must still obtain family context from authenticated membership (for example, the existing `FamilyAuthorizationService`) rather than trusting a body/query `familyId`.

Levels are linear integer positions. Level `0` is Basisplan; subsequent contiguous indexes are Trinn 1, Trinn 2, and so on. `@@unique([healthPlanId, levelIndex])` and `@@unique([levelId, stepOrder])` prevent ambiguous ordering. The domain validator additionally requires a base level, contiguous level indexes, at least one step per level, and zero-based contiguous step ordering. These multi-row rules must be checked in the same transaction that creates or edits a definition.

There is intentionally no transition table or graph. API commands in Run 2 may only select adjacent levels manually. Automatic movement is represented only by `HealthPlanStep.autoAdvance` and a positive `durationDays`, and only means following the next ordered step in the same level. Open-ended steps have `durationDays = null` and cannot auto-advance. The database checks the row-level part of this rule.

## Active state and pause semantics

`HealthPlan.status` uses `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED`, and `ARCHIVED`. Archive is the normal removal mechanism. Family, member, occurrence, notes, and history relations use `RESTRICT` where deletion would destroy or detach audit data. Configuration can cascade only while its parent plan is actually deletable; history/occurrence references prevent deletion after meaningful use.

`activeLevelId` and `activeStepId` are nullable together. Composite foreign keys guarantee both belong to the plan, and a deferred constraint trigger guarantees that the active step belongs to the active level. This permits creating a draft plan first, then its definition, then selecting its pointers within one transaction.

`activeLevelStartedAt` and `activeStepStartedAt` are the separate logical starts of the current level and step progress windows. `pausedAt` is populated exactly while status is `PAUSED`. Resume shifts both active start timestamps forward by `resumedAt - pausedAt`. Consequently paused wall-clock time is excluded from duration calculation, without accumulating a lossy counter. Pause and resume operations must update the plan and append history atomically.

The database also rejects start timestamps without their corresponding pointer (and pointers without start timestamps), requires pointers for `ACTIVE`/`PAUSED`, and forbids pointers for `DRAFT`. A completed or archived plan may retain its final pointers and starts as useful terminal context. These are deliberately state-shape checks, not a workflow engine: allowed status transitions and timestamp ordering remain service policy.

## Schedules and time zones

A step may have any number of schedules and each schedule owns one or more ordered actions. The three recurrence shapes are:

- `DAILY`: no weekday, interval, or anchor fields;
- `WEEKDAYS`: one or more unique ISO weekdays (`1` Monday through `7` Sunday);
- `INTERVAL_DAYS`: a positive `intervalDays` and a calendar `anchorDate`.

The database enforces the shape except duplicate weekday array entries, which the domain validator rejects. `localTime` is PostgreSQL `TIME(0)`, `anchorDate` is `DATE`, and `timezone` is an IANA zone with `Europe/Oslo` as the default. A future occurrence generator must combine the calendar date and local time in the stored IANA zone before converting to UTC. It must use a time-zone-aware library and explicitly define behavior for DST gaps/overlaps; it must not add 24-hour UTC durations to generate local daily times. The interval predicate is the number of local calendar days from `anchorDate`, modulo `intervalDays`, which makes “every other day” deterministic.

Schedules and actions are version-like rows: editing a schedule/action that may have generated occurrences retires it (`retiredAt`) and creates replacement rows rather than mutating it. Both row types have `effectiveFrom`, and the database rejects a `retiredAt` before it. Schedule retirement is not sufficient for action-only edits: an action replacement can remain under the same schedule, so its own effective range identifies when it became eligible for generation.

Retired action versions may reuse `(scheduleId, sortOrder)`. PostgreSQL enforces that only one **unretired** action occupies a given order using the partial unique index `health_plan_actions_active_sort_order_key ... WHERE "retiredAt" IS NULL`. Prisma cannot express partial indexes, so there is intentionally no matching `@@unique` in `schema.prisma`; the adjacent schema comment and migration SQL are the source of truth. Replacement must retire the old row before inserting the active replacement (in one transaction). Run 2 must select only schedule/action versions whose effective range contains the generated instant and must never repoint an existing occurrence.

## Occurrences and immutable history

A `HealthPlanOccurrence` is one action at one instant, so completion is naturally individual per action. `scheduledAt` is the current time (and may move for snooze/reschedule); `originalScheduledAt` is immutable and participates with `sourceActionId` in an idempotency key. `timezone`, `actionTitle`, and `actionInstruction` are snapshots. Later schedule/action edits therefore cannot rewrite what a historical occurrence said or when its original event was generated.

Occurrence statuses are `PENDING`, `COMPLETED`, `SKIPPED`, and `SNOOZED`. `MISSED` is **derived**, not stored: a pending occurrence is missed when `scheduledAt` is before the evaluation time. Storing it would require a time-based mutation and could become inconsistent. Run 2 should define the grace boundary, if one is desired, in API policy.

A snooze keeps `originalScheduledAt`, changes `scheduledAt`, and sets `SNOOZED`; Run 2 must define when it returns to pending. Completion requires `completedAt`; the database ensures only completed rows have that timestamp. `completedByUserId` is forbidden for every non-completed status, but is nullable for a completed row because deleting the referenced user uses `SET NULL`. Actor foreign keys therefore do not destroy occurrences.

`(sourceActionId, originalScheduledAt)` remains the idempotency key. Recreated actions receive a new immutable ID, so action versions cannot collide. A snooze changes neither component. PostgreSQL timestamps represent instants, so two local times in a DST overlap become distinct UTC instants once Run 2 applies its explicit overlap policy. Multiple actions at the same instant are distinct by action ID. The generator must reuse the same source action version on retries; creating a new version is a definition edit, not a retry mechanism.

`HealthPlanNote` supports a plan note (neither target set), an occurrence note, or an action-definition note. It stores unstructured text only. The `num_nonnulls` check permits zero or one specific target and rejects two. Deferred database constraint triggers prove that a targeted occurrence/action belongs to the note's plan and that an occurrence's source action belongs to its plan. Relations are restricted so notes and occurrences cannot be orphaned.

## Database-only constraints and migration discipline

Prisma models the columns, nullability, enums, relations, referential actions, ordinary indexes, and ordinary unique constraints. It cannot currently declare this foundation's CHECK constraints, partial unique action index, or deferred PL/pgSQL constraint triggers. Those objects live in `20260910120000_health_plans_foundation/migration.sql` and are intentional, not schema drift to remove. Future migrations must preserve and, when affected columns change, explicitly update them. In particular, do not replace the partial action index with a normal `@@unique`, and inspect generated migration SQL before applying it.

The database-only rules cover recurrence/effective-range shapes, action ordering, occurrence completion actor/state, note target cardinality, active pointer/status/timestamp shape, active step-to-level membership, and same-plan occurrence/note targets. Unit tests and SQL text assertions protect domain behavior and the presence of this custom SQL; only applying the migration and exercising it against PostgreSQL validates PostgreSQL syntax and runtime constraint behavior.

A single append-only `HealthPlanHistory` is used rather than separate tables because all required lifecycle changes share actor/time/type/metadata semantics and are queried as one timeline. Its enum records creation, pause, resume, level increase/decrease, step advance, and status change. Metadata carries event-specific snapshots such as from/to IDs and indexes. `actorDisplayName` preserves useful audit display when the optional user FK is later cleared. Definition versioning remains in definition tables rather than overloading lifecycle history.

## Run 2 HTTP API and authorization

All routes require the normal auth guard and `X-Family-Id`. The family header is treated only as authenticated context through `FamilyAuthorizationService`; no DTO accepts `familyId`. Plan reads use `(id, familyId)`, and occurrence, action, and note targets are additionally proven to belong to that plan. A resource in another family therefore has the same not-found result as a nonexistent resource.

The API is `GET/POST /health-plans`, `GET/PATCH /health-plans/:id`, command POSTs at `start`, `pause`, `resume`, `level-up`, `level-down`, `advance-step`, and `archive`, plus `notes`, `history`, and the nested occurrence list/update routes. `advance-step` is exposed as an authenticated explicit command for testing and future job integration; it performs no time calculation or scheduling.

Create accepts the complete level/step/schedule/action tree and commits it with `CREATED` history in one transaction. It defaults to `DRAFT`. Limits are: name 120, plan description 2,000, action title 160, action instruction 2,000, note 4,000 characters; 10 levels, 20 steps per level, 20 schedules per step, and 20 actions per schedule. Names are trimmed, orderings and recurrence shapes are validated, local time is strict, and timezone must be recognized by `Intl`.

## Lifecycle, concurrency, and idempotency policy

Allowed transitions are `DRAFT -> ACTIVE`, `ACTIVE -> PAUSED`, `PAUSED -> ACTIVE`, and any non-archived state (including `COMPLETED`) to `ARCHIVED`. Level and step commands require `ACTIVE`. Level movement is exactly one adjacent level; entering any level always selects its first step and resets both clocks. There is intentionally no remembered per-level step. Step advance requires `autoAdvance`, a duration, and the next step in the same level; the final step returns conflict and never causes a level increase.

Each lifecycle command reads and writes in one Prisma transaction. Its conditional update includes family, prior status, and `updatedAt`, so only one contender commits; history is in the same transaction. Occurrence resolution similarly compares prior status and `updatedAt`. Commands are intentionally **conflict-idempotent** rather than silently idempotent: replaying pause/start/completion after success returns conflict, which prevents an old client from appearing to apply a new transition. Clients should reload after HTTP 409.

Resume uses the domain helper and moves both progress clocks by exactly the pause duration. Archive retains active pointers as terminal context, clears `pausedAt`, writes status history, and is irreversible in v1. Archived plans remain readable/auditable but reject lifecycle commands and edits. No hard-delete route exists.

## Definition editing and pending occurrences

Plan name and description may be updated in place. Run 2 deliberately offers a narrow action edit rather than arbitrary structural replacement. An action with no occurrences is updated in place. Once referenced, it is retired first and a replacement at the same active sort order is inserted atomically; existing occurrences keep their immutable action/time/title/instruction snapshots and are never repointed.

When replacing a used action, future `PENDING` or `SNOOZED` occurrences from the retired version are deterministically marked `SKIPPED`. Past, completed, and already skipped occurrences are untouched. Run 2 does not create replacement occurrences, because doing so belongs to the generator. This avoids old/new duplicate future work while preserving audit data. Schedule and structural editing are intentionally deferred until their replacement semantics can be coupled to Run 3 regeneration.

Occurrence completion and skipping are accepted only from `PENDING` or `SNOOZED`. Completion time and actor always come from the server/authenticated user. Snooze preserves `originalScheduledAt`, requires a future `scheduledAt`, and remains `SNOOZED` until completion, skipping, or the future Run 3 generator policy; it is not silently reset to pending. Occurrence and plan notes are append-only, preserve server creation time, and derive their author from authentication. History is service-owned and deterministically ordered by time and ID.

## Transaction and authorization requirements

The API/service layer must implement each command in a transaction and:

1. derive `familyId` from authenticated family context and scope every lookup by it;
2. validate plan subject membership through the composite relation and authorization service;
3. lock or conditionally update the plan to prevent concurrent level/step transitions;
4. enforce base/contiguous level and step invariants using the domain helpers;
5. permit manual level changes only to the adjacent level, never automatically upward;
6. append history in the same transaction as every lifecycle change;
7. retire and replace used schedules/actions rather than mutate them;
8. a future generator must generate occurrences idempotently from effective schedule/action versions and copy action/time-zone presentation snapshots;
9. archive used plans instead of exposing hard delete.

## Run 3 and remaining risks

Run 3 owns occurrence generation, recurrence calculation, a generation horizon, implementation of DST gap/overlap policy, automatic time-triggered step advancement, restart-safe generation, and deterministic regeneration after broader schedule/structural edits. Notifications and dashboards remain out of scope.

Before the occurrence generator ships, choose and test an explicit DST gap/overlap policy and a generation horizon. Broader schedule/structure editing and replacement occurrence generation remain unavailable. PostgreSQL runtime constraint/race tests require a configured database; unit and SQL-text tests alone do not validate database execution. The deferred same-plan triggers validate resource writes, but do not turn configuration into globally immutable rows; service authorization and edit commands remain responsible for that policy.
