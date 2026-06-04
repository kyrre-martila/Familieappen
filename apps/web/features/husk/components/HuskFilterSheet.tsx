import { Check, X } from "lucide-react";

import type { HuskPersonFilter } from "../types";
import { useFamilyMembers } from "../../family/hooks/useFamilyMembers";
import { HuskMobileSheet } from "./HuskMobileSheet";

export function HuskFilterSheet({
  isOpen,
  onClose,
  onPersonChange,
  onReset,
  onToggleChange,
  person,
  status,
  title,
  toggleChecked,
  toggleLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPersonChange: (person: HuskPersonFilter) => void;
  onReset: () => void;
  onToggleChange: (checked: boolean) => void;
  person: HuskPersonFilter;
  status: string;
  title: string;
  toggleChecked: boolean;
  toggleLabel: string;
}) {
  const { familyMembers } = useFamilyMembers();
  const personFilterOptions = [
    { value: "all" as HuskPersonFilter, label: "Alle" },
    ...familyMembers.map((member) => ({ value: member.id as HuskPersonFilter, label: member.name })),
    { value: "family" as HuskPersonFilter, label: "Hele familien" },
  ];

  return (
    <HuskMobileSheet
      isOpen={isOpen}
      labelledBy="husk-filter-title"
      onClose={onClose}
    >
      <div className="calendar-filter-sheet__header">
        <div>
          <h3 className="calendar-filter-sheet__title" id="husk-filter-title">
            {title}
          </h3>
          <p className="calendar-filter-sheet__status">{status}</p>
        </div>
        <button
          className="calendar-filter-sheet__close"
          type="button"
          aria-label="Lukk filter"
          onClick={onClose}
        >
          <X aria-hidden="true" size={18} strokeWidth={2.5} />
        </button>
      </div>
      <div className="calendar-filter-sheet__content">
        <fieldset className="calendar-filter-group">
          <legend className="calendar-filter-group__legend">Person</legend>
          <div className="calendar-filter-group__options">
            {personFilterOptions.map((option) => {
              const isSelected = person === option.value;

              return (
                <label
                  className={`calendar-filter-option${isSelected ? " calendar-filter-option--selected" : ""}`}
                  key={option.value}
                >
                  <input
                    checked={isSelected}
                    className="calendar-filter-option__input"
                    name="husk-person-filter"
                    onChange={() => onPersonChange(option.value)}
                    type="radio"
                  />
                  <span className="calendar-filter-option__label">
                    {option.label}
                  </span>
                  {isSelected ? (
                    <Check
                      className="calendar-filter-option__check"
                      aria-hidden="true"
                      size={16}
                      strokeWidth={2.8}
                    />
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="husk-filter-toggle">
          <span>{toggleLabel}</span>
          <input
            checked={toggleChecked}
            onChange={(event) => onToggleChange(event.target.checked)}
            type="checkbox"
          />
        </label>
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
          onClick={onClose}
        >
          Ferdig
        </button>
      </div>
    </HuskMobileSheet>
  );
}
