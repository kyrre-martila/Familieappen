import assert from "node:assert/strict";
import test from "node:test";

import { healthPlanChipLabel, healthPlanOccurrenceSummary, occurrencesForOsloDate, osloDayBounds } from "./occurrence-summary";

const occurrence = (status: "PENDING" | "SNOOZED" | "COMPLETED" | "SKIPPED", scheduledAt = "2026-09-13T08:00:00Z", planStatus: "ACTIVE" | "PAUSED" = "ACTIVE") => ({
  status, scheduledAt, healthPlan: { status: planStatus },
  plan: { name: "ADHD-medisin" }, member: "Alma", actionTitle: "Ta Ritalin 20 mg", actionInstruction: "Ta én tablett",
});

test("empty occurrences produce no chip", () => assert.equal(healthPlanChipLabel(healthPlanOccurrenceSummary([])), null));
test("pending occurrences are remaining", () => {
  assert.deepEqual(healthPlanOccurrenceSummary([occurrence("PENDING")], new Date("2026-09-13T07:00:00Z")), { total: 1, remaining: 1, overdue: 0, resolved: 0 });
  assert.equal(healthPlanOccurrenceSummary([occurrence("PENDING"), occurrence("PENDING")]).remaining, 2);
});
test("snoozed is remaining and overdue pending or snoozed is overdue", () => {
  assert.equal(healthPlanOccurrenceSummary([occurrence("SNOOZED")]).remaining, 1);
  assert.equal(healthPlanOccurrenceSummary([occurrence("PENDING")], new Date("2026-09-13T09:00:00Z")).overdue, 1);
});
test("completed and skipped are resolved", () => {
  assert.deepEqual(healthPlanOccurrenceSummary([occurrence("COMPLETED"), occurrence("SKIPPED")]), { total: 2, remaining: 0, overdue: 0, resolved: 2 });
  assert.equal(healthPlanOccurrenceSummary([occurrence("COMPLETED"), occurrence("PENDING")]).remaining, 1);
});
test("future unresolved rows for non-active plans are hidden", () => assert.equal(healthPlanOccurrenceSummary([occurrence("PENDING", undefined, "PAUSED")]).total, 0));
test("labels are privacy-safe even when input carries health content", () => {
  const label = healthPlanChipLabel(healthPlanOccurrenceSummary([occurrence("PENDING")])) ?? "";
  for (const secret of ["ADHD-medisin", "Alma", "Ta Ritalin 20 mg", "Ta én tablett"]) assert.equal(label.includes(secret), false);
});
test("Europe/Oslo day placement and bounds handle winter and summer offsets", () => {
  assert.equal(occurrencesForOsloDate([occurrence("PENDING", "2026-01-14T23:30:00Z")], "2026-01-15").length, 1);
  assert.equal(occurrencesForOsloDate([occurrence("PENDING", "2026-07-14T22:30:00Z")], "2026-07-15").length, 1);
  assert.deepEqual([osloDayBounds("2026-01-15").start.toISOString(), osloDayBounds("2026-01-15").end.toISOString()], ["2026-01-14T23:00:00.000Z", "2026-01-15T23:00:00.000Z"]);
  assert.deepEqual([osloDayBounds("2026-07-15").start.toISOString(), osloDayBounds("2026-07-15").end.toISOString()], ["2026-07-14T22:00:00.000Z", "2026-07-15T22:00:00.000Z"]);
});
