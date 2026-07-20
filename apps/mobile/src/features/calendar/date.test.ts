import { addMonthsClamped, buildMonthDates, buildMonthWeeks, buildWeekDates, formatDateString, formatMonthTitle, getCalendarMonthRangeForTimeZone, getCalendarRange, getIsoWeekNumber, startOfMondayWeek, weekDayLabels } from "./date";

function assertEqual<T>(actual: T, expected: T, description: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

assertEqual(formatDateString(new Date(2026, 6, 15)), "2026-07-15", "formats local dates as API date strings");
assertEqual(startOfMondayWeek(new Date(2026, 6, 19)).getDay(), 1, "uses Monday as week start");
assertEqual(formatDateString(startOfMondayWeek(new Date(2026, 6, 19))), "2026-07-13", "returns the Monday at week start");
assertEqual(buildWeekDates("2026-07-15"), ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"], "builds selected week dates");
assertEqual(formatMonthTitle("2026-07-15"), "Juli 2026", "formats Norwegian month title");
assertEqual(getCalendarRange("2026-07-15"), { from: "2025-01-01T00:00:00.000Z", to: "2027-12-31T23:59:59.999Z" }, "matches web calendar fetch range");
assertEqual(buildMonthDates("2026-02-15").length, 28, "builds dates for the selected month");
assertEqual(getCalendarMonthRangeForTimeZone("2026-07-15").from.slice(0, 10), "2026-06-30", "month range starts at local month midnight in UTC");
assertEqual(weekDayLabels, ["MAN", "TIR", "ONS", "TOR", "FRE", "LØR", "SØN"], "month weekday headings start on Monday");
assertEqual(buildMonthWeeks("2026-08-15").length, 6, "month grid always renders six weeks");
assertEqual(buildMonthWeeks("2026-08-15")[0].days, ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"], "dates align under Monday-first weekdays when month starts mid-week");
assertEqual(getIsoWeekNumber(new Date(2026, 11, 28)), 53, "ISO week number handles late December before week one");
assertEqual(getIsoWeekNumber(new Date(2026, 11, 31)), 53, "ISO week number handles year end");
assertEqual(getIsoWeekNumber(new Date(2027, 0, 4)), 1, "ISO week number handles first Monday of ISO year");
assertEqual(addMonthsClamped("2026-01-31", 1), "2026-02-28", "month navigation clamps 31 January to February end");
assertEqual(addMonthsClamped("2026-12-15", 1), "2027-01-15", "month navigation moves forward over year boundary");
assertEqual(addMonthsClamped("2026-01-15", -1), "2025-12-15", "month navigation moves backward over year boundary");
