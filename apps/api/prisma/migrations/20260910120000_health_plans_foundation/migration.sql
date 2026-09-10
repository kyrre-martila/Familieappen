-- Helseplan is a family-scoped, linear plan model. Configuration rows are retained
-- once referenced, and generated occurrences contain presentation snapshots.
CREATE TYPE "HealthPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "HealthPlanRecurrenceType" AS ENUM ('DAILY', 'WEEKDAYS', 'INTERVAL_DAYS');
CREATE TYPE "HealthPlanOccurrenceStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED', 'SNOOZED');
CREATE TYPE "HealthPlanHistoryType" AS ENUM ('CREATED', 'PAUSED', 'RESUMED', 'LEVEL_INCREASED', 'LEVEL_DECREASED', 'STEP_ADVANCED', 'STATUS_CHANGED');

-- Enables a composite foreign key to prove that a plan subject belongs to its family.
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_id_familyId_key" UNIQUE ("id", "familyId");

CREATE TABLE "health_plans" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "familyMemberId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "HealthPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "activeLevelId" TEXT,
  "activeStepId" TEXT,
  "activeLevelStartedAt" TIMESTAMP(3),
  "activeStepStartedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "health_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "health_plans_active_pointer_pair_check" CHECK (("activeLevelId" IS NULL) = ("activeStepId" IS NULL)),
  CONSTRAINT "health_plans_active_pointer_timestamps_check" CHECK (
    (("activeLevelId" IS NULL) = ("activeLevelStartedAt" IS NULL)) AND
    (("activeStepId" IS NULL) = ("activeStepStartedAt" IS NULL))
  ),
  CONSTRAINT "health_plans_active_status_check" CHECK (
    "status" NOT IN ('ACTIVE', 'PAUSED') OR "activeLevelId" IS NOT NULL
  ),
  CONSTRAINT "health_plans_draft_state_check" CHECK (
    "status" <> 'DRAFT' OR "activeLevelId" IS NULL
  ),
  CONSTRAINT "health_plans_pause_state_check" CHECK (("status" = 'PAUSED') = ("pausedAt" IS NOT NULL))
);

CREATE TABLE "health_plan_levels" (
  "id" TEXT NOT NULL,
  "healthPlanId" TEXT NOT NULL,
  "levelIndex" INTEGER NOT NULL,
  "name" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "health_plan_levels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "health_plan_levels_nonnegative_index_check" CHECK ("levelIndex" >= 0)
);

CREATE TABLE "health_plan_steps" (
  "id" TEXT NOT NULL,
  "healthPlanId" TEXT NOT NULL,
  "levelId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "name" TEXT,
  "description" TEXT,
  "durationDays" INTEGER,
  "autoAdvance" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "health_plan_steps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "health_plan_steps_order_check" CHECK ("stepOrder" >= 0),
  CONSTRAINT "health_plan_steps_duration_check" CHECK ("durationDays" IS NULL OR "durationDays" > 0),
  CONSTRAINT "health_plan_steps_auto_advance_check" CHECK (NOT "autoAdvance" OR "durationDays" IS NOT NULL)
);

CREATE TABLE "health_plan_schedules" (
  "id" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "recurrenceType" "HealthPlanRecurrenceType" NOT NULL,
  "localTime" TIME(0) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Oslo',
  "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "intervalDays" INTEGER,
  "anchorDate" DATE,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "health_plan_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "health_plan_schedules_shape_check" CHECK (
    ("recurrenceType" = 'DAILY' AND cardinality("weekdays") = 0 AND "intervalDays" IS NULL AND "anchorDate" IS NULL) OR
    ("recurrenceType" = 'WEEKDAYS' AND cardinality("weekdays") > 0 AND "weekdays" <@ ARRAY[1,2,3,4,5,6,7] AND "intervalDays" IS NULL AND "anchorDate" IS NULL) OR
    ("recurrenceType" = 'INTERVAL_DAYS' AND cardinality("weekdays") = 0 AND "intervalDays" > 0 AND "anchorDate" IS NOT NULL)
  ),
  CONSTRAINT "health_plan_schedules_effective_range_check" CHECK ("retiredAt" IS NULL OR "retiredAt" >= "effectiveFrom")
);

CREATE TABLE "health_plan_actions" (
  "id" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instruction" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "health_plan_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "health_plan_actions_sort_order_check" CHECK ("sortOrder" >= 0),
  CONSTRAINT "health_plan_actions_effective_range_check" CHECK ("retiredAt" IS NULL OR "retiredAt" >= "effectiveFrom")
);

