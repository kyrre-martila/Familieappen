import type { CalendarEvent } from "@familieappen/shared";
import { calendarEventToForm, updateCalendarEventPayload, validateCalendarEventForm } from "./eventForm";
function assertEqual<T>(actual: T, expected: T, description: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent { return { id: "event-a", familyId: "family-1", title: " Trening ", date: "2026-03-29", endDate: null, startTime: "09:00:00", endTime: "10:00:00", allDay: false, location: null, description: null, icon: "family", participantIds: [], participants: [], source: "manual", isImported: false, reminder: null, reminderMinutesBefore: null, recurrence: null, recurrenceFrequency: "never", recurrenceUntil: null, startsAt: "2026-03-29T09:00:00.000Z", endsAt: "2026-03-29T10:00:00.000Z", icsSourceId: null, externalUid: null, createdByUserId: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...overrides } as CalendarEvent; }
const hydrated = calendarEventToForm(event({ location: "", description: null }));
assertEqual(hydrated, { title: " Trening ", date: "2026-03-29", allDay: false, startTime: "09:00", endTime: "10:00", location: "", description: "" }, "maps existing event to form values without UTC date parsing");
assertEqual(calendarEventToForm(event({ allDay: true, startTime: null, endTime: null })).allDay, true, "hydrates all-day events");
assertEqual(validateCalendarEventForm({ ...hydrated, title: "   " }).title, "Tittel må fylles ut.", "edit validation rejects whitespace title");
assertEqual(validateCalendarEventForm({ ...hydrated, endTime: "08:00" }).endTime, "Sluttid må være etter starttid.", "edit validation rejects end before start");
assertEqual(updateCalendarEventPayload({ ...hydrated, title: " Ny ", location: " ", description: " Tekst " }), { title: "Ny", description: "Tekst", location: null, startsAt: "2026-03-29T09:00:00.000Z", endsAt: "2026-03-29T10:00:00.000Z", allDay: false }, "maps edit form to PATCH payload");
assertEqual(updateCalendarEventPayload({ ...hydrated, allDay: true }), { title: "Trening", description: null, location: null, startsAt: "2026-03-29T00:00:00.000Z", endsAt: "2026-03-29T00:00:00.000Z", allDay: true }, "all-day edit payload ignores old clock times");
const seriesPayload = updateCalendarEventPayload(hydrated);
assertEqual("recurrenceFrequency" in seriesPayload || "recurrenceUntil" in seriesPayload || "recurrence" in seriesPayload, false, "series edit payload preserves existing recurrence by omitting recurrence fields");
const occurrencePayload = updateCalendarEventPayload(hydrated);
assertEqual("recurrenceFrequency" in occurrencePayload || "recurrenceUntil" in occurrencePayload || "recurrence" in occurrencePayload, false, "occurrence edit payload never sends recurrence fields");
