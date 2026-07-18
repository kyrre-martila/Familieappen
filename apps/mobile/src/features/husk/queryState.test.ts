import { findCachedHuskList, huskListsQueryKey, huskQueryEnabled } from "./queryState";
import { huskQueryKeys } from "./queryKeys";
import { getHuskListBackAction } from "./navigation";
import { selectHuskView } from "./viewState";

const assert = {
  equal(actual: unknown, expected: unknown, message: string) { if (actual !== expected) throw new Error(message); },
  deepEqual(actual: unknown, expected: unknown, message: string) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message); },
};

assert.equal(huskQueryEnabled({ accessToken: "token", familyId: "family", view: "reminders", dataset: "reminders" }), true, "reminders are enabled in reminder view");
assert.equal(huskQueryEnabled({ accessToken: "token", familyId: "family", view: "reminders", dataset: "lists" }), false, "lists are disabled in reminder view");
assert.equal(huskQueryEnabled({ accessToken: "token", familyId: "family", view: "lists", dataset: "lists" }), true, "lists are enabled in list view");
assert.equal(huskQueryEnabled({ accessToken: "token", familyId: "family", view: "lists", dataset: "reminders" }), false, "reminders are disabled in list view");
assert.deepEqual(huskListsQueryKey("family"), huskQueryKeys.lists("family"), "overview and detail use the canonical list key");
const cachedLists = [{ id: "packing", items: [] }, { id: "shopping", items: [] }] as any;
assert.equal(findCachedHuskList(cachedLists, "shopping"), cachedLists[1], "detail reads the selected list from canonical cached data");
assert.equal(findCachedHuskList(cachedLists, null), undefined, "missing IDs do not read a cached list");
assert.deepEqual(selectHuskView({ view: "reminders", reminderFilter: "history" }, "lists"), { view: "lists", reminderFilter: "history" }, "switching to lists preserves the reminder filter");
assert.deepEqual(selectHuskView({ view: "lists", reminderFilter: "history" }, "reminders"), { view: "reminders", reminderFilter: "history" }, "switching back preserves the reminder filter");
assert.equal(getHuskListBackAction(true), "back", "list details return through the existing list overview stack entry");
assert.equal(getHuskListBackAction(false), "husk", "direct list links use the stable Husk fallback");
console.log("Husk query state tests passed");
