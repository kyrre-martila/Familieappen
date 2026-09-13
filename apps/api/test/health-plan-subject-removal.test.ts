import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prepareHealthPlansForSubjectRemoval } from "../src/health-plans/health-plan-subject-removal";
import { FamiliesService } from "../src/families/families.service";

type Row = Record<string, any>;

async function main() {
  const statuses = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];
  const plans = statuses.map((status, index) => ({ id: `p${index}`, familyId: "family", familyMemberId: "subject" as string | null, status }));
  const occurrences = plans.flatMap(plan => [
    { id: `${plan.id}-future-p`, healthPlanId: plan.id, scheduledAt: new Date("2030-01-02"), status: "PENDING" },
    { id: `${plan.id}-future-s`, healthPlanId: plan.id, scheduledAt: new Date("2030-01-02"), status: "SNOOZED" },
    { id: `${plan.id}-past`, healthPlanId: plan.id, scheduledAt: new Date("2029-12-31"), status: "PENDING" },
    { id: `${plan.id}-done`, healthPlanId: plan.id, scheduledAt: new Date("2030-01-02"), status: "COMPLETED" },
  ]);
  const histories: Row[] = [];
  const client = {
    healthPlan: {
      findMany: async () => plans.map(({ id, status }) => ({ id, status })),
      updateMany: async ({ where, data }: Row) => { const selected = plans.filter(plan => plan.familyId === where.familyId && plan.familyMemberId === where.familyMemberId && (!where.id || plan.id === where.id) && (!where.status || plan.status === where.status)); selected.forEach(plan => Object.assign(plan, data)); return { count: selected.length }; },
    },
    healthPlanOccurrence: { updateMany: async ({ where, data }: Row) => { const selected = occurrences.filter(row => row.healthPlanId === where.healthPlanId && row.scheduledAt >= where.scheduledAt.gte && where.status.in.includes(row.status)); selected.forEach(row => Object.assign(row, data)); return { count: selected.length }; } },
    healthPlanHistory: { create: async ({ data }: Row) => { histories.push(data); return data; } },
  };

  await prepareHealthPlansForSubjectRemoval(client, "family", "subject", { userId: "admin", displayName: "Administrator" }, new Date("2030-01-01"));
  assert.deepEqual(plans.map(plan => plan.status), ["ARCHIVED", "COMPLETED", "COMPLETED", "COMPLETED", "ARCHIVED"]);
  assert.ok(plans.every(plan => plan.familyMemberId === null));
  assert.equal(histories.length, 3);
  assert.ok(histories.every(row => row.type === "STATUS_CHANGED" && row.metadata.reason === "SUBJECT_REMOVED"));
  for (const plan of plans.slice(0, 3)) {
    assert.equal(occurrences.find(row => row.id === `${plan.id}-future-p`)?.status, "SKIPPED");
    assert.equal(occurrences.find(row => row.id === `${plan.id}-future-s`)?.status, "SKIPPED");
    assert.equal(occurrences.find(row => row.id === `${plan.id}-past`)?.status, "PENDING");
    assert.equal(occurrences.find(row => row.id === `${plan.id}-done`)?.status, "COMPLETED");
  }
  assert.deepEqual(Object.keys(histories[0].metadata).sort(), ["fromStatus", "reason", "toStatus"]);

  const migration = await readFile(join(__dirname, "../prisma/migrations/20260913120000_health_plan_subject_lifecycle/migration.sql"), "utf8");
  assert.match(migration, /SET "subjectDisplayName" = fm\."displayName"/);
  assert.match(migration, /"familyMemberId"\) REFERENCES "family_members"\("id"\) ON DELETE SET NULL/);
  assert.match(migration, /CREATE TRIGGER health_plan_subject_same_family_trigger/);
  assert.match(migration, /"health_plans"\("id", "familyId"\) ON DELETE CASCADE/);

  // FamiliesService owns one transaction around preparation and hard delete.
  const member = { id: "child", familyId: "family", userId: null, displayName: "Barn", role: "CHILD", includeInSchoolWeek: true, createdAt: new Date(), updatedAt: new Date() };
  const familyPlans: Row[] = [{ id: "family-plan", familyId: "family", familyMemberId: "child", status: "ACTIVE" }];
  const familyHistory: Row[] = [];
  let failDelete = true;
  const transactionClient: Row = {
    healthPlan: {
      findMany: async () => familyPlans.map(({ id, status }) => ({ id, status })),
      updateMany: async ({ where, data }: Row) => { const selected = familyPlans.filter(plan => plan.familyId === where.familyId && plan.familyMemberId === where.familyMemberId && (!where.id || plan.id === where.id) && (!where.status || plan.status === where.status)); selected.forEach(plan => Object.assign(plan, data)); return { count: selected.length }; },
    },
    healthPlanOccurrence: { updateMany: async () => ({ count: 0 }) },
    healthPlanHistory: { create: async ({ data }: Row) => { familyHistory.push(data); return data; } },
    familyMember: { delete: async () => { if (failDelete) throw new Error("forced delete failure"); return member; } },
  };
  const prisma = { client: {
    familyMember: { findFirst: async () => member },
    $transaction: async (work: (tx: Row) => Promise<unknown>) => {
      const beforePlans = structuredClone(familyPlans); const beforeHistory = structuredClone(familyHistory);
      try { return await work(transactionClient); } catch (error) { familyPlans.splice(0, familyPlans.length, ...beforePlans); familyHistory.splice(0, familyHistory.length, ...beforeHistory); throw error; }
    },
  } };
  const authorization = { requireFamilyRole: async () => ({ ...member, id: "admin", userId: "admin", role: "OWNER", displayName: "Admin" }) };
  const families = new FamiliesService(prisma as never, authorization as never, {} as never, {} as never);
  await assert.rejects(() => families.removeFamilyMember("admin", "family", "child"), /forced delete failure/);
  assert.equal(familyPlans[0].status, "ACTIVE", "member-delete failure rolls lifecycle back");
  assert.equal(familyPlans[0].familyMemberId, "child", "member-delete failure rolls detach back");
  assert.equal(familyHistory.length, 0, "member-delete failure rolls history back");
  failDelete = false;
  await families.removeFamilyMember("admin", "family", "child");
  assert.equal(familyPlans[0].status, "COMPLETED");
  assert.equal(familyPlans[0].familyMemberId, null);

  // A later plan failure must roll back cleanup already performed for plan one.
  const multiPlans: Row[] = [
    { id: "multi-1", familyId: "family", familyMemberId: "child", status: "ACTIVE" },
    { id: "multi-2", familyId: "family", familyMemberId: "child", status: "PAUSED" },
  ];
  const multiOccurrences: Row[] = multiPlans.map(plan => ({ id: `${plan.id}-future`, healthPlanId: plan.id, familyId: "family", scheduledAt: new Date("2030-01-02"), status: "PENDING" }));
  const multiHistory: Row[] = [];
  const multiTx: Row = {
    healthPlan: {
      findMany: async () => multiPlans.map(({ id, status }) => ({ id, status })),
      updateMany: async ({ where, data }: Row) => {
        if (where.id === "multi-2") throw new Error("forced second plan failure");
        const selected = multiPlans.filter(plan => plan.familyId === where.familyId && plan.familyMemberId === where.familyMemberId && (!where.id || plan.id === where.id) && (!where.status || plan.status === where.status));
        selected.forEach(plan => Object.assign(plan, data)); return { count: selected.length };
      },
    },
    healthPlanOccurrence: { updateMany: async ({ where, data }: Row) => { const selected = multiOccurrences.filter(row => row.healthPlanId === where.healthPlanId); selected.forEach(row => Object.assign(row, data)); return { count: selected.length }; } },
    healthPlanHistory: { create: async ({ data }: Row) => { multiHistory.push(data); return data; } },
    familyMember: { delete: async () => member },
  };
  const multiPrisma = { client: {
    familyMember: { findFirst: async () => member },
    $transaction: async (work: (tx: Row) => Promise<unknown>) => {
      const beforePlans = structuredClone(multiPlans), beforeOccurrences = structuredClone(multiOccurrences), beforeHistory = structuredClone(multiHistory);
      try { return await work(multiTx); } catch (error) {
        multiPlans.splice(0, multiPlans.length, ...beforePlans); multiOccurrences.splice(0, multiOccurrences.length, ...beforeOccurrences); multiHistory.splice(0, multiHistory.length, ...beforeHistory); throw error;
      }
    },
  } };
  const multiFamilies = new FamiliesService(multiPrisma as never, authorization as never, {} as never, {} as never);
  await assert.rejects(() => multiFamilies.removeFamilyMember("admin", "family", "child"), /forced second plan failure/);
  assert.deepEqual(multiPlans.map(plan => [plan.status, plan.familyMemberId]), [["ACTIVE", "child"], ["PAUSED", "child"]], "later plan failure restores every plan");
  assert.ok(multiOccurrences.every(row => row.status === "PENDING"), "later plan failure restores earlier occurrence cleanup");
  assert.equal(multiHistory.length, 0, "later plan failure restores earlier history");
}

void main();
