"use client";

import type { CalendarViewMode } from "@familieappen/shared";

export function CalendarViewSwitcher({
  selectedView,
  onSelectView,
}: {
  selectedView: CalendarViewMode;
  onSelectView: (view: CalendarViewMode) => void;
}) {
  const labelByView = {
    day: "Dag",
    list: "Liste",
    month: "Måned",
  } satisfies Record<CalendarViewMode, string>;

  const viewOrder = ["day", "month", "list"] satisfies CalendarViewMode[];

  return (
    <div
      className="calendar-view-switcher"
      role="radiogroup"
      aria-label="Velg kalendervisning"
    >
      {viewOrder.map((view) => {
        const isSelected = selectedView === view;

        return (
          <button
            className={`calendar-view-switcher__option${isSelected ? " calendar-view-switcher__option--selected" : ""}`}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${labelByView[view]}visning${isSelected ? ", valgt" : ""}`}
            key={view}
            onClick={() => onSelectView(view)}
          >
            {labelByView[view]}
          </button>
        );
      })}
    </div>
  );
}
