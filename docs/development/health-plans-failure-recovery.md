# Helseplan V1 – failure and recovery

## Consistency boundaries

Prisma interactive transactions cover plan creation, lifecycle state plus history, future-occurrence cleanup plus lifecycle transition, action retirement/replacement plus cleanup and history, occurrence status plus optional note, and notification-recipient replacement. Subject cleanup and member deletion share the owning family/account transaction. Account deletion intentionally uses one transaction across all memberships, family cleanup and the user delete; a failure in a later family rolls back earlier work.

Lifecycle and occurrence commands use conditional `updateMany` writes over the previously read `status` and `updatedAt`. One concurrent command wins; a stale or duplicate command receives Conflict. A response lost after commit is therefore discoverable by reload; retrying a resolved occurrence/lifecycle command does not repeat its effects. Standalone notes are append-only and have no client idempotency key: the web client does not automatically retry mutations, but a manual retry after a lost response can theoretically duplicate a note.

## Scheduler and notifications

Each active plan is isolated so one failure is logged with opaque IDs/safe codes and processing continues. Step transition, old-occurrence cleanup and history are atomic. Progression follows strictly increasing `stepOrder`, so the finite persisted step structure bounds the loop. After a crash following transition, the next run generates only the committed active context from `generationNotBefore`; the unique `(sourceActionId, originalScheduledAt)` identity and `skipDuplicates` make restarts and overlapping runs idempotent. Failed `createMany` is retried naturally on the next hourly run without repeating history.

Generation has a fixed four-hour lookback and a 14-local-calendar-day horizon. A two-hour outage can backfill due work; work older than four hours is deliberately omitted, while later runs still rebuild the future horizon. Resume sets a new generation boundary, so paused time is never backfilled and skipped snapshots are not reactivated.

Notification delivery is ledger-first. The dedupe key elects one scheduler winner and recipients/devices are isolated; `DeviceNotRegistered` disables only that device. Transport/network failures do not tight-loop and payloads/logs omit health text. The known crash window between ledger commit and physical push can lose a push; V1 has no retry queue and does not promise exactly-once physical delivery.

## Web recovery

A mutation failure is an error. A successful mutation is committed in the UI before refresh; refresh failure becomes a warning that the write succeeded. Abort/context-change failures and stale FamilyRequestGuard generations do not commit or show errors. Overview and detail clear cross-family state before fetching. Busy guards suppress repeat occurrence and lifecycle submissions from the same control; the API remains the final concurrency boundary.

The overview schedules one DST-safe timer for the next Europe/Oslo midnight. At midnight it refreshes and recomputes `I dag`/`Kommende`, then schedules the next boundary. Visibility and focus reuse that date check after browser/PWA sleep.

## Verification status and V1 limits

The PostgreSQL 16 subject-lifecycle migration must be runtime-tested from an empty database and with pre-migration data before final production readiness. Static checks are not a substitute. The migration is expected to backfill `subjectDisplayName`, enforce same-family subjects, use `SET NULL` for ordinary subject removal and cascade the plan tree for whole-family deletion. Prisma validate/generate results are recorded in the run report.

Remaining deliberate limits: four-hour catch-up, no push retry queue, the ledger-first loss window, no note idempotency key, no distributed job queue, no websocket/live sync, no offline mutation queue, and no exactly-once device delivery.
