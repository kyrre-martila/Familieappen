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
  familyId: string;
  date: string;
  mealName: string;
  title: string;
  note: string | null;
  notes: string | null;
  createdByFamilyMemberId: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MoveMealResult {
  meals: MealPlanDay[];
  swapped: boolean;
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
  familyId: string;
  ownerUserId: string;
  ownerFamilyMemberId: string | null;
  title: string;
  description: string | null;
  price: number | null;
  storeOrLink: string | null;
  imageUrl: string | null;
  icon: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WishlistItemCreateInput {
  title: string;
  description?: string | null;
  price?: number | null;
  storeOrLink?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
}

export interface WishlistItemUpdateInput {
  title?: string;
  description?: string | null;
  price?: number | null;
  storeOrLink?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
}

export interface WishlistItemListResponse {
  items: WishlistItem[];
}

export interface WishlistReorderInput {
  orderedIds?: string[];
  positions?: Record<string, number>;
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


export type SchoolWeekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export interface SchoolWeekReminder {
  id: string;
  familyId?: string;
  childFamilyMemberId?: string;
  title: string;
  icon: string;
  category?: string;
  weekday?: SchoolWeekday;
  date?: string | null;
  occurrenceDate?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: "weekly";
  recurrenceEndDate?: string | null;
  recurringSeriesId?: string | null;
  exceptionOfId?: string | null;
  note?: string | null;
  tone?: "blue" | "green" | "orange" | "purple" | "yellow";
}

export interface SchoolWeek {
  childId: string;
  days: Record<SchoolWeekday, SchoolWeekReminder[]>;
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
