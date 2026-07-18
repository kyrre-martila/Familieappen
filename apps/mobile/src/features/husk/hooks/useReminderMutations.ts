import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import type { Reminder } from "@familieappen/shared";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import { ApiError } from "../../../lib/api/client";
import {
  completeHuskReminder,
  createHuskReminder,
  undoCompleteHuskReminder,
  updateHuskReminder,
} from "../api";
import { mergeCreatedReminder, replaceReminder } from "../cache";
import { reminderFormToPayload, type ReminderForm } from "../reminderForm";
import { huskQueryKeys } from "../queryKeys";
const message = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "Kunne ikke lagre påminnelsen akkurat nå. Prøv igjen.";
function useFamily() {
  const { accessToken } = useAuth();
  const families = useQuery({
    queryKey: huskQueryKeys.families,
    queryFn: () => listFamilies(accessToken!),
    enabled: Boolean(accessToken),
    staleTime: 60_000,
  });
  return {
    accessToken,
    families,
    familyId: families.data?.[0]?.family.id ?? null,
  };
}
export function useCreateReminder() {
  const { accessToken, families, familyId } = useFamily();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (form: ReminderForm) =>
      createHuskReminder(accessToken!, familyId!, reminderFormToPayload(form)),
    onSuccess: (reminder) => {
      if (familyId)
        client.setQueryData(
          huskQueryKeys.reminders(familyId),
          (current: Reminder[] | undefined) =>
            mergeCreatedReminder(current, reminder),
        );
      router.replace(`/(app)/husk/${reminder.id}`);
    },
  });
  return {
    create: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error ? message(mutation.error) : null,
    resetError: mutation.reset,
    familiesLoading: families.isLoading,
    missingContext: Boolean(accessToken && families.isSuccess && !familyId),
  };
}
export function useUpdateReminder(reminderId: string) {
  const { accessToken, families, familyId } = useFamily();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (form: ReminderForm) =>
      updateHuskReminder(
        accessToken!,
        familyId!,
        reminderId,
        reminderFormToPayload(form),
      ),
    onSuccess: (reminder) => {
      if (familyId)
        client.setQueryData(
          huskQueryKeys.reminders(familyId),
          (current: Reminder[] | undefined) =>
            replaceReminder(current, reminder),
        );
      router.replace(`/(app)/husk/${reminder.id}`);
    },
  });
  return {
    update: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error ? message(mutation.error) : null,
    resetError: mutation.reset,
    familiesLoading: families.isLoading,
    missingContext: Boolean(accessToken && families.isSuccess && !familyId),
  };
}

export function useReminderCompletion() {
  const { accessToken, families, familyId } = useFamily();
  const client = useQueryClient();
  const updateCache = (reminder: Reminder) => {
    if (familyId)
      client.setQueryData(
        huskQueryKeys.reminders(familyId),
        (current: Reminder[] | undefined) => replaceReminder(current, reminder),
      );
  };
  const completeMutation = useMutation({
    mutationFn: (reminderId: string) =>
      completeHuskReminder(accessToken!, familyId!, reminderId),
    onSuccess: updateCache,
  });
  const undoMutation = useMutation({
    mutationFn: (reminderId: string) =>
      undoCompleteHuskReminder(accessToken!, familyId!, reminderId),
    onSuccess: updateCache,
  });
  const error = completeMutation.error ?? undoMutation.error;
  return {
    complete: completeMutation.mutateAsync,
    undo: undoMutation.mutateAsync,
    saving: completeMutation.isPending || undoMutation.isPending,
    error: error ? message(error) : null,
    resetError: () => {
      completeMutation.reset();
      undoMutation.reset();
    },
    familiesLoading: families.isLoading,
    missingContext: Boolean(accessToken && families.isSuccess && !familyId),
  };
}
