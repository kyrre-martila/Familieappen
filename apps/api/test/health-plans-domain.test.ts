import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertValidHealthPlanLevels,
  assertValidHealthPlanSchedule,
  DEFAULT_HEALTH_PLAN_TIMEZONE,
  isHealthPlanOccurrenceMissed,
  resumeProgressStartedAt,
} from "../src/health-plans";

assert.equal(DEFAULT_HEALTH_PLAN_TIMEZONE, "Europe/Oslo");

assert.doesNotThrow(() =>
  assertValidHealthPlanLevels([
    { levelIndex: 0, steps: [{ stepOrder: 0, durationDays: null, autoAdvance: false, schedules: [{ actionCount: 1 }] }] },
    {
      levelIndex: 1,
      steps: [
        { stepOrder: 0, durationDays: 14, autoAdvance: true, schedules: [{ actionCount: 2 }] },
        { stepOrder: 1, durationDays: null, autoAdvance: false, schedules: [{ actionCount: 1 }] },
      ],
    },
  ]),
);
assert.throws(() => assertValidHealthPlanLevels([]), /level 0/);
assert.throws(
  () => assertValidHealthPlanLevels([{ levelIndex: 1, steps: [{ stepOrder: 0, autoAdvance: false, schedules: [{ actionCount: 1 }] }] }]),
  /level 0/,
);
assert.throws(
  () =>
    assertValidHealthPlanLevels([
      { levelIndex: 0, steps: [{ stepOrder: 0, autoAdvance: false, schedules: [{ actionCount: 1 }] }] },
      { levelIndex: 2, steps: [{ stepOrder: 0, autoAdvance: false, schedules: [{ actionCount: 1 }] }] },
    ]),
  /contiguous/,
);
assert.throws(
  () => assertValidHealthPlanLevels([{ levelIndex: 0, steps: [{ stepOrder: 0, autoAdvance: true, schedules: [{ actionCount: 1 }] }] }]),
  /open-ended/,
);
assert.throws(
  () => assertValidHealthPlanLevels([{ levelIndex: 0, steps: [{ stepOrder: 0, autoAdvance: false, schedules: [] }] }]),
  /at least one action/,
);

assert.doesNotThrow(() => assertValidHealthPlanSchedule({ recurrenceType: "DAILY" }));
assert.doesNotThrow(() =>
  assertValidHealthPlanSchedule({ recurrenceType: "WEEKDAYS", weekdays: [1, 3, 5] }),
);
assert.doesNotThrow(() =>
  assertValidHealthPlanSchedule({
    recurrenceType: "INTERVAL_DAYS",
    intervalDays: 2,
    anchorDate: new Date("2026-09-08"),
  }),
);
assert.throws(
  () => assertValidHealthPlanSchedule({ recurrenceType: "WEEKDAYS", weekdays: [1, 1] }),
  /unique ISO weekdays/,
);
assert.throws(
  () =>
    assertValidHealthPlanSchedule({
      recurrenceType: "INTERVAL_DAYS",
      intervalDays: 0,
      anchorDate: new Date("2026-09-08"),
    }),
  /positive interval/,
);

assert.equal(
  resumeProgressStartedAt(
    new Date("2026-09-01T08:00:00Z"),
    new Date("2026-09-05T08:00:00Z"),
    new Date("2026-09-08T08:00:00Z"),
  ).toISOString(),
  "2026-09-04T08:00:00.000Z",
);
assert.equal(
  isHealthPlanOccurrenceMissed("PENDING", new Date("2026-09-08T18:00:00Z"), new Date("2026-09-09T00:00:00Z")),
  true,
);
assert.equal(
  isHealthPlanOccurrenceMissed("SKIPPED", new Date("2026-09-08T18:00:00Z"), new Date("2026-09-09T00:00:00Z")),
  false,
);

const schema = readFileSync(resolve(__dirname, "../prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(__dirname, "../prisma/migrations/20260910120000_health_plans_foundation/migration.sql"),
  "utf8",
);
for (const model of [
  "HealthPlan",
  "HealthPlanLevel",
  "HealthPlanStep",
  "HealthPlanSchedule",
  "HealthPlanAction",
  "HealthPlanOccurrence",
  "HealthPlanNote",
  "HealthPlanHistory",
]) {
  assert.match(schema, new RegExp(`model ${model} \\{`));
}
assert.match(schema, /@@unique\(\[healthPlanId, levelIndex\]\)/);
assert.match(schema, /@@unique\(\[levelId, stepOrder\]\)/);
assert.match(schema, /@@index\(\[familyId, status, scheduledAt\]\)/);

// These are textual regression assertions for database-only migration features. They do
// not replace applying the migration to PostgreSQL (see the architecture document).
assert.doesNotMatch(schema, /@@unique\(\[scheduleId, sortOrder\]\)/);
assert.match(schema, /effectiveFrom DateTime @default\(now\(\)\)/);
assert.match(
  migration,
  /CREATE UNIQUE INDEX "health_plan_actions_active_sort_order_key"[\s\S]*WHERE "retiredAt" IS NULL;/,
);
assert.match(migration, /health_plan_actions_effective_range_check/);

assert.match(migration, /health_plan_occurrences_completed_by_check/);
assert.match(migration, /"completedByUserId" IS NULL OR "status" = 'COMPLETED'/);
assert.match(migration, /health_plan_occurrences_completion_check/);

assert.match(migration, /health_plans_active_pointer_pair_check/);
assert.match(migration, /health_plans_active_pointer_timestamps_check/);
assert.match(migration, /health_plans_active_status_check/);
assert.match(migration, /health_plans_draft_state_check/);
assert.match(migration, /health_plans_pause_state_check/);
assert.match(migration, /health_plans_active_pointer_consistency/);

assert.match(migration, /health_plan_schedules_shape_check/);
assert.match(migration, /health_plan_schedules_effective_range_check/);
assert.match(migration, /health_plan_notes_single_target_check/);
assert.match(migration, /num_nonnulls\("occurrenceId", "sourceActionId"\) <= 1/);
assert.match(migration, /health_plan_notes_resource_consistency/);
assert.match(migration, /health_plan_occurrences_resource_consistency/);
assert.match(
  migration,
  /CREATE UNIQUE INDEX "health_plan_occurrences_sourceActionId_originalScheduledAt_key"/,
);
assert.match(
  migration,
  /health_plan_occurrences_sourceActionId_fkey[\s\S]*ON DELETE RESTRICT/,
);
