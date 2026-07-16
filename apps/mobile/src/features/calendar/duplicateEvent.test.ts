import type { CalendarEvent } from "@familieappen/shared";
import { buildCalendarEventDuplicatePath, duplicateLookupRange, findCalendarEventDuplicateSource, parseCalendarEventDuplicateParams } from "./duplicateEventModel";
import { calendarEventToDuplicateCreateForm, createCalendarEventPayload } from "./createEventForm";

function assertEqual<T>(actual: T, expected: T, description: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
function event(overrides: Partial<CalendarEvent> & { participantIds?: string[] } = {}): CalendarEvent { return { id: "event-a", familyId: "family-1", title: "Bursdag", date: "2026-07-15", endDate: null, startTime: "17:00:00", endTime: "19:00:00", allDay: false, location: "Hjemme", description: "Lang tekst".repeat(200), icon: "birthday", participantIds: ["member-1"], participants: [], source: "manual", reminder: { label: "30 minutter før", minutesBefore: 30 }, reminderMinutesBefore: 30, recurrence: { frequency: "weekly", until: "2026-08-15T23:59:59.999Z" }, recurrenceFrequency: "weekly", recurrenceUntil: "2026-08-15T23:59:59.999Z", startsAt: "2026-07-15T17:00:00.000Z", endsAt: "2026-07-15T19:00:00.000Z", icsSourceId: null, externalUid: null, createdByUserId: "user-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z", ...overrides } as CalendarEvent; }

const regularPath = buildCalendarEventDuplicatePath({ eventId: "event-a" });
assertEqual(regularPath, { pathname: "/(app)/calendar/create", params: { duplicateEventId: "event-a" } }, "duplicate route for regular event contains only event id");
assertEqual(JSON.stringify(regularPath).includes("Lang tekst"), false, "long descriptions are not serialized into duplicate URL params");
assertEqual(buildCalendarEventDuplicatePath({ eventId: "series-a", occurrenceDate: "2026-07-22" }), { pathname: "/(app)/calendar/create", params: { duplicateEventId: "series-a", occurrenceDate: "2026-07-22" } }, "duplicate route for occurrence contains event id and occurrence date only");
assertEqual(parseCalendarEventDuplicateParams({ duplicateEventId: "" }).error, "Duplisering mangler en gyldig hendelse.", "missing duplicate event id gives controlled error");
assertEqual(parseCalendarEventDuplicateParams({ duplicateEventId: "event-a", occurrenceDate: "bad" }).error, "Duplisering krever en gyldig forekomstdato.", "invalid occurrence date gives controlled error");

const regular = event();
const occurrenceA = event({ id: "occ-a", recurringEventId: "series-a", occurrenceDate: "2026-07-22", date: "2026-07-22", isRecurringOccurrence: true, title: "Riktig forekomst" });
const occurrenceB = event({ id: "occ-b", recurringEventId: "series-a", occurrenceDate: "2026-07-29", date: "2026-07-29", isRecurringOccurrence: true, title: "Feil forekomst" });
assertEqual(findCalendarEventDuplicateSource([regular], "event-a")?.title, "Bursdag", "regular duplicate source is found and mapped by id");
assertEqual(findCalendarEventDuplicateSource([occurrenceA, occurrenceB], "series-a")?.id ?? null, null, "ambiguous recurring series id without occurrence date does not pick a random occurrence");
assertEqual(findCalendarEventDuplicateSource([occurrenceB, occurrenceA], "series-a", "2026-07-22")?.title, "Riktig forekomst", "duplicate source picks the requested recurring occurrence");
assertEqual(findCalendarEventDuplicateSource([], "event-a"), null, "cache miss before API fallback is represented as not found in pure lookup");
assertEqual(duplicateLookupRange(), { from: "1970-01-01", to: "2100-12-31" }, "direct open without cache uses broad API fallback range for regular event id lookup");
assertEqual(duplicateLookupRange("2026-07-22"), { from: "2026-07-22T00:00:00.000Z", to: "2026-07-22T23:59:59.999Z" }, "direct occurrence open uses API fallback for the exact occurrence date");

const imported = event({ source: "ics", icsSourceId: "ics-1", externalUid: "external-1" });
const duplicate = calendarEventToDuplicateCreateForm(imported);
assertEqual(duplicate, { title: "Bursdag", date: "2026-07-15", allDay: false, startTime: "17:00", endTime: "19:00", location: "Hjemme", description: imported.description!, recurrenceFrequency: "weekly", recurrenceUntil: "2026-08-15", icon: "birthday", reminderMinutesBefore: 30, participantFamilyMemberIds: ["member-1"] }, "duplicate form keeps recurrence, participants, icon and reminder but not identity/import fields");
assertEqual(createCalendarEventPayload(duplicate), { title: "Bursdag", description: imported.description!, location: "Hjemme", icon: "birthday", reminderMinutesBefore: 30, startsAt: "2026-07-15T17:00:00.000Z", endsAt: "2026-07-15T19:00:00.000Z", allDay: false, recurrenceFrequency: "weekly", recurrenceUntil: "2026-08-15T23:59:59.999Z", participantFamilyMemberIds: ["member-1"] }, "create payload for duplicate contains no id, import metadata, occurrence id or series id");
assertEqual("id" in createCalendarEventPayload(duplicate), false, "duplicate create payload has no id before explicit save mutation");
