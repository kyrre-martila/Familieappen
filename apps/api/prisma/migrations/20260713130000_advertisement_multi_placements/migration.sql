-- Production-safe migration to normalize advertisement placements.
ALTER TYPE "AdvertisementPlacement" ADD VALUE IF NOT EXISTS 'WISHLIST';
ALTER TYPE "AdvertisementPlacement" ADD VALUE IF NOT EXISTS 'SHOPPING';

CREATE TABLE "advertisement_placement_links" (
    "advertisementId" TEXT NOT NULL,
    "placement" "AdvertisementPlacement" NOT NULL,
    CONSTRAINT "advertisement_placement_links_pkey" PRIMARY KEY ("advertisementId", "placement")
);

CREATE INDEX "advertisement_placement_links_placement_idx" ON "advertisement_placement_links"("placement");

ALTER TABLE "advertisement_placement_links" ADD CONSTRAINT "advertisement_placement_links_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "advertisement_placement_links" ("advertisementId", "placement")
SELECT "id", "placement"
FROM "advertisements"
WHERE "placement" IS NOT NULL
ON CONFLICT ("advertisementId", "placement") DO NOTHING;

ALTER TABLE "advertisements" DROP COLUMN "placement";
