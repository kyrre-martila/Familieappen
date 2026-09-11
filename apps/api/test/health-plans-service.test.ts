import "reflect-metadata";
import assert from "node:assert/strict";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { HealthPlansService } from "../src/health-plans";

type Row = Record<string, any>;
const now = new Date("2026-09-10T10:00:00Z");

class StatefulClient {
  plans: Row[] = [
    { id: "pa", familyId: "a", status: "DRAFT", updatedAt: new Date(0), pausedAt: null, activeLevelId: null, activeStepId: null, activeLevelStartedAt: null, activeStepStartedAt: null, generationNotBefore: null },
    { id: "pb", familyId: "b", status: "DRAFT", updatedAt: new Date(0), pausedAt: null, activeLevelId: null, activeStepId: null, activeLevelStartedAt: null, activeStepStartedAt: null, generationNotBefore: null },
  ];
  levels: Row[] = [
    { id: "l0", healthPlanId: "pa", levelIndex: 0 }, { id: "l1", healthPlanId: "pa", levelIndex: 1 },
  ];
  steps: Row[] = [
    { id: "s0", healthPlanId: "pa", levelId: "l0", stepOrder: 0, autoAdvance: true, durationDays: 1 },
    { id: "s1", healthPlanId: "pa", levelId: "l0", stepOrder: 1, autoAdvance: false, durationDays: null },
    { id: "s2", healthPlanId: "pa", levelId: "l1", stepOrder: 0, autoAdvance: false, durationDays: null },
  ];
  histories: Row[] = [];
  notes: Row[] = [];
  occurrences: Row[] = [];
  actions: Row[] = [];
  serial = 1;
  failNextPlanUpdate = false;
  healthPlan = {
    findFirst: undefined,
  } as any;
  constructor() {
    this.healthPlan.findFirst = async ({ where }: Row) => this.plans.find(p => p.id === where.id && p.familyId === where.familyId) ?? null;
    this.healthPlan.update = async ({ where, data }: Row) => { const p = this.plans.find(x => x.id === where.id)!; Object.assign(p, data); p.updatedAt = new Date(p.updatedAt.getTime() + 1); return p; };
    this.healthPlan.updateMany = async ({ where, data }: Row) => {
      await new Promise(resolve => setImmediate(resolve));
      if (this.failNextPlanUpdate) { this.failNextPlanUpdate = false; return { count: 0 }; }
      const p = this.plans.find(x => x.id === where.id && x.familyId === where.familyId && x.status === where.status && x.updatedAt.getTime() === where.updatedAt.getTime());
      if (!p) return { count: 0 }; Object.assign(p, data); p.updatedAt = new Date(p.updatedAt.getTime() + 1); return { count: 1 };
    };
  }
  familyMember = { findFirst: async ({ where }: Row) => where.id === "wrong" ? null : { id: where.id } };
  healthPlanLevel = { findFirst: async ({ where }: Row) => this.levels.find(x => Object.entries(where).every(([k,v]) => x[k] === v)) ?? null };
  healthPlanStep = { findFirst: async ({ where }: Row) => this.steps.find(x => Object.entries(where).every(([k,v]) => x[k] === v)) ?? null };
  healthPlanHistory = {
    create: async ({ data }: Row) => { const row = { id: `h${this.serial++}`, occurredAt: new Date(), ...data }; this.histories.push(row); return row; },
    findMany: async ({ where }: Row) => this.histories.filter(x => x.healthPlanId === where.healthPlanId),
  };
  healthPlanOccurrence = {
    findFirst: async ({ where }: Row) => this.occurrences.find(x => x.id === where.id && x.healthPlanId === where.healthPlanId && x.familyId === where.familyId) ?? null,
    updateMany: async ({ where, data }: Row) => {
      if (where.sourceActionId) { let count = 0; for (const x of this.occurrences) if (x.sourceActionId === where.sourceActionId && x.scheduledAt > where.scheduledAt.gt && where.status.in.includes(x.status)) { Object.assign(x, data); count++; } return { count }; }
      if (where.healthPlanId && where.scheduledAt?.gt) { let count = 0; for (const x of this.occurrences) if (x.healthPlanId === where.healthPlanId && x.scheduledAt > where.scheduledAt.gt && where.status.in.includes(x.status)) { Object.assign(x, data); count++; } return { count }; }
      await new Promise(resolve => setImmediate(resolve)); const x = this.occurrences.find(o => o.id === where.id && o.status === where.status && o.updatedAt.getTime() === where.updatedAt.getTime()); if (!x) return { count: 0 }; Object.assign(x, data); x.updatedAt = new Date(x.updatedAt.getTime() + 1); return { count: 1 };
    },
    count: async ({ where }: Row) => this.occurrences.filter(x => x.sourceActionId === where.sourceActionId).length,
    findMany: async ({ where, take }: Row) => this.occurrences.filter(x => x.familyId === where.familyId && (!where.healthPlanId || x.healthPlanId === where.healthPlanId)).slice(0, take),
  };
  healthPlanAction = {
    findFirst: async ({ where }: Row) => this.actions.find(x => x.id === where.id && x.healthPlanId === where.schedule.step.healthPlanId && (where.retiredAt === undefined || x.retiredAt === where.retiredAt)) ?? null,
    update: async ({ where, data }: Row) => { const x = this.actions.find(a => a.id === where.id)!; Object.assign(x, data); return x; },
    create: async ({ data }: Row) => { const x = { id: `action${this.serial++}`, healthPlanId: "pa", retiredAt: null, ...data }; this.actions.push(x); return x; },
  };
  healthPlanNote = { create: async ({ data }: Row) => { const row = { id: `n${this.serial++}`, ...data }; this.notes.push(row); return row; } };
  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    const emulateRollback = this.failNextPlanUpdate;
    const plans = structuredClone(this.plans), occurrences = structuredClone(this.occurrences), histories = structuredClone(this.histories);
    try { return await fn(this); } catch (error) { if (emulateRollback) { this.plans = plans; this.occurrences = occurrences; this.histories = histories; } throw error; }
  }
}

