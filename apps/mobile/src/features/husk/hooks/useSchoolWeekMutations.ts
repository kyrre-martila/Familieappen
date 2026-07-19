import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SchoolWeekReminder } from "@familieappen/shared";
import { ApiError } from "../../../lib/api/client";
import { useActiveFamily } from "../../family/useActiveFamily";
import { createSchoolWeekReminder, deleteSchoolWeekReminder, updateSchoolWeekReminder, type SchoolWeekPayload } from "../api";
import { huskQueryKeys } from "../queryKeys";

const message = (error: unknown) => error instanceof ApiError ? error.message : "Skoleuka ble ikke lagret. Prøv igjen.";

export function useSchoolWeekMutations(weekStart: string) {
  const { accessToken, familyId } = useActiveFamily();
  const client = useQueryClient();
  const key = familyId ? huskQueryKeys.schoolWeek(familyId, weekStart) : null;
  const replace = (saved: SchoolWeekReminder) => {
    if (!key) return;
    client.setQueryData(key, (current: SchoolWeekReminder[] | undefined) => {
      const items = current ?? [];
      return items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved];
    });
  };
  const create = useMutation({ mutationFn: (input: SchoolWeekPayload) => createSchoolWeekReminder(accessToken!, familyId!, input), onSuccess: replace });
  const update = useMutation({ mutationFn: (input: { id: string; payload: Partial<SchoolWeekPayload> & { scope?: "occurrence" | "series"; occurrenceDate?: string } }) => updateSchoolWeekReminder(accessToken!, familyId!, input.id, input.payload), onSuccess: replace });
  const remove = useMutation({ mutationFn: (input: { id: string; scope?: "occurrence" | "series"; occurrenceDate?: string }) => deleteSchoolWeekReminder(accessToken!, familyId!, input.id, input), onSuccess: (deleted) => {
    if (!key) return;
    client.setQueryData(key, (current: SchoolWeekReminder[] | undefined) => (current ?? []).filter((item) => item.id !== deleted.id));
    void client.invalidateQueries({ queryKey: key });
  } });
  const error = create.error ?? update.error ?? remove.error;
  return { create: create.mutateAsync, update: update.mutateAsync, remove: remove.mutateAsync, saving: create.isPending || update.isPending || remove.isPending, error: error ? message(error) : null, resetError: () => { create.reset(); update.reset(); remove.reset(); } };
}
