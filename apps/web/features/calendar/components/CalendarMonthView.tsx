"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { monthTitleFormatter } from "./calendarFormatters";
import { CalendarMonthGrid } from "./CalendarMonthGrid";

export function CalendarMonthView({
  selectedDate,
  visibleMonth,
  onChangeMonth,
  onSelectDate,
}: {
  selectedDate: string;
  visibleMonth: Date;
  onChangeMonth: (direction: "previous" | "next") => void;
  onSelectDate: (date: string) => void;
}) {
  const title = monthTitleFormatter.format(visibleMonth);
  const monthTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <section className="calendar-month" aria-labelledby="calendar-month-title">
      <div className="calendar-month__toolbar">
        <button
          className="calendar-month__nav"
          type="button"
          aria-label="Vis forrige måned"
          onClick={() => onChangeMonth("previous")}
        >
          <ChevronLeft aria-hidden="true" size={26} strokeWidth={2.4} />
        </button>
        <h2 className="calendar-month__title" id="calendar-month-title">
          {monthTitle}
        </h2>
        <button
          className="calendar-month__nav"
          type="button"
          aria-label="Vis neste måned"
          onClick={() => onChangeMonth("next")}
        >
          <ChevronRight aria-hidden="true" size={26} strokeWidth={2.4} />
        </button>
      </div>

      <CalendarMonthGrid
        selectedDate={selectedDate}
        visibleMonth={visibleMonth}
        onSelectDate={onSelectDate}
      />
    </section>
  );
}