const auth = { requireFamilyMember: async (userId: string, familyId: string) => {
  if ((userId === "ua" && familyId !== "a") || (userId === "ub" && familyId !== "b")) throw new NotFoundException();
  return { id: `${familyId}-member`, displayName: userId };
} };

async function main() {
  const db = new StatefulClient();
  const service = new HealthPlansService({ client: db } as never, auth as never);

  db.occurrences.push({ id: "feed-a", healthPlanId: "pa", familyId: "a", status: "PENDING", scheduledAt: now });
  db.occurrences.push({ id: "feed-b", healthPlanId: "pb", familyId: "b", status: "PENDING", scheduledAt: now });
  assert.deepEqual((await service.occurrenceFeed("ua", "a", { limit: "5" }) as Row[]).map(x => x.id), ["feed-a"], "feed is scoped by authenticated family context");
  await assert.rejects(() => service.occurrenceFeed("ua", "a", { limit: "501" }), BadRequestException);

  assert.equal((await service.get("ua", "a", "pa") as Row).id, "pa");
  await assert.rejects(() => service.get("ua", "a", "pb"), NotFoundException);
  await assert.rejects(() => service.create("ua", "a", { familyMemberId: "wrong", name: "x", levels: [] }), BadRequestException);

  const [winner, loser] = await Promise.allSettled([service.start("ua", "a", "pa"), service.start("ua", "a", "pa")]);
  assert.equal([winner, loser].filter(x => x.status === "fulfilled").length, 1, "only one concurrent start wins");
  assert.equal(db.plans[0].activeLevelId, "l0"); assert.equal(db.plans[0].activeStepId, "s0");
  assert.ok(db.plans[0].generationNotBefore instanceof Date, "start opens generation at the activation instant");
  assert.equal(db.histories.filter(x => x.type === "STATUS_CHANGED").length, 1, "state and history commit once");

  await service.pause("ua", "a", "pa");
  const pausedAt = db.plans[0].pausedAt as Date;
  db.plans[0].activeLevelStartedAt = new Date(now.getTime() - 86_400_000);
  db.plans[0].activeStepStartedAt = new Date(now.getTime() - 43_200_000);
  db.plans[0].pausedAt = new Date(pausedAt.getTime() - 10_000);
  const oldLevelStart = db.plans[0].activeLevelStartedAt as Date;
  const oldStepStart = db.plans[0].activeStepStartedAt as Date;
  await service.resume("ua", "a", "pa");
  const shift = (db.plans[0].activeLevelStartedAt as Date).getTime() - oldLevelStart.getTime();
  assert.ok(shift >= 10_000); assert.equal((db.plans[0].activeStepStartedAt as Date).getTime() - oldStepStart.getTime(), shift);
  assert.ok((db.plans[0].generationNotBefore as Date) >= (db.plans[0].pausedAt ?? new Date(0)), "resume resets the wall-clock generation boundary");

  await assert.rejects(() => service.levelDown("ua", "a", "pa"), /base level/);
  const beforeLevelUpBoundary = db.plans[0].generationNotBefore as Date;
  await service.levelUp("ua", "a", "pa"); assert.equal(db.plans[0].activeLevelId, "l1"); assert.equal(db.plans[0].activeStepId, "s2"); assert.ok(db.plans[0].generationNotBefore >= beforeLevelUpBoundary);
  await service.levelDown("ua", "a", "pa"); assert.equal(db.plans[0].activeStepId, "s0", "entering a level resets to step zero");

  // Occurrence updates run before the conditional plan write during pause. A losing
  // transition must roll the whole database transaction back.
  db.occurrences.push({ id: "pause-race", healthPlanId: "pa", familyId: "a", status: "PENDING", scheduledAt: new Date("2099-01-01"), updatedAt: new Date(0) });
  db.failNextPlanUpdate = true;
  await assert.rejects(() => service.pause("ua", "a", "pa"), ConflictException);
  assert.equal(db.occurrences.find(x => x.id === "pause-race")?.status, "PENDING", "losing pause rolls occurrence skips back");

  db.occurrences.push({ id: "oa", healthPlanId: "pa", familyId: "a", status: "PENDING", scheduledAt: now, originalScheduledAt: now, updatedAt: new Date(0), completedAt: null, completedByUserId: null });
  const results = await Promise.allSettled([
    service.updateOccurrence("ua", "a", "pa", "oa", { status: "COMPLETED" }),
    service.updateOccurrence("ua", "a", "pa", "oa", { status: "COMPLETED" }),
  ]);
  assert.equal(results.filter(x => x.status === "fulfilled").length, 1, "double completion conflicts deterministically");
  assert.equal(db.occurrences.find(x => x.id === "oa")?.completedByUserId, "ua"); assert.ok(db.occurrences.find(x => x.id === "oa")?.completedAt instanceof Date);
  await assert.rejects(() => service.updateOccurrence("ua", "a", "pa", "oa", { status: "SKIPPED" }), ConflictException);

  db.occurrences.push({ id: "os", healthPlanId: "pa", familyId: "a", status: "PENDING", scheduledAt: now, originalScheduledAt: now, updatedAt: new Date(0), completedAt: null, completedByUserId: null });
  await service.updateOccurrence("ua", "a", "pa", "os", { status: "SNOOZED", scheduledAt: "2099-01-01T12:00:00Z" });
  assert.equal(db.occurrences.find(x => x.id === "os")?.originalScheduledAt, now); assert.equal(db.occurrences.find(x => x.id === "os")?.scheduledAt.toISOString(), "2099-01-01T12:00:00.000Z");
  await service.updateOccurrence("ua", "a", "pa", "os", { status: "SKIPPED" });
  assert.equal(db.occurrences.find(x => x.id === "os")?.status, "SKIPPED");
  await assert.rejects(() => service.updateOccurrence("ua", "a", "pa", "os", { status: "SNOOZED", scheduledAt: "2000-01-01T00:00:00Z" }), ConflictException);

  db.occurrences.push({ id: "ob", healthPlanId: "pb", familyId: "b", status: "PENDING", updatedAt: new Date(0) });
  await assert.rejects(() => service.updateOccurrence("ua", "a", "pa", "ob", { status: "SKIPPED" }), NotFoundException);
  await service.addNote("ua", "a", "pa", { text: "plan" });
  await service.addNote("ua", "a", "pa", { text: "occurrence", occurrenceId: "oa" });
  assert.deepEqual(db.notes.map(x => x.authorUserId), ["ua", "ua"]);
  db.actions.push({ id: "aa", healthPlanId: "pa", retiredAt: null }, { id: "ab", healthPlanId: "pb", retiredAt: null });
  await service.addNote("ua", "a", "pa", { text: "action", sourceActionId: "aa" });
  await assert.rejects(() => service.addNote("ua", "a", "pa", { text: "cross action", sourceActionId: "ab" }), NotFoundException);
  await assert.rejects(() => service.addNote("ua", "a", "pa", { text: "cross", occurrenceId: "ob" }), NotFoundException);

  assert.deepEqual(db.histories.map(x => x.type), ["STATUS_CHANGED", "PAUSED", "RESUMED", "LEVEL_INCREASED", "LEVEL_DECREASED"]);
  const action: Row = { id: "used", healthPlanId: "pa", scheduleId: "schedule", sortOrder: 3, title: "old", instruction: "old", retiredAt: null };
  db.actions.push(action);
  db.occurrences.push(
    { id: "future", sourceActionId: "used", scheduledAt: new Date("2099-01-01"), status: "PENDING" },
    { id: "past", sourceActionId: "used", scheduledAt: new Date("2000-01-01"), status: "PENDING" },
    { id: "done", sourceActionId: "used", scheduledAt: new Date("2099-01-01"), status: "COMPLETED", actionTitle: "old" },
  );
  await service.update("ua", "a", "pa", { action: { id: "used", title: "new", instruction: "new" } });
  const replacement = db.actions.at(-1)!;
  assert.ok(action.retiredAt instanceof Date); assert.equal(replacement.sortOrder, 3); assert.ok(replacement.effectiveFrom instanceof Date);
  assert.equal(db.occurrences.find(x => x.id === "future")!.status, "SKIPPED");
  assert.equal(db.occurrences.find(x => x.id === "past")!.status, "PENDING");
  assert.equal(db.occurrences.find(x => x.id === "done")!.actionTitle, "old");

  await service.update("ua", "a", "pa", { name: "Oppdatert" });
  assert.equal(db.histories.at(-1)?.type, "DEFINITION_UPDATED");
  assert.equal(db.histories.filter(x => x.type === "STATUS_CHANGED").length, 1, "definition edit is not a lifecycle status event");

  await service.archive("ua", "a", "pa");
  await assert.rejects(() => service.pause("ua", "a", "pa"), ConflictException);
}
void main();
