"use client";

import { Check, ChevronDown, Users } from "lucide-react";

import { UserAvatar } from "../../../components/avatar/UserAvatar";
import { AppCard } from "../../../components/app-ui";

type AudienceMember = {
  id: string;
  name?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export function getAudienceSummary(
  memberIds: string[],
  members: AudienceMember[],
) {
  if (memberIds.length === 0) return "Hele familien";
  const names = memberIds
    .map((memberId) => {
      const member = members.find((candidate) => candidate.id === memberId);
      return member?.displayName ?? member?.name;
    })
    .filter((name): name is string => Boolean(name));

  return names.length > 0
    ? names.join(", ")
    : `${memberIds.length} person${memberIds.length === 1 ? "" : "er"}`;
}

export function SharedAudienceSelector({
  labelledBy,
  isOpen,
  members,
  onToggleOpen,
  selectedMemberIds,
  setSelectedMemberIds,
  title = "Gjelder",
}: {
  labelledBy: string;
  isOpen: boolean;
  members: AudienceMember[];
  onToggleOpen: () => void;
  selectedMemberIds: string[];
  setSelectedMemberIds: (
    value: string[] | ((currentIds: string[]) => string[]),
  ) => void;
  title?: string;
}) {
  const summary = getAudienceSummary(selectedMemberIds, members);

  function collapseAfterSelection() {
    if (isOpen) onToggleOpen();
  }

  function selectFamily() {
    setSelectedMemberIds([]);
    collapseAfterSelection();
  }

  function toggleMember(memberId: string) {
    setSelectedMemberIds((currentIds) =>
      currentIds.includes(memberId)
        ? currentIds.filter((id) => id !== memberId)
        : [...currentIds, memberId],
    );
    collapseAfterSelection();
  }

  return (
    <AppCard className="event-form-card--compact" aria-labelledby={labelledBy}>
      <button
        className="event-form-picker-row"
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-controls={`${labelledBy}-picker`}
      >
        <span className="event-form-picker-row__label" id={labelledBy}>
          {title}
        </span>
        <span
          className="event-form-scope-summary event-form-scope-summary--inline"
          aria-live="polite"
        >
          <span className="event-form-scope-summary__text">{summary}</span>
          <ChevronDown aria-hidden="true" size={18} />
        </span>
      </button>
      {isOpen ? (
        <div
          className="event-form-avatar-list"
          id={`${labelledBy}-picker`}
          role="group"
          aria-label="Velg personer"
        >
          <button
            className={`event-form-avatar-chip event-form-avatar-chip--family${selectedMemberIds.length === 0 ? " event-form-avatar-chip--selected" : ""}`}
            type="button"
            onClick={selectFamily}
            aria-pressed={selectedMemberIds.length === 0}
          >
            <span
              className="event-form-avatar-chip__avatar event-form-avatar-chip__avatar--family"
              aria-hidden="true"
            >
              <Users size={19} strokeWidth={2.5} />
              {selectedMemberIds.length === 0 ? (
                <span className="event-form-avatar-chip__check">
                  <Check size={13} strokeWidth={3.2} />
                </span>
              ) : null}
            </span>
            <span>Hele familien</span>
          </button>
          {members.map((member) => {
            const isSelected = selectedMemberIds.includes(member.id);
            return (
              <button
                className={`event-form-avatar-chip${isSelected ? " event-form-avatar-chip--selected" : ""}`}
                type="button"
                key={member.id}
                onClick={() => toggleMember(member.id)}
                aria-pressed={isSelected}
              >
                <span className="event-form-avatar-chip__avatar-wrap">
                  <UserAvatar
                    identity={member}
                    avatarUrl={member.avatarUrl ?? undefined}
                    size="sm"
                    className="event-form-avatar-chip__avatar"
                    decorative
                  />
                  {isSelected ? (
                    <span className="event-form-avatar-chip__check">
                      <Check size={13} strokeWidth={3.2} />
                    </span>
                  ) : null}
                </span>
                <span>{member.displayName ?? member.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </AppCard>
  );
}
