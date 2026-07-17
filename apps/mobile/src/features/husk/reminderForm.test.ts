import { defaultReminderForm, reminderFormToPayload, reminderToForm, validateReminderForm } from "./reminderForm";
const assert = { equal(actual: unknown, expected: unknown, message: string) { if (actual !== expected) throw new Error(message); }, deepEqual(actual: unknown, expected: unknown, message: string) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message); } };
const form = defaultReminderForm("2026-07-17");
assert.deepEqual(validateReminderForm(form), { title: "Skriv inn hva som skal huskes." }, "create validation blocks an empty title");
const complete = { ...form, title: "  Tannlege ", note: "  Husk kort  ", time: "14:30", scope: "members" as const, memberIds: ["member-1"], isPrivate: true };
assert.deepEqual(reminderFormToPayload(complete), { title: "Tannlege", icon: "backpack", dueDate: "2026-07-17T14:30:00", reminderMinutesBefore: 1440, note: "Husk kort", scope: "members", memberIds: ["member-1"], isPrivate: true }, "form maps to the existing create/update DTO");
const hydrated = reminderToForm({ id: "r", familyId: "f", title: "Tannlege", icon: "tooth", dueDate: "2026-07-17T14:30:00.000Z", date: "2026-07-17", reminderMinutesBefore: null, reminder: null, note: null, scope: "family", memberIds: [], sourceType: null, sourceId: null, isPrivate: false, createdByUserId: null, createdAt: "", updatedAt: "", archivedAt: null, audienceMembers: [] });
assert.equal(hydrated.title, "Tannlege", "edit form hydrates title"); assert.equal(hydrated.date, "2026-07-17", "edit form hydrates DTO date without UTC parsing"); assert.equal(hydrated.reminderEnabled, false, "edit form hydrates disabled notification");
console.log("Reminder form tests passed");
