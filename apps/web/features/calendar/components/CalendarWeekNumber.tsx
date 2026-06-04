"use client";

export function CalendarWeekNumber({ weekNumber }: { weekNumber: number }) {
  return (
    <div
      className="calendar-month__week-number"
      aria-label={`Uke ${weekNumber}`}
    >
      {weekNumber}
    </div>
  );
}
