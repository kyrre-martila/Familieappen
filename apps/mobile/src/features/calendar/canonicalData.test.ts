import type { CalendarEvent } from "@familieappen/shared";
import { calendarQueryKeys } from "./queryKeys";
import { getCalendarDayRangeForTimeZone } from "./date";
import { mapCalendarEventToViewModel } from "./events";
import { getCalendarEvents } from "./api";

function assertEqual<T>(actual: T, expected: T, message: string) { if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`); }
function assertDeepEqual(actual: unknown, expected: unknown, message: string) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
function assertNotDeepEqual(actual: unknown, expected: unknown, message: string) { if (JSON.stringify(actual) === JSON.stringify(expected)) throw new Error(message); }

assertNotDeepEqual(calendarQueryKeys.events("family-a", "2026-07-18T00:00:00.000Z", "2026-07-18T23:59:59.999Z"), calendarQueryKeys.events("family-b", "2026-07-18T00:00:00.000Z", "2026-07-18T23:59:59.999Z"), "calendar query keys differ between families");
assertDeepEqual(getCalendarDayRangeForTimeZone("2026-03-29", "Europe/Oslo"), { from: "2026-03-28T23:00:00.000Z", to: "2026-03-29T21:59:59.999Z" }, "Oslo selected-day range respects spring DST boundary");
assertDeepEqual(getCalendarDayRangeForTimeZone("2026-10-25", "Europe/Oslo"), { from: "2026-10-24T22:00:00.000Z", to: "2026-10-25T22:59:59.999Z" }, "Oslo selected-day range respects autumn DST boundary");
const imported = { id: "ics-1", title: "Imported", date: "2026-07-18", allDay: true, startTime: null, endTime: null, location: null, description: null, icon: "calendar", source: "ics", icsSourceId: "source-1", isRecurringOccurrence: false, occurrenceDate: undefined, recurringEventId: undefined, recurrence: null, recurrenceFrequency: "never", recurrenceUntil: null, reminder: null, participants: [], createdByUserId: null } as unknown as CalendarEvent;
assertEqual(mapCalendarEventToViewModel(imported).isImported, true, "imported ICS events map as imported instead of being filtered out");
const recurring = { ...imported, id: "occurrence-1", source: "ics", date: "2026-07-18", isRecurringOccurrence: true, recurringEventId: "series-1", occurrenceDate: "2026-07-18" } as unknown as CalendarEvent;
assertEqual(mapCalendarEventToViewModel(recurring).date, "2026-07-18", "recurring imported occurrence keeps backend occurrence date");
console.log("Canonical calendar data tests passed");

const originalFetch = globalThis.fetch;
let capturedFamilyId: string | null = null;
globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  capturedFamilyId = new Headers(init?.headers).get("x-family-id");
  return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
}) as typeof fetch;
void (async () => {
  await getCalendarEvents("token", "resolved-family", { from: "2026-07-17T22:00:00.000Z", to: "2026-07-18T21:59:59.999Z" });
  assertEqual(capturedFamilyId, "resolved-family", "calendar request sends resolved family ID in x-family-id");
  globalThis.fetch = originalFetch;
})().then(() => console.log("Calendar request header tests passed"));
