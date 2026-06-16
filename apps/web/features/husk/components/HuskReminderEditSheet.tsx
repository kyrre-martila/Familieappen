"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CalendarDays, Check, FileText, Users, X } from "lucide-react";

import { UserAvatar } from "../../../components/avatar/UserAvatar";
import type { ReminderInput } from "../hooks/useReminders";
import type {
  HuskFamilyMember,
  HuskReminder,
  HuskReminderIcon,
} from "../types";
import { reminderIcons } from "./huskConfig";

const reminderIconOptions = [
  { value: "backpack", label: "Sekk" },
  { value: "book", label: "Bok" },
  { value: "cake", label: "Bursdag" },
  { value: "car", label: "Kjøring" },
  { value: "gift", label: "Gave" },
  { value: "grill", label: "Mat" },
  { value: "passport", label: "Reise" },
  { value: "shirt", label: "Gymtøy" },
  { value: "summer", label: "Sommer" },
  { value: "tooth", label: "Tannlege" },
] satisfies { value: HuskReminderIcon; label: string }[];

const reminderMinuteOptions = [
  { value: 0, label: "På dagen" },
  { value: 60, label: "1 t før" },
  { value: 1440, label: "Dagen før" },
  { value: 10080, label: "Uken før" },
] as const;

type ReminderEditDraft = {
  title: string;
  note: string;
  icon: HuskReminderIcon;
  audience: "family" | "people";
  memberIds: string[];
  dueDate: string;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  isPrivate: boolean;
};

function toDraft(reminder: HuskReminder | null): ReminderEditDraft {
  return {
    title: reminder?.title ?? "",
    note: reminder?.note ?? "",
    icon: reminder?.icon ?? "backpack",
    audience:
      !reminder ||
      reminder.scopeText === "Hele familien" ||
      reminder.memberIds.length === 0
        ? "family"
        : "people",
    memberIds:
      reminder?.scopeText === "Hele familien"
        ? []
        : (reminder?.memberIds ?? []),
    dueDate: reminder?.dueDate ?? new Date().toISOString().slice(0, 10),
    reminderEnabled:
      reminder?.reminderMinutesBefore !== null &&
      reminder?.reminderMinutesBefore !== undefined,
    reminderMinutesBefore: reminder?.reminderMinutesBefore ?? 1440,
    isPrivate: reminder?.isPrivate ?? false,
  };
}

function getScopeSummary(
  draft: ReminderEditDraft,
  familyMembers: HuskFamilyMember[],
) {
  if (draft.audience === "family") return "Hele familien";
  const selectedMembers = familyMembers.filter((member) =>
    draft.memberIds.includes(member.id),
  );
  if (selectedMembers.length === 0) return "Ingen valgt";
  if (selectedMembers.length === 1) return selectedMembers[0].name;
  return `${selectedMembers.length} personer`;
}

