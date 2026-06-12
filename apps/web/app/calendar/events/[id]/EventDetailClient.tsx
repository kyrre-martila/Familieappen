"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Cake,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plane,
  StickyNote,
  Utensils,
  Users,
} from "lucide-react";
import type {
  CalendarMvpEvent,
  CalendarMvpEventIcon,
} from "@familieappen/shared";

import { UserAvatar } from "../../../../components/avatar/UserAvatar";
import { LockedFeatureState } from "../../../../components/PendingAccess";
import { useFamilyAccess } from "../../../../components/ProtectedFamilyRoute";
import {
  Button,
  Card,
  EmptyState,
  PageContainer,
} from "../../../../components/ui";
import { useCalendar } from "../../../../features/calendar/hooks/useCalendar";
import { remapLegacyMemberIds } from "../../../../features/family/familyMemberAdapters";

const eventIcons = {
  birthday: Cake,
  family: Users,
  health: HeartPulse,
  meal: Utensils,
  school: GraduationCap,
  sport: Dumbbell,
  travel: Plane,
} satisfies Record<CalendarMvpEventIcon, typeof Cake>;

const eventDateFormatter = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "long",
  weekday: "long",
});

function parseDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function capitalizeDateLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatEventDate(date: string) {
  return capitalizeDateLabel(eventDateFormatter.format(parseDateString(date)));
}

function formatEventTime(event: CalendarMvpEvent) {
  if (event.allDay) {
    return "Hele dagen";
  }

  if (!event.startTime) {
    return "Tid ikke satt";
  }

  return event.endTime
    ? `${event.startTime}–${event.endTime}`
    : event.startTime;
}

function getParticipants(
  participantIds: string[],
  familyMembers: ReturnType<typeof useCalendar>["familyMembers"],
) {
  if (participantIds.length === 0) {
    return familyMembers;
  }

  const scopedParticipantIds = remapLegacyMemberIds(
    participantIds,
    familyMembers,
  );

  return familyMembers.filter((member) =>
    scopedParticipantIds.includes(member.id),
  );
}

function EventDetailLoading() {
  return (
    <main className="event-detail event-detail--state" aria-live="polite">
      <PageContainer>
        <Card tone="default">
          <EmptyState
            title="Sjekker familietilgang"
            description="Vent litt mens vi bekrefter familietilknytningen din."
          />
        </Card>
      </PageContainer>
    </main>
  );
}

