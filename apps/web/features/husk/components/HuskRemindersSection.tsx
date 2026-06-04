"use client";

import { useState } from "react";

import { useReminders } from "../hooks/useReminders";
import type { HuskFilters, HuskReminder } from "../types";
import { previousReminders, reminderGroupOrder } from "./huskConfig";
import { matchesPersonFilter, normalizeSearch } from "./huskUtils";
import { HuskReminderDetailSheet } from "./HuskReminderDetailSheet";
import { HuskReminderEmptyState } from "./HuskReminderEmptyState";
import { HuskReminderGroups } from "./HuskReminderGroups";

export function HuskRemindersSection({
  filters,
  query,
}: {
  filters: HuskFilters;
  query: string;
}) {
  const [selectedReminder, setSelectedReminder] = useState<HuskReminder | null>(
    null,
  );
  const { familyMembers, reminders } = useReminders();
  const normalizedQuery = normalizeSearch(query);
  const filteredReminders = reminders.filter((reminder) => {
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
          onOpenReminder={setSelectedReminder}
          previousReminders={filteredPreviousReminders}
          showPrevious={filters.showPrevious}
        />
      ) : (
        <HuskReminderEmptyState
          title="Ingen husk ennå"
          description="Legg inn små ting familien ikke skal glemme."
          actionHref="/husk/reminders/new"
          actionLabel="+ Ny husk"
        />
      )}
      <HuskReminderDetailSheet
        reminder={selectedReminder}
        onClose={() => setSelectedReminder(null)}
      />
    </section>
  );
}
