export interface UpsertMealPlanDayRequestDto {
  date?: unknown;
  mealName?: unknown;
  title?: unknown;
  note?: unknown;
  notes?: unknown;
  createdByFamilyMemberId?: unknown;
  sortOrder?: unknown;
}

export interface MoveMealRequestDto {
  mealId?: unknown;
  sourceDate?: unknown;
  targetDate?: unknown;
}

export interface MealPlanDayDto {
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

export interface MoveMealResultDto {
  meals: MealPlanDayDto[];
  swapped: boolean;
}

export interface MealPlanDto {
  id: string;
  familyId: string;
  createdAt: string;
  updatedAt: string;
  days: MealPlanDayDto[];
  recentMeals: string[];
}
