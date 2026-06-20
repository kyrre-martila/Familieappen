"use client";

import { useCalendar } from "../hooks/useCalendar";
import { CalendarMealChip } from "./CalendarMealChip";
import { CalendarReminderSummaryChip } from "./CalendarReminderChip";
import { CalendarSchoolWeekChip } from "./CalendarSchoolWeekChip";
import { CalendarTaskChip } from "./CalendarTaskChip";

export function CalendarDayChips({ selectedDate }: { selectedDate: string }) {
  const {
    mealSummaries: mealPlannerMeals,
    normalizedItems,
    reminders,
    tasks,
  } = useCalendar();
  const meal = mealPlannerMeals.find((item) => item.date === selectedDate);
  const visibleReminders = reminders.filter(
    (item) => item.date === selectedDate,
  );
  const dueTasks = tasks.filter((task) => task.dueDate?.slice(0, 10) === selectedDate);
  const schoolWeekItems = normalizedItems.filter(
    (item) => item.date === selectedDate && item.type === "school-week",
  );
  const shownReminders = visibleReminders.slice(0, 3);
  const remainingReminderCount = Math.max(
    0,
    visibleReminders.length - shownReminders.length,
  );

  if (!meal && schoolWeekItems.length === 0 && visibleReminders.length === 0 && dueTasks.length === 0) {
    return null;
  }

  return (
    <section
      className="calendar-summary-chips"
      aria-label="Middag, skoleuke og påminnelser"
    >
      {meal ? <CalendarMealChip date={selectedDate} meal={meal} /> : null}
      {schoolWeekItems.map((item) => (
        <CalendarSchoolWeekChip item={item} key={item.id} />
      ))}
      {shownReminders.map((reminder) => (
        <CalendarReminderSummaryChip reminder={reminder} key={reminder.id} />
      ))}
      {dueTasks.map((task) => (
        <CalendarTaskChip task={task} key={task.id} />
      ))}
      {remainingReminderCount > 0 ? (
        <span className="calendar-chip calendar-chip--more">
          +{remainingReminderCount}
        </span>
      ) : null}
    </section>
  );
}
