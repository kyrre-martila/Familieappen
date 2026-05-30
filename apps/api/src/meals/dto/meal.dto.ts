export interface UpsertMealPlanDayRequestDto {
  date?: unknown;
  mealName?: unknown;
  notes?: unknown;
}

export interface MealPlanDayDto {
  id: string;
  mealPlanId: string;
  date: string;
  mealName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanDto {
  id: string;
  familyId: string;
  createdAt: string;
  updatedAt: string;
  days: MealPlanDayDto[];
  recentMeals: string[];
}
