import type { CalendarEvent } from "@familieappen/shared";
import { getCalendarDayRange } from "./date";
import { isValidCalendarOccurrenceDate } from "./events";

export type CalendarEventDuplicateRouteParams = { duplicateEventId?: string; sourceDate?: string; occurrenceDate?: string };
export type CalendarEventDuplicateParams = { duplicateEventId: string | null; sourceDate?: string; occurrenceDate?: string; error: string | null };

export const missingDuplicateDateError = "Duplisering mangler en gyldig dato for oppslag av hendelsen.";

export function buildCalendarEventDuplicatePath(input: { eventId: string; sourceDate: string; occurrenceDate?: string }): { pathname: "/(app)/calendar/create"; params: CalendarEventDuplicateRouteParams } {
  return { pathname: "/(app)/calendar/create", params: input.occurrenceDate ? { duplicateEventId: input.eventId, occurrenceDate: input.occurrenceDate } : { duplicateEventId: input.eventId, sourceDate: input.sourceDate } };
}

export function parseCalendarEventDuplicateParams(input: { duplicateEventId?: string | string[]; sourceDate?: string | string[]; occurrenceDate?: string | string[] }): CalendarEventDuplicateParams {
  const rawEventId = Array.isArray(input.duplicateEventId) ? input.duplicateEventId[0] : input.duplicateEventId;
  const rawSourceDate = Array.isArray(input.sourceDate) ? input.sourceDate[0] : input.sourceDate;
  const rawOccurrenceDate = Array.isArray(input.occurrenceDate) ? input.occurrenceDate[0] : input.occurrenceDate;
  if (rawEventId === undefined && rawSourceDate === undefined && rawOccurrenceDate === undefined) return { duplicateEventId: null, error: null };
  const duplicateEventId = rawEventId?.trim();
  if (!duplicateEventId) return { duplicateEventId: null, error: "Duplisering mangler en gyldig hendelse." };
  if (rawSourceDate !== undefined && !isValidCalendarOccurrenceDate(rawSourceDate)) return { duplicateEventId, error: "Duplisering krever en gyldig kildedato." };
  if (rawOccurrenceDate !== undefined && !isValidCalendarOccurrenceDate(rawOccurrenceDate)) return { duplicateEventId, error: "Duplisering krever en gyldig forekomstdato." };
  if (rawOccurrenceDate) return { duplicateEventId, occurrenceDate: rawOccurrenceDate, error: null };
  if (rawSourceDate) return { duplicateEventId, sourceDate: rawSourceDate, error: null };
  return { duplicateEventId, error: null };
}

export function findCalendarEventDuplicateSource(events: CalendarEvent[], eventId: string, occurrenceDate?: string): CalendarEvent | null {
  if (occurrenceDate) return events.find((event) => event.recurringEventId === eventId && event.occurrenceDate === occurrenceDate) ?? events.find((event) => event.id === eventId && event.date === occurrenceDate) ?? null;
  return events.find((event) => event.id === eventId) ?? null;
}

export function shouldFetchDuplicateFallback(input: { eventId: string | null; sourceDate?: string; occurrenceDate?: string; cachedEvent: CalendarEvent | null }): boolean {
  return Boolean(input.eventId && !input.cachedEvent && duplicateLookupRange(input));
}

export function duplicateLookupRange(input: { sourceDate?: string; occurrenceDate?: string }): ReturnType<typeof getCalendarDayRange> | null {
  const lookupDate = input.occurrenceDate ?? input.sourceDate;
  return lookupDate ? getCalendarDayRange(lookupDate) : null;
}
