import { getAccessToken } from "./session";

import type {
  CalendarEvent,
  Family,
  FamilyDashboardResponse,
  FamilyMember,
  FamilyMemberRole,
  ManualFamilyMemberRole,
  MealPlan,
  MealPlanDay,
  MoveMealResult,
  ShoppingList,
  ShoppingListItem,
  SharedWishlistItem,
  SharedWishlistItemsResponse,
  SharedWishlistSummary,
  Task,
  WishlistItem,
  WishlistItemCreateInput,
  WishlistItemListResponse,
  WishlistItemUpdateInput,
  WishlistSummary,
  WishlistInvitePreview,
  WishlistShareInvitation,
  WishlistShareInviteResponse,
  Reminder,
  HuskList,
  HuskListItem,
  SchoolWeekReminder
} from "@familieappen/shared";

export type { CalendarEvent, Family, FamilyDashboardResponse, FamilyMember, FamilyMemberRole, ManualFamilyMemberRole, MealPlan, MealPlanDay, MoveMealResult, ShoppingList, ShoppingListItem, SharedWishlistItem, SharedWishlistItemsResponse, SharedWishlistSummary, Task, WishlistItem, WishlistItemCreateInput, WishlistItemListResponse, WishlistItemUpdateInput, WishlistSummary, WishlistInvitePreview, WishlistShareInvitation, WishlistShareInviteResponse, Reminder, HuskList, HuskListItem, SchoolWeekReminder };


type LegacyWishlistItem = WishlistItem & {
  productUrl?: string | null;
  estimatedPrice?: string | null;
  purchased?: boolean;
  unavailable?: boolean;
  reserved?: boolean;
};

export interface Wishlist {
  id: string;
  familyId: string;
  ownerFamilyMemberId: string;
  title: string;
  description: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  items: LegacyWishlistItem[];
}

export interface WishlistShare {
  token: string;
  shareUrl: string;
  expiresAt: string | null;
}

export type PublicWishlistItem = Pick<WishlistItem, "id" | "title" | "description" | "imageUrl"> & {
  productUrl?: string | null;
  estimatedPrice?: string | null;
  purchased?: boolean;
  unavailable?: boolean;
  reserved?: boolean;
};

export interface PublicWishlist {
  id: string;
  title: string;
  description: string | null;
  items: PublicWishlistItem[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
  };
}

export interface FamilyDetails {
  family: Family;
  members: FamilyMember[];
}

export interface FamilyWithMembership {
  family: Family;
  membership: FamilyMember;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

interface ApiEnvelope<TData> {
  data: TData;
}

interface ApiErrorBody {
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
  }
}

export async function register(input: { name: string; email: string; password: string }): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: input,
    includeAuth: false
  });
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: input,
    includeAuth: false
  });
}

export async function createFamily(input: { name: string }): Promise<FamilyDetails> {
  return apiRequest<FamilyDetails>("/families", {
    method: "POST",
    body: input
  });
}

export async function listFamilies(): Promise<FamilyWithMembership[]> {
  return apiRequest<FamilyWithMembership[]>("/families");
}

export async function getFamily(familyId: string): Promise<FamilyDetails> {
  return apiRequest<FamilyDetails>(`/families/${encodeURIComponent(familyId)}`);
}

export async function getFamilyDashboard(familyId: string): Promise<FamilyDashboardResponse> {
  return apiRequest<FamilyDashboardResponse>(`/families/${encodeURIComponent(familyId)}/dashboard`);
}

export async function addFamilyMember(
  familyId: string,
  input: { displayName: string; role: ManualFamilyMemberRole }
): Promise<FamilyMember> {
  return apiRequest<FamilyMember>(`/families/${encodeURIComponent(familyId)}/members`, {
    method: "POST",
    body: input
  });
}

