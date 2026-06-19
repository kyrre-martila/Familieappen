"use client";

import { Check, ChevronDown, Users } from "lucide-react";

import { UserAvatar } from "../../../components/avatar/UserAvatar";
import { AppCard, AppListRow } from "../../../components/app-ui";

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

  function toggleMember(memberId: string) {
    setSelectedMemberIds((currentIds) =>
      currentIds.includes(memberId)
        ? currentIds.filter((id) => id !== memberId)
        : [...currentIds, memberId],
    );
  }

  return (
    <AppCard className="event-form-card--compact" aria-labelledby={labelledBy}>
      <h2 className="event-form-card-title" id={labelledBy}>
        {title}
      </h2>
      <AppListRow
        as="button"
        type="button"
        className="event-form-compact-selector"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
      >
        <span>{summary}</span>
        <ChevronDown aria-hidden="true" size={18} />
      </AppListRow>
      {isOpen ? (
        <div
          className="event-form-participant-list"
          role="group"
          aria-label="Velg personer"
        >
          <AppListRow
            as="button"
            type="button"
            onClick={() => setSelectedMemberIds([])}
            aria-pressed={selectedMemberIds.length === 0}
          >
            <span
              className="event-form-avatar-chip__avatar event-form-avatar-chip__avatar--family"
              aria-hidden="true"
            >
              <Users size={19} strokeWidth={2.5} />
            </span>
            <span>Hele familien</span>
            {selectedMemberIds.length === 0 ? (
              <Check aria-hidden="true" size={18} />
            ) : null}
          </AppListRow>
          {members.map((member) => {
            const isSelected = selectedMemberIds.includes(member.id);
            return (
              <AppListRow
                as="button"
                type="button"
                key={member.id}
                onClick={() => toggleMember(member.id)}
                aria-pressed={isSelected}
              >
                <UserAvatar
                  identity={member}
                  avatarUrl={member.avatarUrl ?? undefined}
                  size="xs"
                  className="event-form-avatar-chip__avatar"
                  decorative
                />
                <span>{member.displayName ?? member.name}</span>
                {isSelected ? <Check aria-hidden="true" size={18} /> : null}
              </AppListRow>
            );
          })}
        </div>
      ) : null}
    </AppCard>
  );
}
