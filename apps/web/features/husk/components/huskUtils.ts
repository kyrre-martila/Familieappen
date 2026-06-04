import type { HuskPersonFilter } from "../types";

const oneDayInMs = 24 * 60 * 60 * 1000;

export function getIsoWeekStart(date: Date) {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  return utcDate;
}

export function getIsoWeekNumber(date: Date) {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / oneDayInMs + 1) / 7,
  );
}

export function formatSchoolDate(date: Date) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatWeekRange(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 4);
  const formatter = new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${formatter.format(weekStart)}–${formatter.format(weekEnd)}`;
}

export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("nb-NO");
}

export function matchesPersonFilter(
  memberIds: string[],
  scopeText: string,
  person: HuskPersonFilter,
) {
  if (person === "all") {
    return true;
  }

  if (person === "family") {
    return scopeText === "Hele familien";
  }

  return memberIds.includes(person);
}
