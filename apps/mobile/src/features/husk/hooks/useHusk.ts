import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "../../family/useActiveFamily";
import { getHuskLists, getHuskReminders } from "../api";
import { mapHuskListToViewModel, mapReminderToViewModel, sortHuskLists, sortReminders } from "../models";
import { filterRemindersByStatus, type ReminderFilter } from "../reminderHistory";
import { huskQueryKeys } from "../queryKeys";
import { huskListsQueryKey, huskQueryEnabled } from "../queryState";

export type HuskView = "reminders" | "lists";

export function useHusk(filter: ReminderFilter = "active", view: HuskView = "reminders") {
  const { accessToken, familiesQuery, familyId } = useActiveFamily();
  const remindersQuery = useQuery({ queryKey: familyId ? huskQueryKeys.reminders(familyId) : ["husk", "reminders", "missing-family"], queryFn: () => getHuskReminders(accessToken!, familyId!), enabled: huskQueryEnabled({ accessToken, familyId: familyId ?? null, view, dataset: "reminders" }), staleTime: 60_000 });
  const listsQuery = useQuery({ queryKey: huskListsQueryKey(familyId ?? null), queryFn: () => getHuskLists(accessToken!, familyId!), enabled: huskQueryEnabled({ accessToken, familyId: familyId ?? null, view, dataset: "lists" }), staleTime: 60_000 });
  const reminders = useMemo(() => sortReminders(filterRemindersByStatus(remindersQuery.data ?? [], filter).map((item) => mapReminderToViewModel(item))), [filter, remindersQuery.data]);
  const lists = useMemo(() => sortHuskLists(listsQuery.data ?? []).map(mapHuskListToViewModel), [listsQuery.data]);
  const contentQuery = view === "reminders" ? remindersQuery : listsQuery;
  const refresh = async () => { await Promise.all([familiesQuery.refetch(), contentQuery.refetch()]); };
  return { reminders, lists, familyId: familyId ?? null, loading: familiesQuery.isLoading || contentQuery.isLoading, refreshing: familiesQuery.isRefetching || contentQuery.isRefetching, error: familiesQuery.error || contentQuery.error, missingContext: !accessToken || (familiesQuery.isSuccess && !familyId), refresh };
}
