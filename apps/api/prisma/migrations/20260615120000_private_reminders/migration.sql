ALTER TABLE "reminders" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "reminders_familyId_isPrivate_createdByUserId_idx" ON "reminders"("familyId", "isPrivate", "createdByUserId");
