import type { HuskList, HuskListItem, Reminder, SchoolWeekReminder, Task } from "@familieappen/shared";
import { apiRequest } from "../../lib/api/client";
import type { ReminderPayload } from "./reminderForm";
import type { HuskListItemPayload, HuskListPayload } from "./huskListForm";
import type { TaskPayload } from "./taskModel";

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

export function getTasks(accessToken: string, familyId: string) {
  return apiRequest<Task[]>("/tasks", { accessToken, headers: familyHeaders(familyId) });
}
export function createTask(accessToken: string, familyId: string, input: TaskPayload) {
  return apiRequest<Task>("/tasks", { method: "POST", accessToken, headers: familyHeaders(familyId), body: input });
}
export function updateTask(accessToken: string, familyId: string, taskId: string, input: TaskPayload) {
  return apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", accessToken, headers: familyHeaders(familyId), body: input });
}
export function toggleTask(accessToken: string, familyId: string, taskId: string) {
  return apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}/toggle`, { method: "PATCH", accessToken, headers: familyHeaders(familyId) });
}
export function deleteTask(accessToken: string, familyId: string, taskId: string) {
  return apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE", accessToken, headers: familyHeaders(familyId) });
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

export function buildSchoolWeekRemindersRequest(weekStart: string): HuskRequest {
  const params = new URLSearchParams({ weekStart });
  return { path: `/school-week?${params.toString()}` };
}

export function getSchoolWeekReminders(accessToken: string, familyId: string, weekStart: string) {
  const request = buildSchoolWeekRemindersRequest(weekStart);
  return apiRequest<SchoolWeekReminder[]>(request.path, {
    accessToken,
    headers: familyHeaders(familyId),
  });
}


export type SchoolWeekPayload = {
  childFamilyMemberId: string;
  title: string;
  icon: string;
  weekday: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  date: string;
  isRecurring?: boolean;
  recurrenceFrequency?: "weekly";
  recurrenceEndDate?: string | null;
  note?: string | null;
};

export function buildCreateSchoolWeekReminderRequest(input: SchoolWeekPayload): HuskRequest {
  return { path: "/school-week", method: "POST", body: input };
}
export function buildUpdateSchoolWeekReminderRequest(reminderId: string, input: Partial<SchoolWeekPayload> & { scope?: "occurrence" | "series"; occurrenceDate?: string }): HuskRequest {
  return { path: `/school-week/${encodeURIComponent(reminderId)}`, method: "PATCH", body: input };
}
export function buildDeleteSchoolWeekReminderRequest(reminderId: string, input: { scope?: "occurrence" | "series"; occurrenceDate?: string } = {}): HuskRequest {
  const params = new URLSearchParams();
  if (input.scope) params.set("scope", input.scope);
  if (input.occurrenceDate) params.set("occurrenceDate", input.occurrenceDate);
  const query = params.toString();
  return { path: `/school-week/${encodeURIComponent(reminderId)}${query ? `?${query}` : ""}`, method: "DELETE" };
}

export function createSchoolWeekReminder(accessToken: string, familyId: string, input: SchoolWeekPayload) {
  const request = buildCreateSchoolWeekReminderRequest(input);
  return apiRequest<SchoolWeekReminder>(request.path, { method: request.method, accessToken, headers: familyHeaders(familyId), body: request.body });
}

export function updateSchoolWeekReminder(accessToken: string, familyId: string, reminderId: string, input: Partial<SchoolWeekPayload> & { scope?: "occurrence" | "series"; occurrenceDate?: string }) {
  const request = buildUpdateSchoolWeekReminderRequest(reminderId, input);
  return apiRequest<SchoolWeekReminder>(request.path, { method: request.method, accessToken, headers: familyHeaders(familyId), body: request.body });
}

export function deleteSchoolWeekReminder(accessToken: string, familyId: string, reminderId: string, input: { scope?: "occurrence" | "series"; occurrenceDate?: string } = {}) {
  const request = buildDeleteSchoolWeekReminderRequest(reminderId, input);
  return apiRequest<SchoolWeekReminder>(request.path, { method: request.method, accessToken, headers: familyHeaders(familyId) });
}
