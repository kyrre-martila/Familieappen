import { buildMonthDates, buildWeekDates, formatDateString, formatMonthTitle, getCalendarMonthRangeForTimeZone, getCalendarRange, startOfMondayWeek } from "./date";

function assertEqual<T>(actual: T, expected: T, description: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

assertEqual(formatDateString(new Date(2026, 6, 15)), "2026-07-15", "formats local dates as API date strings");
assertEqual(formatDateString(startOfMondayWeek(new Date(2026, 6, 19))), "2026-07-13", "uses Monday as week start");
assertEqual(buildWeekDates("2026-07-15"), ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"], "builds selected week dates");
assertEqual(formatMonthTitle("2026-07-15"), "Juli 2026", "formats Norwegian month title");
assertEqual(getCalendarRange("2026-07-15"), { from: "2025-01-01T00:00:00.000Z", to: "2027-12-31T23:59:59.999Z" }, "matches web calendar fetch range");
assertEqual(buildMonthDates("2026-02-15").length, 28, "builds dates for the selected month");
assertEqual(getCalendarMonthRangeForTimeZone("2026-07-15").from.slice(0, 10), "2026-06-30", "month range starts at local month midnight in UTC");
