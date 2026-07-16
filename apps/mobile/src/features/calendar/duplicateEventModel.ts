import type { CalendarEvent } from "@familieappen/shared";
import { getCalendarDayRange } from "./date";
import { isValidCalendarOccurrenceDate } from "./events";

export type CalendarEventDuplicateRouteParams = { duplicateEventId?: string; occurrenceDate?: string };

export function buildCalendarEventDuplicatePath(input: { eventId: string; occurrenceDate?: string }): { pathname: "/(app)/calendar/create"; params: CalendarEventDuplicateRouteParams } {
  return { pathname: "/(app)/calendar/create", params: input.occurrenceDate ? { duplicateEventId: input.eventId, occurrenceDate: input.occurrenceDate } : { duplicateEventId: input.eventId } };
}

export function parseCalendarEventDuplicateParams(input: { duplicateEventId?: string | string[]; occurrenceDate?: string | string[] }): { duplicateEventId: string | null; occurrenceDate?: string; error: string | null } {
  const rawEventId = Array.isArray(input.duplicateEventId) ? input.duplicateEventId[0] : input.duplicateEventId;
  const rawOccurrenceDate = Array.isArray(input.occurrenceDate) ? input.occurrenceDate[0] : input.occurrenceDate;
  if (rawEventId === undefined && rawOccurrenceDate === undefined) return { duplicateEventId: null, error: null };
  const duplicateEventId = rawEventId?.trim();
  if (!duplicateEventId) return { duplicateEventId: null, error: "Duplisering mangler en gyldig hendelse." };
  if (rawOccurrenceDate !== undefined && !isValidCalendarOccurrenceDate(rawOccurrenceDate)) return { duplicateEventId, error: "Duplisering krever en gyldig forekomstdato." };
  return rawOccurrenceDate ? { duplicateEventId, occurrenceDate: rawOccurrenceDate, error: null } : { duplicateEventId, error: null };
}

export function findCalendarEventDuplicateSource(events: CalendarEvent[], eventId: string, occurrenceDate?: string): CalendarEvent | null {
  if (occurrenceDate) return events.find((event) => event.recurringEventId === eventId && event.occurrenceDate === occurrenceDate) ?? events.find((event) => event.id === eventId && event.date === occurrenceDate) ?? null;
  return events.find((event) => event.id === eventId) ?? null;
}


export function duplicateLookupRange(occurrenceDate?: string) {
  if (occurrenceDate) return getCalendarDayRange(occurrenceDate);
  return { from: "1970-01-01", to: "2100-12-31" };
}

