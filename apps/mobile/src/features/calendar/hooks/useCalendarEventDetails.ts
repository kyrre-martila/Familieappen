import { useMemo } from "react";
import type { CalendarEvent } from "@familieappen/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveFamily } from "../../family/useActiveFamily";
import { getCalendarEvents } from "../api";
import { getCalendarDayRange, getCalendarRange, getTodayString } from "../date";
import { findCalendarEventOccurrence, findCalendarEventSeries, mapCalendarEventToViewModel, type CalendarEventEditScope } from "../events";
import { calendarQueryKeys } from "../queryKeys";

function getCachedCalendarEvent(queryClient: ReturnType<typeof useQueryClient>, eventId: string, occurrenceDate?: string, scope?: CalendarEventEditScope | null): CalendarEvent | null {
  const cachedQueries = queryClient.getQueriesData<CalendarEvent[]>({ queryKey: ["calendar", "events"] });
  for (const [, events] of cachedQueries) {
    const event = scope === "series" ? findCalendarEventSeries(events ?? [], eventId) : findCalendarEventOccurrence(events ?? [], eventId, occurrenceDate);
    if (event) return event;
  }
  return null;
}

export function useCalendarEventDetails(eventId: string | null, occurrenceDate?: string, scope?: CalendarEventEditScope | null) {
  const { accessToken, familiesQuery, familyId } = useActiveFamily();
  const queryClient = useQueryClient();
  const today = getTodayString();
  const lookupDate = occurrenceDate ?? today;
  const range = useMemo(() => occurrenceDate ? getCalendarDayRange(occurrenceDate) : getCalendarRange(today), [occurrenceDate, today]);
  const cachedEvent = useMemo(() => eventId ? getCachedCalendarEvent(queryClient, eventId, occurrenceDate, scope) : null, [eventId, occurrenceDate, queryClient, scope]);
  const eventsQuery = useQuery({
    queryKey: familyId && eventId ? calendarQueryKeys.detail(familyId, eventId, occurrenceDate ?? null, lookupDate) : ["calendar", "events", "detail", "missing"],
    queryFn: () => getCalendarEvents(accessToken!, familyId!, range),
    enabled: Boolean(accessToken && familyId && eventId),
    staleTime: 60_000,
    initialData: cachedEvent ? [cachedEvent] : undefined,
  });
  const event = useMemo(() => eventId ? (scope === "series" ? findCalendarEventSeries(eventsQuery.data ?? [], eventId) : findCalendarEventOccurrence(eventsQuery.data ?? [], eventId, occurrenceDate)) : null, [eventsQuery.data, eventId, occurrenceDate, scope]);
  return {
    event: event ? mapCalendarEventToViewModel(event) : null,
    rawEvent: event ?? null,
    familyId,
    loading: familiesQuery.isLoading || (eventsQuery.isLoading && !cachedEvent),
    refreshing: familiesQuery.isRefetching || eventsQuery.isRefetching,
    error: familiesQuery.error || eventsQuery.error,
    missingContext: !accessToken || (!familiesQuery.isLoading && !familyId),
    refetch: async () => { await Promise.all([familiesQuery.refetch(), eventsQuery.refetch()]); },
  };
}
