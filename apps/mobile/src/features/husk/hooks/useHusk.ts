import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listFamilies } from "../../auth/api";
import { useAuth } from "../../auth/AuthProvider";
import { getHuskLists, getHuskReminders } from "../api";
import { mapHuskListToViewModel, mapReminderToViewModel, sortReminders } from "../models";
import { filterRemindersByStatus, type ReminderFilter } from "../reminderHistory";
import { huskQueryKeys } from "../queryKeys";

export function useHusk(filter: ReminderFilter = "active") {
  const { accessToken } = useAuth();
  const familiesQuery = useQuery({ queryKey: huskQueryKeys.families, queryFn: () => listFamilies(accessToken!), enabled: Boolean(accessToken), staleTime: 60_000 });
  const familyId = familiesQuery.data?.[0]?.family.id;
  const remindersQuery = useQuery({ queryKey: familyId ? huskQueryKeys.reminders(familyId) : ["husk", "reminders", "missing-family"], queryFn: () => getHuskReminders(accessToken!, familyId!), enabled: Boolean(accessToken && familyId), staleTime: 60_000 });
  const listsQuery = useQuery({ queryKey: familyId ? huskQueryKeys.lists(familyId) : ["husk", "lists", "missing-family"], queryFn: () => getHuskLists(accessToken!, familyId!), enabled: Boolean(accessToken && familyId), staleTime: 60_000 });
  const reminders = useMemo(() => sortReminders(filterRemindersByStatus(remindersQuery.data ?? [], filter).map((item) => mapReminderToViewModel(item))), [filter, remindersQuery.data]);
  const lists = useMemo(() => (listsQuery.data ?? []).filter((item) => !item.archived).map(mapHuskListToViewModel).sort((a, b) => a.title.localeCompare(b.title, "nb-NO")), [listsQuery.data]);
  const refresh = async () => { await Promise.all([familiesQuery.refetch(), remindersQuery.refetch(), listsQuery.refetch()]); };
  return { reminders, lists, loading: familiesQuery.isLoading || remindersQuery.isLoading || listsQuery.isLoading, refreshing: familiesQuery.isRefetching || remindersQuery.isRefetching || listsQuery.isRefetching, error: familiesQuery.error || remindersQuery.error || listsQuery.error, refresh };
}
