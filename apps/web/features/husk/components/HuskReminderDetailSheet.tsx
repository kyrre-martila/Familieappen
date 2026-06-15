import { CalendarDays, ClipboardList, Users, X } from "lucide-react";

import type { HuskReminder } from "../types";
import { reminderIcons } from "./huskConfig";
import { HuskMobileSheet } from "./HuskMobileSheet";

export function HuskReminderDetailSheet({
  onClose,
  onEdit,
  reminder,
}: {
  onClose: () => void;
  onEdit: (reminder: HuskReminder) => void;
  reminder: HuskReminder | null;
}) {
  const Icon = reminder ? reminderIcons[reminder.icon] : ClipboardList;

  return (
    <HuskMobileSheet
      isOpen={Boolean(reminder)}
      labelledBy="husk-reminder-detail-title"
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
                <p className="calendar-filter-sheet__status">
                  {reminder.scopeText} • {reminder.dateLabel}
                </p>
                <h3
                  className="calendar-filter-sheet__title"
                  id="husk-reminder-detail-title"
                >
                  {reminder.title}
                </h3>
              </div>
            </div>
            <button
              className="calendar-filter-sheet__close"
              type="button"
              aria-label="Lukk husk"
              onClick={onClose}
            >
              <X aria-hidden="true" size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="husk-reminder-detail__content">
            <div className="husk-reminder-detail__row">
              <Users aria-hidden="true" size={19} strokeWidth={2.4} />
              <span>{reminder.scopeText}</span>
            </div>
            <div className="husk-reminder-detail__row">
              <CalendarDays aria-hidden="true" size={19} strokeWidth={2.4} />
              <span>{reminder.dateLabel}</span>
            </div>
            {reminder.note ? (
              <p className="husk-reminder-detail__note">{reminder.note}</p>
            ) : null}
          </div>
          <div className="calendar-filter-sheet__actions">
            <button
              className="calendar-filter-sheet__action calendar-filter-sheet__action--primary"
              type="button"
              onClick={() => onEdit(reminder)}
            >
              Endre
            </button>
          </div>
        </>
      ) : null}
    </HuskMobileSheet>
  );
}
