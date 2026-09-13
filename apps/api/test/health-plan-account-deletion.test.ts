import "reflect-metadata";
import assert from "node:assert/strict";
import { ProfileService } from "../src/auth/profile.service";

type Row = Record<string, any>;

async function main() {
  const state = {
    user: { id: "user", passwordHash: "hash" } as Row | null,
    sessions: [{ id: "session", userId: "user", revokedAt: null }] as Row[],
    memberships: [
      { id: "member-a", familyId: "family-a", userId: "user", role: "MEMBER", displayName: "Test User" },
      { id: "member-b", familyId: "family-b", userId: "user", role: "MEMBER", displayName: "Test User" },
      { id: "other-a", familyId: "family-a", userId: "other-a", role: "OWNER", displayName: "Other A" },
      { id: "other-b", familyId: "family-b", userId: "other-b", role: "OWNER", displayName: "Other B" },
    ] as Row[],
    plans: [
      { id: "plan-a", familyId: "family-a", familyMemberId: "member-a", status: "ACTIVE" },
      { id: "plan-b", familyId: "family-b", familyMemberId: "member-b", status: "ACTIVE" },
    ] as Row[],
    occurrences: [
      { id: "occurrence-a", healthPlanId: "plan-a", familyId: "family-a", scheduledAt: new Date("2099-01-01"), status: "PENDING" },
      { id: "occurrence-b", healthPlanId: "plan-b", familyId: "family-b", scheduledAt: new Date("2099-01-01"), status: "PENDING" },
    ] as Row[],
    history: [] as Row[],
    families: [{ id: "family-a" }, { id: "family-b" }] as Row[],
  };

  const tx: Row = {
    familyMember: {
      findMany: async ({ where }: Row) => state.memberships.filter(member => member.userId === where.userId).map(member => ({ ...member })),
      count: async ({ where }: Row) => state.memberships.filter(member => member.familyId === where.familyId && (!where.id?.not || member.id !== where.id.not) && (!where.role?.in || where.role.in.includes(member.role))).length,
      delete: async ({ where }: Row) => { state.memberships = state.memberships.filter(member => member.id !== where.id); },
    },
    healthPlan: {
      findMany: async ({ where }: Row) => state.plans.filter(plan => plan.familyId === where.familyId && plan.familyMemberId === where.familyMemberId).map(({ id, status }) => ({ id, status })),
      updateMany: async ({ where, data }: Row) => {
        if (where.id === "plan-b") throw new Error("forced later family cleanup failure");
        const selected = state.plans.filter(plan => plan.familyId === where.familyId && plan.familyMemberId === where.familyMemberId && (!where.id || plan.id === where.id) && (!where.status || plan.status === where.status));
        selected.forEach(plan => Object.assign(plan, data)); return { count: selected.length };
      },
    },
    healthPlanOccurrence: { updateMany: async ({ where, data }: Row) => { const selected = state.occurrences.filter(row => row.healthPlanId === where.healthPlanId); selected.forEach(row => Object.assign(row, data)); return { count: selected.length }; } },
    healthPlanHistory: { create: async ({ data }: Row) => { state.history.push(data); return data; } },
    userSession: { updateMany: async ({ data }: Row) => { state.sessions.forEach(session => Object.assign(session, data)); return { count: state.sessions.length }; } },
    familyInvitation: { updateMany: async () => ({ count: 0 }) },
    wishlistShareInvitation: { updateMany: async () => ({ count: 0 }) },
    family: { delete: async ({ where }: Row) => { state.families = state.families.filter(family => family.id !== where.id); } },
    user: { delete: async () => { state.user = null; } },
  };
  const prisma = { client: {
    user: { findUnique: async () => state.user },
    $transaction: async (work: (client: Row) => Promise<unknown>) => {
      const before = structuredClone(state);
      try { return await work(tx); } catch (error) { Object.assign(state, before); throw error; }
    },
  } };
  const auth = { verifyPassword: async () => true };
  const service = new ProfileService(prisma as never, auth as never);

  await assert.rejects(() => service.deleteCurrentUserAccount("user", { password: "password", confirmationText: "SLETT" }), /forced later family cleanup failure/);
  assert.equal(state.user?.id, "user", "user survives a later-family cleanup failure");
  assert.equal(state.sessions[0].revokedAt, null, "session revocation rolls back");
  assert.deepEqual(state.memberships.map(member => member.id), ["member-a", "member-b", "other-a", "other-b"], "earlier membership deletion rolls back");
  assert.ok(state.plans.every(plan => plan.status === "ACTIVE" && plan.familyMemberId !== null), "all family plan cleanup rolls back");
  assert.ok(state.occurrences.every(row => row.status === "PENDING"), "all family occurrence cleanup rolls back");
  assert.equal(state.history.length, 0, "all family history writes roll back");
  assert.deepEqual(state.families.map(family => family.id), ["family-a", "family-b"], "families survive rollback");
}

void main();
