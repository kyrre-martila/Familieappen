import { notifyFamilyCacheReset } from "./family-cache-events";
import { clearAuthSession, getAccessToken, saveAccessToken } from "./session";

import type {
  CalendarEvent,
  Family,
  FamilyDashboardResponse,
  FamilyInvitation,
  FamilyInviteResponse,
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

export type { CalendarEvent, Family, FamilyDashboardResponse, FamilyInvitation, FamilyInviteResponse, FamilyMember, FamilyMemberRole, ManualFamilyMemberRole, MealPlan, MealPlanDay, MoveMealResult, ShoppingList, ShoppingListItem, SharedWishlistItem, SharedWishlistItemsResponse, SharedWishlistSummary, Task, WishlistItem, WishlistItemCreateInput, WishlistItemListResponse, WishlistItemUpdateInput, WishlistSummary, WishlistInvitePreview, WishlistShareInvitation, WishlistShareInviteResponse, Reminder, HuskList, HuskListItem, SchoolWeekReminder };

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
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserProfile = AuthUser;
export type UserProfileUpdate = Partial<Pick<UserProfile, "name" | "firstName" | "middleName" | "lastName" | "displayName" | "avatarUrl" | "email" | "phone">>;

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface DeleteAccountInput {
  password: string;
  confirmationText: string;
}

export interface DeleteAccountResponse {
  message: string;
}

export type FeedbackSubmissionType = "feedback" | "bug";

export interface FeedbackSubmission {
  id: string;
  type: FeedbackSubmissionType;
  message: string;
  userId: string;
  familyId: string | null;
  userAgent: string | null;
  appVersion: string | null;
  createdAt: string;
}

export interface SubmitFeedbackInput {
  type: FeedbackSubmissionType;
  message: string;
  appVersion?: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  calendar_events: boolean;
  calendar_reminders: boolean;
  husk_reminders: boolean;
  wishlist_shared: boolean;
  family_invites: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationPreferenceUpdate = Partial<Pick<NotificationPreferences, "calendar_events" | "calendar_reminders" | "husk_reminders" | "wishlist_shared" | "family_invites">>;

export interface AuthResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
  };
}

export interface RefreshResponse {
  tokens: AuthResponse["tokens"];
}

export interface LogoutResponse {
  message: string;
}

