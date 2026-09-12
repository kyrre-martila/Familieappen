import assert from "node:assert/strict";
import test from "node:test";
import { mutationThenRefresh } from "./mutation-refresh";

test("successful append is committed once before a failed refresh", async () => {
  let posts = 0; let dialogOpen = true; let refreshes = 0;
  const outcome = await mutationThenRefresh({
    mutation: async () => { posts += 1; }, isCurrent: () => true,
    commitMutation: () => { dialogOpen = false; },
    refresh: async () => { refreshes += 1; throw new Error("GET failed"); },
    commitRefresh: () => assert.fail("failed refresh cannot commit"),
  });
  assert.equal(outcome, "refresh-failed"); assert.equal(posts, 1); assert.equal(refreshes, 1); assert.equal(dialogOpen, false);
});

test("successful occurrence comment is not reported as a write failure when overview refresh fails", async () => {
  let comments = 0; let committed = false;
  const outcome = await mutationThenRefresh({
    mutation: async () => { comments += 1; }, isCurrent: () => true,
    commitMutation: () => { committed = true; },
    refresh: async () => { throw new Error("overview unavailable"); }, commitRefresh: () => undefined,
  });
  assert.equal(outcome, "refresh-failed"); assert.equal(comments, 1); assert.equal(committed, true);
});

test("failed mutation leaves dialog open and does not refresh", async () => {
  let dialogOpen = true; let refreshes = 0;
  await assert.rejects(() => mutationThenRefresh({
    mutation: async () => { throw new Error("POST failed"); }, isCurrent: () => true,
    commitMutation: () => { dialogOpen = false; }, refresh: async () => { refreshes += 1; }, commitRefresh: () => undefined,
  }), /POST failed/);
  assert.equal(dialogOpen, true); assert.equal(refreshes, 0);
});

test("successful lifecycle and edit results survive refresh failure", async () => {
  for (const kind of ["lifecycle", "edit"] as const) {
    let plan = "old"; let dialogOpen = true;
    const outcome = await mutationThenRefresh({
      mutation: async () => `${kind}-plan`, isCurrent: () => true,
      commitMutation: value => { plan = value; dialogOpen = false; },
      refresh: async () => { throw new Error("GET failed"); }, commitRefresh: () => undefined,
    });
    assert.equal(outcome, "refresh-failed"); assert.equal(plan, `${kind}-plan`); assert.equal(dialogOpen, false);
  }
});

test("stale refresh failures do not become warnings", async () => {
  let current = true;
  const outcome = await mutationThenRefresh({
    mutation: async () => "saved", isCurrent: () => current,
    commitMutation: () => { current = false; }, refresh: async () => { throw new Error("aborted"); }, commitRefresh: () => undefined,
  });
  assert.equal(outcome, "stale");
});
