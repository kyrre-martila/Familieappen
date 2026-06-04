"use client";

import { useMemo, useState } from "react";

import { huskMockData } from "../../../app/husk/mockHuskData";
import { remapLegacyMemberIds } from "../../family/familyMemberAdapters";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import type { HuskFamilyMember, HuskReminder } from "../types";

export type ReminderInput = Omit<HuskReminder, "id"> & { id?: string };

export function useReminders() {
  const [reminders, setReminders] = useState<HuskReminder[]>(
    huskMockData.reminders,
  );
  const { familyMembers, loading, error, refresh } = useFamilyMembers();
  const huskFamilyMembers = familyMembers as HuskFamilyMember[];
  const scopedReminders = useMemo(
    () =>
      reminders.map((reminder) => {
        const memberIds = remapLegacyMemberIds(reminder.memberIds, huskFamilyMembers);

        return {
          ...reminder,
          memberIds,
          scopeText: getScopeText(reminder.scopeText, memberIds, huskFamilyMembers),
        };
      }),
    [huskFamilyMembers, reminders],
  );

  function createReminder(input: ReminderInput) {
    const reminder: HuskReminder = {
      ...input,
      id: input.id ?? `mock-reminder-${Date.now()}`,
    };
    setReminders((currentReminders) => [reminder, ...currentReminders]);
    return reminder;
  }

  function updateReminder(id: string, update: Partial<HuskReminder>) {
    setReminders((currentReminders) =>
      currentReminders.map((reminder) =>
        reminder.id === id ? { ...reminder, ...update } : reminder,
      ),
    );
  }

  function deleteReminder(id: string) {
    setReminders((currentReminders) =>
      currentReminders.filter((reminder) => reminder.id !== id),
    );
  }

  return {
    familyMembers: huskFamilyMembers,
    reminders: scopedReminders,
    loading,
    error,
    refresh,
    createReminder,
    updateReminder,
    deleteReminder,
  };
}

function getScopeText(scopeText: string, memberIds: string[], familyMembers: HuskFamilyMember[]) {
  if (scopeText === "Hele familien") {
    return scopeText;
  }

  if (memberIds.length === 1) {
    return familyMembers.find((member) => member.id === memberIds[0])?.name ?? scopeText;
  }

  if (memberIds.length > 1) {
    return `${memberIds.length} personer`;
  }

  return scopeText;
}
