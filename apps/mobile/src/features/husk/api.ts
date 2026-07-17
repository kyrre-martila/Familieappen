import type { HuskList, Reminder } from "@familieappen/shared";
import { apiRequest } from "../../lib/api/client";

export function getHuskReminders(accessToken: string, familyId: string) {
  return apiRequest<Reminder[]>("/husk/reminders", { accessToken, headers: { "x-family-id": familyId } });
}

export function getHuskLists(accessToken: string, familyId: string) {
  return apiRequest<HuskList[]>("/husk/lists", { accessToken, headers: { "x-family-id": familyId } });
}
