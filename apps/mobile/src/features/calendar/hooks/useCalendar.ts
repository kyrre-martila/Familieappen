import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import { getCalendarEvents } from "../api";
import { getCalendarDayRange, getTodayString } from "../date";
import { mapCalendarEventToViewModel, sortCalendarEvents } from "../events";

import { calendarQueryKeys } from "../queryKeys";

export function useCalendar() {
  const { accessToken } = useAuth();
  const today = useMemo(getTodayString, []);
  const [selectedDate, setSelectedDate] = useState(today);
  const range = useMemo(() => getCalendarDayRange(selectedDate), [selectedDate]);
  const familiesQuery = useQuery({
    queryKey: calendarQueryKeys.families,
    queryFn: () => listFamilies(accessToken!),
    enabled: Boolean(accessToken),
  });
  const familyId = familiesQuery.data?.[0]?.family.id ?? null;
  const eventsQuery = useQuery({
    queryKey: familyId ? calendarQueryKeys.day(familyId, selectedDate) : ["calendar", "events", "missing-family"],
    queryFn: () => getCalendarEvents(accessToken!, familyId!, range),
    enabled: Boolean(accessToken && familyId),
    staleTime: 60_000,
  });
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const eventViewModels = useMemo(() => sortCalendarEvents(events.filter((event) => event.date === selectedDate && event.source !== "school-week").map(mapCalendarEventToViewModel)), [events, selectedDate]);
  return {
    today,
    selectedDate,
    setSelectedDate,
    events,
    eventsForSelectedDate: eventViewModels,
    loading: familiesQuery.isLoading || eventsQuery.isLoading,
    refreshing: familiesQuery.isRefetching || eventsQuery.isRefetching,
    error: familiesQuery.error || eventsQuery.error,
    refresh: async () => { await Promise.all([familiesQuery.refetch(), eventsQuery.refetch()]); },
  };
}
