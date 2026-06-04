CREATE TABLE "school_week_reminders" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "childFamilyMemberId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT 'backpack',
  "weekday" TEXT NOT NULL,
  "date" TIMESTAMP(3),
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "recurrenceFrequency" TEXT NOT NULL DEFAULT 'weekly',
  "recurrenceEndDate" TIMESTAMP(3),
  "recurringSeriesId" TEXT,
  "exceptionOfId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "school_week_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "school_week_reminders_familyId_idx" ON "school_week_reminders"("familyId");
CREATE INDEX "school_week_reminders_childFamilyMemberId_idx" ON "school_week_reminders"("childFamilyMemberId");
CREATE INDEX "school_week_reminders_date_idx" ON "school_week_reminders"("date");
CREATE INDEX "school_week_reminders_exceptionOfId_idx" ON "school_week_reminders"("exceptionOfId");
CREATE INDEX "school_week_reminders_recurringSeriesId_idx" ON "school_week_reminders"("recurringSeriesId");

ALTER TABLE "school_week_reminders" ADD CONSTRAINT "school_week_reminders_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_week_reminders" ADD CONSTRAINT "school_week_reminders_childFamilyMemberId_fkey" FOREIGN KEY ("childFamilyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_week_reminders" ADD CONSTRAINT "school_week_reminders_exceptionOfId_fkey" FOREIGN KEY ("exceptionOfId") REFERENCES "school_week_reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
