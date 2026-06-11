"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCalendar } from "../hooks/useCalendar";
import {
  buildDateStrip,
  dayFormatter,
  formatSelectedDate,
  parseDateString,
} from "./calendarFormatters";

export function CalendarDateStrip({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const { ensureSchoolWeeksForRange, normalizedItems, today } = useCalendar();
  const dates = useMemo(
    () => buildDateStrip(selectedDate, 14, -3),
    [selectedDate],
  );
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void ensureSchoolWeeksForRange(dates[0], dates[dates.length - 1]);
  }, [dates, ensureSchoolWeeksForRange]);

  function scrollDates(direction: "back" | "forward") {
    scrollerRef.current?.scrollBy({
      left: direction === "forward" ? 260 : -260,
      behavior: "smooth",
    });
  }

  return (
    <section className="calendar-date-strip" aria-label="Velg dato">
      <button
        className="calendar-date-strip__arrow"
        type="button"
        aria-label="Rull til tidligere datoer"
        onClick={() => scrollDates("back")}
      >
        <ChevronLeft aria-hidden="true" size={24} />
      </button>
      <div
        className="calendar-date-strip__scroller"
        role="list"
        ref={scrollerRef}
      >
        {dates.map((date) => {
          const dateObject = parseDateString(date);
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const hasEvent = normalizedItems.some((item) => item.date === date);

          return (
            <button
              className={[
                "calendar-date",
                isToday ? "calendar-date--today" : "",
                isSelected ? "calendar-date--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={date}
              type="button"
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              aria-label={`Vis ${formatSelectedDate(date)}`}
              onClick={() => onSelectDate(date)}
              role="listitem"
            >
              <span className="calendar-date__weekday">
                {dayFormatter.format(dateObject).replace(".", "").toUpperCase()}
              </span>
              <span className="calendar-date__day">{dateObject.getDate()}</span>
              <span
                className={`calendar-date__dot${hasEvent ? " calendar-date__dot--active" : ""}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      <button
        className="calendar-date-strip__arrow"
        type="button"
        aria-label="Rull til senere datoer"
        onClick={() => scrollDates("forward")}
      >
        <ChevronRight aria-hidden="true" size={24} />
      </button>
    </section>
  );
}
