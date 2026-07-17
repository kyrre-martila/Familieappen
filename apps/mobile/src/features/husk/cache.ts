import type { Reminder } from "@familieappen/shared";
export function mergeCreatedReminder(current: Reminder[] | undefined, reminder: Reminder) { return current ? [...current.filter((item) => item.id !== reminder.id), reminder] : current; }
export function replaceReminder(current: Reminder[] | undefined, reminder: Reminder) { return current ? current.map((item) => item.id === reminder.id ? reminder : item) : current; }
