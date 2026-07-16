import { useMemo } from "react";
import type { CalendarEvent } from "@familieappen/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listFamilies } from "../auth/api";
import { useAuth } from "../auth/AuthProvider";
import { getCalendarEvents } from "./api";
import { calendarQueryKeys } from "./queryKeys";
import { duplicateLookupRange, findCalendarEventDuplicateSource } from "./duplicateEventModel";

function getCachedDuplicateSource(queryClient: ReturnType<typeof useQueryClient>, eventId: string, occurrenceDate?: string): CalendarEvent | null {
  const cachedQueries = queryClient.getQueriesData<CalendarEvent[]>({ queryKey: ["calendar", "events"] });
  for (const [, events] of cachedQueries) {
    const event = findCalendarEventDuplicateSource(events ?? [], eventId, occurrenceDate);
    if (event) return event;
  }
  return null;
}

export function useDuplicateCalendarEventSource(eventId: string | null, occurrenceDate?: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const familiesQuery = useQuery({ queryKey: calendarQueryKeys.families, queryFn: () => listFamilies(accessToken!), enabled: Boolean(accessToken) });
  const familyId = familiesQuery.data?.[0]?.family.id ?? null;
  const cachedEvent = useMemo(() => eventId ? getCachedDuplicateSource(queryClient, eventId, occurrenceDate) : null, [eventId, occurrenceDate, queryClient]);
  const range = useMemo(() => duplicateLookupRange(occurrenceDate), [occurrenceDate]);
  const eventsQuery = useQuery({
    queryKey: familyId && eventId ? calendarQueryKeys.duplicate(familyId, eventId, occurrenceDate ?? null) : ["calendar", "events", "duplicate", "missing"],
    queryFn: () => getCalendarEvents(accessToken!, familyId!, range),
    enabled: Boolean(accessToken && familyId && eventId),
    staleTime: 60_000,
    initialData: cachedEvent ? [cachedEvent] : undefined,
  });
  const rawEvent = useMemo(() => eventId ? findCalendarEventDuplicateSource(eventsQuery.data ?? [], eventId, occurrenceDate) : null, [eventsQuery.data, eventId, occurrenceDate]);
  return {
    rawEvent,
    familyId,
    loading: familiesQuery.isLoading || (eventsQuery.isLoading && !cachedEvent),
    refreshing: familiesQuery.isRefetching || eventsQuery.isRefetching,
    error: familiesQuery.error || eventsQuery.error,
    notFound: Boolean(eventId && eventsQuery.isSuccess && !rawEvent),
    missingContext: !accessToken || (!familiesQuery.isLoading && !familyId),
    refetch: async () => { await Promise.all([familiesQuery.refetch(), eventsQuery.refetch()]); },
  };
}
