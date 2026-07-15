import type { CalendarEvent } from "@familieappen/shared";

export function mergeCreatedCalendarEvent(current: CalendarEvent[] | undefined, event: CalendarEvent): CalendarEvent[] | undefined {
  if (!current) return current;
  return [...current.filter((item) => item.id !== event.id), event];
}

export function calendarEventsInvalidationKey() {
  return ["calendar", "events"] as const;
}


function isSameCalendarEventIdentity(event: CalendarEvent, target: CalendarEvent) {
  return event.id === target.id || Boolean(target.occurrenceDate && (event.recurringEventId ?? event.id) === (target.recurringEventId ?? target.id) && event.occurrenceDate === target.occurrenceDate);
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

export function replaceCalendarEventOccurrenceInDay(current: CalendarEvent[] | undefined, event: CalendarEvent, previous: { eventId: string; occurrenceDate: string; date: string }): CalendarEvent[] | undefined {
  if (!current) return current;
  const targetSeriesId = event.recurringEventId ?? previous.eventId;
  const withoutPrevious = current.filter((item) => !((item.recurringEventId ?? item.id) === targetSeriesId && item.occurrenceDate === previous.occurrenceDate));
  return event.date === previous.date ? replaceCalendarEventInDay(withoutPrevious, event) : withoutPrevious;
}


export function removeCalendarEventByIdFromDay(current: CalendarEvent[] | undefined, eventId: string): CalendarEvent[] | undefined {
  if (!current) return current;
  return current.filter((item) => item.id !== eventId);
}

export function removeCalendarEventOccurrenceFromDay(current: CalendarEvent[] | undefined, target: { eventId: string; occurrenceDate: string }): CalendarEvent[] | undefined {
  if (!current) return current;
  return current.filter((item) => !((item.recurringEventId ?? item.id) === target.eventId && item.occurrenceDate === target.occurrenceDate));
}

export function removeCalendarEventSeriesFromDay(current: CalendarEvent[] | undefined, eventId: string): CalendarEvent[] | undefined {
  if (!current) return current;
  return current.filter((item) => (item.recurringEventId ?? item.id) !== eventId);
}
