import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CalendarEvent } from "@familieappen/shared";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import { getCalendarEvents } from "../api";
import { getCalendarRange, getTodayString } from "../date";

export const calendarQueryKeys = {
  families: ["calendar", "families"] as const,
  events: (familyId: string, from: string, to: string) => ["calendar", "events", familyId, from, to] as const,
};

export function useCalendar() {
  const { accessToken } = useAuth();
  const today = useMemo(getTodayString, []);
  const [selectedDate, setSelectedDate] = useState(today);
  const range = useMemo(() => getCalendarRange(today), [today]);
  const familiesQuery = useQuery({
    queryKey: calendarQueryKeys.families,
    queryFn: () => listFamilies(accessToken!),
    enabled: Boolean(accessToken),
  });
  const familyId = familiesQuery.data?.[0]?.family.id ?? null;
  const eventsQuery = useQuery({
    queryKey: familyId ? calendarQueryKeys.events(familyId, range.from, range.to) : ["calendar", "events", "missing-family"],
    queryFn: () => getCalendarEvents(accessToken!, familyId!, range),
    enabled: Boolean(accessToken && familyId),
  });
  const events = eventsQuery.data ?? [];
  const eventsForSelectedDate = events.filter((event: CalendarEvent) => event.date === selectedDate && event.source !== "school-week");
  return {
    today,
    selectedDate,
    setSelectedDate,
    events,
    eventsForSelectedDate,
    loading: familiesQuery.isLoading || eventsQuery.isLoading,
    refreshing: familiesQuery.isRefetching || eventsQuery.isRefetching,
    error: familiesQuery.error || eventsQuery.error,
    refresh: async () => { await Promise.all([familiesQuery.refetch(), eventsQuery.refetch()]); },
  };
}
