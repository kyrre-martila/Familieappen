"use client";

import type { ReminderSummary } from "@familieappen/shared";

import { reminderIcons } from "./calendarConfig";

export function CalendarReminderChip({ reminder }: { reminder: ReminderSummary }) {
  const ReminderIcon = reminderIcons[reminder.icon];

  return (
    <button
      className="calendar-chip calendar-chip--reminder"
      type="button"
      aria-label={`Åpne husk: ${reminder.title}`}
    >
      <ReminderIcon aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{reminder.title}</span>
    </button>
  );
}

export function CalendarReminderSummaryChip({ reminder }: { reminder: ReminderSummary }) {
  const ReminderIcon = reminderIcons[reminder.icon];

  return (
    <span
      className="calendar-chip calendar-chip--reminder"
      key={reminder.id}
    >
      <ReminderIcon aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{reminder.title}</span>
    </span>
  );
}
