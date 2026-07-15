import type { CalendarEvent } from "@familieappen/shared";
import { calendarEventsInvalidationKey, mergeCreatedCalendarEvent } from "./cache";
function assertEqual<T>(actual: T, expected: T, description: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
function event(id: string, title = id): CalendarEvent { return { id, familyId: "family-1", title, date: "2026-07-15", endDate: null, startTime: "09:00", endTime: "10:00", allDay: false, location: null, description: null, icon: "family", participantIds: [], participants: [], source: "manual", isImported: false, reminder: null, reminderMinutesBefore: null, recurrence: null, recurrenceFrequency: "never", recurrenceUntil: null, startsAt: "2026-07-15T09:00:00.000Z", endsAt: "2026-07-15T10:00:00.000Z", icsSourceId: null, externalUid: null, createdByUserId: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } as CalendarEvent; }
const created = event("new", "Ny hendelse");
assertEqual(mergeCreatedCalendarEvent([event("old")], created)?.map((item) => item.id), ["old", "new"], "mutation success appends created event to selected day cache");
assertEqual(mergeCreatedCalendarEvent([event("new", "Gammel")], created)?.find((item) => item.id === "new")?.title, "Ny hendelse", "mutation success replaces duplicate cached event");
assertEqual(mergeCreatedCalendarEvent(undefined, created), undefined, "mutation error/empty cache preserves existing input state and cache shape");
assertEqual(calendarEventsInvalidationKey(), ["calendar", "events"], "mutation invalidates all calendar event queries");