export async function removeFamilyMember(familyId: string, memberId: string): Promise<FamilyMember> {
  return apiRequest<FamilyMember>(
    `/families/${encodeURIComponent(familyId)}/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE" }
  );
}

export async function getMyWishlistItems(familyId: string): Promise<WishlistItemListResponse> {
  return apiRequest<WishlistItemListResponse>("/wishlist", { familyId });
}

export async function getWishlistShareInvitations(familyId: string): Promise<WishlistShareInvitation[]> {
  return apiRequest<WishlistShareInvitation[]>("/wishlist/share", { familyId });
}

export async function inviteToWishlistByEmail(familyId: string, email: string): Promise<WishlistShareInviteResponse> {
  return apiRequest<WishlistShareInviteResponse>("/wishlist/share/invite", {
    method: "POST",
    body: { email },
    familyId
  });
}

export async function resendWishlistShareInvitation(familyId: string, inviteId: string): Promise<WishlistShareInviteResponse> {
  return apiRequest<WishlistShareInviteResponse>(`/wishlist/share/${encodeURIComponent(inviteId)}/resend`, {
    method: "POST",
    familyId
  });
}

export async function revokeWishlistShareInvitation(familyId: string, inviteId: string): Promise<WishlistShareInvitation> {
  return apiRequest<WishlistShareInvitation>(`/wishlist/share/${encodeURIComponent(inviteId)}/revoke`, {
    method: "POST",
    familyId
  });
}

export async function getWishlistInvitePreview(token: string): Promise<WishlistInvitePreview> {
  return apiRequest<WishlistInvitePreview>(`/wishlist/invites/${encodeURIComponent(token)}`, { includeAuth: false });
}

export async function acceptWishlistInvite(token: string): Promise<WishlistShareInvitation> {
  return apiRequest<WishlistShareInvitation>(`/wishlist/invites/${encodeURIComponent(token)}/accept`, { method: "POST" });
}

export async function declineWishlistInvite(token: string): Promise<WishlistShareInvitation> {
  return apiRequest<WishlistShareInvitation>(`/wishlist/invites/${encodeURIComponent(token)}/decline`, { method: "POST" });
}

export async function removeSharedWishlist(shareId: string): Promise<WishlistShareInvitation> {
  return apiRequest<WishlistShareInvitation>(`/wishlist/shared/${encodeURIComponent(shareId)}/remove`, { method: "POST" });
}


export async function getSharedWishlistSummaries(familyId: string): Promise<SharedWishlistSummary[]> {
  return apiRequest<SharedWishlistSummary[]>("/wishlist/shared", { familyId });
}

export async function getSharedWishlistItems(familyId: string, memberId: string): Promise<SharedWishlistItemsResponse> {
  return apiRequest<SharedWishlistItemsResponse>(`/wishlist/shared/${encodeURIComponent(memberId)}`, { familyId });
}


export async function reserveWishlistItem(familyId: string, itemId: string): Promise<SharedWishlistItem> {
  return apiRequest<SharedWishlistItem>(`/wishlist/items/${encodeURIComponent(itemId)}/reserve`, {
    method: "POST",
    familyId
  });
}

export async function unreserveWishlistItem(familyId: string, itemId: string): Promise<SharedWishlistItem> {
  return apiRequest<SharedWishlistItem>(`/wishlist/items/${encodeURIComponent(itemId)}/unreserve`, {
    method: "POST",
    familyId
  });
}

export async function createWishlistItem(
  familyId: string,
  input: WishlistItemCreateInput
): Promise<WishlistItem> {
  return apiRequest<WishlistItem>("/wishlist", {
    method: "POST",
    body: input,
    familyId
  });
}

export async function updateMyWishlistItem(
  familyId: string,
  itemId: string,
  input: WishlistItemUpdateInput
): Promise<WishlistItem> {
  return apiRequest<WishlistItem>(`/wishlist/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: input,
    familyId
  });
}

export async function deleteMyWishlistItem(familyId: string, itemId: string): Promise<WishlistItem> {
  return apiRequest<WishlistItem>(`/wishlist/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    familyId
  });
}

export async function reorderMyWishlistItems(familyId: string, orderedIds: string[]): Promise<WishlistItemListResponse> {
  return apiRequest<WishlistItemListResponse>("/wishlist/reorder", {
    method: "POST",
    body: { orderedIds },
    familyId
  });
}


export async function getWishlists(familyId: string): Promise<WishlistSummary[]> {
  return apiRequest<WishlistSummary[]>("/wishlists", { familyId });
}

export async function createWishlist(
  familyId: string,
  input: { ownerFamilyMemberId: string; title: string; description?: string }
): Promise<Wishlist> {
  return apiRequest<Wishlist>("/wishlists", {
    method: "POST",
    body: input,
    familyId
  });
}

export async function getWishlist(familyId: string, wishlistId: string): Promise<Wishlist> {
  return apiRequest<Wishlist>(`/wishlists/${encodeURIComponent(wishlistId)}`, { familyId });
}

export async function addWishlistItem(
  familyId: string,
  wishlistId: string,
  input: { title: string; description?: string; productUrl?: string; imageUrl?: string; estimatedPrice?: string }
): Promise<WishlistItem> {
  return apiRequest<WishlistItem>(`/wishlists/${encodeURIComponent(wishlistId)}/items`, {
    method: "POST",
    body: input,
    familyId
  });
}

export async function updateWishlistItem(
  familyId: string,
  itemId: string,
  input: { title?: string; description?: string; productUrl?: string; imageUrl?: string; estimatedPrice?: string; purchased?: boolean }
): Promise<WishlistItem> {
  return apiRequest<WishlistItem>(`/wishlists/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: input,
    familyId
  });
}

