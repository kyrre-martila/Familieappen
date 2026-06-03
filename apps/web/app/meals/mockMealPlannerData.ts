export interface MockMealPlannerDay {
  date: string;
  mealTitle?: string;
}

export const demoMealTitles = [
  "Taco",
  "Pizza",
  "Fiskegrateng",
  "Pasta med kylling",
  "Lasagne",
  "Kjøttsuppe",
  "Fiskekaker",
  "Hjemmelaget burger",
] as const;

const plannedMealByOffset = new Map<number, (typeof demoMealTitles)[number]>([
  [-8, "Kjøttsuppe"],
  [-6, "Fiskekaker"],
  [-3, "Pasta med kylling"],
  [-1, "Lasagne"],
  [0, "Taco"],
  [2, "Pizza"],
  [3, "Fiskegrateng"],
  [5, "Hjemmelaget burger"],
  [7, "Pasta med kylling"],
  [12, "Kjøttsuppe"],
]);

export function getMockMealPlannerTimeline(referenceDate = new Date()): MockMealPlannerDay[] {
  return Array.from({ length: 25 }, (_, index) => {
    const offset = index - 9;
    const date = new Date(referenceDate);
    date.setHours(12, 0, 0, 0);
    date.setDate(referenceDate.getDate() + offset);

    return {
      date: formatDateKey(date),
      mealTitle: plannedMealByOffset.get(offset),
    };
  });
}

export function getMealPlannerReminder(days: MockMealPlannerDay[], referenceDate = new Date()) {
  const todayKey = formatDateKey(referenceDate);
  const lastPlannedDay = [...days]
    .filter((day) => day.date >= todayKey && day.mealTitle)
    .sort((firstDay, secondDay) => firstDay.date.localeCompare(secondDay.date))
    .at(-1);

  if (!lastPlannedDay) {
    return null;
  }

  return {
    title: "Snart tomt for middager 🍽️",
    description: `Du har planlagt frem til ${formatReminderDate(lastPlannedDay.date)}`,
  };
}

export function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatReminderDate(dateKey: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(parseDateKey(dateKey));
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}
