// @ts-nocheck
import assert from "node:assert/strict";
import { filterSchoolWeekByQuery, filterTasksByQuery } from "./search";

const tasks = [
  { id: "1", title: "Kjøp melk", description: "Husk lettmelk", assigneeLabel: "Anna", dueLabel: "20. juli", completed: false },
  { id: "2", title: "Rydd garasje", description: null, assigneeLabel: "Alle", dueLabel: null, completed: true },
] as any;

assert.deepEqual(filterTasksByQuery(tasks, "melk").map((task) => task.id), ["1"]);
assert.deepEqual(filterTasksByQuery(tasks, "ANNA").map((task) => task.id), ["1"]);
assert.deepEqual(filterTasksByQuery(tasks, "").map((task) => task.id), ["1", "2"]);

const schoolItems = [
  { id: "s1", title: "Gymtøy", note: "Ta med sko", childLabel: "Mina", dayLabel: "Mandag" },
  { id: "s2", title: "Bibliotek", note: null, childLabel: "Ola", dayLabel: "Fredag" },
] as any;

assert.deepEqual(filterSchoolWeekByQuery(schoolItems, "fredag").map((item) => item.id), ["s2"]);
assert.deepEqual(filterSchoolWeekByQuery(schoolItems, "sko").map((item) => item.id), ["s1"]);
