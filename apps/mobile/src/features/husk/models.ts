import type { HuskList, Reminder } from "@familieappen/shared";
import { isHuskListItemCompleted } from "./listItemActions";
import {
  addDays,
  formatDateString,
  getTodayString,
  parseDateString,
} from "../calendar/date";

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
  audienceLabel: string;
};

export type HuskListItemViewModel = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  sortOrder: number;
};

const dateFormatter = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat("nb-NO", {
  hour: "2-digit",
  minute: "2-digit",
});

export function getReminderStatus(
  date: string | null,
  today = getTodayString(),
): ReminderStatus {
  if (!date) return "unscheduled";
  const dateOnly = date.slice(0, 10);
  if (dateOnly < today) return "overdue";
  if (dateOnly === today) return "today";
  return "upcoming";
}

export function formatReminderDate(
  date: string | null,
  today = getTodayString(),
) {
  if (!date) return "Ingen dato";
  const value = date.slice(0, 10);
  if (value === today) return "I dag";
  if (value === formatDateString(addDays(parseDateString(today), 1)))
    return "I morgen";
  return dateFormatter.format(parseDateString(value));
}

export function formatReminderTime(dueDate: string | null) {
  if (!dueDate || !/T\d{2}:\d{2}/.test(dueDate)) return null;
  return timeFormatter.format(new Date(dueDate));
}

export function mapReminderToViewModel(
  reminder: Reminder,
  today = getTodayString(),
): ReminderViewModel {
  const status = getReminderStatus(reminder.date, today);
  const statusLabel = {
    overdue: "Forfalt",
    today: "I dag",
    upcoming: "Kommende",
    unscheduled: "Uten dato",
  }[status];
  const assigneeLabel =
    reminder.scope === "family" || reminder.memberIds.length === 0
      ? "Hele familien"
      : reminder.audienceMembers.length === 1
        ? reminder.audienceMembers[0].familyMember.displayName
        : `${reminder.memberIds.length} personer`;

  return {
    id: reminder.id,
    title: reminder.title,
    icon: reminder.icon,
    dateLabel: formatReminderDate(reminder.date, today),
    timeLabel: formatReminderTime(reminder.dueDate),
    assigneeLabel,
    status,
    statusLabel,
    date: reminder.date,
  };
}

export function sortReminders(reminders: ReminderViewModel[]) {
  return [...reminders].sort((a, b) => {
    const rank = { overdue: 0, today: 1, upcoming: 2, unscheduled: 3 };
    const diff = rank[a.status] - rank[b.status];
    if (diff) return diff;
    return (
      (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31") ||
      a.title.localeCompare(b.title, "nb-NO")
    );
  });
}

export function mapHuskListToViewModel(list: HuskList): HuskListViewModel {
  const totalCount = list.totalCount ?? list.items.length;
  const completedCount =
    list.completedCount ?? list.items.filter(isHuskListItemCompleted).length;
  const progressPercent = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;
  const audienceLabel =
    list.scope === "family" || list.memberIds.length === 0
      ? "Hele familien"
      : list.audienceMembers.length === 1
        ? list.audienceMembers[0].familyMember.displayName
        : `${list.memberIds.length} personer`;
  return {
    id: list.id,
    title: list.title,
    icon: list.icon,
    completedCount,
    totalCount,
    progressPercent,
    progressLabel: `${completedCount} av ${totalCount} fullført`,
    audienceLabel,
  };
}

export function sortHuskLists(lists: HuskList[]) {
  return [...lists]
    .filter((list) => !list.archived)
    .sort((a, b) => a.title.localeCompare(b.title, "nb-NO"));
}

export function mapHuskListItems(list: HuskList): HuskListItemViewModel[] {
  return list.items
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      completed: isHuskListItemCompleted(item),
      sortOrder: item.sortOrder,
    }))
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "nb-NO"),
    );
}

export function groupHuskListItems(list: HuskList) {
  const items = mapHuskListItems(list);
  return {
    active: items.filter((item) => !item.completed),
    completed: items.filter((item) => item.completed),
  };
}

export function huskListCardAccessibilityLabel(list: HuskListViewModel) {
  return `${list.title}. ${list.progressLabel} elementer.`;
}

export type SchoolWeekReminderViewModel = {
  id: string;
  title: string;
  icon: string;
  childLabel: string;
  dayLabel: string;
  note: string | null;
};

const schoolWeekdayLabels: Record<string, string> = {
  monday: "Mandag",
  tuesday: "Tirsdag",
  wednesday: "Onsdag",
  thursday: "Torsdag",
  friday: "Fredag",
};

export function mapSchoolWeekReminderToViewModel(
  reminder: import("@familieappen/shared").SchoolWeekReminder,
  childNameById: Record<string, string> = {},
): SchoolWeekReminderViewModel {
  return {
    id: reminder.id,
    title: reminder.title,
    icon: reminder.icon,
    childLabel: childNameById[reminder.childFamilyMemberId ?? ""] ?? "Barn",
    dayLabel: schoolWeekdayLabels[reminder.weekday ?? ""] ?? "Skoleuka",
    note: reminder.note ?? null,
  };
}

export function sortSchoolWeekReminders(reminders: SchoolWeekReminderViewModel[]) {
  const rank: Record<string, number> = { Mandag: 0, Tirsdag: 1, Onsdag: 2, Torsdag: 3, Fredag: 4 };
  return [...reminders].sort((a, b) => (rank[a.dayLabel] ?? 99) - (rank[b.dayLabel] ?? 99) || a.childLabel.localeCompare(b.childLabel, "nb-NO") || a.title.localeCompare(b.title, "nb-NO"));
}
