import assert from "node:assert/strict";
import { HealthPlanSchedulerService, HEALTH_PLAN_GENERATION_LOOKBACK_HOURS } from "../src/health-plans/health-plan-scheduler.service";

type Row = Record<string, any>;
const localTime = (value: string) => new Date(`1970-01-01T${value}:00Z`);
const action = (id: string) => ({ id, title: id, instruction: null, effectiveFrom: new Date("2020-01-01Z"), retiredAt: null });
const schedule = (id: string, time: string, actionId = id) => ({ id, recurrenceType: "DAILY", localTime: localTime(time), timezone: "Europe/Oslo", weekdays: [], intervalDays: null, anchorDate: null, effectiveFrom: new Date("2020-01-01Z"), retiredAt: null, actions: [action(actionId)] });

class SchedulerDb {
  plan: Row;
  steps: Row[];
  occurrences = new Map<string, Row>();
  histories: Row[] = [];
  updateDelay = false;

  constructor(plan: Row, steps: Row[]) { this.plan = plan; this.steps = steps; }
  healthPlan = {
    findMany: async () => this.plan.status === "ACTIVE" ? [{ id: this.plan.id }] : [],
    findFirst: async (args: Row) => {
      if (this.plan.id !== args.where.id || (args.where.status && this.plan.status !== args.where.status)) return null;
      const step = this.steps.find(candidate => candidate.id === this.plan.activeStepId) ?? null;
      return { ...this.plan, activeStep: step };
    },
    updateMany: async ({ where, data }: Row) => {
      if (this.updateDelay) await new Promise(resolve => setImmediate(resolve));
      if (this.plan.id !== where.id || this.plan.status !== where.status || this.plan.activeStepId !== where.activeStepId || this.plan.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
      Object.assign(this.plan, data); this.plan.updatedAt = new Date(this.plan.updatedAt.getTime() + 1); return { count: 1 };
    },
  };
  healthPlanStep = { findFirst: async ({ where }: Row) => this.steps.find(step => step.healthPlanId === where.healthPlanId && step.levelId === where.levelId && step.stepOrder === where.stepOrder) ?? null };
  healthPlanOccurrence = {
    createMany: async ({ data }: Row) => { let count = 0; for (const row of data) { const key = `${row.sourceActionId}:${row.originalScheduledAt.toISOString()}`; if (!this.occurrences.has(key)) { this.occurrences.set(key, row); count++; } } return { count }; },
    updateMany: async ({ where, data }: Row) => { let count = 0; for (const row of this.occurrences.values()) if (row.healthPlanId === where.healthPlanId && row.scheduledAt >= where.scheduledAt.gte && where.status.in.includes(row.status) && this.steps.find(s => s.id === this.plan.activeStepId)?.id !== where.sourceAction.schedule.stepId) { Object.assign(row, data); count++; } return { count }; },
  };
  healthPlanHistory = { create: async ({ data }: Row) => { this.histories.push(data); return data; } };
  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> { return fn(this); }
}

function fixture(boundary: string, time = "08:00", now = "2026-09-10T08:05:00Z") {
  // September Oslo is UTC+2, hence local 08:00 is 06:00Z.
  const step = { id: "s1", healthPlanId: "p", levelId: "l", stepOrder: 0, autoAdvance: false, durationDays: null, schedules: [schedule("daily", time)] };
  const db = new SchedulerDb({ id: "p", familyId: "f", status: "ACTIVE", activeStepId: "s1", activeStepStartedAt: new Date(boundary), generationNotBefore: new Date(boundary), updatedAt: new Date(0) }, [step]);
  return { db, service: new HealthPlanSchedulerService({ client: db } as never), now: new Date(now) };
}
const times = (db: SchedulerDb) => [...db.occurrences.values()].map(row => row.originalScheduledAt.toISOString()).sort();

async function main() {
  { // Start after today's schedule: do not backfill it, but generate tomorrow.
    const { db, service, now } = fixture("2026-09-10T08:00:00Z"); await service.runOnce(now);
    assert.ok(!times(db).includes("2026-09-10T06:00:00.000Z")); assert.ok(times(db).includes("2026-09-11T06:00:00.000Z"));
  }
  { // Start before today's schedule.
    const { db, service } = fixture("2026-09-10T05:00:00Z", "08:00", "2026-09-10T05:05:00Z"); await service.runOnce(new Date("2026-09-10T05:05:00Z"));
    assert.ok(times(db).includes("2026-09-10T06:00:00.000Z"));
  }
  { // A manual level change has the same now-boundary semantics as activation.
    const after = fixture("2026-09-10T08:00:00Z"); await after.service.runOnce(after.now); assert.ok(!times(after.db).includes("2026-09-10T06:00:00.000Z"));
    const before = fixture("2026-09-10T05:00:00Z", "08:00", "2026-09-10T05:05:00Z"); await before.service.runOnce(before.now); assert.ok(times(before.db).includes("2026-09-10T06:00:00.000Z"));
  }
  { // Resume at noon excludes a 09:00 local occurrence from the pause window.
    const resumed = fixture("2026-09-10T10:00:00Z", "09:00", "2026-09-10T11:00:00Z"); await resumed.service.runOnce(resumed.now);
    assert.ok(!times(resumed.db).includes("2026-09-10T07:00:00.000Z"));
  }
  { // Short downtime backfills; long downtime remains bounded by lookback.
    const short = fixture("2026-09-01T00:00:00Z", "09:00", "2026-09-10T08:00:00Z"); await short.service.runOnce(short.now); assert.ok(times(short.db).includes("2026-09-10T07:00:00.000Z"));
    const long = fixture("2026-09-01T00:00:00Z", "03:00", "2026-09-10T08:00:00Z"); await long.service.runOnce(long.now); assert.ok(!times(long.db).includes("2026-09-10T01:00:00.000Z"));
    assert.equal(HEALTH_PLAN_GENERATION_LOOKBACK_HOURS, 4);
  }
  { // Deterministic catch-up sets each new context boundary to its effective expiry.
    const steps = [
      { id: "s1", healthPlanId: "p", levelId: "l", stepOrder: 0, autoAdvance: true, durationDays: 1, schedules: [schedule("old", "09:00", "old")] },
      { id: "s2", healthPlanId: "p", levelId: "l", stepOrder: 1, autoAdvance: true, durationDays: 1, schedules: [schedule("middle", "09:00", "middle")] },
      { id: "s3", healthPlanId: "p", levelId: "l", stepOrder: 2, autoAdvance: false, durationDays: null, schedules: [schedule("final", "09:00", "final")] },
    ];
    const db = new SchedulerDb({ id: "p", familyId: "f", status: "ACTIVE", activeStepId: "s1", activeStepStartedAt: new Date("2026-09-08T06:00:00Z"), generationNotBefore: new Date("2026-09-08T06:00:00Z"), updatedAt: new Date(0) }, steps);
    const service = new HealthPlanSchedulerService({ client: db } as never); await service.runOnce(new Date("2026-09-10T08:00:00Z"));
    assert.equal(db.plan.activeStepId, "s3"); assert.equal(db.plan.activeStepStartedAt.toISOString(), "2026-09-10T06:00:00.000Z"); assert.equal(db.plan.generationNotBefore.toISOString(), "2026-09-10T06:00:00.000Z");
    assert.equal(db.histories.length, 2); assert.ok([...db.occurrences.values()].every(row => row.sourceActionId === "final")); assert.ok(times(db).includes("2026-09-10T07:00:00.000Z"));
    const count = db.occurrences.size; await new HealthPlanSchedulerService({ client: db } as never).runOnce(new Date("2026-09-10T08:00:00Z")); assert.equal(db.occurrences.size, count, "restart is idempotent");
  }
  { // No early advance; final auto-advance step writes no repeated history.
    const future = { id: "s1", healthPlanId: "p", levelId: "l", stepOrder: 0, autoAdvance: true, durationDays: 1, schedules: [] };
    const db = new SchedulerDb({ id: "p", familyId: "f", status: "ACTIVE", activeStepId: "s1", activeStepStartedAt: new Date("2026-09-10T06:00:00Z"), generationNotBefore: new Date("2026-09-09T00:00:00Z"), updatedAt: new Date(0) }, [future]);
    await new HealthPlanSchedulerService({ client: db } as never).runOnce(new Date("2026-09-10T08:00:00Z")); assert.equal(db.plan.activeStepId, "s1"); assert.equal(db.plan.generationNotBefore.toISOString(), "2026-09-09T00:00:00.000Z"); assert.equal(db.histories.length, 0);
    db.plan.activeStepStartedAt = new Date("2026-09-08T06:00:00Z"); await new HealthPlanSchedulerService({ client: db } as never).runOnce(new Date("2026-09-10T08:00:00Z")); assert.equal(db.histories.length, 0);
  }
  { // Two runners elect one transition and unique occurrence insertion remains idempotent.
    const steps = [{ id: "s1", healthPlanId: "p", levelId: "l", stepOrder: 0, autoAdvance: true, durationDays: 1, schedules: [] }, { id: "s2", healthPlanId: "p", levelId: "l", stepOrder: 1, autoAdvance: false, durationDays: null, schedules: [schedule("new", "09:00")] }];
    const db = new SchedulerDb({ id: "p", familyId: "f", status: "ACTIVE", activeStepId: "s1", activeStepStartedAt: new Date("2026-09-09T06:00:00Z"), generationNotBefore: new Date("2026-09-09T06:00:00Z"), updatedAt: new Date(0) }, steps); db.updateDelay = true;
    await Promise.all([new HealthPlanSchedulerService({ client: db } as never).runOnce(new Date("2026-09-10T08:00:00Z")), new HealthPlanSchedulerService({ client: db } as never).runOnce(new Date("2026-09-10T08:00:00Z"))]);
    assert.equal(db.histories.length, 1); assert.equal(db.plan.generationNotBefore.toISOString(), "2026-09-10T06:00:00.000Z"); assert.equal(new Set(db.occurrences.keys()).size, db.occurrences.size);
  }
  { // Boundary comparison is by instant even around Oslo's spring DST transition.
    const dst = fixture("2026-03-29T01:45:00Z", "02:30", "2026-03-29T01:50:00Z"); await dst.service.runOnce(dst.now);
    assert.ok(!times(dst.db).includes("2026-03-29T01:30:00.000Z")); assert.ok(times(dst.db).includes("2026-03-30T00:30:00.000Z"));
  }
  console.log("health-plan scheduler tests passed");
}
void main();
