"use client";

import { useMemo, useRef, useState } from "react";
import {
  Backpack,
  Cake,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Gift,
  GraduationCap,
  Plane,
  Stethoscope,
  Utensils,
  Users,
  Volleyball
} from "lucide-react";
import type { CalendarMvpEvent, CalendarMvpEventIcon, CalendarViewMode, ReminderSummary } from "@familieappen/shared";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer } from "../../components/ui";
import { calendarEvents, familyMembers, meals, mockToday, reminders } from "./mockCalendarData";

const dayFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "short" });
const selectedDateFormatter = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", weekday: "long", year: "numeric" });

const eventIcons = {
  birthday: Cake,
  family: Users,
  health: Stethoscope,
  meal: Utensils,
  school: GraduationCap,
  sport: Dumbbell,
  travel: Plane
} satisfies Record<CalendarMvpEventIcon, typeof Cake>;

const reminderIcons = {
  backpack: Backpack,
  birthday: Cake,
  family: Users,
  flame: Flame,
  gift: Gift,
  health: Stethoscope,
  meal: Utensils,
  school: GraduationCap,
  sport: Volleyball,
  travel: Plane
} satisfies Record<ReminderSummary["icon"], typeof Cake>;

const eventToneByIcon = {
  birthday: "purple",
  family: "yellow",
  health: "blue",
  meal: "orange",
  school: "blue",
  sport: "green",
  travel: "blue"
} satisfies Record<CalendarMvpEventIcon, "blue" | "green" | "orange" | "purple" | "yellow">;

