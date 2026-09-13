import assert from "node:assert/strict";
import test from "node:test";
import { currentOsloDay, millisecondsUntilNextOsloDay, osloDayChanged } from "./rollover";

test("next Oslo midnight uses calendar boundaries across DST", () => {
  assert.equal(millisecondsUntilNextOsloDay(new Date("2026-03-28T23:00:00Z")), 23 * 60 * 60_000);
  assert.equal(millisecondsUntilNextOsloDay(new Date("2026-10-24T22:00:00Z")), 25 * 60 * 60_000);
});

test("resume detects an Oslo date change", () => {
  const before = currentOsloDay(new Date("2026-09-13T21:59:59Z"));
  assert.equal(osloDayChanged(before, new Date("2026-09-13T22:00:00Z")), true);
  assert.equal(osloDayChanged(before, new Date("2026-09-13T21:59:59Z")), false);
});
