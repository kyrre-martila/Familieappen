"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addSchoolWeekReminder,
  deleteSchoolWeekReminder as deleteBackendSchoolWeekReminder,
  getSchoolWeekReminders,
  updateSchoolWeekReminder as updateBackendSchoolWeekReminder,
  type SchoolWeekMutationScope,
  type SchoolWeekReminder as BackendSchoolWeekReminder,
} from "../../../lib/api";
import { getUserFacingApiMessage } from "../../../lib/auth-family";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import type {
  HuskFamilyMember,
  HuskSchoolWeekChildPlan,
  HuskSchoolWeekItem,
  HuskSchoolWeekday,
} from "../types";

export type SchoolReminderInput = {
  childId: string;
  weekday: HuskSchoolWeekday;
  date: string;
  title: string;
  icon: HuskSchoolWeekItem["icon"];
  isRecurring?: boolean;
  recurrenceEndDate?: string | null;
  note?: string | null;
};

export type SchoolReminderUpdate = Partial<Pick<HuskSchoolWeekItem, "title" | "icon" | "note" | "isRecurring" | "recurrenceEndDate" | "childFamilyMemberId">> & {
  weekday?: HuskSchoolWeekday;
  date?: string;
  occurrenceDate?: string;
  scope?: SchoolWeekMutationScope;
};

const schoolWeekdays: HuskSchoolWeekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const schoolTones: HuskSchoolWeekItem["tone"][] = ["purple", "blue", "orange", "green", "yellow"];

export function useSchoolWeek(selectedWeek: Date) {
  const selectedWeekKey = toDateString(selectedWeek);
  const { family, children: familyChildren, loading: familyLoading, error: familyError, refresh: refreshFamilyMembers } = useFamilyMembers();
  const children = familyChildren as HuskFamilyMember[];
  const [backendItems, setBackendItems] = useState<BackendSchoolWeekReminder[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await refreshFamilyMembers();
  }, [refreshFamilyMembers]);

  const refreshItems = useCallback(async () => {
    if (!family?.id) {
      setBackendItems([]);
      return;
    }

    setItemsLoading(true);
    setItemsError(null);

    try {
      setBackendItems(await getSchoolWeekReminders(family.id, selectedWeekKey));
    } catch (error) {
      setBackendItems([]);
      setItemsError(getUserFacingApiMessage(error, "Kunne ikke hente skoleuka akkurat nå"));
    } finally {
      setItemsLoading(false);
    }
  }, [family?.id, selectedWeekKey]);

  useEffect(() => {
    void refreshItems();
  }, [refreshItems]);

  const weekItems = useMemo(() => {
    const plans = new Map<string, HuskSchoolWeekChildPlan>();

    for (const child of children) {
      plans.set(child.id, { childId: child.id, days: createEmptyDays() });
    }

    for (const item of backendItems) {
      const childId = item.childFamilyMemberId;
      const weekday = item.weekday;
      if (!childId || !isSchoolWeekday(weekday) || !plans.has(childId)) continue;
      plans.get(childId)!.days[weekday].push(toHuskSchoolItem(item));
    }

    return Array.from(plans.values());
  }, [backendItems, children]);

  const createSchoolReminder = useCallback(async (input: SchoolReminderInput) => {
    if (!family?.id) throw new Error("Family is not ready");
    const optimisticItem = createOptimisticItem(input, family.id);
    const previousItems = backendItems;
    setBackendItems((current) => [...current, optimisticItem]);

    try {
      const saved = await addSchoolWeekReminder(family.id, {
        childFamilyMemberId: input.childId,
        title: input.title,
        icon: input.icon,
        weekday: input.weekday,
        date: input.date,
        isRecurring: input.isRecurring ?? false,
        recurrenceFrequency: "weekly",
        recurrenceEndDate: input.isRecurring ? input.recurrenceEndDate ?? null : null,
        note: input.note ?? null,
      });
      setBackendItems((current) => current.map((item) => item.id === optimisticItem.id ? saved : item));
      return toHuskSchoolItem(saved);
    } catch (error) {
      setBackendItems(previousItems);
      setItemsError(getUserFacingApiMessage(error, "Skolehusk ble ikke lagret"));
      throw error;
    }
  }, [backendItems, family?.id]);

  const updateSchoolReminder = useCallback(async (itemId: string, update: SchoolReminderUpdate) => {
    if (!family?.id) throw new Error("Family is not ready");
    const previousItems = backendItems;
    setBackendItems((current) => current.map((item) => item.id === itemId ? applyOptimisticUpdate(item, update) : item));

    try {
      const saved = await updateBackendSchoolWeekReminder(family.id, itemId, update);
      setBackendItems((current) => current.map((item) => item.id === itemId ? saved : item));
      await refreshItems();
      return toHuskSchoolItem(saved);
    } catch (error) {
      setBackendItems(previousItems);
      setItemsError(getUserFacingApiMessage(error, "Endringen ble ikke lagret"));
      throw error;
    }
  }, [backendItems, family?.id, refreshItems]);

  const deleteSchoolReminder = useCallback(async (itemId: string, input: { scope?: SchoolWeekMutationScope; occurrenceDate?: string } = {}) => {
    if (!family?.id) throw new Error("Family is not ready");
    const previousItems = backendItems;
    setBackendItems((current) => current.filter((item) => item.id !== itemId));

    try {
      const deleted = await deleteBackendSchoolWeekReminder(family.id, itemId, input);
      await refreshItems();
      return toHuskSchoolItem(deleted);
    } catch (error) {
      setBackendItems(previousItems);
      setItemsError(getUserFacingApiMessage(error, "Skolehusk ble ikke slettet"));
      throw error;
    }
  }, [backendItems, family?.id, refreshItems]);

  return {
    children,
    selectedWeek: selectedWeekKey,
    weekItems,
    loading: familyLoading || itemsLoading,
    error: familyError ?? itemsError,
    refresh: async () => {
      await refresh();
      await refreshItems();
    },
    createSchoolReminder,
    updateSchoolReminder,
    deleteSchoolReminder,
  };
}

