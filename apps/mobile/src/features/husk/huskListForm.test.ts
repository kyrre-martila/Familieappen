import {
  defaultHuskListForm,
  huskListFormToCreatePayload,
  huskListFormToUpdatePayload,
  huskListItemFormToPayload,
  huskListToForm,
  validateHuskListForm,
  validateHuskListItemForm,
} from "./huskListForm";
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
assert.deepEqual(defaultHuskListForm(), {
  title: "",
  icon: "home",
  description: "",
  scope: "family",
  memberIds: [],
});
assert.equal(
  validateHuskListForm(defaultHuskListForm()).title,
  "Skriv inn listenavn.",
);
assert.equal(
  validateHuskListForm({ ...defaultHuskListForm(), title: "   " }).title,
  "Skriv inn listenavn.",
);
assert.equal(
  validateHuskListForm({
    ...defaultHuskListForm(),
    title: "Tur",
    scope: "members",
    memberIds: [],
  }).memberIds,
  "Velg minst én person, eller velg hele familien.",
);
const list = {
  title: "Pakk",
  icon: "summer",
  description: null,
  scope: "members",
  memberIds: ["m1"],
} as any;
assert.deepEqual(huskListToForm(list), {
  title: "Pakk",
  icon: "summer",
  description: "",
  scope: "members",
  memberIds: ["m1"],
});
assert.deepEqual(
  huskListFormToCreatePayload({
    title: "  Pakk ",
    icon: "summer",
    description: " ",
    scope: "family",
    memberIds: ["m1"],
  }),
  {
    title: "Pakk",
    icon: "summer",
    description: null,
    scope: "family",
    memberIds: [],
  },
);
assert.deepEqual(
  huskListFormToUpdatePayload({
    title: " Mat ",
    icon: "home",
    description: "Butikk",
    scope: "members",
    memberIds: ["m1", "m1"],
  }),
  {
    title: "Mat",
    icon: "home",
    description: "Butikk",
    scope: "members",
    memberIds: ["m1"],
  },
);
assert.equal(
  validateHuskListItemForm({
    title: " ",
    description: "",
    assignedMemberIds: [],
  }).title,
  "Skriv inn element.",
);
assert.deepEqual(
  huskListItemFormToPayload({
    title: " Pass ",
    description: " ",
    assignedMemberIds: ["m1", "m1"],
  }),
  { title: "Pass", description: null, assignedMemberIds: ["m1"] },
);
console.log("Husk list form tests passed");
