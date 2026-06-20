"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Card } from "../../../components/ui";
import { useCalendar } from "../hooks/useCalendar";
import { CalendarEmptyState } from "./CalendarEmptyState";
import { CalendarFilterSheet } from "./CalendarFilterSheet";
import { CalendarListDayGroup } from "./CalendarListDayGroup";
import { CalendarListFilters } from "./CalendarListFilters";
import { defaultListFilters } from "./calendarConfig";
import { buildListDayGroups, countActiveListFilters } from "./calendarFilters";
import {
  addDays,
  formatDateString,
  parseDateString,
} from "./calendarFormatters";
import type { CalendarListFilters as CalendarListFiltersType } from "./calendarTypes";

export function CalendarListView() {
  const [filters, setFilters] =
    useState<CalendarListFiltersType>(defaultListFilters);
  const [draftFilters, setDraftFilters] =
    useState<CalendarListFiltersType>(defaultListFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const activeFilterCount = countActiveListFilters(filters);
  const {
    ensureSchoolWeeksForRange,
    events: calendarEvents,
    mealSummaries: mealPlannerMeals,
    reminders,
    tasks,
    selectedDate,
    setSelectedDate,
    setSelectedView,
    today,
  } = useCalendar();
  useEffect(() => {
    const todayDate = parseDateString(today);
    void ensureSchoolWeeksForRange(
      formatDateString(addDays(todayDate, -30)),
      formatDateString(addDays(todayDate, 90)),
    );
  }, [ensureSchoolWeeksForRange, today]);

  const dayGroups = useMemo(
    () =>
      buildListDayGroups(filters, calendarEvents, reminders, mealPlannerMeals, tasks),
    [calendarEvents, filters, mealPlannerMeals, reminders, tasks],
  );
  const initialScrollCompleteRef = useRef(false);

  useEffect(() => {
    if (initialScrollCompleteRef.current || dayGroups.length === 0) {
      return;
    }

    const targetDate = selectedDate || today;
    const targetGroup =
      dayGroups.find((group) => group.date === targetDate) ??
      dayGroups.find((group) => group.date >= targetDate) ??
      dayGroups.at(-1);

    if (!targetGroup) {
      return;
    }

    document
      .getElementById(`calendar-list-${targetGroup.date}`)
      ?.closest(".calendar-list-day")
      ?.scrollIntoView({ block: "start" });
    initialScrollCompleteRef.current = true;
  }, [dayGroups, selectedDate, today]);

  function openDayView(date: string) {
    setSelectedDate(date);
    setSelectedView("day");
  }

  function openFilterSheet() {
    setDraftFilters(filters);
    setIsFilterOpen(true);
  }

  function closeFilterSheet() {
    setIsFilterOpen(false);
  }

  function applyFilters() {
    setFilters(draftFilters);
    setIsFilterOpen(false);
  }

  function resetFilters() {
    setDraftFilters(defaultListFilters);
    setFilters(defaultListFilters);
    setIsFilterOpen(false);
  }

  return (
    <section
      className="calendar-list-view"
      aria-labelledby="calendar-list-title"
    >
      <div className="calendar-list-view__toolbar">
        <h2 className="calendar-list-view__title" id="calendar-list-title">
          Familietidslinje
        </h2>
        <CalendarListFilters
          activeFilterCount={activeFilterCount}
          isFilterOpen={isFilterOpen}
          onOpenFilterSheet={openFilterSheet}
        />
      </div>

      {isFilterOpen ? (
        <CalendarFilterSheet
          draftFilters={draftFilters}
          isOpen={isFilterOpen}
          onApply={applyFilters}
          onClose={closeFilterSheet}
          onDraftChange={setDraftFilters}
          onReset={resetFilters}
        />
      ) : null}

      {activeFilterCount > 0 ? (
        <p className="calendar-list-view__filter-status" aria-live="polite">
          {activeFilterCount} aktive filter påvirker listen.
        </p>
      ) : null}

      {dayGroups.length > 0 ? (
        <div className="calendar-list-view__groups">
          {dayGroups.map((group) => (
            <CalendarListDayGroup
              group={group}
              key={group.date}
              onOpenDay={openDayView}
              today={today}
            />
          ))}
        </div>
      ) : (
        <Card tone="default" className="calendar-list-empty">
          <CalendarEmptyState
            title="Ingen treff"
            description="Prøv å endre filteret."
          />
        </Card>
      )}
    </section>
  );
}