function buildDateStrip(startDate: string, length = 14) {
  const [year, month, day] = startDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);

  return Array.from({ length }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function formatSelectedDate(date: string) {
  const formatted = selectedDateFormatter.format(new Date(`${date}T12:00:00`));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getFamilyMembers(participantIds: string[]) {
  if (participantIds.length === 0) {
    return familyMembers;
  }

  return familyMembers.filter((member) => participantIds.includes(member.id));
}

function ViewSwitcher({ selectedView }: { selectedView: CalendarViewMode }) {
  const labelByView = { day: "Dag", list: "Liste", month: "Måned" } satisfies Record<CalendarViewMode, string>;

  return (
    <button className="calendar-view-switcher" type="button" aria-haspopup="menu" aria-label="Velg kalendervisning. Dagvisning er valgt.">
      <span>{labelByView[selectedView]}</span>
      <ChevronDown aria-hidden="true" size={20} strokeWidth={2.4} />
    </button>
  );
}

function DateStrip({ selectedDate, onSelectDate }: { selectedDate: string; onSelectDate: (date: string) => void }) {
  const dates = useMemo(() => buildDateStrip("2025-06-02"), []);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollDates(direction: "back" | "forward") {
    scrollerRef.current?.scrollBy({ left: direction === "forward" ? 260 : -260, behavior: "smooth" });
  }

  return (
    <section className="calendar-date-strip" aria-label="Velg dato">
      <button className="calendar-date-strip__arrow" type="button" aria-label="Rull til tidligere datoer" onClick={() => scrollDates("back")}>
        <ChevronLeft aria-hidden="true" size={24} />
      </button>
      <div className="calendar-date-strip__scroller" role="list" ref={scrollerRef}>
        {dates.map((date) => {
          const dateObject = new Date(`${date}T12:00:00`);
          const isToday = date === mockToday;
          const isSelected = date === selectedDate;
          const hasEvent = calendarEvents.some((event) => event.date === date) || reminders.some((reminder) => reminder.date === date);

          return (
            <button
              className={["calendar-date", isToday ? "calendar-date--today" : "", isSelected ? "calendar-date--selected" : ""].filter(Boolean).join(" ")}
              key={date}
              type="button"
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              aria-label={`Vis ${formatSelectedDate(date)}`}
              onClick={() => onSelectDate(date)}
              role="listitem"
            >
              <span className="calendar-date__weekday">{dayFormatter.format(dateObject).replace(".", "").toUpperCase()}</span>
              <span className="calendar-date__day">{dateObject.getDate()}</span>
              <span className={`calendar-date__dot${hasEvent ? " calendar-date__dot--active" : ""}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <button className="calendar-date-strip__arrow" type="button" aria-label="Rull til senere datoer" onClick={() => scrollDates("forward")}>
        <ChevronRight aria-hidden="true" size={24} />
      </button>
    </section>
  );
}

function SummaryChips({ selectedDate }: { selectedDate: string }) {
  const meal = meals.find((item) => item.date === selectedDate);
  const visibleReminders = reminders.filter((item) => item.date === selectedDate);
  const shownReminders = visibleReminders.slice(0, 3);
  const remainingReminderCount = Math.max(0, visibleReminders.length - shownReminders.length);

  if (!meal && visibleReminders.length === 0) {
    return null;
  }

  return (
    <section className="calendar-summary-chips" aria-label="Middag og påminnelser">
      {meal ? (
        <span className="calendar-chip calendar-chip--meal">
          <Utensils aria-hidden="true" size={22} strokeWidth={2.3} />
          <span>{meal.title}</span>
        </span>
      ) : null}
      {shownReminders.map((reminder) => {
        const ReminderIcon = reminderIcons[reminder.icon];
        return (
          <span className="calendar-chip calendar-chip--reminder" key={reminder.id}>
            <ReminderIcon aria-hidden="true" size={22} strokeWidth={2.3} />
            <span>{reminder.title}</span>
          </span>
        );
      })}
      {remainingReminderCount > 0 ? <span className="calendar-chip calendar-chip--more">+{remainingReminderCount}</span> : null}
    </section>
  );
}

function ParticipantStack({ participantIds }: { participantIds: string[] }) {
  const members = getFamilyMembers(participantIds);

  return (
    <div className="calendar-participants">
      <span className="calendar-participants__avatars" aria-hidden="true">
        {members.map((member) => (
          <span className={`calendar-avatar calendar-avatar--${member.avatarColor}`} key={member.id}>{member.initials}</span>
        ))}
      </span>
      <span className="calendar-participants__label">{participantIds.length === 0 ? "Hele familien" : members.map((member) => member.name).join(", ")}</span>
    </div>
  );
}

function EventTime({ event }: { event: CalendarMvpEvent }) {
  if (event.allDay) {
    return <span className="calendar-event-card__time">Hele dagen</span>;
  }

  return (
    <time className="calendar-event-card__time" dateTime={`${event.date}T${event.startTime ?? "00:00"}`}>
      <span>{event.startTime}</span>
      <span aria-hidden="true">–</span>
      <span>{event.endTime}</span>
    </time>
  );
}

function EventCard({ event }: { event: CalendarMvpEvent }) {
  const Icon = eventIcons[event.icon];
  const tone = eventToneByIcon[event.icon];

  return (
    <button className={`calendar-event-card calendar-event-card--${tone}`} type="button" aria-label={`${event.title}. ${event.location ?? "Ingen lokasjon"}.`}>
      <EventTime event={event} />
      <span className="calendar-event-card__content">
        <span className="calendar-event-card__title">{event.title}</span>
        <span className="calendar-event-card__location">{event.location ?? "Ingen lokasjon"}</span>
        <ParticipantStack participantIds={event.participantIds} />
      </span>
      <span className="calendar-event-card__icon" aria-hidden="true">
        <Icon size={38} strokeWidth={2.15} />
      </span>
    </button>
  );
}

function DayView({ selectedDate }: { selectedDate: string }) {
  const eventsForDate = calendarEvents.filter((event) => event.date === selectedDate);

  return (
    <section className="calendar-day-view" aria-labelledby="calendar-selected-date">
      <h2 className="calendar-day-view__date" id="calendar-selected-date">{formatSelectedDate(selectedDate)}</h2>
      <SummaryChips selectedDate={selectedDate} />
      <div className="calendar-event-list" aria-label="Hendelser for valgt dato">
        {eventsForDate.length > 0 ? eventsForDate.map((event) => <EventCard event={event} key={event.id} />) : <EmptyState title="Ingen hendelser" description="Denne dagen er rolig foreløpig." />}
      </div>
    </section>
  );
}

export default function CalendarPage() {
  const familyAccess = useFamilyAccess();
  const [selectedView] = useState<CalendarViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(mockToday);

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Kalender">
        <PageContainer>
          <Card tone="default">
            <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell title="Kalender" titleAction={<ViewSwitcher selectedView={selectedView} />}>
      <PageContainer>
        <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        {selectedView === "day" ? <DayView selectedDate={selectedDate} /> : null}
        {selectedView === "month" ? <div hidden>TODO: Month view</div> : null}
        {selectedView === "list" ? <div hidden>TODO: List view</div> : null}
      </PageContainer>
    </AppShell>
  );
}
