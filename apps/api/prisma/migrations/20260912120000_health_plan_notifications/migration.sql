-- V1 Health Plan notification audience, preference and race-safe notification ledger identity.
ALTER TABLE "notification_preferences"
  ADD COLUMN "healthPlansEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "notifications"
  ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "notifications_dedupeKey_key" ON "notifications"("dedupeKey");

CREATE TABLE "health_plan_notification_recipients" (
  "healthPlanId" TEXT NOT NULL,
  "familyMemberId" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "health_plan_notification_recipients_pkey" PRIMARY KEY ("healthPlanId", "familyMemberId")
);
CREATE INDEX "health_plan_notification_recipients_familyId_idx" ON "health_plan_notification_recipients"("familyId");
CREATE INDEX "health_plan_notification_recipients_familyMemberId_idx" ON "health_plan_notification_recipients"("familyMemberId");
ALTER TABLE "health_plan_notification_recipients" ADD CONSTRAINT "health_plan_notification_recipients_healthPlanId_familyId_fkey" FOREIGN KEY ("healthPlanId", "familyId") REFERENCES "health_plans"("id", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_notification_recipients" ADD CONSTRAINT "health_plan_notification_recipients_familyMemberId_familyId_fkey" FOREIGN KEY ("familyMemberId", "familyId") REFERENCES "family_members"("id", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_plan_notification_recipients" ADD CONSTRAINT "health_plan_notification_recipients_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
