ALTER TABLE "calendar_events" ADD COLUMN "recurrenceUntil" TIMESTAMP(3);

CREATE TABLE "calendar_event_exceptions" (
    "id" TEXT NOT NULL,
    "recurringEventId" TEXT NOT NULL,
    "occurrenceDate" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "overrideStartsAt" TIMESTAMP(3),
    "overrideEndsAt" TIMESTAMP(3),
    "overrideTitle" TEXT,
    "overrideDescription" TEXT,
    "overrideLocation" TEXT,
    "overrideIcon" TEXT,
    "overrideReminderMinutesBefore" INTEGER,
    "overrideAllDay" BOOLEAN,
    "overrideParticipantsSet" BOOLEAN NOT NULL DEFAULT false,
    "overrideParticipantFamilyMemberIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calendar_event_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_event_exceptions_recurringEventId_occurrenceDate_key" ON "calendar_event_exceptions"("recurringEventId", "occurrenceDate");
CREATE INDEX "calendar_event_exceptions_recurringEventId_idx" ON "calendar_event_exceptions"("recurringEventId");
CREATE INDEX "calendar_event_exceptions_recurringEventId_occurrenceDate_idx" ON "calendar_event_exceptions"("recurringEventId", "occurrenceDate");

ALTER TABLE "calendar_event_exceptions" ADD CONSTRAINT "calendar_event_exceptions_recurringEventId_fkey" FOREIGN KEY ("recurringEventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
