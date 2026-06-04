export type FamilyMemberRole = "OWNER" | "PARENT" | "CHILD" | "GUEST";

export type ManualFamilyMemberRole = Exclude<FamilyMemberRole, "OWNER">;

export interface Family {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
  role: FamilyMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  assignedFamilyMemberId: string | null;
  createdByUserId: string | null;
  completed: boolean;
  completedAt: string | null;
  completedByUserId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanDay {
  id: string;
  mealPlanId: string;
  date: string;
  mealName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlan {
  id: string;
  familyId: string;
  createdAt: string;
  updatedAt: string;
  days: MealPlanDay[];
  recentMeals: string[];
}

export interface CalendarEventParticipant {
  id: string;
  eventId: string;
  familyMemberId: string;
  createdAt: string;
  familyMember: FamilyMember;
}

export interface CalendarEvent {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  location: string | null;
  icon: string;
  reminderMinutesBefore: number | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reminder: { minutesBefore: number; label: string } | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: CalendarEventParticipant[];
}

export interface ReminderAudienceMember {
  id: string;
  reminderId: string;
  familyMemberId: string;
  createdAt: string;
  familyMember: FamilyMember;
}

export interface Reminder {
  id: string;
  familyId: string;
  title: string;
  icon: string;
  dueDate: string;
  date: string;
  reminderMinutesBefore: number | null;
  reminder: { minutesBefore: number; label: string } | null;
  note: string | null;
  scope: "family" | "members";
  memberIds: string[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  audienceMembers: ReminderAudienceMember[];
}

export interface HuskListAudienceMember {
  id: string;
  listId: string;
  familyMemberId: string;
  createdAt: string;
  familyMember: FamilyMember;
}

export interface HuskListItem {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  completedAt: string | null;
  completed: boolean;
  assignedFamilyMemberId: string | null;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HuskList {
  id: string;
  familyId: string;
  title: string;
  icon: string;
  category: string;
  description: string | null;
  archivedAt: string | null;
  archived: boolean;
  scope: "family" | "members";
  memberIds: string[];
  completedCount: number;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
  audienceMembers: HuskListAudienceMember[];
  items: HuskListItem[];
}

export interface FamilyDashboardResponse {
  family: Family;
  members: FamilyMember[];
  todayEvents: CalendarEvent[];
  todayTasks: Task[];
  dinnerToday: MealPlanDay | null;
  shoppingSummary: {
    uncheckedCount: number;
    totalItems: number;
  };
  wishlistSummary: {
    wishlistCount: number;
    upcomingPlaceholder: string;
    recentlyUpdated: WishlistSummary[];
  };
}

export interface WishlistItem {
  id: string;
  wishlistId: string;
  title: string;
  description: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  estimatedPrice: string | null;
  purchased: boolean;
  unavailable: boolean;
  reserved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Wishlist {
  id: string;
  familyId: string;
  ownerFamilyMemberId: string;
  title: string;
  description: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  items: WishlistItem[];
}

export interface WishlistSummary {
  id: string;
  ownerFamilyMemberId: string;
  title: string;
  description: string | null;
  itemCount: number;
  unavailableCount: number;
  updatedAt: string;
}

export interface WishlistShare {
  token: string;
  shareUrl: string;
  expiresAt: string | null;
}

export interface PublicWishlistItem {
  id: string;
  title: string;
  description: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  estimatedPrice: string | null;
  purchased: boolean;
  unavailable: boolean;
  reserved: boolean;
}

export interface PublicWishlist {
  id: string;
  title: string;
  description: string | null;
  items: PublicWishlistItem[];
}

export interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  label: string;
  quantity: string | null;
  checked: boolean;
  createdByUserId: string | null;
  checkedByUserId: string | null;
  checkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  familyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: ShoppingListItem[];
}

export const sharingLevels = ["private", "family", "selected"] as const;

export type SharingLevel = (typeof sharingLevels)[number];

export interface FamilyMemberSummary {
  id: string;
  displayName: string;
  role: FamilyMemberRole;
}

export type {
  CalendarEvent as CalendarMvpEvent,
  CalendarEventIcon as CalendarMvpEventIcon,
  CalendarEventRecurrence as CalendarMvpEventRecurrence,
  CalendarEventReminder as CalendarMvpEventReminder,
  CalendarEventSource as CalendarMvpEventSource,
  CalendarExportFeed,
  CalendarExportScope,
  CalendarImportSource,
  CalendarImportSyncFrequency,
  CalendarViewMode,
  FamilyMember as CalendarMvpFamilyMember,
  MealSummary,
  ReminderSummary
} from "./calendar-mvp.js";
