"use client";

import { useMemo } from "react";

import { useCalendar } from "../hooks/useCalendar";
import {
  buildMonthWeeks,
  formatDateString,
  weekDayLabels,
} from "./calendarFormatters";
import { CalendarMonthCell } from "./CalendarMonthCell";
import { CalendarWeekNumber } from "./CalendarWeekNumber";

export function CalendarMonthGrid({
  selectedDate,
  visibleMonth,
  onSelectDate,
}: {
  selectedDate: string;
  visibleMonth: Date;
  onSelectDate: (date: string) => void;
}) {
  const { events: calendarEvents, mealSummaries: mealPlannerMeals, reminders, today } = useCalendar();
  const activeMonth = visibleMonth.getMonth();
  const weeks = useMemo(() => buildMonthWeeks(visibleMonth), [visibleMonth]);

  return (
    <div
      className="calendar-month__grid"
      role="grid"
      aria-labelledby="calendar-month-title"
    >
      <div className="calendar-month__week-heading">UKE</div>
      {weekDayLabels.map((label, index) => (
        <div
          className={
            index === 6
              ? "calendar-month__weekday calendar-month__weekday--sunday"
              : "calendar-month__weekday"
          }
          key={label}
        >
          {label}
        </div>
      ))}

      {weeks.map((week) => (
        <div
          className="calendar-month__week-row"
          role="row"
          key={`${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}-${week.weekNumber}`}
        >
          <CalendarWeekNumber weekNumber={week.weekNumber} />
          {week.days.map((day) => {
            const date = formatDateString(day);
            const eventCount = calendarEvents.filter(
              (event) => event.date === date,
            ).length;
            const hasMeal = mealPlannerMeals.some(
              (meal) => meal.date === date,
            );
            const hasReminder = reminders.some(
              (reminder) => reminder.date === date,
            );

            return (
              <CalendarMonthCell
                date={date}
                day={day}
                eventCount={eventCount}
                hasMeal={hasMeal}
                hasReminder={hasReminder}
                isOutsideMonth={day.getMonth() !== activeMonth}
                isSelected={date === selectedDate}
                isSunday={day.getDay() === 0}
                isToday={date === today}
                key={date}
                onSelectDate={onSelectDate}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
