import { groupHuskListItems, huskListCardAccessibilityLabel, mapHuskListToViewModel, sortHuskLists } from "./models";

const assert = {
  equal(actual: unknown, expected: unknown, message: string) { if (actual !== expected) throw new Error(message); },
  deepEqual(actual: unknown, expected: unknown, message: string) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message); },
};
const item = (id: string, completed: boolean, sortOrder: number) => ({ id, title: id, description: null, completed, sortOrder });
const list = (id: string, title: string, items = [item("first", false, 2), item("second", true, 1)]) => ({ id, title, icon: "home", archived: false, scope: "family", memberIds: [], audienceMembers: [], completedCount: items.filter((value) => value.completed).length, totalCount: items.length, items });

assert.equal(mapHuskListToViewModel(list("empty", "Tom", []) as any).progressPercent, 0, "0 av 0 is zero percent");
assert.equal(mapHuskListToViewModel(list("partial", "Delvis") as any).progressLabel, "1 av 2 fullført", "partial progress uses completed count");
assert.equal(mapHuskListToViewModel(list("done", "Ferdig", [item("a", true, 0)]) as any).progressPercent, 100, "completed list is 100 percent");
assert.deepEqual(sortHuskLists([list("b", "Å", []), { ...list("a", "A", []), archived: true }, list("c", "B", [])] as any).map((value) => value.id), ["c", "b"], "active lists are alphabetically sorted and archived lists omitted");
assert.deepEqual(groupHuskListItems(list("items", "Elementer") as any).active.map((value) => value.id), ["first"], "active items retain sort order");
assert.deepEqual(groupHuskListItems(list("items", "Elementer") as any).completed.map((value) => value.id), ["second"], "completed items are grouped separately");
assert.equal(huskListCardAccessibilityLabel(mapHuskListToViewModel(list("pack", "Pakkeliste") as any)), "Pakkeliste. 1 av 2 fullført elementer.", "list card announces progress");
console.log("Husk list view tests passed");
