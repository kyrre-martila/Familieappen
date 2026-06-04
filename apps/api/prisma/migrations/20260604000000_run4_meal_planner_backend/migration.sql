ALTER TABLE "meal_plan_days" ADD COLUMN "familyId" TEXT;
UPDATE "meal_plan_days" AS day
SET "familyId" = plan."familyId"
FROM "meal_plans" AS plan
WHERE day."mealPlanId" = plan."id";
ALTER TABLE "meal_plan_days" ALTER COLUMN "familyId" SET NOT NULL;

ALTER TABLE "meal_plan_days" ADD COLUMN "createdByFamilyMemberId" TEXT;
ALTER TABLE "meal_plan_days" ADD COLUMN "sortOrder" INTEGER;
ALTER TABLE "meal_plan_days" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "meal_plan_days_familyId_date_key" ON "meal_plan_days"("familyId", "date");
CREATE INDEX "meal_plan_days_familyId_idx" ON "meal_plan_days"("familyId");
CREATE INDEX "meal_plan_days_createdByFamilyMemberId_idx" ON "meal_plan_days"("createdByFamilyMemberId");
CREATE INDEX "meal_plan_days_deletedAt_idx" ON "meal_plan_days"("deletedAt");

ALTER TABLE "meal_plan_days" ADD CONSTRAINT "meal_plan_days_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meal_plan_days" ADD CONSTRAINT "meal_plan_days_createdByFamilyMemberId_fkey" FOREIGN KEY ("createdByFamilyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
