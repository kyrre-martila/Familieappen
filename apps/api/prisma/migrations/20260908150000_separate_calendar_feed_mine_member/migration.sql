-- Keep the creator audit metadata separate from the member represented by "mine".
-- Existing mine feeds are deliberately left unresolved: createdByFamilyMemberId does
-- not prove who the historical mine audience was, so rendering fails closed.
ALTER TABLE "calendar_export_feeds" ADD COLUMN "mineFamilyMemberId" TEXT;

CREATE INDEX "calendar_export_feeds_mineFamilyMemberId_idx" ON "calendar_export_feeds"("mineFamilyMemberId");

ALTER TABLE "calendar_export_feeds" ADD CONSTRAINT "calendar_export_feeds_mineFamilyMemberId_fkey"
FOREIGN KEY ("mineFamilyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
