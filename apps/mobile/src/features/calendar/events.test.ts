import type { CalendarEvent } from "@familieappen/shared";
import { calendarQueryKeys } from "./queryKeys";
import { buildCalendarEventDeletePath, buildCalendarEventDetailPath, buildCalendarEventEditPath, buildUpdatedCalendarEventDetailPath, canDeleteCalendarEvent, canEditCalendarEvent, findCalendarEventOccurrence, formatCalendarEventDate, formatEventTimeLabel, getCalendarEventDeleteRestriction, getCalendarEventDeleteScopeDescription, getCalendarEventDeleteScopeLabel, getCalendarEventEditRestriction, getCalendarEventEditScopeDescription, getCalendarEventEditScopeLabel, getCalendarEventIdentity, getCalendarEventEditScopes, getCalendarEventDeleteScopes, getCalendarEventSeriesHydrationError, isValidCalendarOccurrenceDate, mapCalendarEventToViewModel, parseCalendarEventEditScope, requiresCalendarEventDeleteScope, requiresCalendarEventEditScope, sortCalendarEvents, validateCalendarEventDeleteScope, validateCalendarEventEditRoute, validateCalendarEventUpdateScope } from "./events";
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
assertEqual(validateCalendarEventEditRoute({ scope: "series" }), null, "series scope is valid without occurrenceDate");
assertEqual(validateCalendarEventEditRoute({ isRecurringOccurrence: true }), "Velg om du vil redigere kun denne hendelsen eller hele serien.", "recurring occurrence without scope is rejected after event load");
assertEqual(validateCalendarEventEditRoute({ isRecurringOccurrence: true, scope: "occurrence" }), "Kun denne krever en gyldig forekomstdato.", "occurrence scope without occurrenceDate is rejected after event load");
assertEqual(validateCalendarEventEditRoute({ isRecurringOccurrence: true, scope: "occurrence", occurrenceDate: "2026-07-15" }), null, "occurrence scope with occurrenceDate is valid after event load");
assertEqual(validateCalendarEventEditRoute({ isRecurringOccurrence: true, scope: "series" }), null, "series scope without occurrenceDate is valid after event load");
assertEqual(validateCalendarEventEditRoute({ isRecurringOccurrence: false }), null, "single event without scope is valid after event load");
assertEqual(getCalendarEventEditScopeLabel("occurrence"), "Kun denne", "labels occurrence scope");
assertEqual(getCalendarEventEditScopeDescription("series"), "Endrer alle hendelsene i denne serien.", "describes series scope");
assertEqual(requiresCalendarEventEditScope(recurringVm), true, "recurring occurrence requires scope choice");
assertEqual(requiresCalendarEventEditScope(editableVm), false, "single event does not require scope choice");
assertEqual(getCalendarEventEditScopes(recurringVm), ["occurrence", "series"], "recurring event exposes both edit scopes");
assertEqual(getCalendarEventEditScopes(imported), [], "imported event exposes no edit scopes");
assertEqual(getCalendarEventSeriesHydrationError(event({ id: "series-a", recurrenceFrequency: "weekly", recurrence: { frequency: "weekly", until: null } }), "series-a", "series"), null, "series hydration accepts actual series base event");
assertEqual(getCalendarEventSeriesHydrationError(seriesOccurrence, "series-a", "series"), "Mobilappen mangler sikkert seriegrunnlag for denne gjentakende hendelsen. Prøv web inntil kalender-API-et kan hente selve serien direkte.", "series hydration rejects generated occurrence as unsafe base");
assertEqual(buildUpdatedCalendarEventDetailPath({ requestedEventId: "series-a", scope: "occurrence", event: { recurringEventId: "series-a", occurrenceDate: "2026-07-16" } }), { pathname: "/(app)/calendar/[eventId]", params: { eventId: "series-a", occurrenceDate: "2026-07-16" } }, "occurrence save navigates to updated occurrenceDate from response");
assertEqual(buildUpdatedCalendarEventDetailPath({ requestedEventId: "series-a", scope: "series", event: { recurringEventId: "series-a", occurrenceDate: "2026-07-16" } }), { pathname: "/(app)/calendar/[eventId]", params: { eventId: "series-a" } }, "series save navigates to safe series detail without occurrenceDate");
assertEqual(validateCalendarEventUpdateScope({ previousEvent: seriesOccurrence }), "Velg om du vil redigere kun denne hendelsen eller hele serien.", "mutation guard rejects recurring occurrence without scope before series PATCH fallback");
assertEqual(validateCalendarEventUpdateScope({ previousEvent: seriesOccurrence, scope: "occurrence" }), "Kun denne krever en gyldig forekomstdato.", "mutation guard rejects occurrence update without occurrenceDate");
assertEqual(validateCalendarEventUpdateScope({ previousEvent: seriesOccurrence, scope: "occurrence", occurrenceDate: "2026-07-15" }), null, "mutation guard accepts occurrence update with occurrenceDate");
assertEqual(validateCalendarEventUpdateScope({ previousEvent: seriesOccurrence, scope: "series" }), null, "mutation guard accepts series update without occurrenceDate");
assertEqual(validateCalendarEventUpdateScope({ previousEvent: event({ id: "single-a" }) }), null, "mutation guard accepts single event without scope");

