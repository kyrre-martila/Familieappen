-- Expand the former one-feed-per-family table without replacing rows or tokens.
-- This preserves every existing subscription URL and its filter configuration.
ALTER TABLE "calendar_export_feeds" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Familiekalender';
ALTER TABLE "calendar_export_feeds" ADD COLUMN "createdByFamilyMemberId" TEXT;
DROP INDEX "calendar_export_feeds_familyId_key";
CREATE INDEX "calendar_export_feeds_familyId_idx" ON "calendar_export_feeds"("familyId");
CREATE INDEX "calendar_export_feeds_createdByFamilyMemberId_idx" ON "calendar_export_feeds"("createdByFamilyMemberId");

CREATE TABLE "calendar_export_feed_members" (
  "feedId" TEXT NOT NULL,
  "familyMemberId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_export_feed_members_pkey" PRIMARY KEY ("feedId", "familyMemberId")
);
CREATE INDEX "calendar_export_feed_members_familyMemberId_idx" ON "calendar_export_feed_members"("familyMemberId");
ALTER TABLE "calendar_export_feed_members" ADD CONSTRAINT "calendar_export_feed_members_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "calendar_export_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_export_feed_members" ADD CONSTRAINT "calendar_export_feed_members_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_export_feeds" ADD CONSTRAINT "calendar_export_feeds_createdByFamilyMemberId_fkey" FOREIGN KEY ("createdByFamilyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Normalize the old single selected member into the new many-to-many relation.
INSERT INTO "calendar_export_feed_members" ("feedId", "familyMemberId")
SELECT f."id", f."selectedFamilyMemberId"
FROM "calendar_export_feeds" f
JOIN "family_members" m ON m."id" = f."selectedFamilyMemberId" AND m."familyId" = f."familyId"
WHERE f."selectedFamilyMemberId" IS NOT NULL
ON CONFLICT DO NOTHING;