function createEmptyDays(): HuskSchoolWeekChildPlan["days"] {
  return { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] };
}

function toHuskSchoolItem(item: BackendSchoolWeekReminder): HuskSchoolWeekItem {
  return {
    id: item.id,
    title: item.title,
    icon: isSchoolIcon(item.icon) ? item.icon : "backpack",
    tone: schoolTones[Math.abs(hashString(item.id)) % schoolTones.length],
    familyId: item.familyId,
    childFamilyMemberId: item.childFamilyMemberId,
    weekday: item.weekday,
    date: item.date,
    occurrenceDate: item.occurrenceDate,
    isRecurring: item.isRecurring,
    recurrenceFrequency: item.recurrenceFrequency,
    recurrenceEndDate: item.recurrenceEndDate,
    recurringSeriesId: item.recurringSeriesId,
    exceptionOfId: item.exceptionOfId,
    note: item.note,
  };
}

function createOptimisticItem(input: SchoolReminderInput, familyId: string): BackendSchoolWeekReminder {
  const now = new Date().toISOString();
  return {
    id: `optimistic-school-${Date.now()}`,
    familyId,
    childFamilyMemberId: input.childId,
    title: input.title,
    icon: input.icon,
    category: input.icon,
    weekday: input.weekday,
    date: input.date,
    occurrenceDate: input.date,
    isRecurring: input.isRecurring ?? false,
    recurrenceFrequency: "weekly",
    recurrenceEndDate: input.isRecurring ? input.recurrenceEndDate ?? null : null,
    recurringSeriesId: null,
    exceptionOfId: null,
    note: input.note ?? null,
    tone: "blue",
  } as BackendSchoolWeekReminder;
}

function applyOptimisticUpdate(item: BackendSchoolWeekReminder, update: SchoolReminderUpdate): BackendSchoolWeekReminder {
  return {
    ...item,
    title: update.title ?? item.title,
    icon: update.icon ?? item.icon,
    category: update.icon ?? item.category,
    weekday: update.weekday ?? item.weekday,
    childFamilyMemberId: update.childFamilyMemberId ?? item.childFamilyMemberId,
    date: update.date ?? item.date,
    occurrenceDate: update.occurrenceDate ?? item.occurrenceDate,
    isRecurring: update.isRecurring ?? item.isRecurring,
    recurrenceEndDate: update.recurrenceEndDate !== undefined ? update.recurrenceEndDate : item.recurrenceEndDate,
    note: update.note !== undefined ? update.note : item.note,
  };
}

function toDateString(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10);
}

function isSchoolWeekday(value: unknown): value is HuskSchoolWeekday {
  return typeof value === "string" && schoolWeekdays.includes(value as HuskSchoolWeekday);
}

function isSchoolIcon(icon: string): icon is HuskSchoolWeekItem["icon"] {
  return ["backpack", "book", "cake", "car", "gift", "grill", "passport", "shirt", "summer", "tooth"].includes(icon);
}

function hashString(value: string): number {
  return Array.from(value).reduce((sum, character) => sum + character.charCodeAt(0), 0);
}