export async function deleteWishlistItem(familyId: string, itemId: string): Promise<WishlistItem> {
  return apiRequest<WishlistItem>(`/wishlists/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    familyId
  });
}

export async function reserveLegacyWishlistItem(familyId: string, itemId: string): Promise<WishlistItem> {
  return apiRequest<WishlistItem>(`/wishlists/items/${encodeURIComponent(itemId)}/reserve`, {
    method: "POST",
    familyId
  });
}

export async function markWishlistItemPurchased(familyId: string, itemId: string): Promise<WishlistItem> {
  return apiRequest<WishlistItem>(`/wishlists/items/${encodeURIComponent(itemId)}/mark-purchased`, {
    method: "POST",
    familyId
  });
}

export async function createWishlistShare(familyId: string, wishlistId: string): Promise<WishlistShare> {
  return apiRequest<WishlistShare>(`/wishlists/${encodeURIComponent(wishlistId)}/share`, {
    method: "POST",
    familyId
  });
}

export async function getPublicWishlist(token: string): Promise<PublicWishlist> {
  return apiRequest<PublicWishlist>(`/public/wishlists/${encodeURIComponent(token)}`, { includeAuth: false });
}

export async function reservePublicWishlistItem(token: string, itemId: string, reservedByName?: string): Promise<PublicWishlistItem> {
  return apiRequest<PublicWishlistItem>(`/public/wishlists/${encodeURIComponent(token)}/items/${encodeURIComponent(itemId)}/reserve`, {
    method: "POST",
    body: { reservedByName },
    includeAuth: false
  });
}

export async function markPublicWishlistItemPurchased(token: string, itemId: string, reservedByName?: string): Promise<PublicWishlistItem> {
  return apiRequest<PublicWishlistItem>(`/public/wishlists/${encodeURIComponent(token)}/items/${encodeURIComponent(itemId)}/mark-purchased`, {
    method: "POST",
    body: { reservedByName },
    includeAuth: false
  });
}

export async function getShoppingList(familyId: string): Promise<ShoppingList> {
  return apiRequest<ShoppingList>("/shopping", { familyId });
}

export async function addShoppingItem(
  familyId: string,
  input: { label: string; quantity?: string }
): Promise<ShoppingListItem> {
  return apiRequest<ShoppingListItem>("/shopping/items", {
    method: "POST",
    body: input,
    familyId
  });
}

export async function toggleShoppingItem(familyId: string, itemId: string): Promise<ShoppingListItem> {
  return apiRequest<ShoppingListItem>(`/shopping/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    familyId
  });
}

export async function deleteShoppingItem(familyId: string, itemId: string): Promise<ShoppingListItem> {
  return apiRequest<ShoppingListItem>(`/shopping/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    familyId
  });
}

export async function getMealPlan(familyId: string): Promise<MealPlan> {
  return apiRequest<MealPlan>("/meals", { familyId });
}

export async function addMealPlanDay(
  familyId: string,
  input: { date: string; mealName?: string; title?: string; notes?: string | null; note?: string | null }
): Promise<MealPlanDay> {
  return apiRequest<MealPlanDay>("/meals", {
    method: "POST",
    body: input,
    familyId
  });
}

export async function updateMealPlanDay(
  familyId: string,
  dayId: string,
  input: { date?: string; mealName?: string; title?: string; notes?: string | null; note?: string | null }
): Promise<MealPlanDay> {
  return apiRequest<MealPlanDay>(`/meals/${encodeURIComponent(dayId)}`, {
    method: "PATCH",
    body: input,
    familyId
  });
}

export async function deleteMealPlanDay(familyId: string, dayId: string): Promise<MealPlanDay> {
  return apiRequest<MealPlanDay>(`/meals/${encodeURIComponent(dayId)}`, {
    method: "DELETE",
    familyId
  });
}

export async function moveMealPlanDay(
  familyId: string,
  input: { mealId?: string; sourceDate?: string; targetDate: string }
): Promise<MoveMealResult> {
  return apiRequest<MoveMealResult>("/meals/move", {
    method: "POST",
    body: input,
    familyId
  });
}

export async function getCalendarEvents(
  familyId: string,
  input: { from: string; to: string }
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({ from: input.from, to: input.to });

  return apiRequest<CalendarEvent[]>(`/calendar/events?${params.toString()}`, { familyId });
}

export async function addCalendarEvent(
  familyId: string,
  input: {
    title: string;
    description?: string | null;
    location?: string | null;
    icon?: string;
    reminderMinutesBefore?: number | null;
    startsAt: string;
    endsAt?: string | null;
    allDay?: boolean;
    participantFamilyMemberIds?: string[];
  }
): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>("/calendar/events", {
    method: "POST",
    body: input,
    familyId
  });
}

export async function updateCalendarEvent(
  familyId: string,
  eventId: string,
  input: {
    title?: string;
    description?: string | null;
    location?: string | null;
    icon?: string;
    reminderMinutesBefore?: number | null;
    startsAt?: string;
    endsAt?: string | null;
    allDay?: boolean;
    participantFamilyMemberIds?: string[];
  }
): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>(`/calendar/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: input,
    familyId
  });
}

