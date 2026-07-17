import { mergeCreatedReminder, replaceReminder } from "./cache";
const assert = { equal(actual: unknown, expected: unknown, message: string) { if (actual !== expected) throw new Error(message); }, deepEqual(actual: unknown, expected: unknown, message: string) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message); } };
const old = { id: "old", title: "Old" } as any; const created = { id: "new", title: "New" } as any; const changed = { id: "old", title: "Changed" } as any;
assert.deepEqual(mergeCreatedReminder([old], created), [old, created], "create appends mutation response to cached reminders");
assert.deepEqual(replaceReminder([old, created], changed), [changed, created], "edit replaces cached reminder with mutation response");
console.log("Reminder cache tests passed");
