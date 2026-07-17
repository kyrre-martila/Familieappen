import type { HuskList, Reminder } from "@familieappen/shared";
import { apiRequest } from "../../lib/api/client";

export function getHuskReminders(accessToken: string, familyId: string) {
  return apiRequest<Reminder[]>("/husk/reminders", { accessToken, headers: { "x-family-id": familyId } });
}

export function getHuskLists(accessToken: string, familyId: string) {
  return apiRequest<HuskList[]>("/husk/lists", { accessToken, headers: { "x-family-id": familyId } });
}

export function createHuskReminder(accessToken: string, familyId: string, input: import("./reminderForm").ReminderPayload) { return apiRequest<Reminder>("/husk/reminders", { method: "POST", accessToken, headers: { "x-family-id": familyId }, body: input }); }
export function updateHuskReminder(accessToken: string, familyId: string, reminderId: string, input: import("./reminderForm").ReminderPayload) { return apiRequest<Reminder>(`/husk/reminders/${encodeURIComponent(reminderId)}`, { method: "PATCH", accessToken, headers: { "x-family-id": familyId }, body: input }); }
