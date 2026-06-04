"use client";

import { useCalendar } from "../hooks/useCalendar";
import { CalendarMealChip } from "./CalendarMealChip";
import { CalendarReminderSummaryChip } from "./CalendarReminderChip";

export function CalendarDayChips({ selectedDate }: { selectedDate: string }) {
  const { mealSummaries: mealPlannerMeals, reminders } = useCalendar();
  const meal = mealPlannerMeals.find((item) => item.date === selectedDate);
  const visibleReminders = reminders.filter(
    (item) => item.date === selectedDate,
  );
  const shownReminders = visibleReminders.slice(0, 3);
  const remainingReminderCount = Math.max(
    0,
    visibleReminders.length - shownReminders.length,
  );

  if (!meal && visibleReminders.length === 0) {
    return null;
  }

  return (
    <section
      className="calendar-summary-chips"
      aria-label="Middag og påminnelser"
    >
      {meal ? <CalendarMealChip date={selectedDate} meal={meal} /> : null}
      {shownReminders.map((reminder) => (
        <CalendarReminderSummaryChip reminder={reminder} key={reminder.id} />
      ))}
      {remainingReminderCount > 0 ? (
        <span className="calendar-chip calendar-chip--more">
          +{remainingReminderCount}
        </span>
      ) : null}
    </section>
  );
}
