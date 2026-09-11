import "reflect-metadata";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BadRequestException } from "@nestjs/common";
import { HealthPlansService } from "../src/health-plans";

const delegate = new Proxy({}, { get: () => async () => { throw new Error("unexpected database call"); } });
const prisma = { client: { familyMember: delegate } };
const authorization = { requireFamilyMember: async () => ({ id: "actor-member", displayName: "Forelder" }) };
const service = new HealthPlansService(prisma as never, authorization as never);

const valid = {
  familyMemberId: "subject",
  name: " Morgenplan ",
  levels: [{ levelIndex: 0, steps: [{ stepOrder: 0, autoAdvance: false, schedules: [{ recurrenceType: "DAILY" as const, localTime: "08:15", actions: [{ sortOrder: 0, title: "Ta medisin" }] }] }] }]
};

// Validation happens before persistence and protects the deeply nested write.
async function main(): Promise<void> {
let occurrenceQuery: Record<string, any> | undefined;
let listQuery: Record<string, any> | undefined;
const queryService = new HealthPlansService({ client: {
  healthPlanOccurrence: { findMany: async (query: Record<string, any>) => { occurrenceQuery = query; return []; } },
  healthPlan: { findMany: async (query: Record<string, any>) => { listQuery = query; return []; } },
} } as never, authorization as never);
await queryService.occurrenceFeed("user", "family-a", { familyMemberId: "member-a", healthPlanId: "plan-a" });
assert.equal(occurrenceQuery?.where.familyId, "family-a");
assert.equal(occurrenceQuery?.where.healthPlanId, "plan-a");
assert.deepEqual(occurrenceQuery?.where.healthPlan, { familyMemberId: "member-a" });
assert.deepEqual(occurrenceQuery?.where.OR, [
  { status: { in: ["COMPLETED", "SKIPPED"] } },
  { status: { in: ["PENDING", "SNOOZED"] }, healthPlan: { status: "ACTIVE" } },
]);
await queryService.list("user", "family-a");
assert.equal(listQuery?.where.familyId, "family-a");
assert.deepEqual(listQuery?.include.activeLevel.select, { id: true, levelIndex: true, name: true });
assert.deepEqual(listQuery?.include.activeStep.select, { id: true, stepOrder: true, name: true });
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [] }), BadRequestException);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], levelIndex: 1 }] }), /level 0/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [valid.levels[0], { ...valid.levels[0], levelIndex: 2 }] }), /contiguous/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], stepOrder: 1 }] }] }), /ordered from 0/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "WEEKDAYS" as const, weekdays: [1, 1], localTime: "08:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] }), /unique ISO weekdays/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "WEEKDAYS" as const, weekdays: [0], localTime: "08:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] }), /ISO weekdays/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "WEEKDAYS" as const, weekdays: [8], localTime: "08:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] }), /ISO weekdays/);
const isoWeekdays = { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "WEEKDAYS" as const, weekdays: [1, 7], localTime: "08:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] };
// Reaches persistence, proving both ends of the ISO range passed definition validation.
await assert.rejects(() => service.create("user", "family", isoWeekdays), /unexpected database call/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "INTERVAL_DAYS" as const, intervalDays: 0, anchorDate: "2026-09-11", localTime: "08:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] }), /positive interval/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "DAILY" as const, weekdays: [1], localTime: "08:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] }), /Daily schedules/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "DAILY" as const, localTime: "25:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] }), /localTime/);
await assert.rejects(() => service.create("user", "family", { ...valid, name: "x".repeat(121) }), /between 1 and 120/);

// Actor-controlled and server-owned fields are deliberately absent from command DTOs.
const source = readFileSync(resolve(__dirname, "../src/health-plans/health-plans.dto.ts"), "utf8");
assert.doesNotMatch(source, /familyId\??:/);
assert.doesNotMatch(source, /authorUserId\??:/);
assert.doesNotMatch(source, /completedByUserId\??:/);
assert.doesNotMatch(source, /completedAt\??:/);

// Automatic step progression is an internal scheduler primitive, never a client route.
const controller = readFileSync(resolve(__dirname, "../src/health-plans/health-plans.controller.ts"), "utf8");
assert.doesNotMatch(controller, /advance-step|advanceStep/);
const schema = readFileSync(resolve(__dirname, "../prisma/schema.prisma"), "utf8");
const migration = readFileSync(resolve(__dirname, "../prisma/migrations/20260910120000_health_plans_foundation/migration.sql"), "utf8");
assert.match(schema, /DEFINITION_UPDATED/);
assert.match(migration, /DEFINITION_UPDATED/);
}

void main();
