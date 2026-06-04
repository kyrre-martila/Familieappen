ALTER TABLE "calendar_events" ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'family';
ALTER TABLE "calendar_events" ADD COLUMN "reminderMinutesBefore" INTEGER;
