"use client";

import { useEffect, useMemo } from "react";

import { useCalendar } from "../hooks/useCalendar";
import { CalendarMealChip } from "./CalendarMealChip";
import { CalendarReminderSummaryChip } from "./CalendarReminderChip";
import { CalendarSchoolWeekChip } from "./CalendarSchoolWeekChip";
import { CalendarTaskChip } from "./CalendarTaskChip";
import { CalendarHealthPlanChip } from "./CalendarHealthPlanChip";
import { CalendarWasteChip } from "./CalendarWasteChip";
import { calendarDayContentAriaLabel } from "./calendarContentLabels";
import { healthPlanOccurrenceSummary, healthPlanOccurrencesForCalendarDate } from "../../health-plan/occurrence-summary";

export function CalendarDayChips({ selectedDate }: { selectedDate: string }) {
  const {
    mealSummaries: mealPlannerMeals,
    normalizedItems,
    reminders,
    tasks,
    ensureHealthPlansForRange,
    healthPlanOccurrences,
    today,
    events,
  } = useCalendar();
  useEffect(() => { void ensureHealthPlansForRange(selectedDate, selectedDate); }, [ensureHealthPlansForRange, selectedDate]);
  const healthSummary = useMemo(() => healthPlanOccurrenceSummary(
    healthPlanOccurrencesForCalendarDate(healthPlanOccurrences, selectedDate, today),
    new Date(), selectedDate, today,
  ), [healthPlanOccurrences, selectedDate, today]);
  const meal = mealPlannerMeals.find((item) => item.date === selectedDate);
  const visibleReminders = reminders.filter(
    (item) => item.date === selectedDate,
  );
  const dueTasks = tasks.filter((task) => task.dueDate?.slice(0, 10) === selectedDate);
  const schoolWeekItems = normalizedItems.filter(
    (item) => item.date === selectedDate && item.type === "school-week",
  );
  const wasteEvents = events.filter(
    (event) => event.date === selectedDate && event.source === "waste-collection",
  );
  const shownReminders = visibleReminders.slice(0, 3);
  const remainingReminderCount = Math.max(
    0,
    visibleReminders.length - shownReminders.length,
  );

  if (!meal && schoolWeekItems.length === 0 && visibleReminders.length === 0 && dueTasks.length === 0 && healthSummary.total === 0 && wasteEvents.length === 0) {
    return null;
  }

  return (
    <section
      className="calendar-summary-chips"
      aria-label={calendarDayContentAriaLabel}
    >
      {meal ? <CalendarMealChip date={selectedDate} meal={meal} /> : null}
      <CalendarHealthPlanChip summary={healthSummary} />
      {schoolWeekItems.map((item) => (
        <CalendarSchoolWeekChip item={item} key={item.id} />
      ))}
      {shownReminders.map((reminder) => (
        <CalendarReminderSummaryChip reminder={reminder} key={reminder.id} />
      ))}
      {dueTasks.map((task) => (
        <CalendarTaskChip task={task} key={task.id} />
      ))}
      {wasteEvents.map((event) => (
        <CalendarWasteChip event={event} key={event.id} />
      ))}
      {remainingReminderCount > 0 ? (
        <span className="calendar-chip calendar-chip--more">
          +{remainingReminderCount}
        </span>
      ) : null}
    </section>
  );
}
