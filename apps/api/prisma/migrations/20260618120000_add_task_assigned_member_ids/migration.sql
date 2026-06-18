ALTER TABLE "Task" ADD COLUMN "assignedMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Task"
SET "assignedMemberIds" = ARRAY["assignedFamilyMemberId"]
WHERE "assignedFamilyMemberId" IS NOT NULL;
