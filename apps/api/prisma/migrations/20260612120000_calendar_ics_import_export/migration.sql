ALTER TABLE "calendar_events"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "icsSourceId" TEXT,
  ADD COLUMN "externalUid" TEXT,
  ADD COLUMN "externalLastModified" TIMESTAMP(3),
  ADD COLUMN "externalSequence" INTEGER,
  ADD COLUMN "importedAt" TIMESTAMP(3);

CREATE TABLE "calendar_ics_sources" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "defaultFamilyMemberId" TEXT,
  "defaultCategory" TEXT NOT NULL DEFAULT 'family',
  "lastSyncedAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "lastSyncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "calendar_ics_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_export_feeds" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "includeEvents" BOOLEAN NOT NULL DEFAULT true,
  "includeMeals" BOOLEAN NOT NULL DEFAULT true,
  "includeReminders" BOOLEAN NOT NULL DEFAULT true,
  "includeSchoolWeekReminders" BOOLEAN NOT NULL DEFAULT true,
  "scope" TEXT NOT NULL DEFAULT 'family',
  "selectedFamilyMemberId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "calendar_export_feeds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_events_icsSourceId_externalUid_key" ON "calendar_events"("icsSourceId", "externalUid");
CREATE INDEX "calendar_events_icsSourceId_idx" ON "calendar_events"("icsSourceId");
CREATE INDEX "calendar_events_source_idx" ON "calendar_events"("source");
CREATE INDEX "calendar_ics_sources_familyId_idx" ON "calendar_ics_sources"("familyId");
CREATE INDEX "calendar_ics_sources_defaultFamilyMemberId_idx" ON "calendar_ics_sources"("defaultFamilyMemberId");
CREATE UNIQUE INDEX "calendar_export_feeds_familyId_key" ON "calendar_export_feeds"("familyId");
CREATE UNIQUE INDEX "calendar_export_feeds_token_key" ON "calendar_export_feeds"("token");
CREATE INDEX "calendar_export_feeds_token_idx" ON "calendar_export_feeds"("token");

ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_icsSourceId_fkey" FOREIGN KEY ("icsSourceId") REFERENCES "calendar_ics_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_ics_sources" ADD CONSTRAINT "calendar_ics_sources_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_ics_sources" ADD CONSTRAINT "calendar_ics_sources_defaultFamilyMemberId_fkey" FOREIGN KEY ("defaultFamilyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_export_feeds" ADD CONSTRAINT "calendar_export_feeds_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
