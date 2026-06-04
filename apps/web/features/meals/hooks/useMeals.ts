"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addMealPlanDay,
  deleteMealPlanDay,
  getMealPlan,
  moveMealPlanDay,
  updateMealPlanDay,
  type MealPlanDay,
} from "../../../lib/api";
import { getUserFacingApiMessage } from "../../../lib/auth-family";
import { mockMeals } from "../../../app/meals/mockMealPlanData";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import type { Meal } from "../../types";

export type CreateMealInput = { offset: number; title: string };
export type UpdateMealInput = { offset: number; title: string };
export type DeleteMealInput = { offset: number };
export type MoveMealInput = { sourceOffset: number; targetOffset: number };

const MEAL_SAVE_ERROR = "Kunne ikke lagre middag akkurat nå";
const MEAL_DELETE_ERROR = "Kunne ikke slette middag akkurat nå";
const MEAL_MOVE_ERROR = "Kunne ikke flytte middag akkurat nå";

function normalizeMealTitle(value: string) {
  return value.trim().toLocaleLowerCase("nb-NO");
}

function getToday() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setHours(12, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function getDateOffset(today: Date, date: string) {
  const targetDate = parseDateString(date);
  return Math.round((targetDate.getTime() - today.getTime()) / 86400000);
}

function getMealVisual(title: string) {
  const normalizedTitle = normalizeMealTitle(title);
  return mockMeals.find((meal) => normalizeMealTitle(meal.title) === normalizedTitle)?.icon ?? "🍽️";
}

function toMeal(day: MealPlanDay, today: Date): Meal & { offset: number } {
  const title = day.title ?? day.mealName;

  return {
    id: day.id,
    familyId: day.familyId,
    title,
    icon: getMealVisual(title),
    date: day.date,
    plannedByMemberId: day.createdByFamilyMemberId,
    notes: day.note ?? day.notes,
    createdAt: day.createdAt,
    updatedAt: day.updatedAt,
    offset: getDateOffset(today, day.date),
  };
}

function mealsToOffsetMap(days: MealPlanDay[], today: Date) {
  const nextMeals = new Map<number, Meal>();

  days.forEach((day) => {
    const meal = toMeal(day, today);
    nextMeals.set(meal.offset, meal);
  });

  return nextMeals;
}

function createOptimisticMeal(offset: number, title: string, familyId?: string): Meal {
  const date = formatDateString(addDays(getToday(), offset));
  const now = new Date().toISOString();

  return {
    id: `optimistic-meal-${date}-${Date.now()}`,
    familyId,
    title: title.trim(),
    icon: getMealVisual(title),
    date,
    plannedByMemberId: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    pending: true,
  };
}

export function useMeals() {
  const { family, familyMembers, adults, children, currentUserMember, loading: familyLoading, error: familyError } = useFamilyMembers();
  const [mealsByOffset, setMealsByOffset] = useState<Map<number, Meal>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => getToday(), []);
  const activeFamilyId = family?.id ?? null;

  const refresh = useCallback(async () => {
    if (!activeFamilyId) {
      setMealsByOffset(new Map());
      setLoading(familyLoading);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mealPlan = await getMealPlan(activeFamilyId);
      setMealsByOffset(mealsToOffsetMap(mealPlan.days, today));
    } catch (refreshError) {
      setError(getUserFacingApiMessage(refreshError, "Kunne ikke hente middager akkurat nå"));
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, familyLoading, today]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (familyError) {
      setError(familyError);
    }
  }, [familyError]);

  const meals = useMemo(
    () =>
      Array.from(mealsByOffset.entries()).map(([offset, meal]) => ({
        ...meal,
        offset,
      })),
    [mealsByOffset],
  );

  const mealCatalog = useMemo(() => {
    const seenMealTitles = new Set<string>();
    const previousMeals = Array.from(mealsByOffset.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, meal]) => meal);

    return [...previousMeals, ...mockMeals].filter((meal) => {
      const normalizedTitle = normalizeMealTitle(meal.title);

      if (seenMealTitles.has(normalizedTitle)) {
        return false;
      }

      seenMealTitles.add(normalizedTitle);
      return true;
    });
  }, [mealsByOffset]);

  const createMeal = useCallback(async ({ offset, title }: CreateMealInput) => {
    if (!activeFamilyId) {
      throw new Error("Choose a family before continuing.");
    }

    const date = formatDateString(addDays(today, offset));
    const optimisticMeal = createOptimisticMeal(offset, title, activeFamilyId);
    const previousMeals = mealsByOffset;

    setError(null);
    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.set(offset, optimisticMeal);
      return nextMeals;
    });

    try {
      const savedMeal = await addMealPlanDay(activeFamilyId, { date, title });
      const visibleMeal = toMeal(savedMeal, today);
      setMealsByOffset((currentMeals) => {
        const nextMeals = new Map(currentMeals);
        nextMeals.set(offset, visibleMeal);
        return nextMeals;
      });
      return visibleMeal;
    } catch (createError) {
      setMealsByOffset(previousMeals);
      setError(getUserFacingApiMessage(createError, MEAL_SAVE_ERROR));
      throw createError;
    }
  }, [activeFamilyId, mealsByOffset, today]);

  const updateMeal = useCallback(async ({ offset, title }: UpdateMealInput) => {
    const existingMeal = mealsByOffset.get(offset);

    if (!existingMeal) {
      return createMeal({ offset, title });
    }

    if (!activeFamilyId) {
      throw new Error("Choose a family before continuing.");
    }

    const previousMeals = mealsByOffset;
    const optimisticMeal = { ...existingMeal, title: title.trim(), icon: getMealVisual(title), pending: true };

    setError(null);
    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.set(offset, optimisticMeal);
      return nextMeals;
    });

    try {
      const savedMeal = await updateMealPlanDay(activeFamilyId, existingMeal.id, { title });
      const visibleMeal = toMeal(savedMeal, today);
      setMealsByOffset((currentMeals) => {
        const nextMeals = new Map(currentMeals);
        nextMeals.set(offset, visibleMeal);
        return nextMeals;
      });
      return visibleMeal;
    } catch (updateError) {
      setMealsByOffset(previousMeals);
      setError(getUserFacingApiMessage(updateError, MEAL_SAVE_ERROR));
      throw updateError;
    }
  }, [activeFamilyId, createMeal, mealsByOffset, today]);

  const deleteMeal = useCallback(async ({ offset }: DeleteMealInput) => {
    const mealToDelete = mealsByOffset.get(offset) ?? null;

    if (!mealToDelete) {
      return null;
    }

    if (!activeFamilyId) {
      throw new Error("Choose a family before continuing.");
    }

    const previousMeals = mealsByOffset;

    setError(null);
    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.delete(offset);
      return nextMeals;
    });

    try {
      await deleteMealPlanDay(activeFamilyId, mealToDelete.id);
      return mealToDelete;
    } catch (deleteError) {
      setMealsByOffset(previousMeals);
      setError(getUserFacingApiMessage(deleteError, MEAL_DELETE_ERROR));
      throw deleteError;
    }
  }, [activeFamilyId, mealsByOffset]);

  const restoreMeal = useCallback(async (offset: number, meal: Meal) => {
    if (!activeFamilyId) {
      throw new Error("Choose a family before continuing.");
    }

    const previousMeals = mealsByOffset;
    const optimisticMeal = { ...meal, pending: true };
    const date = formatDateString(addDays(today, offset));

    setError(null);
    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.set(offset, optimisticMeal);
      return nextMeals;
    });

    try {
      const savedMeal = await addMealPlanDay(activeFamilyId, { date, title: meal.title, notes: meal.notes ?? null });
      const visibleMeal = toMeal(savedMeal, today);
      setMealsByOffset((currentMeals) => {
        const nextMeals = new Map(currentMeals);
        nextMeals.set(offset, visibleMeal);
        return nextMeals;
      });
      return visibleMeal;
    } catch (restoreError) {
      setMealsByOffset(previousMeals);
      setError(getUserFacingApiMessage(restoreError, MEAL_SAVE_ERROR));
      throw restoreError;
    }
  }, [activeFamilyId, mealsByOffset, today]);

  const moveMeal = useCallback(async ({ sourceOffset, targetOffset }: MoveMealInput) => {
    const sourceMeal = mealsByOffset.get(sourceOffset);

    if (!sourceMeal) {
      return { moved: false, swapped: false };
    }

    if (!activeFamilyId) {
      throw new Error("Choose a family before continuing.");
    }

    const targetMeal = mealsByOffset.get(targetOffset) ?? null;
    const previousMeals = mealsByOffset;

    setError(null);
    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.set(targetOffset, { ...sourceMeal, date: formatDateString(addDays(today, targetOffset)), pending: true });

      if (targetMeal) {
        nextMeals.set(sourceOffset, { ...targetMeal, date: formatDateString(addDays(today, sourceOffset)), pending: true });
      } else {
        nextMeals.delete(sourceOffset);
      }

      return nextMeals;
    });

    try {
      const result = await moveMealPlanDay(activeFamilyId, {
        mealId: sourceMeal.id,
        sourceDate: formatDateString(addDays(today, sourceOffset)),
        targetDate: formatDateString(addDays(today, targetOffset)),
      });
      const updatedMeals = result.meals.map((meal) => toMeal(meal, today));
      setMealsByOffset((currentMeals) => {
        const nextMeals = new Map(currentMeals);
        nextMeals.delete(sourceOffset);
        nextMeals.delete(targetOffset);
        updatedMeals.forEach((meal) => nextMeals.set(meal.offset, meal));
        return nextMeals;
      });
      return { moved: true, swapped: result.swapped };
    } catch (moveError) {
      setMealsByOffset(previousMeals);
      setError(getUserFacingApiMessage(moveError, MEAL_MOVE_ERROR));
      throw moveError;
    }
  }, [activeFamilyId, mealsByOffset, today]);

  return {
    family,
    familyMembers,
    adults,
    children,
    currentUserMember,
    mealCatalog,
    meals,
    mealsByOffset,
    loading: loading || familyLoading,
    error,
    refresh,
    createMeal,
    updateMeal,
    deleteMeal,
    restoreMeal,
    moveMeal,
  };
}
