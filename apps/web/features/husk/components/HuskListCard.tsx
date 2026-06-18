import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { UserAvatar } from "../../../components/avatar/UserAvatar";
import { AppCard, AppListRow } from "../../../components/app-ui";
import type { HuskFamilyMember, HuskListGroup } from "../types";
import { listIcons } from "./huskConfig";

function ListCardAvatars({ members }: { members: HuskFamilyMember[] }) {
  const visibleMembers = members.slice(0, 4);
  const hiddenCount = Math.max(members.length - visibleMembers.length, 0);

  return (
    <span
      className="husk-list-card__avatars"
      aria-label={members.map((member) => member.name).join(", ")}
    >
      {visibleMembers.map((member) => (
        <UserAvatar
          identity={member}
          avatarUrl={member.avatarUrl}
          size="xs"
          className="husk-avatar"
          decorative
          key={member.id}
        />
      ))}
      {hiddenCount > 0 ? (
        <span className="husk-list-card__avatar-count" aria-hidden="true">
          +{hiddenCount}
        </span>
      ) : null}
    </span>
  );
}

export function HuskListCard({
  familyMembers,
  group,
  isArchived = false,
}: {
  familyMembers: HuskFamilyMember[];
  group: HuskListGroup;
  isArchived?: boolean;
}) {
  const Icon = listIcons[group.icon];
  const members = group.memberIds
    .map((memberId) => familyMembers.find((member) => member.id === memberId))
    .filter((member): member is HuskFamilyMember => Boolean(member));
  const progressPercent =
    group.totalCount > 0
      ? Math.round((group.completedCount / group.totalCount) * 100)
      : 0;
  const progressText = `${group.completedCount} av ${group.totalCount} fullført`;

  const cardContent = (
    <>
      <span className="husk-list-card__icon" aria-hidden="true">
        <Icon size={26} strokeWidth={2.25} />
      </span>
      <span className="husk-list-card__copy">
        <span className="husk-list-card__title">{group.title}</span>
        <span className="husk-list-card__progress-text">{progressText}</span>
        <span className="husk-list-card__progress" aria-hidden="true">
          <span
            className="husk-list-card__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </span>
      </span>
      <ListCardAvatars members={members} />
      {isArchived ? (
        <span className="husk-list-card__archived-label">Arkivert</span>
      ) : (
        <ChevronRight
          className="husk-list-card__chevron"
          aria-hidden="true"
          size={22}
          strokeWidth={2.4}
        />
      )}
    </>
  );

  if (isArchived) {
    return (
      <AppCard
        className={`husk-list-card husk-list-card--${group.tone} husk-list-card--archived`}
      >
        {cardContent}
      </AppCard>
    );
  }

  return (
    <AppListRow
      as={Link}
      className={`husk-list-card husk-list-card--${group.tone}`}
      href={`/husk/lister/${group.id}`}
      aria-label={`Åpne listen ${group.title}. ${progressText}`}
    >
      {cardContent}
    </AppListRow>
  );
}
