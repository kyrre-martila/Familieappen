"use client";

import { useMemo, useState } from "react";

import {
  getMockMealForOffset,
  mockMeals,
  type MockMeal,
} from "../../../app/meals/mockMealPlanData";
import type { Meal } from "../../types";

export type CreateMealInput = { offset: number; title: string };
export type UpdateMealInput = { offset: number; title: string };
export type DeleteMealInput = { offset: number };
export type MoveMealInput = { sourceOffset: number; targetOffset: number };

const initialPastDays = 10;
const initialFutureDays = 21;

function normalizeMealTitle(value: string) {
  return value.trim().toLocaleLowerCase("nb-NO");
}

function getMealVisual(title: string) {
  const normalizedTitle = normalizeMealTitle(title);
  return (
    mockMeals.find((meal) => normalizeMealTitle(meal.title) === normalizedTitle)
      ?.icon ?? "🍽️"
  );
}

function createMealFromTitle(title: string): Meal {
  const trimmedTitle = title.trim();
  const existingMeal = mockMeals.find(
    (meal) =>
      normalizeMealTitle(meal.title) === normalizeMealTitle(trimmedTitle),
  );

  return (
    existingMeal ?? {
      id: `custom-${normalizeMealTitle(trimmedTitle).replace(/\s+/g, "-")}`,
      title: trimmedTitle,
      icon: getMealVisual(trimmedTitle),
    }
  );
}

function getInitialMealsByOffset() {
  const initialMeals = new Map<number, Meal>();

  for (let offset = -initialPastDays; offset <= initialFutureDays; offset += 1) {
    const meal = getMockMealForOffset(offset);

    if (meal) {
      initialMeals.set(offset, meal);
    }
  }

  return initialMeals;
}

export function useMeals() {
  const [mealsByOffset, setMealsByOffset] = useState(getInitialMealsByOffset);

  const meals = useMemo(
    () =>
      Array.from(mealsByOffset.entries()).map(([offset, meal]) => ({
        ...meal,
        offset,
      })),
    [mealsByOffset],
  );

  function createMeal({ offset, title }: CreateMealInput) {
    const meal = createMealFromTitle(title);
    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.set(offset, meal);
      return nextMeals;
    });
    return meal;
  }

  function updateMeal({ offset, title }: UpdateMealInput) {
    return createMeal({ offset, title });
  }

  function deleteMeal({ offset }: DeleteMealInput) {
    const deletedMeal = mealsByOffset.get(offset) ?? null;
    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.delete(offset);
      return nextMeals;
    });
    return deletedMeal;
  }

  function restoreMeal(offset: number, meal: MockMeal) {
    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.set(offset, meal);
      return nextMeals;
    });
  }

  function moveMeal({ sourceOffset, targetOffset }: MoveMealInput) {
    const sourceMeal = mealsByOffset.get(sourceOffset);

    if (!sourceMeal) {
      return { moved: false, swapped: false };
    }

    const targetMeal = mealsByOffset.get(targetOffset) ?? null;

    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.set(targetOffset, sourceMeal);

      if (targetMeal) {
        nextMeals.set(sourceOffset, targetMeal);
      } else {
        nextMeals.delete(sourceOffset);
      }

      return nextMeals;
    });

    return { moved: true, swapped: Boolean(targetMeal) };
  }

  return {
    mealCatalog: mockMeals,
    meals,
    mealsByOffset,
    createMeal,
    updateMeal,
    deleteMeal,
    restoreMeal,
    moveMeal,
  };
}
