import type { CalendarEvent } from "@familieappen/shared";

export function mergeCreatedCalendarEvent(current: CalendarEvent[] | undefined, event: CalendarEvent): CalendarEvent[] | undefined {
  if (!current) return current;
  return [...current.filter((item) => item.id !== event.id), event];
}

export function calendarEventsInvalidationKey() {
  return ["calendar", "events"] as const;
}


function isSameCalendarEventIdentity(event: CalendarEvent, target: CalendarEvent) {
  return event.id === target.id || Boolean(target.occurrenceDate && event.recurringEventId === target.recurringEventId && event.occurrenceDate === target.occurrenceDate);
}

export function mergeUpdatedCalendarEvent(current: CalendarEvent | undefined, event: CalendarEvent): CalendarEvent | undefined {
  return current ? { ...current, ...event } : current;
}

export function replaceCalendarEventInDay(current: CalendarEvent[] | undefined, event: CalendarEvent): CalendarEvent[] | undefined {
  if (!current) return current;
  return [...current.filter((item) => !isSameCalendarEventIdentity(item, event)), event].sort((a, b) => {
    const aTime = a.allDay ? "" : a.startTime ?? "99:99";
    const bTime = b.allDay ? "" : b.startTime ?? "99:99";
    return aTime.localeCompare(bTime) || a.title.localeCompare(b.title, "nb") || a.id.localeCompare(b.id);
  });
}

export function removeCalendarEventFromDay(current: CalendarEvent[] | undefined, event: CalendarEvent): CalendarEvent[] | undefined {
  if (!current) return current;
  return current.filter((item) => !isSameCalendarEventIdentity(item, event));
}

export function moveCalendarEventBetweenDays(current: CalendarEvent[] | undefined, event: CalendarEvent, day: string): CalendarEvent[] | undefined {
  return event.date === day ? replaceCalendarEventInDay(current, event) : removeCalendarEventFromDay(current, event);
}