export function HuskReminderEditSheet({
  familyMembers,
  isSaving,
  onClose,
  onSave,
  reminder,
}: {
  familyMembers: HuskFamilyMember[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (reminderId: string, input: ReminderInput) => Promise<void>;
  reminder: HuskReminder | null;
}) {
  const [draft, setDraft] = useState<ReminderEditDraft>(() =>
    toDraft(reminder),
  );
  const [isMounted, setIsMounted] = useState(false);
  const isOpen = Boolean(reminder);
  const Icon = reminderIcons[draft.icon];
  const scopeSummary = useMemo(
    () => getScopeSummary(draft, familyMembers),
    [draft, familyMembers],
  );
  const isValid =
    draft.title.trim().length > 0 &&
    draft.dueDate.trim().length > 0 &&
    (draft.audience === "family" || draft.memberIds.length > 0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setDraft(toDraft(reminder));
  }, [reminder]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function toggleMember(memberId: string) {
    setDraft((current) => ({
      ...current,
      audience: "people",
      memberIds: current.memberIds.includes(memberId)
        ? current.memberIds.filter((id) => id !== memberId)
        : [...current.memberIds, memberId],
    }));
  }

  async function handleSave() {
    if (!reminder || !isValid || isSaving) return;

    await onSave(reminder.id, {
      title: draft.title.trim(),
      icon: draft.icon,
      memberIds: draft.audience === "family" ? [] : draft.memberIds,
      scopeText: draft.audience === "family" ? "Hele familien" : scopeSummary,
      dueDate: draft.dueDate,
      note: draft.note.trim() || undefined,
      reminderMinutesBefore: draft.reminderEnabled
        ? draft.reminderMinutesBefore
        : null,
      isPrivate: draft.isPrivate,
    });
  }

  const sheet = (
    <div
      aria-hidden={!isOpen}
      className={`husk-school-sheet${isOpen ? " husk-school-sheet--open" : ""}`}
    >
      <button
        className="husk-school-sheet__backdrop"
        type="button"
        aria-label="Lukk redigering"
        onClick={onClose}
      />
      <section
        aria-labelledby="husk-reminder-edit-title"
        aria-modal="true"
        className="husk-school-sheet__panel husk-reminder-edit-sheet__panel"
        role="dialog"
      >
        <div className="husk-school-sheet__handle" aria-hidden="true" />
        <div className="husk-school-sheet__header">
          <div className="husk-reminder-edit-sheet__heading">
            <span className="husk-reminder-edit-sheet__icon" aria-hidden="true">
              <Icon size={22} strokeWidth={2.35} />
            </span>
            <div>
              <p className="husk-school-sheet__eyebrow">
                {scopeSummary} • {draft.dueDate || "Velg dato"}
              </p>
              <h3
                className="husk-school-sheet__title"
                id="husk-reminder-edit-title"
              >
                Rediger husk
              </h3>
            </div>
          </div>
          <button
            className="husk-school-sheet__close"
            type="button"
            aria-label="Lukk"
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="husk-school-sheet__content husk-reminder-edit-sheet__content">
          <label className="husk-school-field">
            <span>Tittel</span>
            <input
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              placeholder="Hva skal huskes?"
              required
              type="text"
              value={draft.title}
            />
          </label>

          <label className="husk-school-field">
            <span>Notat</span>
            <textarea
              onChange={(event) =>
                setDraft({ ...draft, note: event.target.value })
              }
              placeholder="Valgfritt notat …"
              rows={3}
              value={draft.note}
            />
          </label>

          <div className="husk-school-field">
            <span>Ikon</span>
            <div className="husk-school-icon-grid">
              {reminderIconOptions.map((option) => {
                const OptionIcon = reminderIcons[option.value];
                const isSelected = draft.icon === option.value;
                return (
                  <button
                    className={`husk-school-icon-option${isSelected ? " husk-school-icon-option--selected" : ""}`}
                    key={option.value}
                    onClick={() => setDraft({ ...draft, icon: option.value })}
                    type="button"
                    aria-pressed={isSelected}
                  >
                    <OptionIcon
                      aria-hidden="true"
                      size={19}
                      strokeWidth={2.3}
                    />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="husk-school-field">
            <span>Gjelder</span>
            <div
              className="event-form-avatar-list husk-reminder-edit-sheet__people"
              aria-label="Velg personer"
            >
              <button
                className={`event-form-avatar-chip event-form-avatar-chip--family${draft.audience === "family" ? " event-form-avatar-chip--selected" : ""}`}
                type="button"
                onClick={() =>
                  setDraft({ ...draft, audience: "family", memberIds: [] })
                }
                aria-pressed={draft.audience === "family"}
              >
                <span
                  className="event-form-avatar-chip__avatar event-form-avatar-chip__avatar--family"
                  aria-hidden="true"
                >
                  <Users size={19} strokeWidth={2.5} />
                  {draft.audience === "family" ? (
                    <span className="event-form-avatar-chip__check">
                      <Check size={13} strokeWidth={3.2} />
                    </span>
                  ) : null}
                </span>
                <span>Hele familien</span>
              </button>
              {familyMembers.map((member) => {
                const isSelected = draft.memberIds.includes(member.id);
                return (
                  <button
                    className={`event-form-avatar-chip${isSelected ? " event-form-avatar-chip--selected" : ""}`}
                    type="button"
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    aria-pressed={isSelected}
                  >
                    <span className="event-form-avatar-chip__avatar-wrap">
                      <UserAvatar
                        identity={member}
                        avatarUrl={member.avatarUrl}
                        size="sm"
                        className="event-form-avatar-chip__avatar"
                        decorative
                      />
                      {isSelected ? (
                        <span className="event-form-avatar-chip__check">
                          <Check size={13} strokeWidth={3.2} />
                        </span>
                      ) : null}
                    </span>
                    <span>{member.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="event-form-card event-form-card--rows husk-reminder-edit-sheet__rows"
            aria-label="Dato og påminnelse"
          >
            <label className="event-form-row">
              <CalendarDays aria-hidden="true" size={22} strokeWidth={2.4} />
              <span>Dato</span>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  setDraft({ ...draft, dueDate: event.target.value })
                }
              />
            </label>
            <div className="event-form-row event-form-row--toggle">
              <Bell aria-hidden="true" size={22} strokeWidth={2.4} />
              <label htmlFor="husk-reminder-edit-enabled">Påminnelse</label>
              <span className="event-form-reminder-control">
                {draft.reminderEnabled ? (
                  <select
                    value={draft.reminderMinutesBefore}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        reminderMinutesBefore: Number(event.target.value),
                      })
                    }
                    aria-label="Tidspunkt for påminnelse"
                  >
                    {reminderMinuteOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  id="husk-reminder-edit-enabled"
                  className="event-form-toggle"
                  checked={draft.reminderEnabled}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      reminderEnabled: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
              </span>
            </div>
            <label className="event-form-row event-form-row--toggle">
              <FileText aria-hidden="true" size={22} strokeWidth={2.4} />
              <span>
                <strong>Privat</strong>
                <small>Bare du kan se denne påminnelsen.</small>
              </span>
              <input
                className="event-form-toggle"
                checked={draft.isPrivate}
                onChange={(event) =>
                  setDraft({ ...draft, isPrivate: event.target.checked })
                }
                type="checkbox"
              />
            </label>
          </div>
        </div>

        <div className="husk-school-sheet__actions">
          <button
            className="husk-school-sheet__action husk-school-sheet__action--secondary"
            type="button"
            onClick={onClose}
          >
            Avbryt
          </button>
          <button
            className="husk-school-sheet__action husk-school-sheet__action--primary"
            type="button"
            onClick={handleSave}
            disabled={!isValid || isSaving}
          >
            {isSaving ? "Lagrer …" : "Lagre"}
          </button>
        </div>
      </section>
    </div>
  );

  return isMounted ? createPortal(sheet, document.body) : sheet;
}
