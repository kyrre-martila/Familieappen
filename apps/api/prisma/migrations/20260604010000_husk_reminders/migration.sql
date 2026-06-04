-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'backpack',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reminderMinutesBefore" INTEGER,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_audience_members" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_audience_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reminders_familyId_idx" ON "reminders"("familyId");

-- CreateIndex
CREATE INDEX "reminders_dueDate_idx" ON "reminders"("dueDate");

-- CreateIndex
CREATE INDEX "reminders_createdByUserId_idx" ON "reminders"("createdByUserId");

-- CreateIndex
CREATE INDEX "reminder_audience_members_reminderId_idx" ON "reminder_audience_members"("reminderId");

-- CreateIndex
CREATE INDEX "reminder_audience_members_familyMemberId_idx" ON "reminder_audience_members"("familyMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_audience_members_reminderId_familyMemberId_key" ON "reminder_audience_members"("reminderId", "familyMemberId");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_audience_members" ADD CONSTRAINT "reminder_audience_members_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_audience_members" ADD CONSTRAINT "reminder_audience_members_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
