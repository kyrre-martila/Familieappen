import { CalendarDays, ClipboardList, FileText, RotateCcw, User, X } from "lucide-react";

import type { HuskFamilyMember, HuskSchoolWeekItem } from "../types";
import { reminderIcons } from "./huskConfig";
import { formatSchoolDate } from "./huskUtils";
import { HuskMobileSheet } from "./HuskMobileSheet";

function formatSchoolReminderDate(reminder: HuskSchoolWeekItem) {
  const date = reminder.occurrenceDate ?? reminder.date;

  if (!date) {
    return "Dato ikke satt";
  }

  return formatSchoolDate(new Date(`${date}T00:00:00.000Z`));
}

export function SchoolWeekDetailSheet({
  child,
  onClose,
  reminder,
}: {
  child: HuskFamilyMember | null;
  onClose: () => void;
  reminder: HuskSchoolWeekItem | null;
}) {
  const Icon = reminder ? reminderIcons[reminder.icon] : ClipboardList;

  return (
    <HuskMobileSheet
      isOpen={Boolean(reminder)}
      labelledBy="husk-school-detail-title"
      onClose={onClose}
    >
      {reminder ? (
        <>
          <div className="calendar-filter-sheet__header">
            <div className="husk-reminder-detail__heading">
              <span
                className={`husk-reminder-detail__icon husk-reminder-card--${reminder.tone}`}
                aria-hidden="true"
              >
                <Icon size={24} strokeWidth={2.35} />
              </span>
              <div>
                <p className="calendar-filter-sheet__status">Skoleuka • {formatSchoolReminderDate(reminder)}</p>
                <h3
                  className="calendar-filter-sheet__title"
                  id="husk-school-detail-title"
                >
                  {reminder.title}
                </h3>
              </div>
            </div>
            <button
              className="calendar-filter-sheet__close"
              type="button"
              aria-label="Lukk skolehusk"
              onClick={onClose}
            >
              <X aria-hidden="true" size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="husk-reminder-detail__content">
            <div className="husk-reminder-detail__row">
              <User aria-hidden="true" size={19} strokeWidth={2.4} />
              <span>{child?.name ?? "Barn"}</span>
            </div>
            <div className="husk-reminder-detail__row">
              <CalendarDays aria-hidden="true" size={19} strokeWidth={2.4} />
              <span>{formatSchoolReminderDate(reminder)}</span>
            </div>
            {reminder.isRecurring ? (
              <div className="husk-reminder-detail__row">
                <RotateCcw aria-hidden="true" size={19} strokeWidth={2.4} />
                <span>
                  Gjentas ukentlig
                  {reminder.recurrenceEndDate
                    ? ` til ${formatSchoolDate(new Date(`${reminder.recurrenceEndDate}T00:00:00.000Z`))}`
                    : ""}
                </span>
              </div>
            ) : null}
            {reminder.note ? (
              <div className="husk-reminder-detail__row husk-reminder-detail__row--note">
                <FileText aria-hidden="true" size={19} strokeWidth={2.4} />
                <p className="husk-reminder-detail__note">{reminder.note}</p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </HuskMobileSheet>
  );
}
