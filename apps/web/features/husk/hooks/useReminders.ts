"use client";

import { useState } from "react";

import { huskMockData } from "../../../app/husk/mockHuskData";
import type { HuskFamilyMember, HuskReminder } from "../types";

export type ReminderInput = Omit<HuskReminder, "id"> & { id?: string };

export function useReminders() {
  const [reminders, setReminders] = useState<HuskReminder[]>(
    huskMockData.reminders,
  );
  const familyMembers = huskMockData.familyMembers as HuskFamilyMember[];

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
    familyMembers,
    reminders,
    createReminder,
    updateReminder,
    deleteReminder,
  };
}
