# Helseplan: backend and persistence foundation

This document records the Run 1 domain boundary for **Helseplan**. It deliberately covers persistence and domain invariants only. There is no controller, UI, notification job, dashboard integration, measurement model, plan-copying feature, or medical decision logic in this run. The NestJS module is named `health-plans` to avoid confusion with the existing system `/health` endpoint.

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

## Schedules and time zones

A step may have any number of schedules and each schedule owns one or more ordered actions. The three recurrence shapes are:

- `DAILY`: no weekday, interval, or anchor fields;
- `WEEKDAYS`: one or more unique ISO weekdays (`1` Monday through `7` Sunday);
- `INTERVAL_DAYS`: a positive `intervalDays` and a calendar `anchorDate`.

The database enforces the shape except duplicate weekday array entries, which the domain validator rejects. `localTime` is PostgreSQL `TIME(0)`, `anchorDate` is `DATE`, and `timezone` is an IANA zone with `Europe/Oslo` as the default. A future occurrence generator must combine the calendar date and local time in the stored IANA zone before converting to UTC. It must use a time-zone-aware library and explicitly define behavior for DST gaps/overlaps; it must not add 24-hour UTC durations to generate local daily times. The interval predicate is the number of local calendar days from `anchorDate`, modulo `intervalDays`, which makes “every other day” deterministic.

Schedules and actions are version-like rows: editing a schedule/action that may have generated occurrences retires it (`retiredAt`) and creates replacement rows rather than mutating it. `effectiveFrom` bounds new schedule generation. This policy keeps old configuration inspectable and prevents historical interpretation from changing.

## Occurrences and immutable history

A `HealthPlanOccurrence` is one action at one instant, so completion is naturally individual per action. `scheduledAt` is the current time (and may move for snooze/reschedule); `originalScheduledAt` is immutable and participates with `sourceActionId` in an idempotency key. `timezone`, `actionTitle`, and `actionInstruction` are snapshots. Later schedule/action edits therefore cannot rewrite what a historical occurrence said or when its original event was generated.

Occurrence statuses are `PENDING`, `COMPLETED`, `SKIPPED`, and `SNOOZED`. `MISSED` is **derived**, not stored: a pending occurrence is missed when `scheduledAt` is before the evaluation time. Storing it would require a time-based mutation and could become inconsistent. Run 2 should define the grace boundary, if one is desired, in API policy.

A snooze keeps `originalScheduledAt`, changes `scheduledAt`, and sets `SNOOZED`; Run 2 must define when it returns to pending. Completion requires `completedAt`; the database ensures only completed rows have that timestamp. Actor foreign keys use `SET NULL` so account deactivation/deletion does not destroy occurrences.

`HealthPlanNote` supports a plan note (neither target set), an occurrence note, or an action-definition note. It stores unstructured text only. At most one specific target may be set. Target-to-plan consistency is an API transaction invariant for Run 2; occurrence/action relations are restricted so a note cannot be orphaned.

A single append-only `HealthPlanHistory` is used rather than separate tables because all required lifecycle changes share actor/time/type/metadata semantics and are queried as one timeline. Its enum records creation, pause, resume, level increase/decrease, step advance, and status change. Metadata carries event-specific snapshots such as from/to IDs and indexes. `actorDisplayName` preserves useful audit display when the optional user FK is later cleared. Definition versioning remains in definition tables rather than overloading lifecycle history.

## Transaction and authorization requirements for Run 2

The API/service layer must implement each command in a transaction and:

1. derive `familyId` from authenticated family context and scope every lookup by it;
2. validate plan subject membership through the composite relation and authorization service;
3. lock or conditionally update the plan to prevent concurrent level/step transitions;
4. enforce base/contiguous level and step invariants using the domain helpers;
5. permit manual level changes only to the adjacent level, never automatically upward;
6. append history in the same transaction as every lifecycle change;
7. retire and replace used schedules/actions rather than mutate them;
8. generate occurrences idempotently and copy action/time-zone presentation snapshots;
9. archive used plans instead of exposing hard delete.

## Deferred work and risks

Run 2 still needs DTOs, controllers, transactional services, authenticated family authorization, optimistic/concurrency behavior, definition editing/versioning commands, lifecycle commands, occurrence generation, and integration tests against PostgreSQL. Notifications and dashboards remain out of scope.

Before the occurrence generator ships, choose and test an explicit DST gap/overlap policy and a generation horizon. Before allowing edits, define whether already-pending future occurrences are retained, cancelled/skipped, or regenerated; completed and past occurrences must always remain immutable. Consider adding database triggers for note target-to-plan consistency if writes outside the API become a supported integration surface.
