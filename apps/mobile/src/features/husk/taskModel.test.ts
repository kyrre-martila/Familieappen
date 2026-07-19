import type { Task } from "@familieappen/shared";
import { getTaskAssignedMemberIds, mapTaskToViewModel, mergeCreatedTask, removeTask, replaceTask, sortTasks } from "./taskModel";

const assert = {
  equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`); },
  deepEqual(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`); },
};

const base = (input: Partial<Task>): Task => ({
  id: input.id ?? "task",
  familyId: "family",
  title: input.title ?? "Task",
  description: input.description ?? null,
  assignedFamilyMemberId: input.assignedFamilyMemberId ?? null,
  assignedMemberIds: input.assignedMemberIds,
  createdByUserId: null,
  completed: input.completed ?? false,
  completedAt: null,
  completedByUserId: null,
  dueDate: input.dueDate ?? null,
  createdAt: input.createdAt ?? "2026-01-01T00:00:00.000Z",
  updatedAt: input.updatedAt ?? "2026-01-01T00:00:00.000Z",
});

assert.deepEqual(getTaskAssignedMemberIds(base({ assignedFamilyMemberId: "m1" })), ["m1"]);
assert.deepEqual(getTaskAssignedMemberIds(base({ assignedMemberIds: ["m2", "m3"], assignedFamilyMemberId: "m1" })), ["m2", "m3"]);

assert.deepEqual(sortTasks([
  base({ id: "completed", completed: true, dueDate: "2026-01-01" }),
  base({ id: "late", dueDate: "2026-01-03" }),
  base({ id: "early", dueDate: "2026-01-02" }),
]).map((task) => task.id), ["early", "late", "completed"]);

const mapped = mapTaskToViewModel(base({ assignedMemberIds: ["m1", "m2"], dueDate: "2026-02-03T12:00:00.000Z" }), [{ id: "m1", displayName: "Ada" }, { id: "m2", displayName: "Bo" }]);
assert.equal(mapped.assigneeLabel, "2 personer");
assert.equal(mapped.dueLabel, "2026-02-03");

assert.deepEqual((mergeCreatedTask([base({ id: "a" })], base({ id: "b" })) ?? []).map((task) => task.id), ["a", "b"]);
assert.equal((replaceTask([base({ id: "a", title: "Old" })], base({ id: "a", title: "New" })) ?? [])[0]?.title, "New");
assert.deepEqual(removeTask([base({ id: "a" }), base({ id: "b" })], "a")?.map((task) => task.id), ["b"]);