export function EventDetailClient({
  event: initialEvent = null,
  eventId,
}: {
  event?: CalendarMvpEvent | null;
  eventId?: string;
}) {
  const router = useRouter();
  const familyAccess = useFamilyAccess();
  const { events, loading, error, refresh, familyMembers } = useCalendar();
  const event =
    initialEvent ??
    events.find((calendarEvent) => calendarEvent.id === eventId) ??
    null;
  const participantIds = event
    ? remapLegacyMemberIds(event.participantIds, familyMembers)
    : [];
  const participants = event
    ? getParticipants(participantIds, familyMembers)
    : [];
  const EventIcon = event ? eventIcons[event.icon] : eventIcons.family;
  const isWholeFamily = event ? event.participantIds.length === 0 : false;
  const description =
    event?.description ?? "Ingen beskrivelse er lagt til ennå.";

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved" || loading) {
    return <EventDetailLoading />;
  }

  if (!event) {
    return (
      <main className="event-detail event-detail--state" aria-live="polite">
        <PageContainer>
          <Card tone="default">
            <EmptyState
              title={error ?? "Hendelsen finnes ikke lenger"}
              description="Prøv igjen, eller gå tilbake til kalenderen."
            />
            <Button onClick={() => void refresh()} variant="primary">
              Prøv igjen
            </Button>
          </Card>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="event-detail" aria-labelledby="event-detail-title">
      <div className="event-detail__topbar" aria-label="Hendelsesnavigasjon">
        <button
          className="event-detail__icon-button"
          type="button"
          onClick={() => router.back()}
          aria-label="Gå tilbake til kalenderen"
        >
          <ChevronLeft aria-hidden="true" size={30} strokeWidth={2.8} />
        </button>
        <button
          className="event-detail__icon-button"
          type="button"
          aria-label="Flere valg for hendelsen"
        >
          <MoreHorizontal aria-hidden="true" size={30} strokeWidth={2.8} />
        </button>
      </div>

      <div className="event-detail__scroll">
        <header className="event-detail__hero">
          <span className="event-detail__event-icon" aria-hidden="true">
            <EventIcon size={34} strokeWidth={2.35} />
          </span>
          <div className="event-detail__headline">
            <h1 className="event-detail__title" id="event-detail-title">
              {event.title}
            </h1>
            <p className="event-detail__subtitle">
              {event.source === "ics" ? "Bjørnevatn IL G15" : "FamilieAppen"}
            </p>
          </div>
        </header>

        <section
          className="event-detail-card event-detail-card--rows"
          aria-labelledby="event-detail-datetime-heading"
        >
          <h2 className="sr-only" id="event-detail-datetime-heading">
            Dato og tid
          </h2>
          <div className="event-detail-row">
            <CalendarCheck
              aria-hidden="true"
              className="event-detail-row__icon"
              size={28}
              strokeWidth={2.25}
            />
            <span className="event-detail-row__label">Dato</span>
            <time className="event-detail-row__value" dateTime={event.date}>
              {formatEventDate(event.date)}
            </time>
          </div>
          <div className="event-detail-row">
            <Clock
              aria-hidden="true"
              className="event-detail-row__icon"
              size={28}
              strokeWidth={2.25}
            />
            <span className="event-detail-row__label">Tid</span>
            <time
              className="event-detail-row__value"
              dateTime={
                event.startTime
                  ? `${event.date}T${event.startTime}`
                  : event.date
              }
            >
              {formatEventTime(event)}
            </time>
          </div>
          <button
            className="event-detail-row event-detail-row--button"
            type="button"
            aria-label={`Sted: ${event.location ?? "Ingen lokasjon"}. Kart kommer senere.`}
          >
            <MapPin
              aria-hidden="true"
              className="event-detail-row__icon"
              size={28}
              strokeWidth={2.25}
            />
            <span className="event-detail-row__label">Sted</span>
            <span className="event-detail-row__value event-detail-row__value--with-chevron">
              {event.location ?? "Ingen lokasjon"}
              <ChevronRight aria-hidden="true" size={24} strokeWidth={2.7} />
            </span>
          </button>
        </section>

        <section
          className="event-detail-card event-detail-participants"
          aria-labelledby="event-detail-participants-heading"
        >
          <div className="event-detail-card__heading-row">
            <h2
              className="event-detail-card__title"
              id="event-detail-participants-heading"
            >
              Deltar
            </h2>
            <span
              className="event-detail-card__meta"
              aria-label={`${isWholeFamily ? "Hele familien" : `${participants.length} deltakere`}`}
            >
              <Users aria-hidden="true" size={20} strokeWidth={2.4} />
              {isWholeFamily ? "Alle" : participants.length}
            </span>
          </div>
          <div
            className="event-detail-participants__list"
            role="list"
            aria-label={isWholeFamily ? "Hele familien deltar" : "Deltakere"}
          >
            {participants.map((member) => (
              <span
                className="event-detail-participant"
                role="listitem"
                key={member.id}
              >
                <UserAvatar
                  identity={member}
                  avatarUrl={member.avatarUrl}
                  size="sm"
                  className="event-detail-participant__avatar"
                  decorative
                />
                <span className="event-detail-participant__name">
                  {member.name}
                </span>
              </span>
            ))}
          </div>
        </section>

        <section
          className="event-detail-card event-detail-card--rows"
          aria-labelledby="event-detail-reminder-heading"
        >
          <h2 className="sr-only" id="event-detail-reminder-heading">
            Påminnelse
          </h2>
          <div className="event-detail-row">
            <Bell
              aria-hidden="true"
              className="event-detail-row__icon"
              size={28}
              strokeWidth={2.25}
            />
            <span className="event-detail-row__label">Påminnelse</span>
            <span className="event-detail-row__value">
              {event.reminder?.label ?? "Ingen påminnelse"}
            </span>
          </div>
        </section>

        <section
          className="event-detail-card event-detail-description"
          aria-labelledby="event-detail-description-heading"
        >
          <div className="event-detail-card__heading-row">
            <h2
              className="event-detail-card__title"
              id="event-detail-description-heading"
            >
              Beskrivelse
            </h2>
            <StickyNote
              aria-hidden="true"
              className="event-detail-card__heading-icon"
              size={24}
              strokeWidth={2.2}
            />
          </div>
          <p>{description}</p>
        </section>
      </div>

      <div className="event-detail__sticky-action">
        <Link
          className="event-detail__edit-button"
          href={`/calendar/events/${event.id}/edit`}
          aria-label={`Rediger hendelse: ${event.title}`}
        >
          <Pencil aria-hidden="true" size={26} strokeWidth={2.45} />
          <span>Rediger hendelse</span>
        </Link>
      </div>
    </main>
  );
}
