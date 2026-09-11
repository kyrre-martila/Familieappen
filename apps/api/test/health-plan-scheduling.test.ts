import assert from "node:assert/strict";
import { addLocalDays, calendarExpiry, localDateTimeToInstant, localParts, recurrenceMatches } from "../src/health-plans/health-plan-scheduling.domain";

const time = (value: string) => new Date(`1970-01-01T${value}Z`);

// DAILY is calculated from each local calendar date, not previous UTC + 24h.
const osloBefore = localDateTimeToInstant({ year: 2026, month: 3, day: 28 }, time("08:00:00"), "Europe/Oslo");
const osloAfter = localDateTimeToInstant({ year: 2026, month: 3, day: 29 }, time("08:00:00"), "Europe/Oslo");
assert.equal(osloBefore.toISOString(), "2026-03-28T07:00:00.000Z");
assert.equal(osloAfter.toISOString(), "2026-03-29T06:00:00.000Z");
assert.equal(osloAfter.getTime() - osloBefore.getTime(), 23 * 3_600_000);

// Spring gap moves 02:30 forward by the one-hour gap, to 03:30 local.
const gap = localDateTimeToInstant({ year: 2026, month: 3, day: 29 }, time("02:30:00"), "Europe/Oslo");
assert.equal(gap.toISOString(), "2026-03-29T01:30:00.000Z");
assert.deepEqual(localParts(gap, "Europe/Oslo"), { year: 2026, month: 3, day: 29, hour: 3, minute: 30, second: 0 });

// Autumn overlap consistently selects the earlier of the two instants.
assert.equal(localDateTimeToInstant({ year: 2026, month: 10, day: 25 }, time("02:30:00"), "Europe/Oslo").toISOString(), "2026-10-25T00:30:00.000Z");

// General IANA support and local weekday semantics around UTC midnight.
assert.equal(localDateTimeToInstant({ year: 2026, month: 9, day: 7 }, time("00:30:00"), "Pacific/Auckland").toISOString(), "2026-09-06T12:30:00.000Z");
assert.equal(recurrenceMatches({ year: 2026, month: 9, day: 7 }, { recurrenceType: "WEEKDAYS", weekdays: [1, 3, 5] }), true);
assert.equal(recurrenceMatches({ year: 2026, month: 9, day: 8 }, { recurrenceType: "WEEKDAYS", weekdays: [1, 3, 5] }), false);

const anchor = new Date("2026-09-01T00:00:00.000Z");
for (const day of [1, 3, 5]) assert.equal(recurrenceMatches({ year: 2026, month: 9, day }, { recurrenceType: "INTERVAL_DAYS", intervalDays: 2, anchorDate: anchor }), true);
assert.equal(recurrenceMatches({ year: 2026, month: 10, day: 1 }, { recurrenceType: "INTERVAL_DAYS", intervalDays: 3, anchorDate: anchor }), true); // month boundary, distance 30
assert.equal(recurrenceMatches({ year: 2027, month: 1, day: 2 }, { recurrenceType: "INTERVAL_DAYS", intervalDays: 3, anchorDate: anchor }), true); // year boundary, distance 123
assert.equal(recurrenceMatches({ year: 2026, month: 8, day: 30 }, { recurrenceType: "INTERVAL_DAYS", intervalDays: 2, anchorDate: anchor }), false);
assert.deepEqual(addLocalDays({ year: 2026, month: 12, day: 31 }, 1), { year: 2027, month: 1, day: 1 });

// Step duration preserves the logical Oslo wall-clock across DST.
assert.equal(calendarExpiry(new Date("2026-03-28T07:00:00Z"), 1, "Europe/Oslo").toISOString(), "2026-03-29T06:00:00.000Z");

console.log("health-plan scheduling domain tests passed");