export interface PasswordResetMessageResponse {
  message: string;
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

export async function forgotPassword(input: { email: string }): Promise<PasswordResetMessageResponse> {
  return apiRequest<PasswordResetMessageResponse>("/auth/forgot-password", {
    method: "POST",
    body: input,
    includeAuth: false
  });
}

export async function resetPassword(input: { token: string; password: string }): Promise<PasswordResetMessageResponse> {
  return apiRequest<PasswordResetMessageResponse>("/auth/reset-password", {
    method: "POST",
    body: input,
    includeAuth: false
  });
}

export async function refreshAuthSession(): Promise<RefreshResponse> {
  const response = await apiRequest<RefreshResponse>("/auth/refresh", {
    method: "POST",
    includeAuth: false,
    retryOnUnauthorized: false
  });

  saveAccessToken(response.tokens.accessToken);

  return response;
}

export async function logout(): Promise<LogoutResponse> {
  try {
    return await apiRequest<LogoutResponse>("/auth/logout", {
      method: "POST",
      retryOnUnauthorized: false
    });
  } finally {
    clearAuthSession();
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/me");
}

export async function updateCurrentUserProfile(input: UserProfileUpdate): Promise<UserProfile> {
  return apiRequest<UserProfile>("/me", {
    method: "PATCH",
    body: input
  });
}

export async function uploadCurrentUserAvatar(file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.set("avatar", file);

  return apiRequest<UserProfile>("/me/avatar", {
    method: "POST",
    body: formData
  });
}

export async function removeCurrentUserAvatar(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/me/avatar", { method: "DELETE" });
}

export async function changeCurrentUserPassword(input: ChangePasswordInput): Promise<ChangePasswordResponse> {
  return apiRequest<ChangePasswordResponse>("/me/change-password", {
    method: "POST",
    body: input
  });
}

export async function deleteCurrentUserAccount(input: DeleteAccountInput): Promise<DeleteAccountResponse> {
  return apiRequest<DeleteAccountResponse>("/me", {
    method: "DELETE",
    body: input
  });
}

export async function createFamily(input: { name: string }): Promise<FamilyDetails> {
  return withFamilyCacheInvalidation(apiRequest<FamilyDetails>("/families", {
    method: "POST",
    body: input
  }));
}

export async function listFamilies(): Promise<FamilyWithMembership[]> {
  return apiRequest<FamilyWithMembership[]>("/families");
}

export async function joinFamilyByCode(code: string): Promise<FamilyInvitation> {
  return withFamilyCacheInvalidation(apiRequest<FamilyInvitation>("/families/join-by-code", {
    method: "POST",
    body: { code }
  }));
}

export async function getFamily(familyId: string): Promise<FamilyDetails> {
  return apiRequest<FamilyDetails>(`/families/${encodeURIComponent(familyId)}`);
}

export async function updateFamily(familyId: string, input: { name: string }): Promise<Family> {
  return withFamilyCacheInvalidation(apiRequest<Family>(`/families/${encodeURIComponent(familyId)}`, {
    method: "PATCH",
    body: input
  }));
}

export async function getFamilyDashboard(familyId: string): Promise<FamilyDashboardResponse> {
  return apiRequest<FamilyDashboardResponse>(`/families/${encodeURIComponent(familyId)}/dashboard`);
}

export async function addFamilyMember(
  familyId: string,
  input: { displayName: string; role: ManualFamilyMemberRole }
): Promise<FamilyMember> {
  return withFamilyCacheInvalidation(apiRequest<FamilyMember>(`/families/${encodeURIComponent(familyId)}/members`, {
    method: "POST",
    body: input
  }));
}

export async function updateFamilyMember(
  familyId: string,
  memberId: string,
  input: { displayName?: string; role?: ManualFamilyMemberRole }
): Promise<FamilyMember> {
  return withFamilyCacheInvalidation(apiRequest<FamilyMember>(`/families/${encodeURIComponent(familyId)}/members/${encodeURIComponent(memberId)}`, {
    method: "PATCH",
    body: input
  }));
}

export async function getFamilyInvitations(familyId: string): Promise<FamilyInvitation[]> {
  return apiRequest<FamilyInvitation[]>(`/families/${encodeURIComponent(familyId)}/invitations`);
}

export async function inviteFamilyMemberByEmail(familyId: string, input: { email: string; role: ManualFamilyMemberRole }): Promise<FamilyInviteResponse> {
  return withFamilyCacheInvalidation(apiRequest<FamilyInviteResponse>(`/families/${encodeURIComponent(familyId)}/invitations`, {
    method: "POST",
    body: input
  }));
}

export async function resendFamilyInvitation(familyId: string, inviteId: string): Promise<FamilyInviteResponse> {
  return withFamilyCacheInvalidation(apiRequest<FamilyInviteResponse>(`/families/${encodeURIComponent(familyId)}/invitations/${encodeURIComponent(inviteId)}/resend`, { method: "POST" }));
}

export async function revokeFamilyInvitation(familyId: string, inviteId: string): Promise<FamilyInvitation> {
  return withFamilyCacheInvalidation(apiRequest<FamilyInvitation>(`/families/${encodeURIComponent(familyId)}/invitations/${encodeURIComponent(inviteId)}/revoke`, { method: "POST" }));
}

export async function approveFamilyJoinRequest(familyId: string, inviteId: string): Promise<FamilyInvitation> {
  return withFamilyCacheInvalidation(apiRequest<FamilyInvitation>(`/families/${encodeURIComponent(familyId)}/invitations/${encodeURIComponent(inviteId)}/approve`, { method: "POST" }));
}

export async function rejectFamilyJoinRequest(familyId: string, inviteId: string): Promise<FamilyInvitation> {
  return withFamilyCacheInvalidation(apiRequest<FamilyInvitation>(`/families/${encodeURIComponent(familyId)}/invitations/${encodeURIComponent(inviteId)}/reject`, { method: "POST" }));
}

export async function removeFamilyMember(familyId: string, memberId: string): Promise<FamilyMember> {
  return withFamilyCacheInvalidation(apiRequest<FamilyMember>(
    `/families/${encodeURIComponent(familyId)}/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE" }
  ));
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

export async function submitFeedback(input: SubmitFeedbackInput): Promise<FeedbackSubmission> {
  return apiRequest<FeedbackSubmission>("/feedback", {
    method: "POST",
    body: input
  });
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/notification-preferences");
}

export async function updateNotificationPreferences(input: NotificationPreferenceUpdate): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/notification-preferences", {
    method: "PATCH",
    body: input
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

async function withFamilyCacheInvalidation<TData>(operation: Promise<TData>): Promise<TData> {
  const result = await operation;
  notifyFamilyCacheReset();
  return result;
}

async function apiRequest<TData>(
  path: string,
  options: { method?: string; body?: unknown; includeAuth?: boolean; familyId?: string; retryOnUnauthorized?: boolean } = {}
): Promise<TData> {
  const headers = new Headers({ Accept: "application/json" });
  const includeAuth = options.includeAuth ?? true;

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body !== undefined && !isFormData) {
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
    body: options.body === undefined ? undefined : isFormData ? options.body as BodyInit : JSON.stringify(options.body),
    credentials: "include"
  });

  if (!response.ok) {
    if (response.status === 401 && includeAuth && (options.retryOnUnauthorized ?? true)) {
      try {
        await refreshAuthSession();
        return apiRequest<TData>(path, { ...options, retryOnUnauthorized: false });
      } catch {
        clearAuthSession();
        throw new ApiError("Your session has expired. Please sign in again.", 401, "auth.expired_token");
      }
    }

    const errorDetails = await getErrorDetails(response);

    if (response.status === 401) {
      clearAuthSession();
    }

    if (response.status === 403) {
      notifyFamilyCacheReset();
    }

    throw new ApiError(...errorDetails);
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
