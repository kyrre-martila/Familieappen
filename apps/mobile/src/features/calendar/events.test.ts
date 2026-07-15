import type { CalendarEvent } from "@familieappen/shared";
import { calendarQueryKeys } from "./queryKeys";
import { buildCalendarEventDetailPath, buildCalendarEventEditPath, canEditCalendarEvent, findCalendarEventOccurrence, formatCalendarEventDate, formatEventTimeLabel, getCalendarEventEditRestriction, getCalendarEventEditScopeDescription, getCalendarEventEditScopeLabel, getCalendarEventIdentity, getCalendarEventEditScopes, isValidCalendarOccurrenceDate, mapCalendarEventToViewModel, parseCalendarEventEditScope, requiresCalendarEventEditScope, sortCalendarEvents, validateCalendarEventEditRoute } from "./events";
import { getCalendarEventBackAction } from "./navigation";
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


const normalDetail = buildCalendarEventDetailPath({ eventId: "event-a" });
assertEqual(normalDetail, { pathname: "/(app)/calendar/[eventId]", params: { eventId: "event-a" } }, "builds full detail route without occurrenceDate for normal event");
const occurrenceDetail = buildCalendarEventDetailPath({ eventId: "series-a", occurrenceDate: "2026-07-15" });
assertEqual(occurrenceDetail, { pathname: "/(app)/calendar/[eventId]", params: { eventId: "series-a", occurrenceDate: "2026-07-15" } }, "includes occurrenceDate in detail route for recurring occurrence");

const recurringVm = mapCalendarEventToViewModel(event({ id: "occ-1", recurringEventId: "series-a", occurrenceDate: "2026-07-15", isRecurringOccurrence: true, recurrenceFrequency: "weekly", recurrence: { frequency: "weekly", until: null } }));
assertEqual(getCalendarEventIdentity(recurringVm), { eventId: "series-a", occurrenceDate: "2026-07-15" }, "uses recurring series id and occurrenceDate for generated occurrences");
assertEqual(recurringVm.recurrenceLabel, "Gjentas ukentlig • enkeltforekomst", "maps recurring occurrence label");

assertEqual(formatCalendarEventDate("2026-03-29"), "Søndag 29. mars 2026", "formats Norwegian date without UTC day shift");
assertEqual(formatEventTimeLabel(event({ allDay: true, startTime: null, endTime: null })), "Hele dagen", "formats all-day details text");
assertEqual(formatEventTimeLabel(event({ startTime: "08:05", endTime: null })), "08:05", "formats missing end time");
assertEqual(mapCalendarEventToViewModel(event({ source: "ics", icsSourceId: "source-a" })).sourceLabel, "Importert kalender", "maps imported source indicator");

const seriesOccurrence = event({ id: "generated-1", recurringEventId: "series-a", occurrenceDate: "2026-07-16", isRecurringOccurrence: true });
assertEqual(findCalendarEventOccurrence([event({ id: "series-a", date: "2026-07-01" }), seriesOccurrence], "series-a", "2026-07-16")?.id, "generated-1", "cache lookup resolves correct occurrence by eventId and occurrenceDate");
assertEqual(findCalendarEventOccurrence([event({ id: "event-a" })], "missing"), null, "unknown event id returns controlled not-found null");
assertEqual(getCalendarEventBackAction(true), "back", "uses router back when history exists");
assertEqual(getCalendarEventBackAction(false), "fallback", "uses calendar fallback when router cannot go back");
const editableVm = mapCalendarEventToViewModel(event({ id: "editable", source: "manual", icsSourceId: null, recurrence: null, recurrenceFrequency: "never" }));
assertEqual(canEditCalendarEvent(editableVm), true, "ordinary manual events can be edited");
assertEqual(getCalendarEventEditRestriction(mapCalendarEventToViewModel(event({ source: "ics", icsSourceId: "ics-1" }))), "Importerte kalenderhendelser kan ikke redigeres i appen ennå.", "imported events are blocked from editing");
assertEqual(canEditCalendarEvent(mapCalendarEventToViewModel(event({ recurrenceFrequency: "weekly", recurrence: { frequency: "weekly", until: null } }))), true, "recurring events can be edited with an explicit scope");
assertEqual(buildCalendarEventEditPath({ eventId: "event-a" }), { pathname: "/(app)/calendar/[eventId]/edit", params: { eventId: "event-a" } }, "builds full edit route with eventId");
assertEqual(buildCalendarEventEditPath({ eventId: "series-a", occurrenceDate: "2026-07-15", scope: "occurrence" }), { pathname: "/(app)/calendar/[eventId]/edit", params: { eventId: "series-a", occurrenceDate: "2026-07-15", scope: "occurrence" } }, "edit-path for occurrence includes occurrenceDate and scope");
assertEqual(buildCalendarEventEditPath({ eventId: "series-a", scope: "series" }), { pathname: "/(app)/calendar/[eventId]/edit", params: { eventId: "series-a", scope: "series" } }, "edit-path for series includes scope and full Expo Router path");
assertEqual(parseCalendarEventEditScope("occurrence"), "occurrence", "parses occurrence scope");
assertEqual(parseCalendarEventEditScope("series"), "series", "parses series scope");
assertEqual(parseCalendarEventEditScope("future"), null, "rejects invalid edit scope");
assertEqual(isValidCalendarOccurrenceDate("2026-07-15"), true, "validates occurrence date");
assertEqual(isValidCalendarOccurrenceDate("2026-02-31"), false, "rejects impossible occurrence date");
assertEqual(validateCalendarEventEditRoute({ scope: "occurrence" }), "Kun denne krever en gyldig forekomstdato.", "missing occurrenceDate for occurrence is rejected");
assertEqual(getCalendarEventEditScopeLabel("occurrence"), "Kun denne", "labels occurrence scope");
assertEqual(getCalendarEventEditScopeDescription("series"), "Endrer alle hendelsene i denne serien.", "describes series scope");
assertEqual(requiresCalendarEventEditScope(recurringVm), true, "recurring occurrence requires scope choice");
assertEqual(requiresCalendarEventEditScope(editableVm), false, "single event does not require scope choice");
assertEqual(getCalendarEventEditScopes(recurringVm), ["occurrence", "series"], "recurring event exposes both edit scopes");
assertEqual(getCalendarEventEditScopes(imported), [], "imported event exposes no edit scopes");
