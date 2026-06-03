export type MockMeal = {
  id: string;
  title: string;
  icon: string;
};

export type MockMealPlanDay = {
  offset: number;
  meal: MockMeal | null;
};

export const mockMeals = [
  { id: "taco", title: "Taco", icon: "🌮" },
  { id: "pizza", title: "Pizza", icon: "🍕" },
  { id: "fiskegrateng", title: "Fiskegrateng", icon: "🐟" },
  { id: "pasta-med-kylling", title: "Pasta med kylling", icon: "🍝" },
  { id: "lasagne", title: "Lasagne", icon: "🥘" },
  { id: "kjottsuppe", title: "Kjøttsuppe", icon: "🍲" },
  { id: "fiskekaker", title: "Fiskekaker", icon: "🐟" },
  { id: "hjemmelaget-burger", title: "Hjemmelaget burger", icon: "🍔" },
] satisfies MockMeal[];

const mealById = new Map(mockMeals.map((meal) => [meal.id, meal]));

const plannedMealOffsets = new Map<string, string>([
  ["-8", "lasagne"],
  ["-6", "fiskekaker"],
  ["-4", "pasta-med-kylling"],
  ["-2", "kjottsuppe"],
  ["0", "taco"],
  ["2", "pizza"],
  ["3", "fiskegrateng"],
  ["5", "pasta-med-kylling"],
  ["6", "lasagne"],
  ["9", "fiskekaker"],
  ["11", "hjemmelaget-burger"],
  ["14", "kjottsuppe"],
]);

export function getMockMealForOffset(offset: number) {
  const mealId = plannedMealOffsets.get(String(offset));
  return mealId ? mealById.get(mealId) ?? null : null;
}

export function getLatestPlannedOffset() {
  return Math.max(...Array.from(plannedMealOffsets.keys(), Number));
}
