import { Check, X } from "lucide-react";

import { AppSheet } from "../../components/app-ui";
import type { FamilyMember, HealthPlan } from "../../lib/api";
import { plansForMember } from "./model";

type FilterOption = { label: string; value: string };

function FilterGroup({
  legend,
  name,
  onChange,
  options,
  value,
}: {
  legend: string;
  name: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  value: string;
}) {
  return (
    <fieldset className="calendar-filter-group">
      <legend className="calendar-filter-group__legend">{legend}</legend>
      <div className="calendar-filter-group__options">
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              className={`calendar-filter-option${isSelected ? " calendar-filter-option--selected" : ""}`}
              key={option.value}
            >
              <input
                checked={isSelected}
                className="calendar-filter-option__input"
                name={name}
                onChange={() => onChange(option.value)}
                type="radio"
              />
              <span className="calendar-filter-option__label">{option.label}</span>
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
  );
}

export function HealthPlanFilterSheet({
  activeFilterCount,
  isOpen,
  memberId,
  members,
  onClose,
  onMemberChange,
  onPlanChange,
  onReset,
  planId,
  plans,
}: {
  activeFilterCount: number;
  isOpen: boolean;
  memberId: string;
  members: FamilyMember[];
  onClose: () => void;
  onMemberChange: (memberId: string) => void;
  onPlanChange: (planId: string) => void;
  onReset: () => void;
  planId: string;
  plans: HealthPlan[];
}) {
  const memberOptions = [
    { value: "", label: "Alle" },
    ...members.map((member) => ({ value: member.id, label: member.displayName })),
  ];
  const planOptions = [
    { value: "", label: "Alle planer" },
    ...plansForMember(plans, memberId).map((plan) => ({
      value: plan.id,
      label: plan.name,
    })),
  ];
  const status = activeFilterCount
    ? `${activeFilterCount} aktive filter`
    : "Viser alle familiemedlemmer og planer";

  return (
    <AppSheet
      baseClassName="calendar-filter-sheet"
      isOpen={isOpen}
      labelledBy="health-plan-filter-title"
      onClose={onClose}
      wrapContent={false}
    >
      <div className="calendar-filter-sheet__header">
        <div>
          <h3 className="calendar-filter-sheet__title" id="health-plan-filter-title">
            Filter for Helseplan
          </h3>
          <p className="calendar-filter-sheet__status">{status}</p>
        </div>
        <button className="calendar-filter-sheet__close" type="button" aria-label="Lukk filter" onClick={onClose}>
          <X aria-hidden="true" size={18} strokeWidth={2.5} />
        </button>
      </div>
      <div className="calendar-filter-sheet__content">
        <FilterGroup legend="Familiemedlem" name="health-plan-member-filter" onChange={onMemberChange} options={memberOptions} value={memberId} />
        <FilterGroup legend="Plan" name="health-plan-plan-filter" onChange={onPlanChange} options={planOptions} value={planId} />
      </div>
      <div className="calendar-filter-sheet__actions">
        <button className="calendar-filter-sheet__action calendar-filter-sheet__action--secondary" type="button" onClick={onReset}>
          Nullstill
        </button>
        <button className="calendar-filter-sheet__action calendar-filter-sheet__action--primary" type="button" onClick={onClose}>
          Ferdig
        </button>
      </div>
    </AppSheet>
  );
}
