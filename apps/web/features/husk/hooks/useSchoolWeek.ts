"use client";

import { useMemo, useState } from "react";

import { huskMockData } from "../../../app/husk/mockHuskData";
import { remapLegacyMemberIds } from "../../family/familyMemberAdapters";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import type {
  HuskFamilyMember,
  HuskSchoolWeekChildPlan,
  HuskSchoolWeekItem,
  HuskSchoolWeekday,
} from "../types";

export type SchoolReminderInput = HuskSchoolWeekItem & {
  childId: string;
  weekday: HuskSchoolWeekday;
};

export function useSchoolWeek() {
  const [weekItems, setWeekItems] = useState<HuskSchoolWeekChildPlan[]>(
    huskMockData.schoolWeek,
  );
  const { children: familyChildren, loading, error, refresh } = useFamilyMembers();
  const children = familyChildren as HuskFamilyMember[];
  const scopedWeekItems = useMemo(
    () => {
      const remappedPlans = weekItems
        .map((plan) => ({
          ...plan,
          childId: remapLegacyMemberIds([plan.childId], children)[0] ?? "",
        }))
        .filter((plan) => plan.childId);
      const existingChildIds = new Set(remappedPlans.map((plan) => plan.childId));
      const createEmptyDays = (): HuskSchoolWeekChildPlan["days"] => ({ monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] });

      return [
        ...remappedPlans,
        ...children
          .filter((child) => !existingChildIds.has(child.id))
          .map((child) => ({ childId: child.id, days: createEmptyDays() })),
      ];
    },
    [children, weekItems],
  );

  function createSchoolReminder(input: SchoolReminderInput) {
    const { childId, weekday, ...item } = input;
    setWeekItems((currentPlans) => {
      const existingPlan = currentPlans.find((plan) => plan.childId === childId);

      if (!existingPlan) {
        return [
          ...currentPlans,
          {
            childId,
            days: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], [weekday]: [item] },
          },
        ];
      }

      return currentPlans.map((plan) =>
        plan.childId === childId
          ? {
              ...plan,
              days: { ...plan.days, [weekday]: [...plan.days[weekday], item] },
            }
          : plan,
      );
    });
    return item;
  }

  function updateSchoolReminder(
    itemId: string,
    update: Partial<HuskSchoolWeekItem>,
  ) {
    setWeekItems((currentPlans) =>
      currentPlans.map((plan) => ({
        ...plan,
        days: Object.fromEntries(
          Object.entries(plan.days).map(([weekday, items]) => [
            weekday,
            items.map((item) =>
              item.id === itemId ? { ...item, ...update } : item,
            ),
          ]),
        ) as HuskSchoolWeekChildPlan["days"],
      })),
    );
  }

  function deleteSchoolReminder(itemId: string) {
    setWeekItems((currentPlans) =>
      currentPlans.map((plan) => ({
        ...plan,
        days: Object.fromEntries(
          Object.entries(plan.days).map(([weekday, items]) => [
            weekday,
            items.filter((item) => item.id !== itemId),
          ]),
        ) as HuskSchoolWeekChildPlan["days"],
      })),
    );
  }

  return {
    children,
    weekItems: scopedWeekItems,
    loading,
    error,
    refresh,
    createSchoolReminder,
    updateSchoolReminder,
    deleteSchoolReminder,
  };
}
