import assert from "node:assert/strict";
import { parseIcsEvents } from "../src/calendar/calendar-ics-sync.service";
import { CalendarService } from "../src/calendar/calendar.service";

const service = new CalendarService({} as never, {} as never, {} as never) as unknown as {
  toCalendarEventDto(event: CalendarEventRecord): {
    date: string;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;
    startsAt: string;
    endsAt: string | null;
    allDay: boolean;
  };
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
  participants: Array<{
    id: string;
    eventId: string;
    familyMemberId: string;
    createdAt: Date;
    familyMember: {
      id: string;
      userId: string | null;
      familyId: string;
      displayName: string;
      role: "OWNER" | "PARENT" | "CHILD" | "GUEST";
      includeInSchoolWeek: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
};

function icsEvent(properties: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:test-event",
    "SUMMARY:Test event",
    properties.trim(),
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ].join("\r\n");
}

function importedEvent(overrides: Partial<CalendarEventRecord>): CalendarEventRecord {
  const startsAt = overrides.startsAt ?? new Date("2026-06-26T06:00:00.000Z");
  return {
    id: "event-1",
    familyId: "family-1",
    title: "Test event",
    description: null,
    location: null,
    icon: "family",
    reminderMinutesBefore: null,
    startsAt,
    endsAt: overrides.allDay ? startsAt : new Date(startsAt.getTime() + 60 * 60 * 1000),
    allDay: false,
    recurrenceFrequency: "never",
    recurrenceUntil: null,
    source: "ics",
    icsSourceId: "source-1",
    externalUid: "test-event",
    createdByUserId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    participants: [],
    ...overrides
  };
}

function firstParsed(properties: string) {
  const [event] = parseIcsEvents(icsEvent(properties));
  assert.ok(event);
  return event;
}

const stockholmSummer = firstParsed(`
DTSTART;TZID=Europe/Stockholm:20260626T080000
DTEND;TZID=Europe/Stockholm:20260626T090000
`);
assert.equal(stockholmSummer.startsAt.toISOString(), "2026-06-26T06:00:00.000Z");
assert.equal(stockholmSummer.endsAt?.toISOString(), "2026-06-26T07:00:00.000Z");
assert.deepEqual(service.toCalendarEventDto(importedEvent({ startsAt: stockholmSummer.startsAt, endsAt: stockholmSummer.endsAt })).startTime, "08:00");
assert.deepEqual(service.toCalendarEventDto(importedEvent({ startsAt: stockholmSummer.startsAt, endsAt: stockholmSummer.endsAt })).endTime, "09:00");

const osloSummer = firstParsed(`
DTSTART;TZID=Europe/Oslo:20260626T080000
DTEND;TZID=Europe/Oslo:20260626T090000
`);
assert.equal(osloSummer.startsAt.toISOString(), "2026-06-26T06:00:00.000Z");
assert.equal(service.toCalendarEventDto(importedEvent({ startsAt: osloSummer.startsAt, endsAt: osloSummer.endsAt })).startTime, "08:00");

const osloWinter = firstParsed(`
DTSTART;TZID=Europe/Oslo:20260126T080000
DTEND;TZID=Europe/Oslo:20260126T090000
`);
assert.equal(osloWinter.startsAt.toISOString(), "2026-01-26T07:00:00.000Z");
assert.equal(service.toCalendarEventDto(importedEvent({ startsAt: osloWinter.startsAt, endsAt: osloWinter.endsAt })).startTime, "08:00");

const utcSummer = firstParsed(`
DTSTART:20260626T080000Z
DTEND:20260626T090000Z
`);
assert.equal(utcSummer.startsAt.toISOString(), "2026-06-26T08:00:00.000Z");
assert.equal(service.toCalendarEventDto(importedEvent({ startsAt: utcSummer.startsAt, endsAt: utcSummer.endsAt })).startTime, "10:00");

const allDay = firstParsed(`
DTSTART;VALUE=DATE:20260626
DTEND;VALUE=DATE:20260627
`);
const allDayDto = service.toCalendarEventDto(importedEvent({ startsAt: allDay.startsAt, endsAt: allDay.endsAt, allDay: true }));
assert.equal(allDay.startsAt.toISOString(), "2026-06-26T00:00:00.000Z");
assert.equal(allDayDto.date, "2026-06-26");
assert.equal(allDayDto.startTime, null);
assert.equal(allDayDto.endTime, null);

const manualDto = service.toCalendarEventDto(importedEvent({ source: "manual", icsSourceId: null, startsAt: stockholmSummer.startsAt, endsAt: stockholmSummer.endsAt }));
assert.equal(manualDto.startTime, "06:00");
assert.equal(manualDto.startsAt, "2026-06-26T06:00:00.000Z");
