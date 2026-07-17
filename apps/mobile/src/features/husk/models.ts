import type { HuskList, Reminder } from "@familieappen/shared";
import { addDays, formatDateString, getTodayString, parseDateString } from "../calendar/date";

export type ReminderStatus = "overdue" | "today" | "upcoming" | "unscheduled";

export type ReminderViewModel = {
  id: string;
  title: string;
  icon: string;
  dateLabel: string;
  timeLabel: string | null;
  assigneeLabel: string;
  status: ReminderStatus;
  statusLabel: string;
  date: string | null;
};

export type HuskListViewModel = {
  id: string;
  title: string;
  icon: string;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  progressLabel: string;
};

const dateFormatter = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long" });
const timeFormatter = new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit" });

export function getReminderStatus(date: string | null, today = getTodayString()): ReminderStatus {
  if (!date) return "unscheduled";
  const dateOnly = date.slice(0, 10);
  if (dateOnly < today) return "overdue";
  if (dateOnly === today) return "today";
  return "upcoming";
}

export function formatReminderDate(date: string | null, today = getTodayString()) {
  if (!date) return "Ingen dato";
  const value = date.slice(0, 10);
  if (value === today) return "I dag";
  if (value === formatDateString(addDays(parseDateString(today), 1))) return "I morgen";
  return dateFormatter.format(parseDateString(value));
}

export function formatReminderTime(dueDate: string | null) {
  if (!dueDate || !/T\d{2}:\d{2}/.test(dueDate)) return null;
  return timeFormatter.format(new Date(dueDate));
}

export function isActiveReminder(reminder: Pick<Reminder, "archivedAt">) {
  return !reminder.archivedAt;
}

export function mapReminderToViewModel(reminder: Reminder, today = getTodayString()): ReminderViewModel {
  const status = getReminderStatus(reminder.date, today);
  const statusLabel = { overdue: "Forfalt", today: "I dag", upcoming: "Kommende", unscheduled: "Uten dato" }[status];
  const assigneeLabel = reminder.scope === "family" || reminder.memberIds.length === 0
    ? "Hele familien"
    : reminder.audienceMembers.length === 1
      ? reminder.audienceMembers[0].familyMember.displayName
      : `${reminder.memberIds.length} personer`;

  return { id: reminder.id, title: reminder.title, icon: reminder.icon, dateLabel: formatReminderDate(reminder.date, today), timeLabel: formatReminderTime(reminder.dueDate), assigneeLabel, status, statusLabel, date: reminder.date };
}

export function sortReminders(reminders: ReminderViewModel[]) {
  return [...reminders].sort((a, b) => {
    const rank = { overdue: 0, today: 1, upcoming: 2, unscheduled: 3 };
    const diff = rank[a.status] - rank[b.status];
    if (diff) return diff;
    return (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31") || a.title.localeCompare(b.title, "nb-NO");
  });
}

export function mapHuskListToViewModel(list: HuskList): HuskListViewModel {
  const totalCount = list.totalCount ?? list.items.length;
  const completedCount = list.completedCount ?? list.items.filter((item) => item.completed).length;
  const progressPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  return { id: list.id, title: list.title, icon: list.icon, completedCount, totalCount, progressPercent, progressLabel: `${completedCount} av ${totalCount} fullført` };
}
