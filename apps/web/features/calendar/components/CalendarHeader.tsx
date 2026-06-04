"use client";

import Link from "next/link";
import { CalendarPlus, Settings } from "lucide-react";
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
      <CalendarViewSwitcher
        selectedView={selectedView}
        onSelectView={onSelectView}
      />
      <Link
        className="calendar-title-action"
        href="/calendar/events/new"
        aria-label="Opprett ny kalenderhendelse"
      >
        <CalendarPlus aria-hidden="true" size={20} strokeWidth={2.4} />
        <span>Ny</span>
      </Link>
      <Link
        className="calendar-title-action calendar-title-action--icon"
        href="/settings/calendar"
        aria-label="Åpne kalenderinnstillinger"
      >
        <Settings aria-hidden="true" size={20} strokeWidth={2.4} />
      </Link>
    </div>
  );
}
