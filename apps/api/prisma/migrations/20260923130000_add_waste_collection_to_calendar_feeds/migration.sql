-- Existing feeds must not gain a new exported content category implicitly.
-- The application explicitly enables this option by default when creating a new feed.
ALTER TABLE "calendar_export_feeds"
ADD COLUMN "includeWasteCollection" BOOLEAN NOT NULL DEFAULT false;
