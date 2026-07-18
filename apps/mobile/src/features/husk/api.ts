import type { HuskList, HuskListItem, Reminder } from "@familieappen/shared";
import { apiRequest } from "../../lib/api/client";
import type { ReminderPayload } from "./reminderForm";
import type { HuskListItemPayload, HuskListPayload } from "./huskListForm";

const familyHeaders = (familyId: string) => ({ "x-family-id": familyId });

type HuskRequest = {
  path: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
};
export function buildCreateHuskListRequest(
  input: HuskListPayload,
): HuskRequest {
  return { path: "/husk/lists", method: "POST", body: input };
}
export function buildUpdateHuskListRequest(
  listId: string,
  input: Partial<HuskListPayload>,
): HuskRequest {
  return {
    path: `/husk/lists/${encodeURIComponent(listId)}`,
    method: "PATCH",
    body: input,
  };
}
export function buildCreateHuskListItemRequest(
  listId: string,
  input: HuskListItemPayload,
): HuskRequest {
  return {
    path: `/husk/lists/${encodeURIComponent(listId)}/items`,
    method: "POST",
    body: input,
  };
}
export function buildUpdateHuskListItemRequest(
  listId: string,
  itemId: string,
  input: Partial<HuskListItemPayload>,
): HuskRequest {
  return {
    path: `/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
    method: "PATCH",
    body: input,
  };
}
export function buildDeleteHuskListItemRequest(
  listId: string,
  itemId: string,
): HuskRequest {
  return {
    path: `/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
    method: "DELETE",
  };
}
export function buildCompleteHuskListItemRequest(
  listId: string,
  itemId: string,
): HuskRequest {
  return {
    path: `/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/complete`,
    method: "PATCH",
  };
}
export function buildUncompleteHuskListItemRequest(
  listId: string,
  itemId: string,
): HuskRequest {
  return {
    path: `/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/uncomplete`,
    method: "PATCH",
  };
}
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
  const request = buildCreateHuskListRequest(input);
  return apiRequest<HuskList>(request.path, {
    method: request.method,
    accessToken,
    headers: familyHeaders(familyId),
    body: request.body,
  });
}
export function updateHuskList(
  accessToken: string,
  familyId: string,
  listId: string,
  input: Partial<HuskListPayload>,
) {
  const request = buildUpdateHuskListRequest(listId, input);
  return apiRequest<HuskList>(request.path, {
    method: request.method,
    accessToken,
    headers: familyHeaders(familyId),
    body: request.body,
  });
}
export function createHuskListItem(
  accessToken: string,
  familyId: string,
  listId: string,
  input: HuskListItemPayload,
) {
  const request = buildCreateHuskListItemRequest(listId, input);
  return apiRequest<HuskListItem>(request.path, {
    method: request.method,
    accessToken,
    headers: familyHeaders(familyId),
    body: request.body,
  });
}
export function updateHuskListItem(
  accessToken: string,
  familyId: string,
  listId: string,
  itemId: string,
  input: Partial<HuskListItemPayload>,
) {
  const request = buildUpdateHuskListItemRequest(listId, itemId, input);
  return apiRequest<HuskListItem>(request.path, {
    method: request.method,
    accessToken,
    headers: familyHeaders(familyId),
    body: request.body,
  });
}
export function deleteHuskListItem(
  accessToken: string,
  familyId: string,
  listId: string,
  itemId: string,
) {
  const request = buildDeleteHuskListItemRequest(listId, itemId);
  return apiRequest<HuskListItem>(request.path, {
    method: request.method,
    accessToken,
    headers: familyHeaders(familyId),
  });
}

export function completeHuskListItem(
  accessToken: string,
  familyId: string,
  listId: string,
  itemId: string,
) {
  const request = buildCompleteHuskListItemRequest(listId, itemId);
  return apiRequest<HuskListItem>(request.path, {
    method: request.method,
    accessToken,
    headers: familyHeaders(familyId),
  });
}
export function uncompleteHuskListItem(
  accessToken: string,
  familyId: string,
  listId: string,
  itemId: string,
) {
  const request = buildUncompleteHuskListItemRequest(listId, itemId);
  return apiRequest<HuskListItem>(request.path, {
    method: request.method,
    accessToken,
    headers: familyHeaders(familyId),
  });
}
