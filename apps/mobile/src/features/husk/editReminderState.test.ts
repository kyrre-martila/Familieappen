import { resolveEditReminderScreenState } from "./editReminderState";
const assert = { equal(actual: unknown, expected: unknown, message: string) { if (actual !== expected) throw new Error(message); } };
const base = { reminderId: "reminder", loading: false, familiesLoading: false, error: null, missingContext: false, reminder: { id: "reminder" } as any, formReady: true };
assert.equal(resolveEditReminderScreenState({ ...base, reminder: null, formReady: false }), "not-found", "missing reminder never remains loading");
assert.equal(resolveEditReminderScreenState({ ...base, error: new Error("nope"), formReady: false }), "error", "query error wins over hydration");
assert.equal(resolveEditReminderScreenState({ ...base, missingContext: true, formReady: false }), "missing-context", "missing family is controlled");
assert.equal(resolveEditReminderScreenState({ ...base, formReady: false }), "hydrating", "valid reminder waits only for hydration");
assert.equal(resolveEditReminderScreenState(base), "ready", "valid reminder renders form after hydration");
console.log("Reminder edit state tests passed");
