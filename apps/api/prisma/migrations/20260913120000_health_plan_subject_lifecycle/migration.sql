-- Preserve the subject's presentation independently of active membership.
ALTER TABLE "health_plans" ADD COLUMN "subjectDisplayName" TEXT;

UPDATE "health_plans" AS hp
SET "subjectDisplayName" = fm."displayName"
FROM "family_members" AS fm
WHERE hp."familyMemberId" = fm."id" AND hp."familyId" = fm."familyId";

ALTER TABLE "health_plans" ALTER COLUMN "subjectDisplayName" SET NOT NULL;
ALTER TABLE "health_plans" ALTER COLUMN "familyMemberId" DROP NOT NULL;

ALTER TABLE "health_plans" DROP CONSTRAINT "health_plans_familyMemberId_familyId_fkey";
ALTER TABLE "health_plans" DROP CONSTRAINT "health_plans_familyId_fkey";
ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_familyId_fkey"
  FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_familyMemberId_fkey"
  FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A nullable single-column FK permits SET NULL. This trigger retains the
-- composite relation's same-family invariant whenever a live subject exists.
CREATE FUNCTION health_plan_subject_same_family() RETURNS trigger AS $$
BEGIN
  IF NEW."familyMemberId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "family_members" fm
    WHERE fm."id" = NEW."familyMemberId" AND fm."familyId" = NEW."familyId"
  ) THEN
    RAISE EXCEPTION 'health plan subject must belong to the same family' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER health_plan_subject_same_family_trigger
BEFORE INSERT OR UPDATE OF "familyMemberId", "familyId" ON "health_plans"
FOR EACH ROW EXECUTE FUNCTION health_plan_subject_same_family();

-- Whole-family deletion owns and removes the complete Helseplan tree.
ALTER TABLE "health_plan_occurrences" DROP CONSTRAINT "health_plan_occurrences_healthPlanId_familyId_fkey";
ALTER TABLE "health_plan_occurrences" ADD CONSTRAINT "health_plan_occurrences_healthPlanId_familyId_fkey" FOREIGN KEY ("healthPlanId", "familyId") REFERENCES "health_plans"("id", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_occurrences" DROP CONSTRAINT "health_plan_occurrences_familyId_fkey";
ALTER TABLE "health_plan_occurrences" ADD CONSTRAINT "health_plan_occurrences_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_occurrences" DROP CONSTRAINT "health_plan_occurrences_sourceActionId_fkey";
ALTER TABLE "health_plan_occurrences" ADD CONSTRAINT "health_plan_occurrences_sourceActionId_fkey" FOREIGN KEY ("sourceActionId") REFERENCES "health_plan_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_notes" DROP CONSTRAINT "health_plan_notes_healthPlanId_fkey";
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_healthPlanId_fkey" FOREIGN KEY ("healthPlanId") REFERENCES "health_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_notes" DROP CONSTRAINT "health_plan_notes_occurrenceId_fkey";
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "health_plan_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_notes" DROP CONSTRAINT "health_plan_notes_sourceActionId_fkey";
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_sourceActionId_fkey" FOREIGN KEY ("sourceActionId") REFERENCES "health_plan_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_history" DROP CONSTRAINT "health_plan_history_healthPlanId_fkey";
ALTER TABLE "health_plan_history" ADD CONSTRAINT "health_plan_history_healthPlanId_fkey" FOREIGN KEY ("healthPlanId") REFERENCES "health_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
