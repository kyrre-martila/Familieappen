ALTER TABLE "tasks"
ADD COLUMN "assignedMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "tasks"
SET "assignedMemberIds" = ARRAY["assignedFamilyMemberId"::text]
WHERE "assignedFamilyMemberId" IS NOT NULL;