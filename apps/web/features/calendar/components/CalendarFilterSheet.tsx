"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";

import { useCalendar } from "../hooks/useCalendar";
import {
  categoryOptions,
  contentTypeOptions,
} from "./calendarConfig";
import { countActiveListFilters } from "./calendarFilters";
import type { CalendarListFilters } from "./calendarTypes";

function FilterOptionGroup<TValue extends string>({
  legend,
  name,
  options,
  selectedValue,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: TValue; label: string }[];
  selectedValue: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset className="calendar-filter-group">
      <legend className="calendar-filter-group__legend">{legend}</legend>
      <div className="calendar-filter-group__options">
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <label
              className={`calendar-filter-option${isSelected ? " calendar-filter-option--selected" : ""}`}
              key={option.value}
            >
              <input
                className="calendar-filter-option__input"
                name={name}
                type="radio"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
              />
              <span className="calendar-filter-option__label">
                {option.label}
              </span>
              {isSelected ? (
                <Check
                  className="calendar-filter-option__check"
                  aria-hidden="true"
                  size={17}
                  strokeWidth={3}
                />
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CalendarFilterSheet({
  draftFilters,
  isOpen,
  onApply,
  onClose,
  onDraftChange,
  onReset,
}: {
  draftFilters: CalendarListFilters;
  isOpen: boolean;
  onApply: () => void;
  onClose: () => void;
  onDraftChange: (filters: CalendarListFilters) => void;
  onReset: () => void;
}) {
  const { familyMembers } = useCalendar();
  const familyOptions = useMemo(
    () => [
      { value: "all", label: "Alle" },
      ...familyMembers.map((member) => ({
        value: member.id,
        label: member.name,
      })),
    ],
    [familyMembers],
  );
  const draftActiveCount = countActiveListFilters(draftFilters);

  return (
    <div
      id="calendar-filter-sheet"
      className={`calendar-filter-sheet${isOpen ? " calendar-filter-sheet--open" : ""}`}
    >
      <button
        className="calendar-filter-sheet__backdrop"
        type="button"
        aria-label="Lukk filter"
        onClick={onClose}
      />
      <section
        aria-labelledby="calendar-filter-title"
        aria-modal="true"
        className="calendar-filter-sheet__panel"
        role="dialog"
      >
        <div className="calendar-filter-sheet__handle" aria-hidden="true" />
        <div className="calendar-filter-sheet__header">
          <div>
            <h2
              className="calendar-filter-sheet__title"
              id="calendar-filter-title"
            >
              Filtrer kalender
            </h2>
            <p className="calendar-filter-sheet__status" aria-live="polite">
              {draftActiveCount > 0
                ? `${draftActiveCount} aktive filter valgt.`
                : "Ingen aktive filter."}
            </p>
          </div>
          <button
            className="calendar-filter-sheet__close"
            type="button"
            aria-label="Lukk filter"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="calendar-filter-sheet__content">
          <FilterOptionGroup
            legend="Innholdstype"
            name="calendar-content-type-filter"
            options={contentTypeOptions}
            selectedValue={draftFilters.contentType}
            onChange={(contentType) =>
              onDraftChange({ ...draftFilters, contentType })
            }
          />
          <FilterOptionGroup
            legend="Familiemedlem"
            name="calendar-family-member-filter"
            options={familyOptions}
            selectedValue={draftFilters.familyMemberId}
            onChange={(familyMemberId) =>
              onDraftChange({ ...draftFilters, familyMemberId })
            }
          />
          <FilterOptionGroup
            legend="Ikon / kategori"
            name="calendar-category-filter"
            options={categoryOptions}
            selectedValue={draftFilters.category}
            onChange={(category) =>
              onDraftChange({ ...draftFilters, category })
            }
          />
        </div>

        <div className="calendar-filter-sheet__actions">
          <button
            className="calendar-filter-sheet__action calendar-filter-sheet__action--secondary"
            type="button"
            onClick={onReset}
          >
            Nullstill
          </button>
          <button
            className="calendar-filter-sheet__action calendar-filter-sheet__action--primary"
            type="button"
            onClick={onApply}
          >
            Bruk filter
          </button>
        </div>
      </section>
    </div>
  );
}
