"use client";

import { CalendarEventCard } from "./CalendarEventCard";
import { CalendarMealChip } from "./CalendarMealChip";
import { CalendarReminderChip } from "./CalendarReminderChip";
import { formatListDate } from "./calendarFormatters";
import type { CalendarListDayGroup as CalendarListDayGroupType } from "./calendarTypes";

export function CalendarListDayGroup({
  group,
  onOpenDay,
  today,
}: {
  group: CalendarListDayGroupType;
  onOpenDay: (date: string) => void;
  today: string;
}) {
  const visibleReminders = group.reminders.slice(0, 10);
  const hiddenReminderCount = Math.max(
    0,
    group.reminders.length - visibleReminders.length,
  );
  const headingId = `calendar-list-${group.date}`;

  return (
    <section
      className="calendar-list-day"
      aria-labelledby={headingId}
    >
      <div className="calendar-list-day__header">
        <h3 className="calendar-list-day__title" id={headingId}>
          <button
            className="calendar-list-day__date-button"
            type="button"
            aria-label={`Åpne dagvisning for ${formatListDate(group.date)}`}
            onClick={() => onOpenDay(group.date)}
          >
            {formatListDate(group.date)}
          </button>
        </h3>
        {group.date === today ? (
          <span className="calendar-list-day__today">I dag</span>
        ) : null}
      </div>

      {group.meal || group.reminders.length > 0 ? (
        <div
          className="calendar-list-day__chips"
          aria-label={`Middag og husk for ${formatListDate(group.date)}`}
        >
          {group.meal ? (
            <CalendarMealChip
              date={group.date}
              label={formatListDate(group.date)}
              meal={group.meal}
            />
          ) : null}
          {visibleReminders.map((reminder) => (
            <CalendarReminderChip reminder={reminder} key={reminder.id} />
          ))}
          {hiddenReminderCount > 0 ? (
            <button
              className="calendar-chip calendar-chip--more"
              type="button"
              aria-label={`Vis ${hiddenReminderCount} flere husk for ${formatListDate(group.date)}`}
            >
              +{hiddenReminderCount} flere
            </button>
          ) : null}
        </div>
      ) : null}

      {group.events.length > 0 ? (
        <div
          className="calendar-event-list calendar-list-day__events"
          aria-label={`Kalenderhendelser for ${formatListDate(group.date)}`}
        >
          {group.events.map((event) => (
            <CalendarEventCard event={event} key={event.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
