import assert from "node:assert/strict";
import test from "node:test";
import { OperationEpoch, parseAuthSyncEvent, parseAuthSyncMessage, ResumeGate } from "./auth-coordination";

test("a stale or aborted operation cannot overwrite newer auth state", () => {
  const epoch = new OperationEpoch();
  const oldRequest = epoch.begin();
  const newRequest = epoch.begin();
  assert.equal(epoch.isCurrent(oldRequest), false);
  assert.equal(epoch.isCurrent(newRequest), true);
  epoch.invalidate();
  assert.equal(epoch.isCurrent(newRequest), false);
});

test("pageshow, focus and visibility resume bursts produce one validation", () => {
  const gate = new ResumeGate(5_000);
  assert.equal(gate.shouldRun(10_000), true);
  assert.equal(gate.shouldRun(10_001), false);
  assert.equal(gate.shouldRun(15_000), true);
});

test("cross-tab messages accept logout without transporting token data", () => {
  assert.equal(parseAuthSyncEvent({ event: "logout" }), "logout");
  assert.equal(parseAuthSyncEvent({ event: "login", token: "must-be-ignored" }), "login");
  assert.equal(parseAuthSyncEvent({ event: "access-token" }), null);
});

test("cross-tab messages require an id so dual transports can be deduplicated", () => {
  assert.deepEqual(parseAuthSyncMessage({ event: "logout", id: "event-1" }), { event: "logout", id: "event-1" });
  assert.equal(parseAuthSyncMessage({ event: "logout" }), null);
  assert.equal(parseAuthSyncMessage({ event: "logout", id: "event-1", token: "not-forwarded" })?.event, "logout");
});
