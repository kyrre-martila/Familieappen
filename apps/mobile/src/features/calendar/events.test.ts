import type { CalendarEvent } from "@familieappen/shared";
import { calendarQueryKeys } from "./queryKeys";
import { formatEventTimeLabel, mapCalendarEventToViewModel, sortCalendarEvents } from "./events";
import { getCalendarDayRange, parseDateString, formatDateString } from "./date";

function assertEqual<T>(actual: T, expected: T, description: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "event-a",
    familyId: "family-1",
    title: "Hendelse",
    description: null,
    location: null,
    icon: "family",
    reminderMinutesBefore: null,
    date: "2026-03-29",
    endDate: "2026-03-29",
    startTime: "10:00",
    endTime: "11:00",
    reminder: null,
    startsAt: "2026-03-29T10:00:00.000Z",
    endsAt: "2026-03-29T11:00:00.000Z",
    allDay: false,
    recurrenceFrequency: "never",
    recurrence: null,
    source: "manual",
    icsSourceId: null,
    externalUid: null,
    createdByUserId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    participants: [],
    ...overrides,
  };
}

assertEqual(formatEventTimeLabel(event({ allDay: true, startTime: null, endTime: null })), "Hele dagen", "formats all-day events");
assertEqual(formatEventTimeLabel(event({ startTime: "08:30", endTime: null })), "08:30", "formats start-only events");
assertEqual(formatEventTimeLabel(event({ startTime: "8:30", endTime: "9:05" })), "08:30–09:05", "normalizes start and end time");
assertEqual(formatEventTimeLabel(event({ startTime: null, endTime: null })), "Tid ikke satt", "handles missing time");

const sorted = sortCalendarEvents([
  mapCalendarEventToViewModel(event({ id: "late", title: "Sen", startTime: "16:00" })),
  mapCalendarEventToViewModel(event({ id: "all-day", title: "Heldag", allDay: true, startTime: null, endTime: null })),
  mapCalendarEventToViewModel(event({ id: "same-b", title: "B-tittel", startTime: "09:00" })),
  mapCalendarEventToViewModel(event({ id: "same-a", title: "A-tittel", startTime: "09:00" })),
]);
assertEqual(sorted.map((item) => item.id), ["all-day", "same-a", "same-b", "late"], "sorts all-day first, then time, then stable title/id fallback");

const imported = mapCalendarEventToViewModel(event({ source: "ics", icsSourceId: "ics-1", participants: [{ id: "p1", eventId: "event-a", familyMemberId: "m1", createdAt: "2026-01-01T00:00:00.000Z", familyMember: { id: "m1", userId: null, familyId: "family-1", displayName: "Ada", avatarUrl: null, role: "CHILD", includeInSchoolWeek: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } }] }));
assertEqual({ isImported: imported.isImported, participantNames: imported.participantNames }, { isImported: true, participantNames: ["Ada"] }, "maps API DTO participants and imported marker");

assertEqual(getCalendarDayRange("2026-03-29"), { from: "2026-03-29T00:00:00.000Z", to: "2026-03-29T23:59:59.999Z" }, "builds selected day query range without parsing through Date");
assertEqual(formatDateString(parseDateString("2026-03-29")), "2026-03-29", "keeps DST date stable without UTC date parsing");
assertEqual(calendarQueryKeys.day("family-1", "2026-03-29"), ["calendar", "events", "family-1", "day", "2026-03-29"], "builds selected-day query key");
