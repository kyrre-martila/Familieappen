import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "../../family/useActiveFamily";
import { getFamily } from "../../auth/api";
import { getHuskLists, getHuskReminders, getSchoolWeekReminders } from "../api";
import { mapHuskListToViewModel, mapReminderToViewModel, mapSchoolWeekReminderToViewModel, sortHuskLists, sortReminders, sortSchoolWeekReminders } from "../models";
import { filterRemindersByStatus, type ReminderFilter } from "../reminderHistory";
import { huskQueryKeys } from "../queryKeys";
import { calendarQueryKeys } from "../../calendar/queryKeys";
import { huskListsQueryKey, huskQueryEnabled } from "../queryState";

export type HuskView = "reminders" | "lists" | "school-week";

export function useHusk(filter: ReminderFilter = "active", view: HuskView = "reminders") {
  const { accessToken, familiesQuery, familyId } = useActiveFamily();
  const remindersQuery = useQuery({ queryKey: familyId ? huskQueryKeys.reminders(familyId) : ["husk", "reminders", "missing-family"], queryFn: () => getHuskReminders(accessToken!, familyId!), enabled: huskQueryEnabled({ accessToken, familyId: familyId ?? null, view, dataset: "reminders" }), staleTime: 60_000 });
  const listsQuery = useQuery({ queryKey: huskListsQueryKey(familyId ?? null), queryFn: () => getHuskLists(accessToken!, familyId!), enabled: huskQueryEnabled({ accessToken, familyId: familyId ?? null, view, dataset: "lists" }), staleTime: 60_000 });
  const weekStart = getCurrentWeekStart();
  const familyMembersQuery = useQuery({ queryKey: familyId ? calendarQueryKeys.familyMembers(familyId) : ["husk", "familyMembers", "missing"], queryFn: () => getFamily(accessToken!, familyId!), enabled: Boolean(accessToken && familyId && view === "school-week"), staleTime: 60_000 });
  const schoolWeekQuery = useQuery({ queryKey: familyId ? huskQueryKeys.schoolWeek(familyId, weekStart) : ["husk", "school-week", "missing-family", weekStart], queryFn: () => getSchoolWeekReminders(accessToken!, familyId!, weekStart), enabled: Boolean(accessToken && familyId && view === "school-week"), staleTime: 60_000 });
  const reminders = useMemo(() => sortReminders(filterRemindersByStatus(remindersQuery.data ?? [], filter).map((item) => mapReminderToViewModel(item))), [filter, remindersQuery.data]);
  const lists = useMemo(() => sortHuskLists(listsQuery.data ?? []).map(mapHuskListToViewModel), [listsQuery.data]);
  const childNameById = useMemo(() => Object.fromEntries((familyMembersQuery.data?.members ?? []).map((member) => [member.id, member.displayName])), [familyMembersQuery.data]);
  const schoolWeek = useMemo(() => sortSchoolWeekReminders((schoolWeekQuery.data ?? []).map((item) => mapSchoolWeekReminderToViewModel(item, childNameById))), [childNameById, schoolWeekQuery.data]);
  const contentQuery = view === "reminders" ? remindersQuery : view === "lists" ? listsQuery : schoolWeekQuery;
  const refresh = async () => { await Promise.all([familiesQuery.refetch(), contentQuery.refetch()]); };
  return { reminders, lists, schoolWeek, familyId: familyId ?? null, loading: familiesQuery.isLoading || contentQuery.isLoading, refreshing: familiesQuery.isRefetching || contentQuery.isRefetching, error: familiesQuery.error || contentQuery.error || (view === "school-week" ? familyMembersQuery.error : null), missingContext: !accessToken || (familiesQuery.isSuccess && !familyId), refresh, weekStart, familyMembers: familyMembersQuery.data?.members ?? [] };
}

function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - day + 1));
  return monday.toISOString().slice(0, 10);
}
