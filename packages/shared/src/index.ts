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

export interface FamilyDashboardResponse {
  family: Family;
  members: FamilyMember[];
  todayEvents: [];
  todayTasks: Task[];
  dinnerToday: MealPlanDay | null;
  shoppingSummary: {
    uncheckedCount: number;
    totalItems: number;
  };
  wishlistSummary: {
    upcomingBirthdays: [];
  };
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
