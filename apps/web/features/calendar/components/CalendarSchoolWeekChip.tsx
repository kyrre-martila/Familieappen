"use client";

import Link from "next/link";
import { Backpack } from "lucide-react";

import type { NormalizedCalendarItem } from "../hooks/useCalendar";

export function CalendarSchoolWeekChip({
  item,
}: {
  item: NormalizedCalendarItem;
}) {
  return (
    <Link
      className="calendar-chip calendar-chip--school-week"
      href={`/husk?tab=skoleuka&date=${item.date}`}
      aria-label={`Åpne skoleuka: ${item.title}`}
    >
      <Backpack aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{item.title}</span>
    </Link>
  );
}
