import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "../../family/useActiveFamily";
import { getCalendarEvents } from "../api";
import { getCalendarMonthRangeForTimeZone, getCalendarRange, getTodayString } from "../date";
import { mapCalendarEventToViewModel, sortCalendarEvents } from "../events";

import { calendarQueryKeys } from "../queryKeys";

export function useCalendar() {
  const { accessToken, familiesQuery, familyId } = useActiveFamily();
  const today = useMemo(getTodayString, []);
  const [selectedDate, setSelectedDate] = useState(today);
  const range = useMemo(() => getCalendarMonthRangeForTimeZone(selectedDate), [selectedDate]);
  const agendaRange = useMemo(() => getCalendarRange(today), [today]);
  const eventsQuery = useQuery({
    queryKey: familyId ? calendarQueryKeys.events(familyId, range.from, range.to) : ["calendar", "events", "missing-family"],
    queryFn: () => getCalendarEvents(accessToken!, familyId!, range),
    enabled: Boolean(accessToken && familyId),
    staleTime: 60_000,
  });
  const agendaEventsQuery = useQuery({
    queryKey: familyId ? calendarQueryKeys.events(familyId, agendaRange.from, agendaRange.to) : ["calendar", "events", "agenda", "missing-family"],
    queryFn: () => getCalendarEvents(accessToken!, familyId!, agendaRange),
    enabled: Boolean(accessToken && familyId),
    staleTime: 60_000,
  });
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const agendaEvents = useMemo(() => agendaEventsQuery.data ?? [], [agendaEventsQuery.data]);
  const eventViewModels = useMemo(() => sortCalendarEvents(events.filter((event) => event.date === selectedDate).map(mapCalendarEventToViewModel)), [events, selectedDate]);
  const monthEventViewModels = useMemo(() => sortCalendarEvents(events.map(mapCalendarEventToViewModel)), [events]);
  const agendaEventViewModels = useMemo(() => sortCalendarEvents(agendaEvents.map(mapCalendarEventToViewModel)), [agendaEvents]);
  return {
    today,
    selectedDate,
    setSelectedDate,
    events,
    eventsForSelectedDate: eventViewModels,
    eventsForMonth: monthEventViewModels,
    eventsForAgenda: agendaEventViewModels,
    loading: familiesQuery.isLoading || eventsQuery.isLoading || agendaEventsQuery.isLoading,
    refreshing: familiesQuery.isRefetching || eventsQuery.isRefetching || agendaEventsQuery.isRefetching,
    error: familiesQuery.error || eventsQuery.error || agendaEventsQuery.error,
    missingContext: !accessToken || Boolean(accessToken && familiesQuery.isSuccess && !familyId),
    refresh: async () => { await Promise.all([familiesQuery.refetch(), eventsQuery.refetch(), agendaEventsQuery.refetch()]); },
  };
}
