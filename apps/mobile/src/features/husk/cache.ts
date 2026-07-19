import type { Reminder } from "@familieappen/shared";
export function mergeCreatedReminder(current: Reminder[] | undefined, reminder: Reminder) { return current ? [...current.filter((item) => item.id !== reminder.id), reminder] : current; }
export function replaceReminder(current: Reminder[] | undefined, reminder: Reminder) { return current ? current.map((item) => item.id === reminder.id ? reminder : item) : current; }
/** Stores the mutation response in the one all-reminders query; filters derive active/history without a refetch. */
export const moveReminderBetweenSections = replaceReminder;

export function removeReminder(current: import("@familieappen/shared").Reminder[] | undefined, reminderId: string) {
  return (current ?? []).filter((reminder) => reminder.id !== reminderId);
}
