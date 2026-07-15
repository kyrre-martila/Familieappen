import type { CalendarEvent } from "@familieappen/shared";
import type { CreateCalendarEventPayload } from "./createEventForm";
import { apiRequest } from "../../lib/api/client";

export function getCalendarEvents(accessToken: string, familyId: string, input: { from: string; to: string }) {
  const params = new URLSearchParams({ from: input.from, to: input.to });
  return apiRequest<CalendarEvent[]>(`/calendar/events?${params.toString()}`, { accessToken, headers: { "x-family-id": familyId } });
}

export function addCalendarEvent(accessToken: string, familyId: string, input: CreateCalendarEventPayload) {
  return apiRequest<CalendarEvent>("/calendar/events", { method: "POST", accessToken, headers: { "x-family-id": familyId }, body: input });
}