assertEqual(canDeleteCalendarEvent(editableVm), true, "ordinary manual events can be deleted");
assertEqual(getCalendarEventDeleteRestriction(imported), "Importerte kalenderhendelser kan ikke slettes i FamilieAppen.", "imported events are blocked from deletion");
assertEqual(requiresCalendarEventDeleteScope(recurringVm), true, "recurring occurrence requires delete scope choice");
assertEqual(getCalendarEventDeleteScopes(recurringVm), ["occurrence", "series"], "recurring event exposes both delete scopes");
assertEqual(getCalendarEventDeleteScopeLabel("occurrence"), "Kun denne", "labels delete occurrence scope");
assertEqual(getCalendarEventDeleteScopeDescription("occurrence", "2026-07-15"), "Sletter bare hendelsen Onsdag 15. juli 2026.", "describes delete occurrence with date");
assertEqual(validateCalendarEventDeleteScope({ previousEvent: seriesOccurrence }), "Velg om du vil slette kun denne hendelsen eller hele serien.", "delete mutation guard rejects recurring occurrence without scope");
assertEqual(validateCalendarEventDeleteScope({ previousEvent: seriesOccurrence, scope: "occurrence", occurrenceDate: "2026-07-15" }), null, "occurrence delete with valid date is valid");
assertEqual(validateCalendarEventDeleteScope({ previousEvent: seriesOccurrence, scope: "occurrence" }), "Kun denne krever en gyldig forekomstdato.", "occurrence delete without date is rejected");
assertEqual(validateCalendarEventDeleteScope({ previousEvent: seriesOccurrence, scope: "series" }), null, "series delete without date is valid");
assertEqual(validateCalendarEventDeleteScope({ previousEvent: seriesOccurrence, scope: "bad" as never }), "Ugyldig slettevalg.", "invalid delete scope is rejected");
assertEqual(validateCalendarEventDeleteScope({ previousEvent: event({ id: "single-a" }) }), null, "single event without delete scope is valid");
assertEqual(validateCalendarEventDeleteScope({ previousEvent: event({ id: "import-a", source: "ics", icsSourceId: "ics-1" }) }), "Importerte kalenderhendelser kan ikke slettes i FamilieAppen.", "delete guard rejects imported ICS event");
assertEqual(buildCalendarEventDeletePath({ eventId: "event/a", scope: null }), "/calendar/events/event%2Fa", "single delete endpoint encodes event id");
assertEqual(buildCalendarEventDeletePath({ eventId: "series/a", scope: "series" }), "/calendar/events/series%2Fa", "series delete endpoint uses event endpoint");
assertEqual(buildCalendarEventDeletePath({ eventId: "series/a", scope: "occurrence", occurrenceDate: "2026-07-15" }), "/calendar/events/series%2Fa/occurrences/2026-07-15", "occurrence delete endpoint includes encoded date");
assertEqual(buildCalendarEventDeletePath({ eventId: "series-a", scope: "occurrence" }), null, "endpoint cannot be selected for invalid occurrence input");