export async function deleteCalendarEvent(familyId: string, eventId: string): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>(`/calendar/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    familyId
  });
}


export async function getHuskReminders(familyId: string): Promise<Reminder[]> {
  return apiRequest<Reminder[]>("/husk/reminders", { familyId });
}

export async function addHuskReminder(
  familyId: string,
  input: {
    title: string;
    icon?: string;
    dueDate?: string | null;
    reminderMinutesBefore?: number | null;
    note?: string | null;
    scope: "family" | "members";
    memberIds?: string[];
    sourceType?: string | null;
    sourceId?: string | null;
  }
): Promise<Reminder> {
  return apiRequest<Reminder>("/husk/reminders", {
    method: "POST",
    body: input,
    familyId
  });
}

export async function updateHuskReminder(
  familyId: string,
  reminderId: string,
  input: {
    title?: string;
    icon?: string;
    dueDate?: string;
    reminderMinutesBefore?: number | null;
    note?: string | null;
    scope?: "family" | "members";
    memberIds?: string[];
  }
): Promise<Reminder> {
  return apiRequest<Reminder>(`/husk/reminders/${encodeURIComponent(reminderId)}`, {
    method: "PATCH",
    body: input,
    familyId
  });
}

export async function deleteHuskReminder(familyId: string, reminderId: string): Promise<Reminder> {
  return apiRequest<Reminder>(`/husk/reminders/${encodeURIComponent(reminderId)}`, {
    method: "DELETE",
    familyId
  });
}

export async function getHuskLists(familyId: string): Promise<HuskList[]> {
  return apiRequest<HuskList[]>("/husk/lists", { familyId });
}

export async function addHuskList(
  familyId: string,
  input: { title: string; icon?: string; category?: string; description?: string | null; scope: "family" | "members"; memberIds?: string[] }
): Promise<HuskList> {
  return apiRequest<HuskList>("/husk/lists", { method: "POST", body: input, familyId });
}

export async function updateHuskList(
  familyId: string,
  listId: string,
  input: { title?: string; icon?: string; category?: string; description?: string | null; scope?: "family" | "members"; memberIds?: string[]; archivedAt?: string | null }
): Promise<HuskList> {
  return apiRequest<HuskList>(`/husk/lists/${encodeURIComponent(listId)}`, { method: "PATCH", body: input, familyId });
}

export async function deleteHuskList(familyId: string, listId: string): Promise<HuskList> {
  return apiRequest<HuskList>(`/husk/lists/${encodeURIComponent(listId)}`, { method: "DELETE", familyId });
}

export async function addHuskListItem(
  familyId: string,
  listId: string,
  input: { title: string; description?: string | null; assignedFamilyMemberId?: string | null; assignedMemberIds?: string[]; dueDate?: string | null; sortOrder?: number }
): Promise<HuskListItem> {
  return apiRequest<HuskListItem>(`/husk/lists/${encodeURIComponent(listId)}/items`, { method: "POST", body: input, familyId });
}

export async function updateHuskListItem(
  familyId: string,
  listId: string,
  itemId: string,
  input: { title?: string; description?: string | null; completedAt?: string | null; assignedFamilyMemberId?: string | null; assignedMemberIds?: string[]; dueDate?: string | null; sortOrder?: number }
): Promise<HuskListItem> {
  return apiRequest<HuskListItem>(`/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`, { method: "PATCH", body: input, familyId });
}

export async function deleteHuskListItem(familyId: string, listId: string, itemId: string): Promise<HuskListItem> {
  return apiRequest<HuskListItem>(`/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE", familyId });
}

