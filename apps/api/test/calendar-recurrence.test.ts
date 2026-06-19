import assert from "node:assert/strict";
import { CalendarService } from "../src/calendar/calendar.service";

const service = new CalendarService({} as never, {} as never) as unknown as {
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
