import type { HuskList, Reminder } from "@familieappen/shared";
import { apiRequest } from "../../lib/api/client";
import type { ReminderPayload } from "./reminderForm";

const familyHeaders = (familyId: string) => ({ "x-family-id": familyId });
export function getHuskReminders(accessToken: string, familyId: string) { return apiRequest<Reminder[]>("/husk/reminders", { accessToken, headers: familyHeaders(familyId) }); }
export function getHuskLists(accessToken: string, familyId: string) { return apiRequest<HuskList[]>("/husk/lists", { accessToken, headers: familyHeaders(familyId) }); }
export function createHuskReminder(accessToken: string, familyId: string, input: ReminderPayload) { return apiRequest<Reminder>("/husk/reminders", { method: "POST", accessToken, headers: familyHeaders(familyId), body: input }); }
export function updateHuskReminder(accessToken: string, familyId: string, reminderId: string, input: ReminderPayload) { return apiRequest<Reminder>(`/husk/reminders/${encodeURIComponent(reminderId)}`, { method: "PATCH", accessToken, headers: familyHeaders(familyId), body: input }); }
export function completeReminderPayload(completedAt = new Date().toISOString()) { return { archivedAt: completedAt }; }
export function undoCompleteReminderPayload() { return { archivedAt: null }; }
export function completeHuskReminder(accessToken: string, familyId: string, reminderId: string) { return apiRequest<Reminder>(`/husk/reminders/${encodeURIComponent(reminderId)}`, { method: "PATCH", accessToken, headers: familyHeaders(familyId), body: completeReminderPayload() }); }
export function undoCompleteHuskReminder(accessToken: string, familyId: string, reminderId: string) { return apiRequest<Reminder>(`/husk/reminders/${encodeURIComponent(reminderId)}`, { method: "PATCH", accessToken, headers: familyHeaders(familyId), body: undoCompleteReminderPayload() }); }
