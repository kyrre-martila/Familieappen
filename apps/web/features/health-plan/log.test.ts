import assert from "node:assert/strict";
import test from "node:test";
import { formatHealthPlanHistoryEntry, healthPlanTimeline } from "./log";
const entry = (type: Parameters<typeof formatHealthPlanHistoryEntry>[0]["type"], metadata: Record<string, unknown> | null = null) => ({ type, metadata });
test("formats known health plan history defensively", () => {
  assert.equal(formatHealthPlanHistoryEntry(entry("CREATED")), "Planen ble opprettet");
  assert.equal(formatHealthPlanHistoryEntry(entry("STATUS_CHANGED", { fromStatus: "DRAFT", toStatus: "ACTIVE" })), "Planen ble startet");
  assert.equal(formatHealthPlanHistoryEntry(entry("PAUSED")), "Planen ble pauset");
  assert.equal(formatHealthPlanHistoryEntry(entry("RESUMED")), "Planen ble fortsatt");
  assert.equal(formatHealthPlanHistoryEntry(entry("LEVEL_INCREASED", { toLevelIndex: 2 })), "Trappet opp til Trinn 2");
  assert.equal(formatHealthPlanHistoryEntry(entry("LEVEL_DECREASED", { toLevelIndex: 0 })), "Trappet ned til Basisplan");
  assert.equal(formatHealthPlanHistoryEntry(entry("STEP_ADVANCED", { toStepId: "s2" }), new Map([["s2", 1]])), "Gikk automatisk videre til Del 2");
  assert.equal(formatHealthPlanHistoryEntry(entry("STEP_ADVANCED")), "Gikk automatisk videre til neste del");
  assert.equal(formatHealthPlanHistoryEntry(entry("STATUS_CHANGED", { fromStatus: "ACTIVE", toStatus: "COMPLETED" })), "Planen ble avsluttet");
  assert.equal(formatHealthPlanHistoryEntry(entry("STATUS_CHANGED", { toStatus: "ARCHIVED" })), "Planen ble arkivert");
  assert.equal(formatHealthPlanHistoryEntry(entry("DEFINITION_UPDATED")), "Planen ble redigert");
  assert.equal(formatHealthPlanHistoryEntry(entry("LEVEL_INCREASED", {})), "Planen ble oppdatert");
});
test("combines notes and history newest first", () => {
  const timeline = healthPlanTimeline({ history: [{ id: "h", healthPlanId: "p", type: "CREATED", actorDisplayName: "Kyrre", metadata: null, occurredAt: "2026-09-12T10:00:00Z" }], notes: [{ id: "n", healthPlanId: "p", occurrenceId: "o", sourceActionId: null, authorDisplayName: "Elisabeth", text: "Fortsatt tørr.", createdAt: "2026-09-12T10:15:00Z", targetContext: { kind: "OCCURRENCE", actionTitle: "Smør krem", scheduledAt: "2026-09-12T10:00:00Z", levelIndex: 1, stepOrder: 1 } }] });
  assert.deepEqual(timeline.map(item => item.id), ["note:n", "history:h"]);
  assert.equal(timeline[0].title, "Kommentar til «Smør krem»");
});
