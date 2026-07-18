import {
  buildCompleteHuskListItemRequest,
  buildCreateHuskListItemRequest,
  buildCreateHuskListRequest,
  buildDeleteHuskListItemRequest,
  buildUncompleteHuskListItemRequest,
  buildSchoolWeekRemindersRequest,
  buildUpdateHuskListItemRequest,
  buildUpdateHuskListRequest,
} from "./api";
import { huskListItemFormToUpdatePayload } from "./huskListForm";

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

const listPayload = {
  title: "Pakk",
  icon: "summer",
  description: null,
  scope: "family" as const,
  memberIds: [],
};
assert.deepEqual(buildCreateHuskListRequest(listPayload), {
  path: "/husk/lists",
  method: "POST",
  body: listPayload,
});
assert.deepEqual(buildUpdateHuskListRequest("list/id", { title: "Ny" }), {
  path: "/husk/lists/list%2Fid",
  method: "PATCH",
  body: { title: "Ny" },
});
const itemPayload = {
  title: "Pass",
  description: null,
  assignedFamilyMemberId: "member 1",
};
assert.deepEqual(buildCreateHuskListItemRequest("list/id", itemPayload), {
  path: "/husk/lists/list%2Fid/items",
  method: "POST",
  body: itemPayload,
});
assert.deepEqual(
  buildUpdateHuskListItemRequest("list/id", "item/id", itemPayload),
  {
    path: "/husk/lists/list%2Fid/items/item%2Fid",
    method: "PATCH",
    body: itemPayload,
  },
);
assert.deepEqual(buildDeleteHuskListItemRequest("list/id", "item/id"), {
  path: "/husk/lists/list%2Fid/items/item%2Fid",
  method: "DELETE",
});
assert.deepEqual(buildCompleteHuskListItemRequest("list/id", "item/id"), {
  path: "/husk/lists/list%2Fid/items/item%2Fid/complete",
  method: "PATCH",
});
assert.equal(
  "body" in buildCompleteHuskListItemRequest("list/id", "item/id"),
  false,
  "complete endpoint does not send a body",
);
assert.deepEqual(buildUncompleteHuskListItemRequest("list/id", "item/id"), {
  path: "/husk/lists/list%2Fid/items/item%2Fid/uncomplete",
  method: "PATCH",
});
assert.equal(
  "body" in buildUncompleteHuskListItemRequest("list/id", "item/id"),
  false,
  "uncomplete endpoint does not send a body",
);
const updatePayload = huskListItemFormToUpdatePayload({
  title: "Pass",
  description: "",
  assignedFamilyMemberId: "member 1",
});
assert.equal(
  "assignedFamilyMemberId" in updatePayload,
  true,
  "mobile sends the single assignee field represented by the backend DTO",
);
assert.equal(
  "assignedMemberIds" in updatePayload,
  false,
  "mobile does not send the lossy multi-assignee alias",
);
assert.equal(
  "dueDate" in updatePayload,
  false,
  "item updates omit dueDate while native due date editing is not implemented",
);
console.log("Husk API contract tests passed");

assert.deepEqual(buildSchoolWeekRemindersRequest("2026-07-13"), {
  path: "/school-week?weekStart=2026-07-13",
});
