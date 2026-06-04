const selectedDateFormatter = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric",
});
const listDateFormatter = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "long",
  weekday: "long",
});
const monthDayLabelFormatter = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "long",
});

export const dayFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "short" });
export const monthTitleFormatter = new Intl.DateTimeFormat("nb-NO", {
  month: "long",
  year: "numeric",
});
export const weekDayLabels = ["MAN", "TIR", "ONS", "TOR", "FRE", "LØR", "SØN"];

export function parseDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + amount);

  return nextDate;
}

export function startOfMondayWeek(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  return addDays(date, mondayOffset);
}

export function getIsoWeekNumber(date: Date) {
  const weekDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNumber = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));

  return Math.ceil(
    ((weekDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

export function buildMonthWeeks(monthDate: Date) {
  const firstOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const startDate = startOfMondayWeek(firstOfMonth);

  return Array.from({ length: 6 }, (_, weekIndex) => {
    const weekStart = addDays(startDate, weekIndex * 7);

    return {
      weekNumber: getIsoWeekNumber(weekStart),
      days: Array.from({ length: 7 }, (_, dayIndex) =>
        addDays(weekStart, dayIndex),
      ),
    };
  });
}

export function buildDateStrip(startDate: string, length = 14) {
  const [year, month, day] = startDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);

  return Array.from({ length }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatDateString(date);
  });
}

export function capitalizeDateLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatSelectedDate(date: string) {
  return capitalizeDateLabel(
    selectedDateFormatter.format(parseDateString(date)),
  );
}

export function formatListDate(date: string) {
  return capitalizeDateLabel(listDateFormatter.format(parseDateString(date)));
}

export function formatMonthDayLabel(date: string) {
  return monthDayLabelFormatter.format(parseDateString(date));
}
