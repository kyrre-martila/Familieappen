"use client";

import Link from "next/link";
import { Backpack } from "lucide-react";

import { UserAvatar } from "../../../components/avatar/UserAvatar";
import { useCalendar } from "../hooks/useCalendar";
import type { NormalizedCalendarItem } from "../hooks/useCalendar";

export function CalendarSchoolWeekChip({
  item,
}: {
  item: NormalizedCalendarItem;
}) {
  const { familyMembers } = useCalendar();
  const members = familyMembers.filter((member) =>
    item.participantIds.includes(member.id),
  );
  const audienceLabel = members.map((member) => member.name).join(", ");

  return (
    <Link
      className="calendar-chip calendar-chip--school-week"
      href={`/husk?tab=skoleuka&date=${item.date}`}
      aria-label={`Åpne skoleuka: ${item.title}${audienceLabel ? ` for ${audienceLabel}` : ""}`}
    >
      <Backpack aria-hidden="true" size={22} strokeWidth={2.3} />
      {members.length > 0 ? (
        <span className="calendar-chip__avatar-stack" aria-hidden="true">
          {members.map((member) => (
            <UserAvatar
              identity={member}
              avatarUrl={member.avatarUrl}
              size="xs"
              className="calendar-chip__avatar"
              decorative
              key={member.id}
            />
          ))}
        </span>
      ) : null}
      <span>{item.title}</span>
    </Link>
  );
}
