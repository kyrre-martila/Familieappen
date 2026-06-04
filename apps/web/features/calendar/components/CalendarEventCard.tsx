"use client";

import Link from "next/link";
import type { CalendarMvpEvent } from "@familieappen/shared";

import { useCalendar } from "../hooks/useCalendar";
import { eventIcons, eventToneByIcon } from "./calendarConfig";

function getFamilyMembers(
  participantIds: string[],
  familyMembers: ReturnType<typeof useCalendar>["familyMembers"],
) {
  if (participantIds.length === 0) {
    return familyMembers;
  }

  return familyMembers.filter((member) => participantIds.includes(member.id));
}

function ParticipantStack({ participantIds }: { participantIds: string[] }) {
  const { familyMembers } = useCalendar();
  const members = getFamilyMembers(participantIds, familyMembers);

  return (
    <div className="calendar-participants">
      <span className="calendar-participants__avatars" aria-hidden="true">
        {members.map((member) => (
          <span
            className={`calendar-avatar calendar-avatar--${member.avatarColor}`}
            key={member.id}
          >
            {member.initials}
          </span>
        ))}
      </span>
      <span className="calendar-participants__label">
        {participantIds.length === 0
          ? "Hele familien"
          : members.map((member) => member.name).join(", ")}
      </span>
    </div>
  );
}

function EventTime({ event }: { event: CalendarMvpEvent }) {
  if (event.allDay) {
    return <span className="calendar-event-card__time">Hele dagen</span>;
  }

  return (
    <time
      className="calendar-event-card__time"
      dateTime={`${event.date}T${event.startTime ?? "00:00"}`}
    >
      <span>{event.startTime}</span>
      <span aria-hidden="true">–</span>
      <span>{event.endTime}</span>
    </time>
  );
}

export function CalendarEventCard({ event }: { event: CalendarMvpEvent }) {
  const Icon = eventIcons[event.icon];
  const tone = eventToneByIcon[event.icon];

  return (
    <Link
      className={`calendar-event-card calendar-event-card--${tone}`}
      href={`/calendar/events/${event.id}`}
      aria-label={`Åpne hendelse: ${event.title}. ${event.location ?? "Ingen lokasjon"}.`}
    >
      <EventTime event={event} />
      <span className="calendar-event-card__content">
        <span className="calendar-event-card__title">{event.title}</span>
        <span className="calendar-event-card__location">
          {event.location ?? "Ingen lokasjon"}
        </span>
        <ParticipantStack participantIds={event.participantIds} />
      </span>
      <span className="calendar-event-card__icon" aria-hidden="true">
        <Icon size={38} strokeWidth={2.15} />
      </span>
    </Link>
  );
}
