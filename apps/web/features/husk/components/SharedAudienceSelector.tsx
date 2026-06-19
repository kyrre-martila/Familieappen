"use client";

import { useEffect, useRef } from "react";
import { Check, ChevronDown, Users } from "lucide-react";

import { UserAvatar } from "../../../components/avatar/UserAvatar";

type AudienceMember = {
  id: string;
  name?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

function getMemberLabel(member?: AudienceMember) {
  return member?.displayName ?? member?.name ?? "Ukjent";
}

function getSelectedMembers(memberIds: string[], members: AudienceMember[]) {
  return memberIds
    .map((memberId) => members.find((candidate) => candidate.id === memberId))
    .filter((member): member is AudienceMember => Boolean(member));
}

export function getAudienceSummary(
  memberIds: string[],
  members: AudienceMember[],
) {
  if (memberIds.length === 0) return "Hele familien";
  if (memberIds.length === 1) {
    const [member] = getSelectedMembers(memberIds, members);
    return member ? getMemberLabel(member) : "1 valgt";
  }

  return `${memberIds.length} valgt`;
}

function AudienceSummaryContent({
  members,
  selectedMemberIds,
}: {
  members: AudienceMember[];
  selectedMemberIds: string[];
}) {
  if (selectedMemberIds.length === 0) {
    return (
      <>
        <span className="event-form-scope-summary__family" aria-hidden="true">
          <Users size={17} strokeWidth={2.5} />
        </span>
        <span className="event-form-scope-summary__text">Hele familien</span>
      </>
    );
  }

  const selectedMembers = getSelectedMembers(selectedMemberIds, members);

  if (selectedMemberIds.length === 1) {
    const [member] = selectedMembers;
    return (
      <>
        {member ? (
          <UserAvatar
            identity={member}
            avatarUrl={member.avatarUrl ?? undefined}
            size="sm"
            className="event-form-scope-summary__avatar"
            decorative
          />
        ) : (
          <span
            className="event-form-scope-summary__empty"
            aria-hidden="true"
          />
        )}
        <span className="event-form-scope-summary__text">
          {member ? getMemberLabel(member) : "1 valgt"}
        </span>
      </>
    );
  }

  const visibleMembers = selectedMembers.slice(0, 3);
  const hiddenCount = Math.max(
    0,
    selectedMemberIds.length - visibleMembers.length,
  );

  return (
    <>
      <span className="event-form-scope-stack" aria-hidden="true">
        {visibleMembers.map((member) => (
          <UserAvatar
            key={member.id}
            identity={member}
            avatarUrl={member.avatarUrl ?? undefined}
            size="sm"
            className="event-form-scope-stack__avatar event-form-avatar-chip__avatar"
            decorative
          />
        ))}
        {hiddenCount > 0 ? (
          <span className="event-form-scope-stack__count">+{hiddenCount}</span>
        ) : null}
      </span>
      <span className="event-form-scope-summary__text">
        {selectedMemberIds.length} valgt
      </span>
    </>
  );
}

export function SharedAudienceSelector({
  labelledBy,
  isOpen,
  members,
  onToggleOpen,
  selectedMemberIds,
  setSelectedMemberIds,
  title = "Gjelder",
  singleSelect = false,
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
  singleSelect?: boolean;
}) {
  const summary = getAudienceSummary(selectedMemberIds, members);
  const selectorRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        selectorRef.current &&
        !selectorRef.current.contains(target)
      ) {
        onToggleOpen();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onToggleOpen();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onToggleOpen]);

  function collapseAfterSelection() {
    if (singleSelect && isOpen) onToggleOpen();
  }

  function selectFamily() {
    setSelectedMemberIds([]);
    collapseAfterSelection();
  }

  function toggleMember(memberId: string) {
    if (singleSelect) {
      setSelectedMemberIds([memberId]);
    } else {
      setSelectedMemberIds((currentIds) =>
        currentIds.includes(memberId)
          ? currentIds.filter((id) => id !== memberId)
          : [...currentIds, memberId],
      );
    }
    collapseAfterSelection();
  }

  return (
    <article
      ref={selectorRef}
      className="app-card event-form-card--compact"
      aria-labelledby={labelledBy}
    >
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
          aria-label={summary}
        >
          <AudienceSummaryContent
            members={members}
            selectedMemberIds={selectedMemberIds}
          />
          <ChevronDown
            aria-hidden="true"
            size={18}
            className="event-form-scope-summary__chevron"
          />
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
                <span>{getMemberLabel(member)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
