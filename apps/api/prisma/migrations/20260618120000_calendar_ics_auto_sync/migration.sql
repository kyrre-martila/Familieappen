ALTER TABLE "calendar_ics_sources"
  ADD COLUMN "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "nextSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncStartedAt" TIMESTAMP(3);

CREATE INDEX "calendar_ics_sources_active_nextSyncAt_idx" ON "calendar_ics_sources"("active", "nextSyncAt");
