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
  ShoppingList,
  ShoppingListItem,
  Task,
  Wishlist,
  WishlistItem,
  WishlistShare,
  WishlistSummary,
  PublicWishlist,
  PublicWishlistItem,
  Reminder
} from "@familieappen/shared";

export type { CalendarEvent, Family, FamilyDashboardResponse, FamilyMember, FamilyMemberRole, ManualFamilyMemberRole, MealPlan, MealPlanDay, ShoppingList, ShoppingListItem, Task, Wishlist, WishlistItem, WishlistShare, WishlistSummary, PublicWishlist, PublicWishlistItem, Reminder };

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

export async function reserveWishlistItem(familyId: string, itemId: string): Promise<WishlistItem> {
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
  input: { date: string; mealName: string; notes?: string }
): Promise<MealPlanDay> {
  return apiRequest<MealPlanDay>("/meals/day", {
    method: "POST",
    body: input,
    familyId
  });
}

export async function updateMealPlanDay(
  familyId: string,
  dayId: string,
  input: { date?: string; mealName?: string; notes?: string }
): Promise<MealPlanDay> {
  return apiRequest<MealPlanDay>(`/meals/day/${encodeURIComponent(dayId)}`, {
    method: "PATCH",
    body: input,
    familyId
  });
}

export async function deleteMealPlanDay(familyId: string, dayId: string): Promise<MealPlanDay> {
  return apiRequest<MealPlanDay>(`/meals/day/${encodeURIComponent(dayId)}`, {
    method: "DELETE",
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
    dueDate: string;
    reminderMinutesBefore?: number | null;
    note?: string | null;
    scope: "family" | "members";
    memberIds?: string[];
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
