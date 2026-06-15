"use client";

import Link from "next/link";
import type { ReminderSummary } from "@familieappen/shared";

import { reminderIcons } from "./calendarConfig";

export function CalendarReminderChip({ reminder }: { reminder: ReminderSummary }) {
  const ReminderIcon = reminderIcons[reminder.icon] ?? reminderIcons.family;

  return (
    <button
      className="calendar-chip calendar-chip--reminder"
      type="button"
      aria-label={`Åpne husk: ${reminder.title}`}
    >
      <ReminderIcon aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{reminder.title || "Påminnelse"}</span>
    </button>
  );
}

export function CalendarReminderSummaryChip({
  ariaLabel,
  href,
  reminder,
}: {
  ariaLabel?: string;
  href?: string;
  reminder: ReminderSummary;
}) {
  const ReminderIcon = reminderIcons[reminder.icon] ?? reminderIcons.family;
  const content = (
    <>
      <ReminderIcon aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{reminder.title || "Påminnelse"}</span>
    </>
  );

  if (href) {
    return (
      <Link
        aria-label={ariaLabel ?? `Åpne husk: ${reminder.title || "Påminnelse"}`}
        className="calendar-chip calendar-chip--reminder"
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      className="calendar-chip calendar-chip--reminder"
      key={reminder.id}
    >
      {content}
    </span>
  );
}
