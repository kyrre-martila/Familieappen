import { addDays, formatDateString, parseDateString } from "../calendar/date";
import { formatReminderDate, getReminderStatus, mapHuskListToViewModel, mapReminderToViewModel, sortReminders } from "./models";
import { isActiveReminder } from "./reminderHistory";

const assert = {
  equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`); },
  deepEqual(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Values are not equal"); },
};

const base = { id: "r", familyId: "f", title: "Påminnelse", icon: "book", dueDate: "2026-07-17T14:30:00.000Z", date: "2026-07-17", reminderMinutesBefore: null, reminder: null, note: null, scope: "family" as const, memberIds: [], sourceType: null, sourceId: null, isPrivate: false, createdByUserId: null, createdAt: "", updatedAt: "", archivedAt: null, audienceMembers: [] };
const localToday = formatDateString(new Date(2026, 6, 17, 23, 55));
const localTomorrow = formatDateString(addDays(parseDateString(localToday), 1));

assert.equal(localToday, "2026-07-17");
assert.equal(localTomorrow, "2026-07-18");
assert.equal(getReminderStatus("2026-07-16", localToday), "overdue");
assert.equal(getReminderStatus(localToday, localToday), "today");
assert.equal(formatReminderDate(localTomorrow, localToday), "I morgen");
assert.equal(mapReminderToViewModel({ ...base, date: "2026-07-16", dueDate: "2026-07-16T14:30:00.000Z" }, localToday).statusLabel, "Forfalt");
assert.equal(isActiveReminder({ archivedAt: null }), true);
assert.equal(isActiveReminder({ archivedAt: "2026-07-17T12:00:00.000Z" }), false);
assert.deepEqual(sortReminders([{ id: "later", title: "Z", status: "upcoming", date: "2026-07-19" }, { id: "today", title: "A", status: "today", date: "2026-07-17" }] as any).map((item) => item.id), ["today", "later"]);
assert.deepEqual(mapHuskListToViewModel({ id: "l", title: "Pakking", icon: "home", completedCount: 2, totalCount: 4, items: [], scope: "family", memberIds: [] } as any), { id: "l", title: "Pakking", icon: "home", completedCount: 2, totalCount: 4, progressPercent: 50, progressLabel: "2 av 4 fullført", audienceLabel: "Hele familien" });
console.log("Husk view model tests passed");
