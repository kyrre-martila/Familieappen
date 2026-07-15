import type { CalendarEvent } from "@familieappen/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import { ApiError } from "../../../lib/api/client";
import { updateCalendarEvent } from "../api";
import { updateCalendarEventPayload, type CalendarEventForm } from "../eventForm";
import { calendarEventsInvalidationKey, moveCalendarEventBetweenDays, replaceCalendarEventInDay } from "../cache";
import { calendarQueryKeys } from "../queryKeys";
import { buildCalendarEventDetailPath } from "../events";

export function getUpdateEventErrorMessage(error: unknown) { if (error instanceof ApiError) return error.message; return "Kunne ikke oppdatere hendelsen akkurat nå. Prøv igjen."; }

export function useUpdateCalendarEvent(input: { eventId: string; previousEvent: CalendarEvent | null; occurrenceDate?: string }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const familiesQuery = useQuery({ queryKey: calendarQueryKeys.families, queryFn: () => listFamilies(accessToken!), enabled: Boolean(accessToken) });
  const familyId = familiesQuery.data?.[0]?.family.id ?? null;
  const mutation = useMutation({
    mutationFn: (form: CalendarEventForm) => updateCalendarEvent(accessToken!, familyId!, input.eventId, updateCalendarEventPayload(form)),
    onSuccess: (event) => {
      if (familyId) {
        if (input.previousEvent?.date && input.previousEvent.date !== event.date) queryClient.setQueryData(calendarQueryKeys.day(familyId, input.previousEvent.date), (current: CalendarEvent[] | undefined) => moveCalendarEventBetweenDays(current, event, input.previousEvent!.date));
        queryClient.setQueryData(calendarQueryKeys.day(familyId, event.date), (current: CalendarEvent[] | undefined) => replaceCalendarEventInDay(current, event));
        queryClient.setQueriesData<CalendarEvent[]>({ queryKey: ["calendar", "events", familyId, "detail", input.eventId] }, (current) => current?.map((item) => item.id === event.id ? event : item));
      }
      void queryClient.invalidateQueries({ queryKey: calendarEventsInvalidationKey() });
      router.replace(buildCalendarEventDetailPath({ eventId: input.eventId, occurrenceDate: input.occurrenceDate }));
    },
  });
  return { familiesLoading: familiesQuery.isLoading, missingContext: Boolean(accessToken && familiesQuery.isSuccess && !familyId), updateEvent: mutation.mutateAsync, saving: mutation.isPending, error: mutation.error ? getUpdateEventErrorMessage(mutation.error) : null, resetError: mutation.reset };
}
