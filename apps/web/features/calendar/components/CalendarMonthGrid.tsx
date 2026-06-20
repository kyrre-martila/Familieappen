"use client";

import { useEffect, useMemo } from "react";

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
  const { ensureSchoolWeeksForRange, normalizedItems, today } = useCalendar();
  const activeMonth = visibleMonth.getMonth();
  const weeks = useMemo(() => buildMonthWeeks(visibleMonth), [visibleMonth]);
  const firstVisibleDate = formatDateString(weeks[0].days[0]);
  const lastVisibleDate = formatDateString(weeks[weeks.length - 1].days[6]);

  useEffect(() => {
    void ensureSchoolWeeksForRange(firstVisibleDate, lastVisibleDate);
  }, [ensureSchoolWeeksForRange, firstVisibleDate, lastVisibleDate]);

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
            const itemsForDate = normalizedItems.filter(
              (item) => item.date === date,
            );
            const eventCount = itemsForDate.filter(
              (item) => item.type === "event" || item.type === "school-week",
            ).length;
            const hasMeal = itemsForDate.some((item) => item.type === "meal");
            const hasReminder = itemsForDate.some(
              (item) => item.type === "reminder" || item.type === "task",
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
