import type { Reminder } from "@familieappen/shared";

export type ReminderFilter = "active" | "history";

export function isActiveReminder(reminder: Pick<Reminder, "archivedAt">) {
  return reminder.archivedAt === null;
}

export function isHistoricalReminder(reminder: Pick<Reminder, "archivedAt">) {
  return !isActiveReminder(reminder);
}

export function filterRemindersByStatus(reminders: Reminder[], filter: ReminderFilter) {
  return reminders.filter(filter === "active" ? isActiveReminder : isHistoricalReminder);
}

export function reminderActionFor(reminder: Pick<Reminder, "archivedAt">) {
  return isActiveReminder(reminder) ? "complete" as const : "undo" as const;
}

export function emptyReminderState(filter: ReminderFilter) {
  return filter === "active"
    ? { title: "Ingen aktive påminnelser", description: "Legg inn påminnelser familien ikke skal glemme." }
    : { title: "Ingen historikk", description: "Fullførte påminnelser vises her." };
}
