import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveFamily } from "../../family/useActiveFamily";
import { getHuskReminders } from "../api";
import { huskQueryKeys } from "../queryKeys";

export function useReminderDetails(reminderId: string | null) {
  const { accessToken, familiesQuery: families, familyId } = useActiveFamily();
  const client = useQueryClient();
  const cached = familyId ? client.getQueryData<import("@familieappen/shared").Reminder[]>(huskQueryKeys.reminders(familyId))?.find((r) => r.id === reminderId) : undefined;
  const reminders = useQuery({ queryKey: familyId ? huskQueryKeys.reminders(familyId) : ["husk", "reminders", "missing"], queryFn: () => getHuskReminders(accessToken!, familyId!), enabled: Boolean(accessToken && familyId && reminderId), initialData: cached ? [cached] : undefined, staleTime: 60_000 });
  const reminder = useMemo(() => reminders.data?.find((item) => item.id === reminderId) ?? null, [reminders.data, reminderId]);
  return { reminder, familyId: familyId ?? null, loading: families.isLoading || (reminders.isLoading && !cached), refreshing: families.isRefetching || reminders.isRefetching, error: families.error || reminders.error, missingContext: !accessToken || (families.isSuccess && !familyId), refetch: async () => { await Promise.all([families.refetch(), reminders.refetch()]); } };
}
