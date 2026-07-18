import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useActiveFamily } from "../../family/useActiveFamily";
import { ApiError } from "../../../lib/api/client";
import { addCalendarEvent } from "../api";
import { createCalendarEventPayload, type CreateCalendarEventForm } from "../createEventForm";
import { calendarEventsInvalidationKey, mergeCreatedCalendarEvent } from "../cache";
import { calendarQueryKeys } from "../queryKeys";

export function getCreateEventErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "Kunne ikke lagre hendelsen akkurat nå. Prøv igjen.";
}

export function useCreateCalendarEvent() {
  const { accessToken, familiesQuery, familyId } = useActiveFamily();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (form: CreateCalendarEventForm) => addCalendarEvent(accessToken!, familyId!, createCalendarEventPayload(form)),
    onSuccess: (event) => {
      if (familyId) queryClient.setQueryData(calendarQueryKeys.day(familyId, event.date), (current: import("@familieappen/shared").CalendarEvent[] | undefined) => mergeCreatedCalendarEvent(current, event));
      void queryClient.invalidateQueries({ queryKey: calendarEventsInvalidationKey() });
      router.replace("/(app)/(tabs)/calendar");
    },
  });
  return { familyId, familiesLoading: familiesQuery.isLoading, missingContext: Boolean(accessToken && familiesQuery.isSuccess && !familyId), createEvent: mutation.mutateAsync, saving: mutation.isPending, error: mutation.error ? getCreateEventErrorMessage(mutation.error) : null, resetError: mutation.reset };
}
