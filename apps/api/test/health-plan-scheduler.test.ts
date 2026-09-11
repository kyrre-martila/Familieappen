import assert from "node:assert/strict";
import { HealthPlanSchedulerService } from "../src/health-plans/health-plan-scheduler.service";

const localTime = (value: string) => new Date(`1970-01-01T${value}:00Z`);
const now = new Date("2026-09-10T10:00:00Z");
const stored = new Map<string, any>();
const step = {
  id: "step-1", levelId: "level-1", stepOrder: 0, autoAdvance: false, durationDays: null,
  schedules: [
    { id: "daily", recurrenceType: "DAILY", localTime: localTime("12:00"), timezone: "Europe/Oslo", weekdays: [], intervalDays: null, anchorDate: null, effectiveFrom: new Date("2026-01-01Z"), retiredAt: null,
      actions: [
        { id: "action-a", title: "A", instruction: "A instruction", effectiveFrom: new Date("2026-01-01Z"), retiredAt: null },
        { id: "action-b", title: "B", instruction: null, effectiveFrom: new Date("2026-01-01Z"), retiredAt: null },
        { id: "retired", title: "old", instruction: null, effectiveFrom: new Date("2026-01-01Z"), retiredAt: new Date("2026-09-01Z") }
      ] },
    { id: "mwf", recurrenceType: "WEEKDAYS", localTime: localTime("18:00"), timezone: "Europe/Oslo", weekdays: [1, 3, 5], intervalDays: null, anchorDate: null, effectiveFrom: new Date("2026-01-01Z"), retiredAt: null,
      actions: [{ id: "action-c", title: "C", instruction: null, effectiveFrom: new Date("2026-09-11T00:00:00Z"), retiredAt: null }] },
    { id: "retired-schedule", recurrenceType: "DAILY", localTime: localTime("09:00"), timezone: "Europe/Oslo", weekdays: [], intervalDays: null, anchorDate: null, effectiveFrom: new Date("2026-01-01Z"), retiredAt: new Date("2026-09-01Z"),
      actions: [{ id: "never", title: "Never", instruction: null, effectiveFrom: new Date("2026-01-01Z"), retiredAt: null }] }
  ]
};

const client: any = {
  healthPlan: {
    findMany: async () => [{ id: "plan-1" }],
    findFirst: async (args: any) => args.include?.activeStep?.include ? { id: "plan-1", familyId: "family-1", activeStep: step } : { id: "plan-1", familyId: "family-1", updatedAt: now, activeStep: step, activeStepStartedAt: now }
  },
  healthPlanOccurrence: {
    createMany: async ({ data }: any) => {
      let count = 0;
      for (const row of data) { const key = `${row.sourceActionId}:${row.originalScheduledAt.toISOString()}`; if (!stored.has(key)) { stored.set(key, row); count++; } }
      return { count };
    }
  },
  $transaction: async (callback: any) => callback(client)
};

async function main() {
const first = new HealthPlanSchedulerService({ client } as any);
await first.runOnce(now);
const initial = stored.size;
assert.ok(initial > 20 && initial < 60, "bounded horizon creates a small batch");
assert.ok([...stored.values()].some((row) => row.sourceActionId === "action-a"));
assert.ok([...stored.values()].some((row) => row.sourceActionId === "action-b"));
assert.ok([...stored.values()].some((row) => row.sourceActionId === "action-c"));
assert.ok([...stored.values()].every((row) => row.sourceActionId !== "retired" && row.sourceActionId !== "never"));
assert.ok([...stored.values()].every((row) => row.healthPlanId === "plan-1" && row.familyId === "family-1"));
assert.ok([...stored.values()].every((row) => row.scheduledAt >= new Date("2026-09-10T06:00:00Z") && row.scheduledAt <= new Date("2026-09-24T10:00:00Z")));

await first.runOnce(now); // same instance
assert.equal(stored.size, initial);
await new HealthPlanSchedulerService({ client } as any).runOnce(now); // restart
assert.equal(stored.size, initial);
await Promise.all([new HealthPlanSchedulerService({ client } as any).runOnce(now), new HealthPlanSchedulerService({ client } as any).runOnce(now)]); // concurrent runners
assert.equal(stored.size, initial);
const sameInstant = [...stored.values()].filter((row) => row.originalScheduledAt.toISOString() === "2026-09-10T10:00:00.000Z");
assert.deepEqual(new Set(sameInstant.map((row) => row.sourceActionId)), new Set(["action-a", "action-b"]));

console.log("health-plan scheduler tests passed");
}

void main();
