import { mergeCreatedReminder, moveReminderBetweenSections, replaceReminder } from "./cache";
const assert = { equal(actual: unknown, expected: unknown, message: string) { if (actual !== expected) throw new Error(message); }, deepEqual(actual: unknown, expected: unknown, message: string) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message); } };
const old = { id: "old", title: "Old" } as any; const created = { id: "new", title: "New" } as any; const changed = { id: "old", title: "Changed" } as any;
assert.deepEqual(mergeCreatedReminder([old], created), [old, created], "create appends mutation response to cached reminders");
assert.deepEqual(replaceReminder([old, created], changed), [changed, created], "edit replaces cached reminder with mutation response");
assert.deepEqual(moveReminderBetweenSections([{ ...old, archivedAt: null }], { ...old, archivedAt: "2026-07-17T12:00:00.000Z" } as any), [{ ...old, archivedAt: "2026-07-17T12:00:00.000Z" }], "complete response updates the cached reminder for active to history");
assert.deepEqual(moveReminderBetweenSections([{ ...old, archivedAt: "2026-07-17T12:00:00.000Z" }], { ...old, archivedAt: null } as any), [{ ...old, archivedAt: null }], "undo response updates the cached reminder for history to active");
console.log("Reminder cache tests passed");
