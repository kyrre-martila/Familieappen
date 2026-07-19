import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "../../family/useActiveFamily";
import { getCalendarEvents } from "../api";
import { getCalendarMonthRangeForTimeZone, getTodayString } from "../date";
import { mapCalendarEventToViewModel, sortCalendarEvents } from "../events";

import { calendarQueryKeys } from "../queryKeys";

export function useCalendar() {
  const { accessToken, familiesQuery, familyId } = useActiveFamily();
  const today = useMemo(getTodayString, []);
  const [selectedDate, setSelectedDate] = useState(today);
  const range = useMemo(() => getCalendarMonthRangeForTimeZone(selectedDate), [selectedDate]);
  const eventsQuery = useQuery({
    queryKey: familyId ? calendarQueryKeys.events(familyId, range.from, range.to) : ["calendar", "events", "missing-family"],
    queryFn: () => getCalendarEvents(accessToken!, familyId!, range),
    enabled: Boolean(accessToken && familyId),
    staleTime: 60_000,
  });
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const eventViewModels = useMemo(() => sortCalendarEvents(events.filter((event) => event.date === selectedDate).map(mapCalendarEventToViewModel)), [events, selectedDate]);
  const monthEventViewModels = useMemo(() => sortCalendarEvents(events.map(mapCalendarEventToViewModel)), [events]);
  return {
    today,
    selectedDate,
    setSelectedDate,
    events,
    eventsForSelectedDate: eventViewModels,
    eventsForMonth: monthEventViewModels,
    loading: familiesQuery.isLoading || eventsQuery.isLoading,
    refreshing: familiesQuery.isRefetching || eventsQuery.isRefetching,
    error: familiesQuery.error || eventsQuery.error,
    missingContext: !accessToken || Boolean(accessToken && familiesQuery.isSuccess && !familyId),
    refresh: async () => { await Promise.all([familiesQuery.refetch(), eventsQuery.refetch()]); },
  };
}
