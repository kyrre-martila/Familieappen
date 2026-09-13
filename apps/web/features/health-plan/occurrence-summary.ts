import type { HealthPlanOccurrenceStatus, HealthPlanStatus } from "../../lib/api";

export const HEALTH_PLAN_TIME_ZONE = "Europe/Oslo";

export type HealthPlanSummaryOccurrence = {
  scheduledAt: string;
  status: HealthPlanOccurrenceStatus;
  healthPlan: { status: HealthPlanStatus };
};

export type HealthPlanOccurrenceSummary = {
  total: number;
  remaining: number;
  overdue: number;
  resolved: number;
};

export function isOccurrenceVisibleForCalendarDate(
  item: HealthPlanSummaryOccurrence,
  occurrenceDate: string,
  todayDate: string,
) {
  if (item.status === "SKIPPED" && occurrenceDate > todayDate) return false;
  return item.status === "COMPLETED" || item.status === "SKIPPED" ||
    (item.healthPlan.status === "ACTIVE" && (item.status === "PENDING" || item.status === "SNOOZED"));
}

export function healthPlanOccurrencesForCalendarDate<T extends HealthPlanSummaryOccurrence>(
  items: readonly T[],
  date: string,
  todayDate = osloCalendarDate(new Date()),
) {
  return items.filter(item =>
    osloCalendarDate(item.scheduledAt) === date &&
    isOccurrenceVisibleForCalendarDate(item, date, todayDate),
  );
}

export function healthPlanOccurrenceSummary(
  items: readonly HealthPlanSummaryOccurrence[],
  now = new Date(),
  date = osloCalendarDate(now),
  todayDate = osloCalendarDate(now),
): HealthPlanOccurrenceSummary {
  const visible = items.filter(item => isOccurrenceVisibleForCalendarDate(item, date, todayDate));
  const unresolved = visible.filter(item => item.status === "PENDING" || item.status === "SNOOZED");
  return {
    total: visible.length,
    remaining: unresolved.length,
    overdue: unresolved.filter(item => new Date(item.scheduledAt).getTime() < now.getTime()).length,
    resolved: visible.filter(item => item.status === "COMPLETED" || item.status === "SKIPPED").length,
  };
}

export function hasHealthPlanActivityForCalendarDate(
  items: readonly HealthPlanSummaryOccurrence[],
  date: string,
  todayDate = osloCalendarDate(new Date()),
) {
  return healthPlanOccurrencesForCalendarDate(items, date, todayDate).length > 0;
}

export function healthPlanChipLabel(summary: HealthPlanOccurrenceSummary) {
  if (summary.total === 0) return null;
  if (summary.overdue > 0) return `Helseplan · ${summary.overdue} forsinket`;
  if (summary.remaining > 0) return `Helseplan · ${summary.remaining} gjenstår`;
  return "Helseplan · Alt gjort";
}

export function osloCalendarDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HEALTH_PLAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addCalendarDays(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function osloMidnight(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const targetUtc = Date.UTC(year, month - 1, day);
  let instant = new Date(targetUtc);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: HEALTH_PLAN_TIME_ZONE,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(instant);
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
    const representedUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    instant = new Date(instant.getTime() + targetUtc - representedUtc);
  }
  return instant;
}

/** Half-open UTC interval for one Norwegian calendar date. */
export function osloDayBounds(date: string) {
  return { start: osloMidnight(date), end: osloMidnight(addCalendarDays(date, 1)) };
}

/** Fetch and grouping bounds based on Norwegian calendar dates, never the device zone. */
export function osloCalendarDayBounds(now = new Date()) {
  const date = osloCalendarDate(now);
  return {
    start: osloMidnight(date),
    tomorrow: osloMidnight(addCalendarDays(date, 1)),
    horizon: osloMidnight(addCalendarDays(date, 14)),
  };
}

export function occurrencesForOsloDate<T extends Pick<HealthPlanSummaryOccurrence, "scheduledAt">>(items: readonly T[], date: string) {
  return items.filter(item => osloCalendarDate(item.scheduledAt) === date);
}
