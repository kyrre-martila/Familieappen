"use client";

import { useMemo, useRef, useState } from "react";
import {
  Backpack,
  CalendarCheck,
  Cake,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Gift,
  GraduationCap,
  Plane,
  SlidersHorizontal,
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
const listDateFormatter = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", weekday: "long" });
const monthTitleFormatter = new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" });
const monthDayLabelFormatter = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long" });
const weekDayLabels = ["MAN", "TIR", "ONS", "TOR", "FRE", "LØR", "SØN"];

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

function parseDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + amount);

  return nextDate;
}

function startOfMondayWeek(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  return addDays(date, mondayOffset);
}

function getIsoWeekNumber(date: Date) {
  const weekDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));

  return Math.ceil(((weekDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function buildMonthWeeks(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDate = startOfMondayWeek(firstOfMonth);

  return Array.from({ length: 6 }, (_, weekIndex) => {
    const weekStart = addDays(startDate, weekIndex * 7);

    return {
      weekNumber: getIsoWeekNumber(weekStart),
      days: Array.from({ length: 7 }, (_, dayIndex) => addDays(weekStart, dayIndex))
    };
  });
}

function buildDateStrip(startDate: string, length = 14) {
  const [year, month, day] = startDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);

  return Array.from({ length }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatDateString(date);
  });
}

function capitalizeDateLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatSelectedDate(date: string) {
  return capitalizeDateLabel(selectedDateFormatter.format(parseDateString(date)));
}

function formatListDate(date: string) {
  return capitalizeDateLabel(listDateFormatter.format(parseDateString(date)));
}

function buildListDayGroups() {
  const dates = new Set<string>();

  meals.forEach((meal) => dates.add(meal.date));
  reminders.forEach((reminder) => dates.add(reminder.date));
  calendarEvents.forEach((event) => dates.add(event.date));

  return Array.from(dates)
    .sort((firstDate, secondDate) => firstDate.localeCompare(secondDate))
    .map((date) => ({
      date,
      events: calendarEvents
        .filter((event) => event.date === date)
        .sort((firstEvent, secondEvent) => (firstEvent.startTime ?? "00:00").localeCompare(secondEvent.startTime ?? "00:00")),
      meal: meals.find((meal) => meal.date === date),
      reminders: reminders.filter((reminder) => reminder.date === date)
    }))
    .filter((group) => group.meal || group.reminders.length > 0 || group.events.length > 0);
}

function getFamilyMembers(participantIds: string[]) {
  if (participantIds.length === 0) {
    return familyMembers;
  }

  return familyMembers.filter((member) => participantIds.includes(member.id));
}

function ViewSwitcher({ selectedView, onToggleView }: { selectedView: CalendarViewMode; onToggleView: () => void }) {
  const labelByView = { day: "Dag", list: "Liste", month: "Måned" } satisfies Record<CalendarViewMode, string>;

  return (
    <button
      className="calendar-view-switcher"
      type="button"
      aria-haspopup="menu"
      aria-label={`Velg kalendervisning. ${labelByView[selectedView]}visning er valgt.`}
      onClick={onToggleView}
    >
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
          const dateObject = parseDateString(date);
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

function buildDateCellLabel(date: string, hasMeal: boolean, hasReminder: boolean, eventCount: number) {
  const formattedDate = monthDayLabelFormatter.format(parseDateString(date));
  const details: string[] = [];

  if (hasMeal) {
    details.push("har middag");
  }

  if (hasReminder) {
    details.push("har husk");
  }

  if (eventCount > 0) {
    details.push(`${eventCount} ${eventCount === 1 ? "hendelse" : "hendelser"}`);
  }

  return `${formattedDate}, ${details.length > 0 ? details.join(", ") : "ingen planer"}`;
}

function MonthView({
  selectedDate,
  visibleMonth,
  onChangeMonth,
  onSelectDate
}: {
  selectedDate: string;
  visibleMonth: Date;
  onChangeMonth: (direction: "previous" | "next") => void;
  onSelectDate: (date: string) => void;
}) {
  const activeMonth = visibleMonth.getMonth();
  const weeks = useMemo(() => buildMonthWeeks(visibleMonth), [visibleMonth]);
  const title = monthTitleFormatter.format(visibleMonth);
  const monthTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <section className="calendar-month" aria-labelledby="calendar-month-title">
      <div className="calendar-month__toolbar">
        <button className="calendar-month__nav" type="button" aria-label="Vis forrige måned" onClick={() => onChangeMonth("previous")}>
          <ChevronLeft aria-hidden="true" size={26} strokeWidth={2.4} />
        </button>
        <h2 className="calendar-month__title" id="calendar-month-title">{monthTitle}</h2>
        <button className="calendar-month__nav" type="button" aria-label="Vis neste måned" onClick={() => onChangeMonth("next")}>
          <ChevronRight aria-hidden="true" size={26} strokeWidth={2.4} />
        </button>
      </div>

      <div className="calendar-month__grid" role="grid" aria-labelledby="calendar-month-title">
        <div className="calendar-month__week-heading">UKE</div>
        {weekDayLabels.map((label, index) => (
          <div className={index === 6 ? "calendar-month__weekday calendar-month__weekday--sunday" : "calendar-month__weekday"} key={label}>
            {label}
          </div>
        ))}

        {weeks.map((week) => (
          <div className="calendar-month__week-row" role="row" key={`${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}-${week.weekNumber}`}>
            <div className="calendar-month__week-number" aria-label={`Uke ${week.weekNumber}`}>{week.weekNumber}</div>
            {week.days.map((day) => {
              const date = formatDateString(day);
              const eventCount = calendarEvents.filter((event) => event.date === date).length;
              const hasMeal = meals.some((meal) => meal.date === date);
              const hasReminder = reminders.some((reminder) => reminder.date === date);
              const isToday = date === mockToday;
              const isSelected = date === selectedDate;
              const isOutsideMonth = day.getMonth() !== activeMonth;
              const isSunday = day.getDay() === 0;
              const dots = Array.from({ length: Math.min(eventCount, 4) });

              return (
                <button
                  className={[
                    "calendar-month-cell",
                    isToday ? "calendar-month-cell--today" : "",
                    isSelected ? "calendar-month-cell--selected" : "",
                    isOutsideMonth ? "calendar-month-cell--outside" : "",
                    isSunday ? "calendar-month-cell--sunday" : ""
                  ].filter(Boolean).join(" ")}
                  key={date}
                  type="button"
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={isSelected}
                  aria-label={buildDateCellLabel(date, hasMeal, hasReminder, eventCount)}
                  onClick={() => onSelectDate(date)}
                >
                  <span className="calendar-month-cell__date">{day.getDate()}</span>
                  <span className="calendar-month-cell__icons" aria-hidden="true">
                    {hasReminder ? <CalendarCheck className="calendar-month-cell__icon calendar-month-cell__icon--reminder" size={18} strokeWidth={2.5} /> : <span />}
                    {hasMeal ? <Utensils className="calendar-month-cell__icon calendar-month-cell__icon--meal" size={18} strokeWidth={2.5} /> : <span />}
                  </span>
                  <span className="calendar-month-cell__dots" aria-hidden="true">
                    {dots.map((_, index) => <span className="calendar-month-cell__dot" key={`${date}-${index}`} />)}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function ReminderChip({ reminder }: { reminder: ReminderSummary }) {
  const ReminderIcon = reminderIcons[reminder.icon];

  return (
    <button className="calendar-chip calendar-chip--reminder" type="button" aria-label={`Åpne husk: ${reminder.title}`}>
      <ReminderIcon aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{reminder.title}</span>
    </button>
  );
}

function ListView({ isFilterOpen, onToggleFilter }: { isFilterOpen: boolean; onToggleFilter: () => void }) {
  const dayGroups = useMemo(() => buildListDayGroups(), []);

  return (
    <section className="calendar-list-view" aria-labelledby="calendar-list-title">
      <div className="calendar-list-view__toolbar">
        <h2 className="calendar-list-view__title" id="calendar-list-title">Familietidslinje</h2>
        <button className="calendar-filter-button" type="button" aria-expanded={isFilterOpen} aria-controls="calendar-filter-placeholder" onClick={onToggleFilter}>
          <SlidersHorizontal aria-hidden="true" size={20} strokeWidth={2.4} />
          <span>Filter</span>
        </button>
      </div>

      {isFilterOpen ? (
        <div className="calendar-filter-placeholder" id="calendar-filter-placeholder" role="status">
          Filter kommer senere: familiemedlem, ikon/kategori, kun middag, kun husk eller kun kalenderhendelser.
        </div>
      ) : null}

      <div className="calendar-list-view__groups">
        {dayGroups.map((group) => {
          const visibleReminders = group.reminders.slice(0, 10);
          const hiddenReminderCount = Math.max(0, group.reminders.length - visibleReminders.length);
          const headingId = `calendar-list-${group.date}`;

          return (
            <section className="calendar-list-day" aria-labelledby={headingId} key={group.date}>
              <div className="calendar-list-day__header">
                <h3 className="calendar-list-day__title" id={headingId}>{formatListDate(group.date)}</h3>
                {group.date === mockToday ? <span className="calendar-list-day__today">I dag</span> : null}
              </div>

              {group.meal || group.reminders.length > 0 ? (
                <div className="calendar-list-day__chips" aria-label={`Middag og husk for ${formatListDate(group.date)}`}>
                  {group.meal ? (
                    <button className="calendar-chip calendar-chip--meal" type="button" aria-label={`Åpne middag for ${formatListDate(group.date)}: ${group.meal.title}`}>
                      <Utensils aria-hidden="true" size={22} strokeWidth={2.3} />
                      <span>{group.meal.title}</span>
                    </button>
                  ) : null}
                  {visibleReminders.map((reminder) => <ReminderChip reminder={reminder} key={reminder.id} />)}
                  {hiddenReminderCount > 0 ? (
                    <button className="calendar-chip calendar-chip--more" type="button" aria-label={`Vis ${hiddenReminderCount} flere husk for ${formatListDate(group.date)}`}>
                      +{hiddenReminderCount} flere
                    </button>
                  ) : null}
                </div>
              ) : null}

              {group.events.length > 0 ? (
                <div className="calendar-event-list calendar-list-day__events" aria-label={`Kalenderhendelser for ${formatListDate(group.date)}`}>
                  {group.events.map((event) => <EventCard event={event} key={event.id} />)}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
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
  const [selectedView, setSelectedView] = useState<CalendarViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(mockToday);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateString(mockToday));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  function toggleCalendarView() {
    const viewOrder = ["day", "month", "list"] satisfies CalendarViewMode[];
    setSelectedView((currentView) => viewOrder[(viewOrder.indexOf(currentView) + 1) % viewOrder.length]);
  }

  function handleChangeMonth(direction: "previous" | "next") {
    setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (direction === "next" ? 1 : -1), 1));
  }

  function handleMonthDateSelect(date: string) {
    setSelectedDate(date);
    setVisibleMonth(parseDateString(date));
    setSelectedView("day");
  }

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
    <AppShell title="Kalender" titleAction={<ViewSwitcher selectedView={selectedView} onToggleView={toggleCalendarView} />}>
      <PageContainer>
        {selectedView === "day" ? (
          <>
            <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <DayView selectedDate={selectedDate} />
          </>
        ) : null}
        {selectedView === "month" ? (
          <MonthView
            selectedDate={selectedDate}
            visibleMonth={visibleMonth}
            onChangeMonth={handleChangeMonth}
            onSelectDate={handleMonthDateSelect}
          />
        ) : null}
        {selectedView === "list" ? <ListView isFilterOpen={isFilterOpen} onToggleFilter={() => setIsFilterOpen((isOpen) => !isOpen)} /> : null}
      </PageContainer>
    </AppShell>
  );
}
