import {
  appendHuskListItem,
  mergeCreatedHuskList,
  removeHuskListItem,
  replaceHuskList,
  replaceHuskListItem,
} from "./listCache";
const assert = {
  equal(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected)
      throw new Error(message ?? `${actual} !== ${expected}`);
  },
  deepEqual(actual: unknown, expected: unknown, message?: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(
        message ?? `${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`,
      );
  },
};
const item = (id: string, completed = false, sortOrder = 0) => ({
  id,
  listId: "l1",
  title: id,
  description: null,
  completed,
  completedAt: completed ? "x" : null,
  assignedFamilyMemberId: null,
  dueDate: null,
  sortOrder,
  createdAt: "",
  updatedAt: "",
});
const l1 = {
  id: "l1",
  title: "Old",
  items: [item("i1")],
  totalCount: 1,
  completedCount: 0,
} as any;
const l2 = {
  id: "l2",
  title: "Other",
  items: [item("o")],
  totalCount: 1,
  completedCount: 0,
} as any;
const created = {
  id: "l3",
  title: "New",
  items: [],
  totalCount: 0,
  completedCount: 0,
} as any;
assert.deepEqual(
  mergeCreatedHuskList([l1], created).map((l) => l.id),
  ["l1", "l3"],
);
assert.deepEqual(mergeCreatedHuskList(undefined, created), [created]);
assert.equal(mergeCreatedHuskList([created], created).length, 1);
assert.deepEqual(
  replaceHuskList([l1, l2], { ...l1, title: "Changed" } as any)!.map(
    (l) => l.title,
  ),
  ["Changed", "Other"],
);
const added = item("i2", true, 2);
const afterAdd = appendHuskListItem([l1, l2], "l1", added)!;
assert.equal(afterAdd[0]!.totalCount, 2);
assert.equal(afterAdd[0]!.completedCount, 1);
assert.equal(afterAdd[1]!, l2);
const afterReplace = replaceHuskListItem(afterAdd, "l1", {
  ...added,
  title: "new",
})!;
assert.equal(afterReplace[0]!.items.find((i) => i.id === "i2")!.title, "new");
const afterRemove = removeHuskListItem(afterReplace, "l1", "i1")!;
assert.deepEqual(
  afterRemove[0]!.items.map((i) => i.id),
  ["i2"],
);
assert.equal(afterRemove[0]!.totalCount, 1);
console.log("Husk list cache tests passed");
const completedResponse = { ...item("i1", true, 7), title: "done" };
const completedOnce = replaceHuskListItem([l1, l2], "l1", completedResponse)!;
assert.equal(
  completedOnce[0]!.completedCount,
  1,
  "completedCount increases when an active item is completed",
);
assert.equal(
  completedOnce[0]!.totalCount,
  1,
  "totalCount is unchanged when an item is completed",
);
assert.equal(
  completedOnce[0]!.items[0]!.completed,
  true,
  "active item is replaced by completed server response",
);
assert.equal(
  completedOnce[0]!.items[0]!.sortOrder,
  7,
  "sortOrder from server response is preserved",
);
assert.equal(completedOnce[1]!, l2, "other lists are preserved by reference");
const completedAgain = replaceHuskListItem(
  completedOnce,
  "l1",
  completedResponse,
)!;
assert.equal(
  completedAgain[0]!.items.length,
  1,
  "completing an already completed response does not duplicate items",
);
const withTwoCompleted = {
  ...l1,
  items: [item("i1", true, 1), item("i2", true, 2)],
  totalCount: 2,
  completedCount: 2,
} as any;
const undone = replaceHuskListItem([withTwoCompleted, l2], "l1", {
  ...item("i2", false, 2),
  title: "active again",
})!;
assert.equal(
  undone[0]!.completedCount,
  1,
  "completedCount decreases when completion is undone",
);
assert.equal(
  undone[0]!.totalCount,
  2,
  "totalCount is unchanged when completion is undone",
);
assert.deepEqual(
  undone[0]!.items.map((i) => i.id),
  ["i1", "i2"],
  "other items are preserved and sortOrder order remains stable",
);
assert.equal(
  undone[0]!.items[0]!.completed,
  true,
  "other elements keep their status",
);
const undoneAgain = replaceHuskListItem(undone, "l1", {
  ...item("i2", false, 2),
  title: "still active",
})!;
assert.equal(
  undoneAgain[0]!.items.length,
  2,
  "undoing an already active response does not duplicate items",
);
const removeCompleted = removeHuskListItem([withTwoCompleted], "l1", "i1")!;
assert.equal(
  removeCompleted[0]!.totalCount,
  1,
  "deleting a completed item still recalculates totalCount",
);
assert.equal(
  removeCompleted[0]!.completedCount,
  1,
  "deleting a completed item still recalculates completedCount",
);
