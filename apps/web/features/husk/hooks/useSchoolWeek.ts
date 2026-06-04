"use client";

import { useState } from "react";

import { huskMockData, type HuskSchoolWeekChildPlan, type HuskSchoolWeekItem, type HuskSchoolWeekday } from "../../../app/husk/mockHuskData";

export type SchoolReminderInput = HuskSchoolWeekItem & {
  childId: string;
  weekday: HuskSchoolWeekday;
};

export function useSchoolWeek() {
  const [weekItems, setWeekItems] = useState<HuskSchoolWeekChildPlan[]>(huskMockData.schoolWeek);

  function createSchoolReminder(input: SchoolReminderInput) {
    const { childId, weekday, ...item } = input;
    setWeekItems((currentPlans) =>
      currentPlans.map((plan) =>
        plan.childId === childId
          ? { ...plan, days: { ...plan.days, [weekday]: [...plan.days[weekday], item] } }
          : plan,
      ),
    );
    return item;
  }

  function updateSchoolReminder(itemId: string, update: Partial<HuskSchoolWeekItem>) {
    setWeekItems((currentPlans) =>
      currentPlans.map((plan) => ({
        ...plan,
        days: Object.fromEntries(
          Object.entries(plan.days).map(([weekday, items]) => [
            weekday,
            items.map((item) => (item.id === itemId ? { ...item, ...update } : item)),
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
    children: huskMockData.familyMembers,
    weekItems,
    createSchoolReminder,
    updateSchoolReminder,
    deleteSchoolReminder,
  };
}
