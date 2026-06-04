"use client";

import { SlidersHorizontal } from "lucide-react";

export function CalendarListFilters({
  activeFilterCount,
  isFilterOpen,
  onOpenFilterSheet,
}: {
  activeFilterCount: number;
  isFilterOpen: boolean;
  onOpenFilterSheet: () => void;
}) {
  const filterButtonLabel =
    activeFilterCount > 0
      ? `Filter, ${activeFilterCount} aktive filter`
      : "Åpne kalenderfilter";

  return (
    <button
      className={`calendar-filter-button${activeFilterCount > 0 ? " calendar-filter-button--active" : ""}`}
      type="button"
      aria-expanded={isFilterOpen}
      aria-controls="calendar-filter-sheet"
      aria-label={filterButtonLabel}
      onClick={onOpenFilterSheet}
    >
      <SlidersHorizontal aria-hidden="true" size={20} strokeWidth={2.4} />
      <span>Filter</span>
      {activeFilterCount > 0 ? (
        <span className="calendar-filter-button__count" aria-hidden="true">
          · {activeFilterCount}
        </span>
      ) : null}
    </button>
  );
}
