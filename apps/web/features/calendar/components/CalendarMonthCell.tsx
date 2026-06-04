"use client";

import { CalendarCheck, Utensils } from "lucide-react";

import { formatMonthDayLabel } from "./calendarFormatters";

function buildDateCellLabel(
  date: string,
  hasMeal: boolean,
  hasReminder: boolean,
  eventCount: number,
) {
  const formattedDate = formatMonthDayLabel(date);
  const details: string[] = [];

  if (hasMeal) {
    details.push("har middag");
  }

  if (hasReminder) {
    details.push("har husk");
  }

  if (eventCount > 0) {
    details.push(
      `${eventCount} ${eventCount === 1 ? "hendelse" : "hendelser"}`,
    );
  }

  return `${formattedDate}, ${details.length > 0 ? details.join(", ") : "ingen planer"}`;
}

export function CalendarMonthCell({
  date,
  day,
  eventCount,
  hasMeal,
  hasReminder,
  isOutsideMonth,
  isSelected,
  isSunday,
  isToday,
  onSelectDate,
}: {
  date: string;
  day: Date;
  eventCount: number;
  hasMeal: boolean;
  hasReminder: boolean;
  isOutsideMonth: boolean;
  isSelected: boolean;
  isSunday: boolean;
  isToday: boolean;
  onSelectDate: (date: string) => void;
}) {
  const dots = Array.from({ length: Math.min(eventCount, 4) });

  return (
    <button
      className={[
        "calendar-month-cell",
        isToday ? "calendar-month-cell--today" : "",
        isSelected ? "calendar-month-cell--selected" : "",
        isOutsideMonth ? "calendar-month-cell--outside" : "",
        isSunday ? "calendar-month-cell--sunday" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isSelected}
      aria-label={buildDateCellLabel(
        date,
        hasMeal,
        hasReminder,
        eventCount,
      )}
      onClick={() => onSelectDate(date)}
    >
      <span className="calendar-month-cell__date">
        {day.getDate()}
      </span>
      <span
        className="calendar-month-cell__icons"
        aria-hidden="true"
      >
        {hasReminder ? (
          <CalendarCheck
            className="calendar-month-cell__icon calendar-month-cell__icon--reminder"
            size={18}
            strokeWidth={2.5}
          />
        ) : (
          <span />
        )}
        {hasMeal ? (
          <Utensils
            className="calendar-month-cell__icon calendar-month-cell__icon--meal"
            size={18}
            strokeWidth={2.5}
          />
        ) : (
          <span />
        )}
      </span>
      <span
        className="calendar-month-cell__dots"
        aria-hidden="true"
      >
        {dots.map((_, index) => (
          <span
            className="calendar-month-cell__dot"
            key={`${date}-${index}`}
          />
        ))}
      </span>
    </button>
  );
}
