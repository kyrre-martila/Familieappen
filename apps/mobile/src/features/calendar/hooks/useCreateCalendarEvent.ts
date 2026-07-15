import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
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
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const familiesQuery = useQuery({ queryKey: calendarQueryKeys.families, queryFn: () => listFamilies(accessToken!), enabled: Boolean(accessToken) });
  const familyId = familiesQuery.data?.[0]?.family.id ?? null;
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
