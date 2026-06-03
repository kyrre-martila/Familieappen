export type MockMeal = {
  id: string;
  title: string;
  icon: string;
};

export type MockMealPlanDay = {
  offset: number;
  meal: MockMeal | null;
};

export type MockMealSummary = {
  date: string;
  title: string;
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

function parseDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setHours(12, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function getMockMealForOffset(offset: number) {
  const mealId = plannedMealOffsets.get(String(offset));
  return mealId ? mealById.get(mealId) ?? null : null;
}

export function getMockMealSummariesFromStartDate(startDate: string) {
  const start = parseDateString(startDate);

  return Array.from(plannedMealOffsets.entries())
    .map(([offset, mealId]) => {
      const meal = mealById.get(mealId);

      if (!meal) {
        return null;
      }

      return {
        date: formatDateString(addDays(start, Number(offset))),
        title: meal.title,
      } satisfies MockMealSummary;
    })
    .filter((meal): meal is MockMealSummary => meal !== null)
    .sort((firstMeal, secondMeal) =>
      firstMeal.date.localeCompare(secondMeal.date),
    );
}

export function getLatestPlannedOffset() {
  return Math.max(...Array.from(plannedMealOffsets.keys(), Number));
}
