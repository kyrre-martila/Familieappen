"use client";

import { useEffect, useState } from "react";

import {
  FamilyMembersEmptyState,
  FamilyMembersErrorState,
  FamilyMembersLoadingState,
} from "../../family/FamilyMembersEmptyState";
import { useReminders } from "../hooks/useReminders";
import type { HuskFilters, HuskReminder } from "../types";
import { reminderGroupOrder } from "./huskConfig";
import { matchesPersonFilter, normalizeSearch } from "./huskUtils";
import { HuskReminderDetailSheet } from "./HuskReminderDetailSheet";
import { HuskReminderEditSheet } from "./HuskReminderEditSheet";
import { HuskReminderEmptyState } from "./HuskReminderEmptyState";
import { HuskReminderGroups } from "./HuskReminderGroups";

export function HuskRemindersSection({
  detailId,
  filters,
  query,
}: {
  detailId?: string | null;
  filters: HuskFilters;
  query: string;
}) {
  const [selectedReminder, setSelectedReminder] = useState<HuskReminder | null>(
    null,
  );
  const [editingReminder, setEditingReminder] = useState<HuskReminder | null>(
    null,
  );
  const [openMenuReminderId, setOpenMenuReminderId] = useState<string | null>(
    null,
  );
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const {
    familyMembers,
    reminders,
    loading,
    error,
    refresh,
    updateReminder,
    deleteReminder,
  } = useReminders();
  const normalizedQuery = normalizeSearch(query);

  useEffect(() => {
    if (!detailId || loading) {
      return;
    }

    setSelectedReminder(reminders.find((reminder) => reminder.id === detailId) ?? null);
  }, [detailId, loading, reminders]);
  const today = new Date().toISOString().slice(0, 10);
  const activeReminders = reminders.filter(
    (reminder) => !reminder.dueDate || reminder.dueDate >= today,
  );
  const previousReminders = reminders.filter(
    (reminder) => reminder.dueDate && reminder.dueDate < today,
  );
  const filteredReminders = activeReminders.filter((reminder) => {
    if (
      !matchesPersonFilter(
        reminder.memberIds,
        reminder.scopeText,
        filters.person,
      )
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [reminder.title, reminder.scopeText, reminder.dateLabel].some(
      (value) => value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
    );
  });

  const filteredPreviousReminders = previousReminders.filter((reminder) => {
    if (
      !filters.showPrevious ||
      !matchesPersonFilter(
        reminder.memberIds,
        reminder.scopeText,
        filters.person,
      )
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [reminder.title, reminder.scopeText, reminder.dateLabel].some(
      (value) => value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
    );
  });

  const groupedReminders = reminderGroupOrder
    .map((group) => ({
      group,
      reminders: filteredReminders.filter(
        (reminder) => reminder.group === group,
      ),
    }))
    .filter(({ reminders: groupReminders }) => groupReminders.length > 0);

  const hasReminders =
    groupedReminders.length > 0 ||
    (filters.showPrevious && filteredPreviousReminders.length > 0);

  if (loading) {
    return (
      <section
        className="husk-panel"
        id="husk-panel-husk"
        role="tabpanel"
        aria-labelledby="husk-tab-husk"
      >
        <FamilyMembersLoadingState />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="husk-panel"
        id="husk-panel-husk"
        role="tabpanel"
        aria-labelledby="husk-tab-husk"
      >
        <FamilyMembersErrorState onRetry={() => void refresh()} />
      </section>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <section
        className="husk-panel"
        id="husk-panel-husk"
        role="tabpanel"
        aria-labelledby="husk-tab-husk"
      >
        <FamilyMembersEmptyState />
      </section>
    );
  }

  return (
    <section
      className="husk-panel"
      id="husk-panel-husk"
      role="tabpanel"
      aria-labelledby="husk-tab-husk"
    >
      {hasReminders ? (
        <HuskReminderGroups
          familyMembers={familyMembers}
          groupedReminders={groupedReminders}
          onDeleteReminder={(reminder) => void deleteReminder(reminder.id)}
          onEditReminder={(reminder) => {
            setSelectedReminder(null);
            setEditingReminder(reminder);
          }}
          onOpenReminder={setSelectedReminder}
          openMenuReminderId={openMenuReminderId}
          previousReminders={filteredPreviousReminders}
          setOpenMenuReminderId={setOpenMenuReminderId}
          showPrevious={filters.showPrevious}
        />
      ) : (
        <HuskReminderEmptyState
          title="Ingen påminnelser ennå"
          description="Legg inn påminnelser familien ikke skal glemme."
          actionHref="/husk/reminders/new"
          actionLabel="+ Ny husk"
        />
      )}
      <HuskReminderDetailSheet
        reminder={selectedReminder}
        onClose={() => setSelectedReminder(null)}
        onEdit={(reminder) => {
          setSelectedReminder(null);
          setEditingReminder(reminder);
        }}
      />
      <HuskReminderEditSheet
        familyMembers={familyMembers}
        isSaving={isSavingEdit}
        reminder={editingReminder}
        onClose={() => setEditingReminder(null)}
        onSave={async (reminderId, input) => {
          setIsSavingEdit(true);
          try {
            await updateReminder(reminderId, input);
            setEditingReminder(null);
          } finally {
            setIsSavingEdit(false);
          }
        }}
      />
    </section>
  );
}
