import { localDateInTimeZone } from "./model";
import { osloCalendarDayBounds } from "./occurrence-summary";

export const HEALTH_PLAN_TIME_ZONE = "Europe/Oslo";

/** The delay to the next Oslo calendar boundary, independent of DST length. */
export function millisecondsUntilNextOsloDay(now = new Date()): number {
  return Math.max(1, osloCalendarDayBounds(now).tomorrow.getTime() - now.getTime());
}

export function osloDayChanged(previousDay: string, now = new Date()): boolean {
  return previousDay !== localDateInTimeZone(now, HEALTH_PLAN_TIME_ZONE);
}

export function currentOsloDay(now = new Date()): string {
  return localDateInTimeZone(now, HEALTH_PLAN_TIME_ZONE);
}
