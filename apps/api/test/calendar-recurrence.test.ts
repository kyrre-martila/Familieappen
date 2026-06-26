import assert from "node:assert/strict";
import { CalendarService } from "../src/calendar/calendar.service";

const service = new CalendarService({} as never, {} as never, {} as never) as unknown as {
  expandEventForRange(event: CalendarEventRecord, from: Date, to: Date): CalendarEventRecord[];
};

type CalendarEventRecord = {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  location: string | null;
  icon: string;
  reminderMinutesBefore: number | null;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  recurrenceFrequency: "never" | "daily" | "weekly" | "monthly" | "yearly";
  recurrenceUntil: Date | null;
  source: string;
  icsSourceId: string | null;
  externalUid: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: unknown[];
  recurrenceExceptions?: unknown[];
};

function event(overrides: Partial<CalendarEventRecord>): CalendarEventRecord {
  const startsAt = overrides.startsAt ?? new Date("2026-01-01T09:30:00.000Z");
  return {
    id: "event-1",
    familyId: "family-1",
    title: "Test event",
    description: "Description",
    location: "Home",
    icon: "family",
    reminderMinutesBefore: 15,
    startsAt,
    endsAt: overrides.allDay ? startsAt : new Date(startsAt.getTime() + 90 * 60 * 1000),
    allDay: false,
    recurrenceFrequency: "never",
    recurrenceUntil: overrides.recurrenceFrequency && overrides.recurrenceFrequency !== "never" ? new Date("2026-12-31T23:59:59.999Z") : null,
    source: "manual",
    icsSourceId: null,
    externalUid: null,
    createdByUserId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    participants: [],
    ...overrides,
  };
}

function datesFor(record: CalendarEventRecord, from: string, to: string) {
  return service.expandEventForRange(record, new Date(from), new Date(to)).map((occurrence) => occurrence.startsAt.toISOString());
}

assert.deepEqual(
  datesFor(event({ recurrenceFrequency: "daily" }), "2026-01-01T00:00:00.000Z", "2026-01-03T23:59:59.999Z"),
  ["2026-01-01T09:30:00.000Z", "2026-01-02T09:30:00.000Z", "2026-01-03T09:30:00.000Z"],
);

assert.deepEqual(
  datesFor(event({ recurrenceFrequency: "weekly" }), "2026-01-01T00:00:00.000Z", "2026-01-22T23:59:59.999Z"),
  ["2026-01-01T09:30:00.000Z", "2026-01-08T09:30:00.000Z", "2026-01-15T09:30:00.000Z", "2026-01-22T09:30:00.000Z"],
);

assert.deepEqual(
  datesFor(event({ recurrenceFrequency: "monthly", startsAt: new Date("2026-01-31T09:30:00.000Z") }), "2026-01-01T00:00:00.000Z", "2026-04-30T23:59:59.999Z"),
  ["2026-01-31T09:30:00.000Z", "2026-03-31T09:30:00.000Z"],
);

assert.deepEqual(
  datesFor(event({ recurrenceFrequency: "yearly", startsAt: new Date("2024-02-29T09:30:00.000Z"), recurrenceUntil: new Date("2028-12-31T23:59:59.999Z") }), "2024-01-01T00:00:00.000Z", "2028-12-31T23:59:59.999Z"),
  ["2024-02-29T09:30:00.000Z", "2028-02-29T09:30:00.000Z"],
);

assert.equal(datesFor(event({ recurrenceFrequency: "never" }), "2026-01-01T00:00:00.000Z", "2026-01-03T23:59:59.999Z").length, 1);

const allDayOccurrences = service.expandEventForRange(
  event({ allDay: true, recurrenceFrequency: "daily", startsAt: new Date("2026-01-01T00:00:00.000Z"), endsAt: new Date("2026-01-01T00:00:00.000Z") }),
  new Date("2026-01-01T00:00:00.000Z"),
  new Date("2026-01-02T23:59:59.999Z"),
);
assert.equal(allDayOccurrences.length, 2);
assert.equal(allDayOccurrences[1].allDay, true);
assert.equal(allDayOccurrences[1].endsAt?.toISOString(), "2026-01-02T00:00:00.000Z");

const timedOccurrences = service.expandEventForRange(
  event({ recurrenceFrequency: "daily", startsAt: new Date("2026-01-01T09:30:00.000Z"), endsAt: new Date("2026-01-01T11:00:00.000Z") }),
  new Date("2026-01-02T00:00:00.000Z"),
  new Date("2026-01-02T23:59:59.999Z"),
);
assert.equal(timedOccurrences[0].startsAt.toISOString(), "2026-01-02T09:30:00.000Z");
assert.equal(timedOccurrences[0].endsAt?.toISOString(), "2026-01-02T11:00:00.000Z");
assert.equal(timedOccurrences[0].id, "event-1::2026-01-02");
assert.equal((timedOccurrences[0] as CalendarEventRecord & { recurringEventId?: string }).recurringEventId, "event-1");


