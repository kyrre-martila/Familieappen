"use client";

import Link from "next/link";
import type { ReminderSummary } from "@familieappen/shared";

import { reminderIcons } from "./calendarConfig";

export function CalendarReminderChip({ reminder }: { reminder: ReminderSummary }) {
  const ReminderIcon = reminderIcons[reminder.icon] ?? reminderIcons.family;

  return (
    <Link
      aria-label={`Åpne påminnelse i Husk: ${reminder.title || "Påminnelse"}`}
      className="calendar-chip calendar-chip--reminder"
      href={`/husk?tab=reminders&detailId=${encodeURIComponent(reminder.id)}`}
    >
      <ReminderIcon aria-hidden="true" size={22} strokeWidth={2.3} />
      <span>{reminder.title || "Påminnelse"}</span>
    </Link>
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
        href={href ?? `/husk?tab=reminders&detailId=${encodeURIComponent(reminder.id)}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      aria-label={ariaLabel ?? `Åpne påminnelse i Husk: ${reminder.title || "Påminnelse"}`}
      className="calendar-chip calendar-chip--reminder"
      href={`/husk?tab=reminders&detailId=${encodeURIComponent(reminder.id)}`}
      key={reminder.id}
    >
      {content}
    </Link>
  );
}
