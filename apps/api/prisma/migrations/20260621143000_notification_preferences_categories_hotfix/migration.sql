-- Reconcile notification_preferences with the current category-based schema.
-- This migration is intentionally idempotent so production can recover if an
-- older notification_preferences table already exists.

CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shoppingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "calendarEnabled" BOOLEAN NOT NULL DEFAULT true,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tasksEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mealsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wishlistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "systemEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "shoppingEnabled" BOOLEAN;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "calendarEnabled" BOOLEAN;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "remindersEnabled" BOOLEAN;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "tasksEnabled" BOOLEAN;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "mealsEnabled" BOOLEAN;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "wishlistEnabled" BOOLEAN;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "systemEnabled" BOOLEAN;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

UPDATE "notification_preferences"
SET
    "id" = COALESCE("id", 'cmig' || md5(random()::text || clock_timestamp()::text)),
    "shoppingEnabled" = COALESCE("shoppingEnabled", true),
    "tasksEnabled" = COALESCE("tasksEnabled", true),
    "mealsEnabled" = COALESCE("mealsEnabled", true),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'notification_preferences' AND column_name = 'calendarEvents') THEN
        UPDATE "notification_preferences" SET "calendarEnabled" = COALESCE("calendarEnabled", "calendarEvents");
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'notification_preferences' AND column_name = 'huskReminders') THEN
        UPDATE "notification_preferences" SET "remindersEnabled" = COALESCE("remindersEnabled", "huskReminders");
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'notification_preferences' AND column_name = 'wishlistShared') THEN
        UPDATE "notification_preferences" SET "wishlistEnabled" = COALESCE("wishlistEnabled", "wishlistShared");
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'notification_preferences' AND column_name = 'familyInvites') THEN
        UPDATE "notification_preferences" SET "systemEnabled" = COALESCE("systemEnabled", "familyInvites");
    END IF;
END $$;

UPDATE "notification_preferences"
SET
    "calendarEnabled" = COALESCE("calendarEnabled", true),
    "remindersEnabled" = COALESCE("remindersEnabled", true),
    "wishlistEnabled" = COALESCE("wishlistEnabled", true),
    "systemEnabled" = COALESCE("systemEnabled", true);

ALTER TABLE "notification_preferences" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "shoppingEnabled" SET DEFAULT true;
ALTER TABLE "notification_preferences" ALTER COLUMN "shoppingEnabled" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "calendarEnabled" SET DEFAULT true;
ALTER TABLE "notification_preferences" ALTER COLUMN "calendarEnabled" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "remindersEnabled" SET DEFAULT true;
ALTER TABLE "notification_preferences" ALTER COLUMN "remindersEnabled" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "tasksEnabled" SET DEFAULT true;
ALTER TABLE "notification_preferences" ALTER COLUMN "tasksEnabled" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "mealsEnabled" SET DEFAULT true;
ALTER TABLE "notification_preferences" ALTER COLUMN "mealsEnabled" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "wishlistEnabled" SET DEFAULT true;
ALTER TABLE "notification_preferences" ALTER COLUMN "wishlistEnabled" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "systemEnabled" SET DEFAULT true;
ALTER TABLE "notification_preferences" ALTER COLUMN "systemEnabled" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "notification_preferences" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE "notification_preferences" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "notification_preferences" ALTER COLUMN "updatedAt" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notification_preferences_pkey'
          AND conrelid = 'notification_preferences'::regclass
    ) THEN
        ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'notification_preferences_userId_fkey'
          AND conrelid = 'notification_preferences'::regclass
    ) THEN
        ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_userId_key" ON "notification_preferences"("userId");
CREATE INDEX IF NOT EXISTS "notification_preferences_userId_idx" ON "notification_preferences"("userId");

ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "calendarEvents";
ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "calendarReminders";
ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "huskReminders";
ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "wishlistShared";
ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "familyInvites";
