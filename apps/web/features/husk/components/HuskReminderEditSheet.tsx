"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, FileText, X } from "lucide-react";

import {
  AppActionFooter,
  AppField,
  AppSelect,
  AppSheet,
  AppTextarea,
} from "../../../components/app-ui";
import type { ReminderInput } from "../hooks/useReminders";
import type {
  HuskFamilyMember,
  HuskReminder,
  HuskReminderIcon,
} from "../types";
import { reminderIcons } from "./huskConfig";
import {
  SharedAudienceSelector,
  getAudienceSummary,
} from "./SharedAudienceSelector";

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
  const [isAudienceOpen, setIsAudienceOpen] = useState(false);
  const isOpen = Boolean(reminder);
  const Icon = reminderIcons[draft.icon];
  const scopeSummary = useMemo(
    () =>
      getAudienceSummary(
        draft.audience === "family" ? [] : draft.memberIds,
        familyMembers,
      ),
    [draft.audience, draft.memberIds, familyMembers],
  );
  const isValid =
    draft.title.trim().length > 0 &&
    draft.dueDate.trim().length > 0 &&
    (draft.audience === "family" || draft.memberIds.length > 0);

  useEffect(() => {
    setDraft(toDraft(reminder));
  }, [reminder]);

  function setSelectedMemberIds(
    value: string[] | ((currentIds: string[]) => string[]),
  ) {
    setDraft((current) => {
      const nextIds =
        typeof value === "function" ? value(current.memberIds) : value;
      return {
        ...current,
        audience: nextIds.length === 0 ? "family" : "people",
        memberIds: nextIds,
      };
    });
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

  return (
    <AppSheet
      baseClassName="husk-school-sheet"
      className="husk-reminder-edit-sheet__panel"
      isOpen={isOpen}
      labelledBy="husk-reminder-edit-title"
      onClose={onClose}
      wrapContent={false}
    >
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
        <AppField className="husk-school-field">
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
        </AppField>

        <AppField className="husk-school-field">
          <span>Notat</span>
          <AppTextarea
            onChange={(event) =>
              setDraft({ ...draft, note: event.target.value })
            }
            placeholder="Valgfritt notat …"
            rows={3}
            value={draft.note}
          />
        </AppField>

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
                  <OptionIcon aria-hidden="true" size={19} strokeWidth={2.3} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <SharedAudienceSelector
          labelledBy="husk-reminder-edit-audience-title"
          isOpen={isAudienceOpen}
          members={familyMembers}
          onToggleOpen={() => setIsAudienceOpen((open) => !open)}
          selectedMemberIds={draft.audience === "family" ? [] : draft.memberIds}
          setSelectedMemberIds={setSelectedMemberIds}
        />

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
                <AppSelect
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
                </AppSelect>
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
          <label className="event-form-row event-form-row--toggle event-form-row--helper">
            <FileText aria-hidden="true" size={22} strokeWidth={2.4} />
            <span className="event-form-row__copy">
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

      <AppActionFooter className="husk-school-sheet__actions">
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
      </AppActionFooter>
    </AppSheet>
  );
}
