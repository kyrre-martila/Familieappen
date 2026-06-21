ALTER TABLE "family_members" ADD COLUMN "includeInSchoolWeek" BOOLEAN NOT NULL DEFAULT true;

UPDATE "family_members" SET "includeInSchoolWeek" = true WHERE "includeInSchoolWeek" IS DISTINCT FROM true;
