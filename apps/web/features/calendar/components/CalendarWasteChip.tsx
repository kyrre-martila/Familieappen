"use client";

import Link from "next/link";
import { Recycle } from "lucide-react";
import type { CalendarMvpEvent } from "@familieappen/shared";

export function CalendarWasteChip({ event }: { event: CalendarMvpEvent }) {
  return (
    <Link
      className="calendar-chip calendar-chip--waste"
      href="/waste-collection"
      aria-label={`Åpne renovasjon: ${event.title}`}
    >
      <Recycle aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{event.title}</span>
    </Link>
  );
}
