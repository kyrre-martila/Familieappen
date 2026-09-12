import assert from "node:assert/strict";
import test from "node:test";
import { canEditHealthPlan, emptyHealthPlanOverviewState, FamilyRequestGuard } from "./request-context";

test("a late detail response from the previous family cannot replace the current plan", async () => {
  const guard = new FamilyRequestGuard(); let shown = "";
  guard.changeContext("family-a:plan-x"); const requestA = guard.begin();
  guard.changeContext("family-b:plan-x"); const requestB = guard.begin();
  await Promise.resolve(); if (guard.isCurrent(requestB)) shown = "family-b";
  await Promise.resolve(); if (guard.isCurrent(requestA)) shown = "family-a";
  assert.equal(shown, "family-b");
});

test("family change clears overview data and filters and rejects stale overview completion", () => {
  const guard = new FamilyRequestGuard(); guard.changeContext("family-a"); const requestA = guard.begin();
  const oldState = { members: [{ id: "member-a" }], plans: [{ id: "plan-a" }], items: [{ id: "item-a" }], memberId: "member-a", planId: "plan-a", upcomingCount: 15 };
  guard.changeContext("family-b"); const state = { ...oldState, ...emptyHealthPlanOverviewState() };
  assert.deepEqual(state, { members: [], plans: [], items: [], memberId: "", planId: "", upcomingCount: 5 });
  assert.equal(guard.isCurrent(requestA), false);
});

test("an action response cannot commit after its family context changes", () => {
  const guard = new FamilyRequestGuard(); guard.changeContext("family-a:plan-x"); const command = guard.begin();
  guard.changeContext("family-b:plan-x");
  assert.equal(guard.isCurrent(command), false);
});

test("only non-terminal plans expose supported definition edits", () => {
  for (const status of ["DRAFT", "ACTIVE", "PAUSED"] as const) assert.equal(canEditHealthPlan(status), true);
  for (const status of ["COMPLETED", "ARCHIVED"] as const) assert.equal(canEditHealthPlan(status), false);
});
