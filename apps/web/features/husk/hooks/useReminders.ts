"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addHuskReminder,
  deleteHuskReminder as deleteBackendHuskReminder,
  getHuskReminders,
  updateHuskReminder as updateBackendHuskReminder,
  type Reminder as BackendReminder,
} from "../../../lib/api";
import { getUserFacingApiMessage } from "../../../lib/auth-family";
import { remapLegacyMemberIds } from "../../family/familyMemberAdapters";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import type { HuskFamilyMember, HuskReminder, HuskReminderIcon } from "../types";

export type ReminderInput = Omit<HuskReminder, "id" | "dateLabel" | "group" | "scopeText" | "tone"> & {
  id?: string;
  scopeText?: string;
  dateLabel?: string;
  group?: HuskReminder["group"];
  tone?: HuskReminder["tone"];
  reminderMinutesBefore?: number | null;
  sourceType?: string | null;
  sourceId?: string | null;
  isPrivate?: boolean;
};

const REMINDERS_ERROR_COPY = "Kunne ikke hente husk akkurat nå";
const tones: HuskReminder["tone"][] = ["yellow", "blue", "pink", "orange", "green", "purple"];

export function useReminders() {
  const { family, familyMembers, loading: familyLoading, error: familyError, refresh: refreshFamilyMembers } = useFamilyMembers();
  const [backendReminders, setBackendReminders] = useState<BackendReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeFamilyId = family?.id ?? null;
  const huskFamilyMembers = familyMembers as HuskFamilyMember[];

  const refresh = useCallback(async () => {
    await refreshFamilyMembers();

    if (!activeFamilyId) {
      setBackendReminders([]);
      setLoading(familyLoading);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setBackendReminders(await getHuskReminders(activeFamilyId));
    } catch (refreshError) {
      setError(getUserFacingApiMessage(refreshError, REMINDERS_ERROR_COPY));
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, familyLoading, refreshFamilyMembers]);

  useEffect(() => {
    if (!activeFamilyId) {
      setBackendReminders([]);
      setLoading(familyLoading);
      setError(familyError);
      return;
    }

    let isActive = true;

    async function loadReminders() {
      setLoading(true);
      setError(null);

      try {
        const reminders = await getHuskReminders(activeFamilyId as string);

        if (isActive) {
          setBackendReminders(reminders);
        }
      } catch (refreshError) {
        if (isActive) {
          setError(getUserFacingApiMessage(refreshError, REMINDERS_ERROR_COPY));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadReminders();

    return () => {
      isActive = false;
    };
  }, [activeFamilyId, familyError, familyLoading]);

  const reminders = useMemo(
    () =>
      backendReminders.map((reminder, index) =>
        toHuskReminder(reminder, huskFamilyMembers, index),
      ),
    [backendReminders, huskFamilyMembers],
  );

  const createReminder = useCallback(async (input: ReminderInput) => {
    if (!activeFamilyId) {
      throw new Error("Choose a family before continuing.");
    }

    const optimisticReminder = createOptimisticBackendReminder(input, activeFamilyId);
    setBackendReminders((currentReminders) => [optimisticReminder, ...currentReminders]);

    try {
      const savedReminder = await addHuskReminder(activeFamilyId, toBackendInput(input));
      setBackendReminders((currentReminders) =>
        currentReminders.map((reminder) => (reminder.id === optimisticReminder.id ? savedReminder : reminder)),
      );
      return toHuskReminder(savedReminder, huskFamilyMembers, 0);
    } catch (createError) {
      setBackendReminders((currentReminders) => currentReminders.filter((reminder) => reminder.id !== optimisticReminder.id));
      setError(getUserFacingApiMessage(createError, "Kunne ikke lagre husk akkurat nå"));
      throw createError;
    }
  }, [activeFamilyId, huskFamilyMembers]);

  const updateReminder = useCallback(async (id: string, update: Partial<HuskReminder>) => {
    if (!activeFamilyId) {
      throw new Error("Choose a family before continuing.");
    }

    const previousReminders = backendReminders;
    const previousReminder = previousReminders.find((reminder) => reminder.id === id);

    if (!previousReminder) {
      throw new Error("Reminder was not found");
    }

    const optimisticReminder = applyHuskUpdate(previousReminder, update);
    setBackendReminders((currentReminders) => currentReminders.map((reminder) => (reminder.id === id ? optimisticReminder : reminder)));

    try {
      const savedReminder = await updateBackendHuskReminder(activeFamilyId, id, toBackendUpdate(update));
      setBackendReminders((currentReminders) => currentReminders.map((reminder) => (reminder.id === id ? savedReminder : reminder)));
      return toHuskReminder(savedReminder, huskFamilyMembers, 0);
    } catch (updateError) {
      setBackendReminders(previousReminders);
      setError(getUserFacingApiMessage(updateError, "Kunne ikke lagre husk akkurat nå"));
      throw updateError;
    }
  }, [activeFamilyId, backendReminders, huskFamilyMembers]);

  const deleteReminder = useCallback(async (id: string) => {
    if (!activeFamilyId) {
      throw new Error("Choose a family before continuing.");
    }

    const previousReminders = backendReminders;
    setBackendReminders((currentReminders) => currentReminders.filter((reminder) => reminder.id !== id));

    try {
      await deleteBackendHuskReminder(activeFamilyId, id);
    } catch (deleteError) {
      setBackendReminders(previousReminders);
      setError(getUserFacingApiMessage(deleteError, "Kunne ikke slette husk akkurat nå"));
      throw deleteError;
    }
  }, [activeFamilyId, backendReminders]);

  return {
    familyMembers: huskFamilyMembers,
    reminders,
    loading: familyLoading || loading,
    error: familyError ?? error,
    refresh,
    createReminder,
    updateReminder,
    deleteReminder,
  };
}

function toBackendInput(input: ReminderInput) {
  return {
    title: input.title,
    icon: input.icon,
    dueDate: input.dueDate ?? null,
    reminderMinutesBefore: input.reminderMinutesBefore ?? null,
    note: input.note ?? null,
    scope: input.scopeText === "Hele familien" || input.memberIds.length === 0 ? "family" as const : "members" as const,
    memberIds: input.scopeText === "Hele familien" ? [] : input.memberIds,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    isPrivate: input.isPrivate ?? false,
  };
}

function toBackendUpdate(update: Partial<HuskReminder> & { reminderMinutesBefore?: number | null }) {
  return {
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.icon !== undefined ? { icon: update.icon } : {}),
    ...(update.dueDate !== undefined ? { dueDate: update.dueDate ?? undefined } : {}),
    ...(update.note !== undefined ? { note: update.note ?? null } : {}),
    ...(update.reminderMinutesBefore !== undefined ? { reminderMinutesBefore: update.reminderMinutesBefore } : {}),
    ...(update.isPrivate !== undefined ? { isPrivate: update.isPrivate } : {}),
    ...(update.scopeText !== undefined || update.memberIds !== undefined
      ? {
          scope: update.scopeText === "Hele familien" || (update.memberIds?.length ?? 0) === 0 ? "family" as const : "members" as const,
          memberIds: update.scopeText === "Hele familien" ? [] : (update.memberIds ?? []),
        }
      : {}),
  };
}

function createOptimisticBackendReminder(input: ReminderInput, familyId: string): BackendReminder {
  const now = new Date().toISOString();
  const scope = input.scopeText === "Hele familien" || input.memberIds.length === 0 ? "family" : "members";
  const memberIds = scope === "family" ? [] : input.memberIds;
  const dueDate = input.dueDate ?? null;

  return {
    id: input.id ?? `optimistic-reminder-${Date.now()}`,
    familyId,
    title: input.title,
    icon: input.icon,
    dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : null,
    date: dueDate,
    reminderMinutesBefore: input.reminderMinutesBefore ?? null,
    reminder: input.reminderMinutesBefore === null || input.reminderMinutesBefore === undefined ? null : { minutesBefore: input.reminderMinutesBefore, label: getReminderLabel(input.reminderMinutesBefore) },
    note: input.note ?? null,
    scope,
    memberIds,
    createdByUserId: null,
    createdAt: now,
    updatedAt: now,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    isPrivate: input.isPrivate ?? false,
    archivedAt: null,
    audienceMembers: [],
  };
}

function applyHuskUpdate(reminder: BackendReminder, update: Partial<HuskReminder> & { reminderMinutesBefore?: number | null }): BackendReminder {
  const nextMemberIds = update.scopeText === "Hele familien" ? [] : (update.memberIds ?? reminder.memberIds);
  const scope = update.scopeText === "Hele familien" || nextMemberIds.length === 0 ? "family" : "members";
  const nextDate = update.dueDate ?? reminder.date;

  return {
    ...reminder,
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.icon !== undefined ? { icon: update.icon } : {}),
    ...(update.note !== undefined ? { note: update.note ?? null } : {}),
    ...(update.isPrivate !== undefined ? { isPrivate: update.isPrivate } : {}),
    ...(update.reminderMinutesBefore !== undefined ? {
      reminderMinutesBefore: update.reminderMinutesBefore,
      reminder: update.reminderMinutesBefore === null ? null : { minutesBefore: update.reminderMinutesBefore, label: getReminderLabel(update.reminderMinutesBefore) },
    } : {}),
    dueDate: nextDate ? `${nextDate}T00:00:00.000Z` : null,
    date: nextDate,
    scope,
    memberIds: scope === "family" ? [] : nextMemberIds,
    updatedAt: new Date().toISOString(),
  };
}

function toHuskReminder(reminder: BackendReminder, familyMembers: HuskFamilyMember[], index: number): HuskReminder {
  const memberIds = remapLegacyMemberIds(reminder.memberIds, familyMembers);
  const scopeText = getScopeText(reminder.scope, memberIds, familyMembers);

  return {
    id: reminder.id,
    familyId: reminder.familyId,
    title: reminder.title,
    scopeText,
    dateLabel: reminder.date ? getDateLabel(reminder.date) : "Ingen dato",
    dueDate: reminder.date,
    group: reminder.date ? getReminderGroup(reminder.date) : "later",
    icon: isReminderIcon(reminder.icon) ? reminder.icon : "backpack",
    tone: tones[index % tones.length],
    memberIds,
    audience: { memberIds, label: scopeText },
    note: reminder.note ?? undefined,
    reminderMinutesBefore: reminder.reminderMinutesBefore,
    isPrivate: reminder.isPrivate,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
    archivedAt: reminder.archivedAt,
  };
}

function getReminderLabel(minutesBefore: number) {
  if (minutesBefore === 0) return "På dagen";
  if (minutesBefore === 1440) return "Dagen før";
  if (minutesBefore === 10080) return "Uken før";
  return `${minutesBefore} min før`;
}

function getScopeText(scope: BackendReminder["scope"], memberIds: string[], familyMembers: HuskFamilyMember[]) {
  if (scope === "family" || memberIds.length === 0) {
    return "Hele familien";
  }

  if (memberIds.length === 1) {
    return familyMembers.find((member) => member.id === memberIds[0])?.name ?? "1 person";
  }

  return `${memberIds.length} personer`;
}

function getReminderGroup(date: string): HuskReminder["group"] {
  const today = startOfToday();
  const reminderDate = parseDate(date);
  const dayDifference = Math.floor((reminderDate.getTime() - today.getTime()) / 86400000);

  if (dayDifference <= 0) {
    return "today";
  }

  if (dayDifference === 1) {
    return "tomorrow";
  }

  if (dayDifference <= 7) {
    return "week";
  }

  return "later";
}

function getDateLabel(date: string) {
  const today = startOfToday();
  const reminderDate = parseDate(date);
  const dayDifference = Math.floor((reminderDate.getTime() - today.getTime()) / 86400000);

  if (dayDifference === 0) {
    return "I dag";
  }

  if (dayDifference === 1) {
    return "I morgen";
  }

  if (dayDifference === -1) {
    return "I går";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    weekday: dayDifference > 1 && dayDifference <= 7 ? "long" : undefined,
    day: "numeric",
    month: "long",
  }).format(reminderDate);
}

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function isReminderIcon(icon: string): icon is HuskReminderIcon {
  return ["backpack", "book", "cake", "car", "gift", "grill", "passport", "shirt", "summer", "tooth"].includes(icon);
}
