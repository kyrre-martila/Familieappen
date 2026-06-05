-- Run 5: Wishlist is modeled as ordered, family-scoped items owned by a person.
-- Remove premature share/reservation tables and flatten the previous wishlist container
-- into wishlist_items while preserving existing item rows where possible.

DROP TABLE IF EXISTS "wishlist_shares";
DROP TABLE IF EXISTS "wishlist_reservations";

ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_wishlistId_fkey";
DROP INDEX IF EXISTS "wishlist_items_wishlistId_idx";
DROP INDEX IF EXISTS "wishlists_familyId_idx";
DROP INDEX IF EXISTS "wishlists_ownerFamilyMemberId_idx";
DROP INDEX IF EXISTS "wishlists_createdByUserId_idx";

ALTER TABLE "wishlist_items" ADD COLUMN "family_id" TEXT;
ALTER TABLE "wishlist_items" ADD COLUMN "owner_user_id" TEXT;
ALTER TABLE "wishlist_items" ADD COLUMN "owner_family_member_id" TEXT;
ALTER TABLE "wishlist_items" ADD COLUMN "price" DECIMAL(10,2);
ALTER TABLE "wishlist_items" ADD COLUMN "store_or_link" TEXT;
ALTER TABLE "wishlist_items" ADD COLUMN "image_url" TEXT;
ALTER TABLE "wishlist_items" ADD COLUMN "icon" TEXT;
ALTER TABLE "wishlist_items" ADD COLUMN "position" INTEGER;
ALTER TABLE "wishlist_items" ADD COLUMN "created_at" TIMESTAMP(3);
ALTER TABLE "wishlist_items" ADD COLUMN "updated_at" TIMESTAMP(3);
ALTER TABLE "wishlist_items" ADD COLUMN "deleted_at" TIMESTAMP(3);

UPDATE "wishlist_items" AS item
SET
  "family_id" = wishlist."familyId",
  "owner_user_id" = COALESCE(wishlist."createdByUserId", member."userId"),
  "owner_family_member_id" = wishlist."ownerFamilyMemberId",
  "store_or_link" = item."productUrl",
  "image_url" = item."imageUrl",
  "price" = CASE
    WHEN item."estimatedPrice" ~ '^[0-9]+(\.[0-9]{1,2})?$' THEN item."estimatedPrice"::DECIMAL(10,2)
    ELSE NULL
  END,
  "position" = ranked."position",
  "created_at" = item."createdAt",
  "updated_at" = item."updatedAt"
FROM "wishlists" AS wishlist
LEFT JOIN "family_members" AS member ON member."id" = wishlist."ownerFamilyMemberId"
JOIN (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "wishlistId" ORDER BY "createdAt" ASC, "id" ASC) * 1000 AS "position"
  FROM "wishlist_items"
) AS ranked ON ranked."id" = item."id"
WHERE item."wishlistId" = wishlist."id";

DELETE FROM "wishlist_items"
WHERE "family_id" IS NULL OR "owner_user_id" IS NULL OR "position" IS NULL;

ALTER TABLE "wishlist_items" ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "wishlist_items" ALTER COLUMN "owner_user_id" SET NOT NULL;
ALTER TABLE "wishlist_items" ALTER COLUMN "position" SET NOT NULL;
ALTER TABLE "wishlist_items" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "wishlist_items" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "wishlist_items" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "wishlist_items" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "wishlistId";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "productUrl";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "imageUrl";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "estimatedPrice";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "purchased";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "createdAt";
ALTER TABLE "wishlist_items" DROP COLUMN IF EXISTS "updatedAt";

DROP TABLE IF EXISTS "wishlists";

ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_owner_family_member_id_fkey" FOREIGN KEY ("owner_family_member_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "wishlist_items_family_id_idx" ON "wishlist_items"("family_id");
CREATE INDEX "wishlist_items_owner_user_id_idx" ON "wishlist_items"("owner_user_id");
CREATE INDEX "wishlist_items_owner_family_member_id_idx" ON "wishlist_items"("owner_family_member_id");
CREATE INDEX "wishlist_items_family_owner_active_position_idx" ON "wishlist_items"("family_id", "owner_user_id", "deleted_at", "position");
CREATE UNIQUE INDEX "wishlist_items_active_owner_position_key" ON "wishlist_items"("family_id", "owner_user_id", "position") WHERE "deleted_at" IS NULL;
