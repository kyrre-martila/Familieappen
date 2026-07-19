import type { CalendarEvent } from "@familieappen/shared";
import type { CreateCalendarEventPayload, OccurrenceUpdateCalendarEventPayload, SeriesUpdateCalendarEventPayload } from "./eventForm";
import { apiRequest } from "../../lib/api/client";
import { buildCalendarEventDeletePath, type CalendarEventDeleteScope } from "./events";

export function getCalendarEvents(accessToken: string, familyId: string, input: { from: string; to: string }) {
  const params = new URLSearchParams({ from: input.from, to: input.to });
  return apiRequest<CalendarEvent[]>(`/calendar/events?${params.toString()}`, { accessToken, headers: { "x-family-id": familyId } });
}

export function addCalendarEvent(accessToken: string, familyId: string, input: CreateCalendarEventPayload) {
  return apiRequest<CalendarEvent>("/calendar/events", { method: "POST", accessToken, headers: { "x-family-id": familyId }, body: input });
}

export function updateCalendarEvent(accessToken: string, familyId: string, eventId: string, input: SeriesUpdateCalendarEventPayload) {
  return apiRequest<CalendarEvent>(`/calendar/events/${encodeURIComponent(eventId)}`, { method: "PATCH", accessToken, headers: { "x-family-id": familyId }, body: input });
}

export function updateCalendarEventOccurrence(accessToken: string, familyId: string, eventId: string, occurrenceDate: string, input: OccurrenceUpdateCalendarEventPayload) {
  return apiRequest<CalendarEvent>(`/calendar/events/${encodeURIComponent(eventId)}/occurrences/${encodeURIComponent(occurrenceDate)}`, { method: "PATCH", accessToken, headers: { "x-family-id": familyId }, body: input });
}


export function deleteCalendarEvent(accessToken: string, familyId: string, eventId: string, input: { scope?: CalendarEventDeleteScope | null; occurrenceDate?: string } = {}) {
  const path = buildCalendarEventDeletePath({ eventId, scope: input.scope, occurrenceDate: input.occurrenceDate });
  if (!path) throw new Error("Ugyldig slettevalg.");
  return apiRequest<CalendarEvent | null>(path, { method: "DELETE", accessToken, headers: { "x-family-id": familyId } });
}

export interface CalendarIcsSource { id: string; familyId: string; name: string; url: string; active: boolean; defaultFamilyMemberId: string | null; defaultCategory: string; lastSyncedAt: string | null; lastSyncStatus: string | null; lastSyncError: string | null; syncIntervalMinutes: number; nextSyncAt: string | null; lastSyncStartedAt: string | null; createdAt: string; updatedAt: string; }
export interface CalendarExportFeedSettings { id: string; familyId: string; enabled: boolean; privateUrl: string; includeEvents: boolean; includeMeals: boolean; includeReminders: boolean; includeSchoolWeekReminders: boolean; scope: "family" | "mine" | "selectedParticipant"; selectedFamilyMemberId: string | null; createdAt: string; updatedAt: string; }
const familyHeaders = (familyId: string) => ({ "x-family-id": familyId });
export function getCalendarIcsSources(accessToken: string, familyId: string) { return apiRequest<CalendarIcsSource[]>("/calendar/ics-sources", { accessToken, headers: familyHeaders(familyId) }); }
export function createCalendarIcsSource(accessToken: string, familyId: string, input: { name: string; url: string; active?: boolean }) { return apiRequest<CalendarIcsSource>("/calendar/ics-sources", { method: "POST", accessToken, headers: familyHeaders(familyId), body: input }); }
export function updateCalendarIcsSource(accessToken: string, familyId: string, sourceId: string, input: { active?: boolean }) { return apiRequest<CalendarIcsSource>(`/calendar/ics-sources/${encodeURIComponent(sourceId)}`, { method: "PATCH", accessToken, headers: familyHeaders(familyId), body: input }); }
export function deleteCalendarIcsSource(accessToken: string, familyId: string, sourceId: string) { return apiRequest<CalendarIcsSource>(`/calendar/ics-sources/${encodeURIComponent(sourceId)}`, { method: "DELETE", accessToken, headers: familyHeaders(familyId) }); }
export function syncCalendarIcsSource(accessToken: string, familyId: string, sourceId: string) { return apiRequest(`/calendar/ics-sources/${encodeURIComponent(sourceId)}/sync`, { method: "POST", accessToken, headers: familyHeaders(familyId) }); }
export function getCalendarExportFeedSettings(accessToken: string, familyId: string) { return apiRequest<CalendarExportFeedSettings>("/calendar/feed-settings", { accessToken, headers: familyHeaders(familyId) }); }
export function updateCalendarExportFeedSettings(accessToken: string, familyId: string, input: Partial<Pick<CalendarExportFeedSettings, "enabled" | "includeEvents" | "includeMeals" | "includeReminders" | "includeSchoolWeekReminders" | "scope" | "selectedFamilyMemberId">>) { return apiRequest<CalendarExportFeedSettings>("/calendar/feed-settings", { method: "PATCH", accessToken, headers: familyHeaders(familyId), body: input }); }
export function regenerateCalendarExportFeed(accessToken: string, familyId: string) { return apiRequest<CalendarExportFeedSettings>("/calendar/feed-settings/regenerate", { method: "POST", accessToken, headers: familyHeaders(familyId) }); }