export async function completeHuskListItem(familyId: string, listId: string, itemId: string): Promise<HuskListItem> {
  return apiRequest<HuskListItem>(`/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/complete`, { method: "PATCH", familyId });
}

export async function uncompleteHuskListItem(familyId: string, listId: string, itemId: string): Promise<HuskListItem> {
  return apiRequest<HuskListItem>(`/husk/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/uncomplete`, { method: "PATCH", familyId });
}


export type SchoolWeekMutationScope = "occurrence" | "series";

export async function getSchoolWeekReminders(familyId: string, weekStart: string): Promise<SchoolWeekReminder[]> {
  const params = new URLSearchParams({ weekStart });
  return apiRequest<SchoolWeekReminder[]>(`/school-week?${params.toString()}`, { familyId });
}

export async function addSchoolWeekReminder(
  familyId: string,
  input: { childFamilyMemberId: string; title: string; icon?: string; category?: string; weekday: string; date: string; isRecurring?: boolean; recurrenceFrequency?: "weekly"; recurrenceEndDate?: string | null; note?: string | null }
): Promise<SchoolWeekReminder> {
  return apiRequest<SchoolWeekReminder>("/school-week", { method: "POST", body: input, familyId });
}

export async function updateSchoolWeekReminder(
  familyId: string,
  reminderId: string,
  input: { title?: string; icon?: string; category?: string; weekday?: string; date?: string; occurrenceDate?: string; isRecurring?: boolean; recurrenceFrequency?: "weekly"; recurrenceEndDate?: string | null; note?: string | null; scope?: SchoolWeekMutationScope }
): Promise<SchoolWeekReminder> {
  return apiRequest<SchoolWeekReminder>(`/school-week/${encodeURIComponent(reminderId)}`, { method: "PATCH", body: input, familyId });
}

export async function deleteSchoolWeekReminder(familyId: string, reminderId: string, input: { scope?: SchoolWeekMutationScope; occurrenceDate?: string } = {}): Promise<SchoolWeekReminder> {
  const params = new URLSearchParams();
  if (input.scope) params.set("scope", input.scope);
  if (input.occurrenceDate) params.set("occurrenceDate", input.occurrenceDate);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<SchoolWeekReminder>(`/school-week/${encodeURIComponent(reminderId)}${suffix}`, { method: "DELETE", familyId });
}

export async function getTasks(familyId: string): Promise<Task[]> {
  return apiRequest<Task[]>("/tasks", { familyId });
}

export async function addTask(
  familyId: string,
  input: { title: string; description?: string; assignedFamilyMemberId?: string; dueDate?: string }
): Promise<Task> {
  return apiRequest<Task>("/tasks", {
    method: "POST",
    body: input,
    familyId
  });
}

export async function toggleTask(familyId: string, taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    familyId
  });
}

export async function deleteTask(familyId: string, taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    familyId
  });
}

async function apiRequest<TData>(
  path: string,
  options: { method?: string; body?: unknown; includeAuth?: boolean; familyId?: string } = {}
): Promise<TData> {
  const headers = new Headers({ Accept: "application/json" });
  const includeAuth = options.includeAuth ?? true;

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.familyId) {
    headers.set("X-Family-Id", options.familyId);
  }

  if (includeAuth) {
    const token = getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    throw new ApiError(...(await getErrorDetails(response)));
  }

  const envelope = (await response.json()) as ApiEnvelope<TData>;

  return envelope.data;
}

async function getErrorDetails(response: Response): Promise<[message: string, status: number, code?: string]> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const code = body.error?.code;
    const fallbackMessage = getDefaultErrorMessage(code);

    return [body.error?.message || body.message || fallbackMessage, response.status, code];
  } catch {
    return ["Something went wrong. Please try again.", response.status];
  }
}

function getDefaultErrorMessage(code?: string): string {
  switch (code) {
    case "auth.requires_auth":
    case "auth.invalid_token":
    case "auth.expired_token":
      return "Your session has expired. Please sign in again.";
    case "family.missing_context":
      return "Choose a family before continuing.";
    case "family.access_denied":
      return "That family could not be loaded for your account.";
    case "validation.invalid_input":
      return "Please check the form and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
