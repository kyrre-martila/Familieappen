import { useMemo } from "react";
import type { CalendarEvent } from "@familieappen/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import { getCalendarEvents } from "../api";
import { getCalendarDayRange, getCalendarRange, getTodayString } from "../date";
import { findCalendarEventOccurrence, mapCalendarEventToViewModel } from "../events";
import { calendarQueryKeys } from "../queryKeys";

function getCachedCalendarEvent(queryClient: ReturnType<typeof useQueryClient>, eventId: string, occurrenceDate?: string): CalendarEvent | null {
  const cachedQueries = queryClient.getQueriesData<CalendarEvent[]>({ queryKey: ["calendar", "events"] });
  for (const [, events] of cachedQueries) {
    const event = findCalendarEventOccurrence(events ?? [], eventId, occurrenceDate);
    if (event) return event;
  }
  return null;
}

export function useCalendarEventDetails(eventId: string | null, occurrenceDate?: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const familiesQuery = useQuery({ queryKey: calendarQueryKeys.families, queryFn: () => listFamilies(accessToken!), enabled: Boolean(accessToken) });
  const familyId = familiesQuery.data?.[0]?.family.id ?? null;
  const today = getTodayString();
  const lookupDate = occurrenceDate ?? today;
  const range = useMemo(() => occurrenceDate ? getCalendarDayRange(occurrenceDate) : getCalendarRange(today), [occurrenceDate, today]);
  const cachedEvent = useMemo(() => eventId ? getCachedCalendarEvent(queryClient, eventId, occurrenceDate) : null, [eventId, occurrenceDate, queryClient]);
  const eventsQuery = useQuery({
    queryKey: familyId && eventId ? calendarQueryKeys.detail(familyId, eventId, occurrenceDate ?? null, lookupDate) : ["calendar", "events", "detail", "missing"],
    queryFn: () => getCalendarEvents(accessToken!, familyId!, range),
    enabled: Boolean(accessToken && familyId && eventId),
    staleTime: 60_000,
    initialData: cachedEvent ? [cachedEvent] : undefined,
  });
  const event = useMemo(() => eventId ? findCalendarEventOccurrence(eventsQuery.data ?? [], eventId, occurrenceDate) : null, [eventsQuery.data, eventId, occurrenceDate]);
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
