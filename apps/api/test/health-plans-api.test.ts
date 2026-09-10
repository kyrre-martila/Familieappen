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
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [] }), BadRequestException);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], levelIndex: 1 }] }), /level 0/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [valid.levels[0], { ...valid.levels[0], levelIndex: 2 }] }), /contiguous/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], stepOrder: 1 }] }] }), /ordered from 0/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "WEEKDAYS" as const, weekdays: [1, 1], localTime: "08:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] }), /unique ISO weekdays/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "DAILY" as const, weekdays: [1], localTime: "08:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] }), /Daily schedules/);
await assert.rejects(() => service.create("user", "family", { ...valid, levels: [{ ...valid.levels[0], steps: [{ ...valid.levels[0].steps[0], schedules: [{ recurrenceType: "DAILY" as const, localTime: "25:00", actions: [{ sortOrder: 0, title: "A" }] }] }] }] }), /localTime/);
await assert.rejects(() => service.create("user", "family", { ...valid, name: "x".repeat(121) }), /between 1 and 120/);

// Actor-controlled and server-owned fields are deliberately absent from command DTOs.
const source = readFileSync(resolve(__dirname, "../src/health-plans/health-plans.dto.ts"), "utf8");
assert.doesNotMatch(source, /familyId\??:/);
assert.doesNotMatch(source, /authorUserId\??:/);
assert.doesNotMatch(source, /completedByUserId\??:/);
assert.doesNotMatch(source, /completedAt\??:/);
}

void main();
