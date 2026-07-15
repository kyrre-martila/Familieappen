import type { CalendarEvent } from "@familieappen/shared";

export function mergeCreatedCalendarEvent(current: CalendarEvent[] | undefined, event: CalendarEvent): CalendarEvent[] | undefined {
  if (!current) return current;
  return [...current.filter((item) => item.id !== event.id), event];
}

export function calendarEventsInvalidationKey() {
  return ["calendar", "events"] as const;
}