CREATE TABLE "health_plan_occurrences" (
  "id" TEXT NOT NULL,
  "healthPlanId" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "sourceActionId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "originalScheduledAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "actionTitle" TEXT NOT NULL,
  "actionInstruction" TEXT,
  "status" "HealthPlanOccurrenceStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "health_plan_occurrences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "health_plan_occurrences_completion_check" CHECK (("status" = 'COMPLETED') = ("completedAt" IS NOT NULL)),
  -- A completed actor is optional because its user FK is ON DELETE SET NULL. For every
  -- other status an actor would be misleading and is rejected.
  CONSTRAINT "health_plan_occurrences_completed_by_check" CHECK ("completedByUserId" IS NULL OR "status" = 'COMPLETED')
);

CREATE TABLE "health_plan_notes" (
  "id" TEXT NOT NULL,
  "healthPlanId" TEXT NOT NULL,
  "occurrenceId" TEXT,
  "sourceActionId" TEXT,
  "authorUserId" TEXT,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "health_plan_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "health_plan_notes_single_target_check" CHECK (num_nonnulls("occurrenceId", "sourceActionId") <= 1)
);

CREATE TABLE "health_plan_history" (
  "id" TEXT NOT NULL,
  "healthPlanId" TEXT NOT NULL,
  "type" "HealthPlanHistoryType" NOT NULL,
  "actorUserId" TEXT,
  "actorDisplayName" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "health_plan_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "health_plans_id_familyId_key" ON "health_plans"("id", "familyId");
CREATE INDEX "health_plans_familyId_status_idx" ON "health_plans"("familyId", "status");
CREATE INDEX "health_plans_familyMemberId_status_idx" ON "health_plans"("familyMemberId", "status");
CREATE INDEX "health_plans_activeLevelId_idx" ON "health_plans"("activeLevelId");
CREATE INDEX "health_plans_activeStepId_idx" ON "health_plans"("activeStepId");
CREATE UNIQUE INDEX "health_plan_levels_healthPlanId_levelIndex_key" ON "health_plan_levels"("healthPlanId", "levelIndex");
CREATE UNIQUE INDEX "health_plan_levels_id_healthPlanId_key" ON "health_plan_levels"("id", "healthPlanId");
CREATE UNIQUE INDEX "health_plan_steps_levelId_stepOrder_key" ON "health_plan_steps"("levelId", "stepOrder");
CREATE UNIQUE INDEX "health_plan_steps_id_healthPlanId_key" ON "health_plan_steps"("id", "healthPlanId");
CREATE INDEX "health_plan_steps_healthPlanId_idx" ON "health_plan_steps"("healthPlanId");
CREATE INDEX "health_plan_schedules_stepId_retiredAt_idx" ON "health_plan_schedules"("stepId", "retiredAt");
-- Prisma cannot represent partial indexes. Keep this index and the corresponding
-- schema comment in sync: historical action versions may share an order, active ones may not.
CREATE UNIQUE INDEX "health_plan_actions_active_sort_order_key"
ON "health_plan_actions"("scheduleId", "sortOrder") WHERE "retiredAt" IS NULL;
CREATE INDEX "health_plan_actions_scheduleId_retiredAt_idx" ON "health_plan_actions"("scheduleId", "retiredAt");
CREATE UNIQUE INDEX "health_plan_occurrences_sourceActionId_originalScheduledAt_key" ON "health_plan_occurrences"("sourceActionId", "originalScheduledAt");
CREATE INDEX "health_plan_occurrences_familyId_status_scheduledAt_idx" ON "health_plan_occurrences"("familyId", "status", "scheduledAt");
CREATE INDEX "health_plan_occurrences_healthPlanId_status_scheduledAt_idx" ON "health_plan_occurrences"("healthPlanId", "status", "scheduledAt");
CREATE INDEX "health_plan_occurrences_completedByUserId_idx" ON "health_plan_occurrences"("completedByUserId");
CREATE INDEX "health_plan_notes_healthPlanId_createdAt_idx" ON "health_plan_notes"("healthPlanId", "createdAt");
CREATE INDEX "health_plan_notes_occurrenceId_idx" ON "health_plan_notes"("occurrenceId");
CREATE INDEX "health_plan_notes_sourceActionId_idx" ON "health_plan_notes"("sourceActionId");
CREATE INDEX "health_plan_notes_authorUserId_idx" ON "health_plan_notes"("authorUserId");
CREATE INDEX "health_plan_history_healthPlanId_occurredAt_idx" ON "health_plan_history"("healthPlanId", "occurredAt");
CREATE INDEX "health_plan_history_actorUserId_idx" ON "health_plan_history"("actorUserId");

ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_familyMemberId_familyId_fkey" FOREIGN KEY ("familyMemberId", "familyId") REFERENCES "family_members"("id", "familyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "health_plan_levels" ADD CONSTRAINT "health_plan_levels_healthPlanId_fkey" FOREIGN KEY ("healthPlanId") REFERENCES "health_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_steps" ADD CONSTRAINT "health_plan_steps_healthPlanId_fkey" FOREIGN KEY ("healthPlanId") REFERENCES "health_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_steps" ADD CONSTRAINT "health_plan_steps_levelId_healthPlanId_fkey" FOREIGN KEY ("levelId", "healthPlanId") REFERENCES "health_plan_levels"("id", "healthPlanId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_activeLevelId_id_fkey" FOREIGN KEY ("activeLevelId", "id") REFERENCES "health_plan_levels"("id", "healthPlanId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_activeStepId_id_fkey" FOREIGN KEY ("activeStepId", "id") REFERENCES "health_plan_steps"("id", "healthPlanId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plan_schedules" ADD CONSTRAINT "health_plan_schedules_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "health_plan_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_actions" ADD CONSTRAINT "health_plan_actions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "health_plan_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_occurrences" ADD CONSTRAINT "health_plan_occurrences_healthPlanId_familyId_fkey" FOREIGN KEY ("healthPlanId", "familyId") REFERENCES "health_plans"("id", "familyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plan_occurrences" ADD CONSTRAINT "health_plan_occurrences_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plan_occurrences" ADD CONSTRAINT "health_plan_occurrences_sourceActionId_fkey" FOREIGN KEY ("sourceActionId") REFERENCES "health_plan_actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plan_occurrences" ADD CONSTRAINT "health_plan_occurrences_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_healthPlanId_fkey" FOREIGN KEY ("healthPlanId") REFERENCES "health_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "health_plan_occurrences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_sourceActionId_fkey" FOREIGN KEY ("sourceActionId") REFERENCES "health_plan_actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "health_plan_history" ADD CONSTRAINT "health_plan_history_healthPlanId_fkey" FOREIGN KEY ("healthPlanId") REFERENCES "health_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "health_plan_history" ADD CONSTRAINT "health_plan_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Composite FKs prove same-plan membership; this trigger additionally proves that
-- the selected active step is inside the selected active level.
CREATE FUNCTION check_health_plan_active_pointer_consistency() RETURNS trigger AS $$
BEGIN
  IF NEW."activeStepId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "health_plan_steps"
    WHERE "id" = NEW."activeStepId"
      AND "healthPlanId" = NEW."id"
      AND "levelId" = NEW."activeLevelId"
  ) THEN
    RAISE EXCEPTION 'active health plan step must belong to the active level';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "health_plans_active_pointer_consistency"
AFTER INSERT OR UPDATE OF "activeLevelId", "activeStepId" ON "health_plans"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION check_health_plan_active_pointer_consistency();

-- Denormalized plan IDs make family queries efficient; deferred checks prevent
-- an occurrence or targeted note from being attached across plan boundaries.
CREATE FUNCTION check_health_plan_resource_consistency() RETURNS trigger AS $$
DECLARE resolved_plan_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'health_plan_occurrences' THEN
    SELECT st."healthPlanId" INTO resolved_plan_id
    FROM "health_plan_actions" a
    JOIN "health_plan_schedules" s ON s."id" = a."scheduleId"
    JOIN "health_plan_steps" st ON st."id" = s."stepId"
    WHERE a."id" = NEW."sourceActionId";
  ELSIF NEW."occurrenceId" IS NOT NULL THEN
    SELECT "healthPlanId" INTO resolved_plan_id FROM "health_plan_occurrences" WHERE "id" = NEW."occurrenceId";
  ELSIF NEW."sourceActionId" IS NOT NULL THEN
    SELECT st."healthPlanId" INTO resolved_plan_id
    FROM "health_plan_actions" a
    JOIN "health_plan_schedules" s ON s."id" = a."scheduleId"
    JOIN "health_plan_steps" st ON st."id" = s."stepId"
    WHERE a."id" = NEW."sourceActionId";
  ELSE
    RETURN NEW;
  END IF;

  IF resolved_plan_id IS DISTINCT FROM NEW."healthPlanId" THEN
    RAISE EXCEPTION 'health plan resource target must belong to the same plan';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "health_plan_occurrences_resource_consistency"
AFTER INSERT OR UPDATE OF "healthPlanId", "sourceActionId" ON "health_plan_occurrences"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_health_plan_resource_consistency();
CREATE CONSTRAINT TRIGGER "health_plan_notes_resource_consistency"
AFTER INSERT OR UPDATE OF "healthPlanId", "occurrenceId", "sourceActionId" ON "health_plan_notes"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_health_plan_resource_consistency();
