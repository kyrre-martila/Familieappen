"use client";

import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import type { CalendarViewMode } from "@familieappen/shared";

import { CalendarViewSwitcher } from "./CalendarViewSwitcher";

export function CalendarHeader({
  selectedView,
  onSelectView,
}: {
  selectedView: CalendarViewMode;
  onSelectView: (view: CalendarViewMode) => void;
}) {
  return (
    <div className="calendar-title-actions" aria-label="Kalenderhandlinger">
      <Link
        className="calendar-title-action"
        href="/calendar/events/new"
        aria-label="Opprett ny kalenderhendelse"
      >
        <CalendarPlus aria-hidden="true" size={20} strokeWidth={2.4} />
        <span>Ny</span>
      </Link>
      <CalendarViewSwitcher
        selectedView={selectedView}
        onSelectView={onSelectView}
      />
    </div>
  );
}
