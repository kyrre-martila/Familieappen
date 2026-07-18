import type { CalendarEvent } from "@familieappen/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useActiveFamily } from "../../family/useActiveFamily";
import { ApiError } from "../../../lib/api/client";
import { deleteCalendarEvent } from "../api";
import { calendarEventsInvalidationKey, removeCalendarEventByIdFromDay, removeCalendarEventOccurrenceFromDay, removeCalendarEventSeriesFromDay } from "../cache";
import { validateCalendarEventDeleteScope, type CalendarEventDeleteScope } from "../events";
import { calendarQueryKeys } from "../queryKeys";

export type DeleteCalendarEventInput = { eventId: string; occurrenceDate?: string; previousEvent: CalendarEvent | null; selectedDate?: string };

export function getDeleteEventErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Økten er utløpt. Logg inn på nytt og prøv igjen.";
    if (error.status === 403) return "Du har ikke tilgang til å slette denne hendelsen.";
    if (error.status === 404) return "Hendelsen er allerede fjernet eller finnes ikke lenger.";
    if (error.status === 409) return "Hendelsen ble endret av noen andre. Last inn kalenderen på nytt og prøv igjen.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Kunne ikke slette hendelsen akkurat nå. Prøv igjen.";
}

export function useDeleteCalendarEvent(input: DeleteCalendarEventInput) {
  const { accessToken, familiesQuery, familyId } = useActiveFamily();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (scope?: CalendarEventDeleteScope | null) => {
      const scopeError = validateCalendarEventDeleteScope({ previousEvent: input.previousEvent, scope, occurrenceDate: input.occurrenceDate });
      if (scopeError) throw new Error(scopeError);
      return deleteCalendarEvent(accessToken!, familyId!, input.eventId, { scope, occurrenceDate: input.occurrenceDate });
    },
    onSuccess: (_deleted, scope) => {
      if (familyId) {
        const date = input.selectedDate ?? input.previousEvent?.date;
        if (date) {
          if (scope === "occurrence" && input.occurrenceDate) queryClient.setQueryData(calendarQueryKeys.day(familyId, date), (current: CalendarEvent[] | undefined) => removeCalendarEventOccurrenceFromDay(current, { eventId: input.eventId, occurrenceDate: input.occurrenceDate! }));
          else if (scope === "series") queryClient.setQueryData(calendarQueryKeys.day(familyId, date), (current: CalendarEvent[] | undefined) => removeCalendarEventSeriesFromDay(current, input.eventId));
          else queryClient.setQueryData(calendarQueryKeys.day(familyId, date), (current: CalendarEvent[] | undefined) => removeCalendarEventByIdFromDay(current, input.eventId));
        }
        queryClient.removeQueries({ queryKey: ["calendar", "events", familyId, "detail", input.eventId] });
      }
      void queryClient.invalidateQueries({ queryKey: calendarEventsInvalidationKey() });
      router.replace("/(app)/(tabs)/calendar");
    },
  });
  return { familiesLoading: familiesQuery.isLoading, missingContext: Boolean(accessToken && familiesQuery.isSuccess && !familyId), deleteEvent: mutation.mutateAsync, deleting: mutation.isPending, error: mutation.error ? getDeleteEventErrorMessage(mutation.error) : null, resetError: mutation.reset };
}
