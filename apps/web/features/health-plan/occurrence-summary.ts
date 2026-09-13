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

export function isOccurrenceVisible(item: HealthPlanSummaryOccurrence) {
  return item.status === "COMPLETED" || item.status === "SKIPPED" ||
    (item.healthPlan.status === "ACTIVE" && (item.status === "PENDING" || item.status === "SNOOZED"));
}

export function healthPlanOccurrenceSummary(
  items: readonly HealthPlanSummaryOccurrence[],
  now = new Date(),
): HealthPlanOccurrenceSummary {
  const visible = items.filter(isOccurrenceVisible);
  const unresolved = visible.filter(item => item.status === "PENDING" || item.status === "SNOOZED");
  return {
    total: visible.length,
    remaining: unresolved.length,
    overdue: unresolved.filter(item => new Date(item.scheduledAt).getTime() < now.getTime()).length,
    resolved: visible.filter(item => item.status === "COMPLETED" || item.status === "SKIPPED").length,
  };
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

export function occurrencesForOsloDate<T extends Pick<HealthPlanSummaryOccurrence, "scheduledAt">>(items: readonly T[], date: string) {
  return items.filter(item => osloCalendarDate(item.scheduledAt) === date);
}
