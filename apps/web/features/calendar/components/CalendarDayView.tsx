"use client";

import { useEffect } from "react";

import { useCalendar } from "../hooks/useCalendar";
import { CalendarDayChips } from "./CalendarDayChips";
import { CalendarEmptyState } from "./CalendarEmptyState";
import { CalendarEventCard } from "./CalendarEventCard";
import { formatSelectedDate } from "./calendarFormatters";

export function CalendarDayView({
  selectedDate,
  showChips = true,
}: {
  selectedDate: string;
  showChips?: boolean;
}) {
  const { ensureSchoolWeeksForRange, events: calendarEvents } = useCalendar();
  useEffect(() => {
    void ensureSchoolWeeksForRange(selectedDate, selectedDate);
  }, [ensureSchoolWeeksForRange, selectedDate]);

  const eventsForDate = calendarEvents.filter(
    (event) => event.date === selectedDate && event.source !== "school-week",
  );

  return (
    <section
      className="calendar-day-view"
      aria-labelledby="calendar-selected-date"
    >
      <h2 className="calendar-day-view__date" id="calendar-selected-date">
        {formatSelectedDate(selectedDate)}
      </h2>
      {showChips ? <CalendarDayChips selectedDate={selectedDate} /> : null}
      <div
        className="calendar-event-list"
        aria-label="Hendelser for valgt dato"
      >
        {eventsForDate.length > 0 ? (
          eventsForDate.map((event) => (
            <CalendarEventCard event={event} key={event.id} />
          ))
        ) : (
          <CalendarEmptyState
            title="Ingen hendelser"
            description="Denne dagen er rolig foreløpig."
          />
        )}
      </div>
    </section>
  );
}
