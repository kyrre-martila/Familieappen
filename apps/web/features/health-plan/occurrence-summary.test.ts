import assert from "node:assert/strict";
import test from "node:test";

import type { HealthPlanOccurrence } from "../../lib/api";
import { buildListDayGroups } from "../calendar/components/calendarFilters";
import { defaultListFilters } from "../calendar/components/calendarConfig";
import { calendarDayContentAriaLabel, calendarListContentAriaLabel } from "../calendar/components/calendarContentLabels";
import {
  hasHealthPlanActivityForCalendarDate,
  healthPlanChipLabel,
  healthPlanOccurrenceSummary,
  healthPlanOccurrencesForCalendarDate,
  occurrencesForOsloDate,
  osloCalendarDate,
  osloDayBounds,
} from "./occurrence-summary";

const NOW = new Date("2026-09-13T10:00:00Z");
const TODAY = "2026-09-13";

function occurrence(
  status: "PENDING" | "SNOOZED" | "COMPLETED" | "SKIPPED",
  scheduledAt = "2026-09-13T12:00:00Z",
  planStatus: "ACTIVE" | "PAUSED" = "ACTIVE",
) {
  return {
    id: `${status}-${scheduledAt}`,
    healthPlanId: "plan-1",
    scheduledAt,
    originalScheduledAt: scheduledAt,
    actionTitle: "Ta Ritalin 20 mg",
    actionInstruction: "Ta én tablett",
    status,
    completedAt: null,
    occurrenceLevel: null,
    occurrenceStep: null,
    healthPlan: { id: "plan-1", subjectDisplayName: "Alma", name: "ADHD-medisin", status: planStatus, familyMember: { id: "member-1", displayName: "Alma" } },
  } satisfies HealthPlanOccurrence;
}

function summary(items: HealthPlanOccurrence[], date = TODAY) {
  return healthPlanOccurrenceSummary(items, NOW, date, TODAY);
}

test("future SKIPPED policy preserves history and today but hides tomorrow", () => {
  assert.equal(summary([occurrence("SKIPPED", "2026-09-12T08:00:00Z")], "2026-09-12").resolved, 1);
  assert.equal(summary([occurrence("SKIPPED")]).resolved, 1);
  assert.deepEqual(summary([occurrence("SKIPPED", "2026-09-14T08:00:00Z")], "2026-09-14"), { total: 0, remaining: 0, overdue: 0, resolved: 0 });
});

test("future mixed summaries count PENDING and COMPLETED but not SKIPPED", () => {
  const skipped = occurrence("SKIPPED", "2026-09-14T08:00:00Z");
  assert.deepEqual(summary([skipped, occurrence("PENDING", "2026-09-14T12:00:00Z")], "2026-09-14"), { total: 1, remaining: 1, overdue: 0, resolved: 0 });
  assert.deepEqual(summary([skipped, occurrence("COMPLETED", "2026-09-14T12:00:00Z")], "2026-09-14"), { total: 1, remaining: 0, overdue: 0, resolved: 1 });
});

test("today labels cover resolved, remaining, overdue, and empty states", () => {
  assert.equal(healthPlanChipLabel(summary([occurrence("SKIPPED"), occurrence("COMPLETED")])), "Helseplan · Alt gjort");
  assert.equal(healthPlanChipLabel(summary([occurrence("PENDING")])), "Helseplan · 1 gjenstår");
  assert.equal(healthPlanChipLabel(summary([occurrence("PENDING", "2026-09-13T08:00:00Z")])), "Helseplan · 1 forsinket");
  assert.equal(healthPlanChipLabel(summary([])), null);
});

test("unresolved occurrences require an ACTIVE plan", () => {
  assert.equal(summary([occurrence("PENDING", undefined, "PAUSED")]).total, 0);
  assert.equal(summary([occurrence("SNOOZED", undefined, "PAUSED")]).total, 0);
});

test("labels remain privacy-safe", () => {
  const label = healthPlanChipLabel(summary([occurrence("PENDING")])) ?? "";
  for (const secret of ["ADHD-medisin", "Alma", "Ta Ritalin 20 mg", "Ta én tablett"]) assert.equal(label.includes(secret), false);
});

test("list groups use presentation-visible health occurrences", () => {
  const skipped = occurrence("SKIPPED", "2026-09-14T08:00:00Z");
  assert.deepEqual(buildListDayGroups(defaultListFilters, [], [], [], [], [skipped], TODAY), []);

  const withMeal = buildListDayGroups(defaultListFilters, [], [], [{ date: "2026-09-14", meal: "Taco" } as never], [], [skipped], TODAY);
  assert.equal(withMeal.length, 1);
  assert.deepEqual(withMeal[0].healthPlanOccurrences, []);

  const withPending = buildListDayGroups(defaultListFilters, [], [], [], [], [occurrence("PENDING", "2026-09-14T12:00:00Z")], TODAY);
  assert.equal(withPending.length, 1);
  assert.equal(withPending[0].healthPlanOccurrences.length, 1);
});

test("month activity marker follows the same visibility policy", () => {
  assert.equal(hasHealthPlanActivityForCalendarDate([occurrence("SKIPPED", "2026-09-14T08:00:00Z")], "2026-09-14", TODAY), false);
  assert.equal(hasHealthPlanActivityForCalendarDate([occurrence("PENDING", "2026-09-14T08:00:00Z")], "2026-09-14", TODAY), true);
  assert.equal(hasHealthPlanActivityForCalendarDate([occurrence("SKIPPED", "2026-09-12T08:00:00Z")], "2026-09-12", TODAY), true);
});

test("calendar chip groups expose durable Norwegian accessibility labels", () => {
  assert.equal(calendarDayContentAriaLabel, "Dagens innhold");
  assert.equal(calendarListContentAriaLabel("mandag 14. september"), "Dagsinnhold for mandag 14. september");
});

test("Europe/Oslo date, classification, and bounds handle UTC boundaries and DST", () => {
  const osloNextDay = occurrence("SKIPPED", "2026-09-13T22:30:00Z");
  assert.equal(osloCalendarDate(osloNextDay.scheduledAt), "2026-09-14");
  assert.equal(healthPlanOccurrencesForCalendarDate([osloNextDay], "2026-09-14", TODAY).length, 0);
  assert.equal(occurrencesForOsloDate([occurrence("PENDING", "2026-01-14T23:30:00Z")], "2026-01-15").length, 1);
  assert.equal(occurrencesForOsloDate([occurrence("PENDING", "2026-07-14T22:30:00Z")], "2026-07-15").length, 1);
  assert.deepEqual([osloDayBounds("2026-01-15").start.toISOString(), osloDayBounds("2026-01-15").end.toISOString()], ["2026-01-14T23:00:00.000Z", "2026-01-15T23:00:00.000Z"]);
  assert.deepEqual([osloDayBounds("2026-07-15").start.toISOString(), osloDayBounds("2026-07-15").end.toISOString()], ["2026-07-14T22:00:00.000Z", "2026-07-15T22:00:00.000Z"]);
});
