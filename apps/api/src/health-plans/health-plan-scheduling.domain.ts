import { DEFAULT_HEALTH_PLAN_TIMEZONE } from "./health-plan.domain";

export type LocalDate = { year: number; month: number; day: number };
export type Recurrence =
  | { recurrenceType: "DAILY" }
  | { recurrenceType: "WEEKDAYS"; weekdays: number[] }
  | { recurrenceType: "INTERVAL_DAYS"; intervalDays: number; anchorDate: Date };

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const formatter = (timeZone: string) => {
  let value = formatterCache.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    formatterCache.set(timeZone, value);
  }
  return value;
};

export function localParts(instant: Date, timeZone = DEFAULT_HEALTH_PLAN_TIMEZONE) {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(instant).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

const tuple = (p: ReturnType<typeof localParts>) => Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
const dateNumber = (date: LocalDate) => Date.UTC(date.year, date.month - 1, date.day);
export const addLocalDays = (date: LocalDate, days: number): LocalDate => {
  const result = new Date(dateNumber(date) + days * 86_400_000);
  return { year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() };
};

/** Resolve wall time without a date library. Overlaps choose the earliest matching
 * instant; gaps move forward by the gap (the first representable wall-clock result). */
export function localDateTimeToInstant(date: LocalDate, localTime: Date, timeZone: string): Date {
  // PostgreSQL TIME arrives as a Date whose UTC fields are the intended clock fields.
  const target = Date.UTC(date.year, date.month - 1, date.day, localTime.getUTCHours(), localTime.getUTCMinutes(), localTime.getUTCSeconds());
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = new Date(target + hours * 3_600_000);
    offsets.add(tuple(localParts(sample, timeZone)) - sample.getTime());
  }
  const candidates = [...offsets].map((offset) => new Date(target - offset)).sort((a, b) => a.getTime() - b.getTime());
  const exact = candidates.find((candidate) => tuple(localParts(candidate, timeZone)) === target);
  if (exact) return exact; // deterministic first instant in an overlap
  const afterGap = candidates.filter((candidate) => tuple(localParts(candidate, timeZone)) > target).sort((a, b) => tuple(localParts(a, timeZone)) - tuple(localParts(b, timeZone)) || a.getTime() - b.getTime())[0];
  if (!afterGap) throw new Error(`Could not resolve local time in ${timeZone}`);
  return afterGap;
}

export function recurrenceMatches(date: LocalDate, recurrence: Recurrence): boolean {
  if (recurrence.recurrenceType === "DAILY") return true;
  if (recurrence.recurrenceType === "WEEKDAYS") {
    const weekday = new Date(dateNumber(date)).getUTCDay() || 7;
    return recurrence.weekdays.includes(weekday);
  }
  const anchor = { year: recurrence.anchorDate.getUTCFullYear(), month: recurrence.anchorDate.getUTCMonth() + 1, day: recurrence.anchorDate.getUTCDate() };
  const distance = Math.floor((dateNumber(date) - dateNumber(anchor)) / 86_400_000);
  return distance >= 0 && distance % recurrence.intervalDays === 0;
}

export function calendarExpiry(start: Date, durationDays: number, timeZone = DEFAULT_HEALTH_PLAN_TIMEZONE): Date {
  const p = localParts(start, timeZone);
  const date = addLocalDays(p, durationDays);
  return localDateTimeToInstant(date, new Date(Date.UTC(1970, 0, 1, p.hour, p.minute, p.second)), timeZone);
}
