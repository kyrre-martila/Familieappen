import { useMemo } from "react";
import type { CalendarEvent } from "@familieappen/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveFamily } from "../family/useActiveFamily";
import { getCalendarEvents } from "./api";
import { calendarQueryKeys } from "./queryKeys";
import { duplicateLookupRange, findCalendarEventDuplicateSource, missingDuplicateDateError, shouldFetchDuplicateFallback } from "./duplicateEventModel";

function getCachedDuplicateSource(queryClient: ReturnType<typeof useQueryClient>, eventId: string, occurrenceDate?: string): CalendarEvent | null {
  const cachedQueries = queryClient.getQueriesData<CalendarEvent[]>({ queryKey: ["calendar", "events"] });
  for (const [, events] of cachedQueries) {
    const event = findCalendarEventDuplicateSource(events ?? [], eventId, occurrenceDate);
    if (event) return event;
  }
  return null;
}

export function useDuplicateCalendarEventSource(eventId: string | null, sourceDate?: string, occurrenceDate?: string) {
  const { accessToken, familiesQuery, familyId } = useActiveFamily();
  const queryClient = useQueryClient();
  const cachedEvent = useMemo(() => eventId ? getCachedDuplicateSource(queryClient, eventId, occurrenceDate) : null, [eventId, occurrenceDate, queryClient]);
  const range = useMemo(() => duplicateLookupRange({ sourceDate, occurrenceDate }), [sourceDate, occurrenceDate]);
  const eventsQuery = useQuery({
    queryKey: familyId && eventId ? calendarQueryKeys.duplicate(familyId, eventId, sourceDate ?? null, occurrenceDate ?? null) : ["calendar", "events", "duplicate", "missing"],
    queryFn: () => getCalendarEvents(accessToken!, familyId!, range!),
    enabled: Boolean(accessToken && familyId && shouldFetchDuplicateFallback({ eventId, sourceDate, occurrenceDate, cachedEvent })),
    staleTime: 60_000,
    initialData: cachedEvent ? [cachedEvent] : undefined,
  });
  const rawEvent = useMemo(() => eventId ? findCalendarEventDuplicateSource(eventsQuery.data ?? [], eventId, occurrenceDate) : null, [eventsQuery.data, eventId, occurrenceDate]);
  return {
    rawEvent,
    familyId,
    loading: familiesQuery.isLoading || (eventsQuery.isLoading && !cachedEvent),
    refreshing: familiesQuery.isRefetching || eventsQuery.isRefetching,
    error: familiesQuery.error || eventsQuery.error || (eventId && !range && !cachedEvent ? new Error(missingDuplicateDateError) : null),
    notFound: Boolean(eventId && ((eventsQuery.isSuccess && !rawEvent) || (!range && !cachedEvent))),
    missingContext: !accessToken || (!familiesQuery.isLoading && !familyId),
    refetch: async () => { await Promise.all([familiesQuery.refetch(), eventsQuery.refetch()]); },
  };
}