const limitedOccurrences = service.expandEventForRange(
  event({ recurrenceFrequency: "daily", recurrenceUntil: new Date("2026-01-02T23:59:59.999Z") }),
  new Date("2026-01-01T00:00:00.000Z"),
  new Date("2026-01-10T23:59:59.999Z"),
);
assert.equal(limitedOccurrences.length, 2);

const deletedOccurrence = service.expandEventForRange(
  { ...event({ recurrenceFrequency: "daily", recurrenceUntil: new Date("2026-01-03T23:59:59.999Z") }), recurrenceExceptions: [{ id: "ex-1", recurringEventId: "event-1", occurrenceDate: new Date("2026-01-02T00:00:00.000Z"), isDeleted: true, overrideStartsAt: null, overrideEndsAt: null, overrideTitle: null, overrideDescription: null, overrideLocation: null, overrideIcon: null, overrideReminderMinutesBefore: null, overrideAllDay: null, overrideParticipantFamilyMemberIds: [], createdAt: new Date(), updatedAt: new Date() }] },
  new Date("2026-01-01T00:00:00.000Z"),
  new Date("2026-01-03T23:59:59.999Z"),
);
assert.deepEqual(deletedOccurrence.map((occurrence) => occurrence.startsAt.toISOString()), ["2026-01-01T09:30:00.000Z", "2026-01-03T09:30:00.000Z"]);

const editedOccurrence = service.expandEventForRange(
  { ...event({ recurrenceFrequency: "daily", recurrenceUntil: new Date("2026-01-03T23:59:59.999Z") }), recurrenceExceptions: [{ id: "ex-2", recurringEventId: "event-1", occurrenceDate: new Date("2026-01-02T00:00:00.000Z"), isDeleted: false, overrideStartsAt: null, overrideEndsAt: null, overrideTitle: "Changed", overrideDescription: null, overrideLocation: null, overrideIcon: null, overrideReminderMinutesBefore: null, overrideAllDay: null, overrideParticipantFamilyMemberIds: [], createdAt: new Date(), updatedAt: new Date() }] },
  new Date("2026-01-01T00:00:00.000Z"),
  new Date("2026-01-03T23:59:59.999Z"),
);
assert.equal(editedOccurrence[1].title, "Changed");
assert.equal(editedOccurrence[0].title, "Test event");

const participantA = { id: "participant-1", eventId: "event-1", familyMemberId: "member-1", createdAt: new Date(), familyMember: { id: "member-1", userId: null, familyId: "family-1", displayName: "A", role: "child", createdAt: new Date(), updatedAt: new Date() } };
const participantB = { id: "participant-2", eventId: "event-1", familyMemberId: "member-2", createdAt: new Date(), familyMember: { id: "member-2", userId: null, familyId: "family-1", displayName: "B", role: "child", createdAt: new Date(), updatedAt: new Date() } };

const noParticipantOverride = service.expandEventForRange(
  { ...event({ recurrenceFrequency: "daily", recurrenceUntil: new Date("2026-01-01T23:59:59.999Z"), participants: [participantA, participantB] }), recurrenceExceptions: [{ id: "ex-3", recurringEventId: "event-1", occurrenceDate: new Date("2026-01-01T00:00:00.000Z"), isDeleted: false, overrideStartsAt: null, overrideEndsAt: null, overrideTitle: null, overrideDescription: null, overrideLocation: null, overrideIcon: null, overrideReminderMinutesBefore: null, overrideAllDay: null, overrideParticipantsSet: false, overrideParticipantFamilyMemberIds: [], createdAt: new Date(), updatedAt: new Date() }] } as CalendarEventRecord,
  new Date("2026-01-01T00:00:00.000Z"),
  new Date("2026-01-01T23:59:59.999Z"),
);
assert.equal(noParticipantOverride[0].participants.length, 2);

const emptyParticipantOverride = service.expandEventForRange(
  { ...event({ recurrenceFrequency: "daily", recurrenceUntil: new Date("2026-01-01T23:59:59.999Z"), participants: [participantA, participantB] }), recurrenceExceptions: [{ id: "ex-4", recurringEventId: "event-1", occurrenceDate: new Date("2026-01-01T00:00:00.000Z"), isDeleted: false, overrideStartsAt: null, overrideEndsAt: null, overrideTitle: null, overrideDescription: null, overrideLocation: null, overrideIcon: null, overrideReminderMinutesBefore: null, overrideAllDay: null, overrideParticipantsSet: true, overrideParticipantFamilyMemberIds: [], createdAt: new Date(), updatedAt: new Date() }] } as CalendarEventRecord,
  new Date("2026-01-01T00:00:00.000Z"),
  new Date("2026-01-01T23:59:59.999Z"),
);
assert.equal(emptyParticipantOverride[0].participants.length, 0);

const guardedStarts = (service as unknown as { getOccurrenceStartsInRange(seriesStart: Date, frequency: "daily", from: Date, to: Date): Date[] }).getOccurrenceStartsInRange(
  new Date("2026-01-01T00:00:00.000Z"),
  "daily",
  new Date("2026-01-01T00:00:00.000Z"),
  new Date("2030-01-01T00:00:00.000Z"),
);
assert.equal(guardedStarts.length, 300);
