-- Production-safe advertisement creative migration.
-- Legacy body/imageUrl columns are preserved and made nullable so existing rows remain as drafts/paused/ended data until reworked.
ALTER TABLE "advertisements" ALTER COLUMN "body" DROP NOT NULL;
ALTER TABLE "advertisements" ADD COLUMN "altText" TEXT;
ALTER TABLE "advertisements" ADD COLUMN "mobileImagePath" TEXT;
ALTER TABLE "advertisements" ADD COLUMN "mobileImageWidth" INTEGER;
ALTER TABLE "advertisements" ADD COLUMN "mobileImageHeight" INTEGER;
ALTER TABLE "advertisements" ADD COLUMN "mobileImageMimeType" TEXT;
ALTER TABLE "advertisements" ADD COLUMN "tabletImagePath" TEXT;
ALTER TABLE "advertisements" ADD COLUMN "tabletImageWidth" INTEGER;
ALTER TABLE "advertisements" ADD COLUMN "tabletImageHeight" INTEGER;
ALTER TABLE "advertisements" ADD COLUMN "tabletImageMimeType" TEXT;
ALTER TABLE "advertisements" ADD COLUMN "desktopImagePath" TEXT;
ALTER TABLE "advertisements" ADD COLUMN "desktopImageWidth" INTEGER;
ALTER TABLE "advertisements" ADD COLUMN "desktopImageHeight" INTEGER;
ALTER TABLE "advertisements" ADD COLUMN "desktopImageMimeType" TEXT;
