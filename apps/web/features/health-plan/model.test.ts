import assert from "node:assert/strict";
import test from "node:test";
import { filterOccurrences, isOverdue, sortOccurrences } from "./model";

const occurrence = (id: string, at: string, member = "alma", plan = "p1", status = "PENDING") => ({ id, healthPlanId: plan, scheduledAt: at, status, healthPlan: { familyMember: { id: member } } }) as never;
test("occurrences from plans and members are chronological and stable", () => assert.deepEqual(sortOccurrences([occurrence("b", "2026-09-11T16:00:00Z"), occurrence("a", "2026-09-11T14:30:00Z")]).map(x => x.id), ["a", "b"]));
test("member and plan filters compose", () => assert.deepEqual(filterOccurrences([occurrence("a", "2026-09-11", "alma", "p1"), occurrence("b", "2026-09-11", "even", "p2")], "alma", "p1").map(x => x.id), ["a"]));
test("only pending past occurrences are overdue", () => { assert.equal(isOverdue(occurrence("a", "2026-09-10", "a", "p", "PENDING"), new Date("2026-09-11")), true); assert.equal(isOverdue(occurrence("a", "2026-09-10", "a", "p", "COMPLETED"), new Date("2026-09-11")), false); });
