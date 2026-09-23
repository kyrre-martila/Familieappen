"use client";

import Link from "next/link";
import type { CalendarMvpEvent } from "@familieappen/shared";

export function CalendarWasteChip({ event }: { event: CalendarMvpEvent }) {
  return (
    <Link
      className="calendar-chip calendar-chip--waste"
      href="/waste-collection"
      aria-label={`Åpne renovasjon: ${event.title}`}
    >
      <span aria-hidden="true">♻️</span>
      <span>{event.title}</span>
    </Link>
  );
}
