import type { HuskList, Reminder } from "@familieappen/shared";
import { apiRequest } from "../../lib/api/client";
import type { ReminderPayload } from "./reminderForm";
import type { HuskListItemPayload, HuskListPayload } from "./huskListForm";

const familyHeaders = (familyId: string) => ({ "x-family-id": familyId });
export function getHuskReminders(accessToken: string, familyId: string) {
  return apiRequest<Reminder[]>("/husk/reminders", {
    accessToken,
    headers: familyHeaders(familyId),
  });
}
export function getHuskLists(accessToken: string, familyId: string) {
  return apiRequest<HuskList[]>("/husk/lists", {
    accessToken,
    headers: familyHeaders(familyId),
  });
}
export function createHuskReminder(
  accessToken: string,
  familyId: string,
  input: ReminderPayload,
) {
  return apiRequest<Reminder>("/husk/reminders", {
    method: "POST",
    accessToken,
    headers: familyHeaders(familyId),
    body: input,
  });
}
export function updateHuskReminder(
  accessToken: string,
  familyId: string,
  reminderId: string,
  input: ReminderPayload,
) {
  return apiRequest<Reminder>(
    `/husk/reminders/${encodeURIComponent(reminderId)}`,
    {
      method: "PATCH",
      accessToken,
      headers: familyHeaders(familyId),
      body: input,
    },
  );
}
export function completeReminderPayload(
  completedAt = new Date().toISOString(),
) {
  return { archivedAt: completedAt };
}
export function undoCompleteReminderPayload() {
  return { archivedAt: null };
}
export function completeHuskReminder(
  accessToken: string,
  familyId: string,
  reminderId: string,
) {
  return apiRequest<Reminder>(
    `/husk/reminders/${encodeURIComponent(reminderId)}`,
    {
      method: "PATCH",
      accessToken,
      headers: familyHeaders(familyId),
      body: completeReminderPayload(),
    },
  );
}
export function undoCompleteHuskReminder(
  accessToken: string,
  familyId: string,
  reminderId: string,
) {
  return apiRequest<Reminder>(
    `/husk/reminders/${encodeURIComponent(reminderId)}`,
    {
      method: "PATCH",
      accessToken,
      headers: familyHeaders(familyId),
      body: undoCompleteReminderPayload(),
    },
  );
}

export function createHuskList(
  accessToken: string,
  familyId: string,
  input: HuskListPayload,
) {
  return apiRequest<HuskList>("/husk/lists", {
    method: "POST",
    accessToken,
    headers: familyHeaders(familyId),
    body: input,
  });
}
export function updateHuskList(
  accessToken: string,
  familyId: string,
  listId: string,
  input: Partial<HuskListPayload>,
) {
  return apiRequest<HuskList>(`/husk/lists/${encodeURIComponent(listId)}`, {
    method: "PATCH",
    accessToken,
    headers: familyHeaders(familyId),
    body: input,
  });
}
export function createHuskListItem(
  accessToken: string,
  familyId: string,
  listId: string,
  input: HuskListItemPayload,
) {
  return apiRequest<import("@familieappen/shared").HuskListItem>(
    `/husk/lists/${encodeURIComponent(listId)}/items`,
    {
      method: "POST",
      accessToken,
      headers: familyHeaders(familyId),
      body: input,
    },
  );
}
export function updateHuskListItem(
  accessToken: string,
  familyId: string,
  listId: string,
  itemId: string,
  input: Partial<HuskListItemPayload>,
) {
  return apiRequest<import("@familieappen/shared").HuskListItem>(
    `/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      accessToken,
      headers: familyHeaders(familyId),
      body: input,
    },
  );
}
export function deleteHuskListItem(
  accessToken: string,
  familyId: string,
  listId: string,
  itemId: string,
) {
  return apiRequest<import("@familieappen/shared").HuskListItem>(
    `/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE", accessToken, headers: familyHeaders(familyId) },
  );
}
