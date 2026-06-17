"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Check,
  Clock,
  FileText,
  MapPin,
  Repeat,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { CalendarMvpEvent } from "@familieappen/shared";

import { useCalendar } from "../../../features/calendar/hooks/useCalendar";
import { UserAvatar } from "../../../components/avatar/UserAvatar";
import {
  FamilyMembersEmptyState,
  FamilyMembersErrorState,
  FamilyMembersLoadingState,
} from "../../../features/family/FamilyMembersEmptyState";
import { remapLegacyMemberIds } from "../../../features/family/familyMemberAdapters";
import {
  type CalendarEventFormDraft,
  getDefaultEventFormDraft,
  getDraftStorageKey,
  getIconOption,
  mapEventFormIconToCalendarIcon,
  mapReminderLabelToReminder,
  reminderOptions,
  repeatOptions,
} from "./eventFormModel";

interface CalendarEventFormClientProps {
  mode: "create" | "edit";
  event?: CalendarMvpEvent | null;
}

function getOrderedFamilyMembers(
  familyMembers: ReturnType<typeof useCalendar>["familyMembers"],
) {
  return familyMembers;
}

function getParticipantSummary(
  participantIds: string[],
  familyMembers: ReturnType<typeof useCalendar>["familyMembers"],
) {
  if (participantIds.length === 0) {
    return "Gjelder hele familien";
  }

  const selectedMembers = getOrderedFamilyMembers(familyMembers).filter(
    (member) => participantIds.includes(member.id),
  );
  const [firstMember] = selectedMembers;

  if (!firstMember) {
    return "Ingen deltakere valgt";
  }

  if (selectedMembers.length === 1) {
    return `Gjelder ${firstMember.name}`;
  }

  return `Gjelder ${firstMember.name} +${selectedMembers.length - 1}`;
}

function readStoredDraft(storageKey: string, fallback: CalendarEventFormDraft) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedDraft = window.sessionStorage.getItem(storageKey);
  const pickedIcon = window.sessionStorage.getItem(`${storageKey}:icon`);

  if (!storedDraft) {
    return pickedIcon
      ? { ...fallback, iconId: pickedIcon as CalendarEventFormDraft["iconId"] }
      : fallback;
  }

  try {
    const parsedDraft = JSON.parse(storedDraft) as CalendarEventFormDraft;
    return pickedIcon
      ? {
          ...parsedDraft,
          iconId: pickedIcon as CalendarEventFormDraft["iconId"],
        }
      : parsedDraft;
  } catch {
    return fallback;
  }
}

export function CalendarEventFormClient({
  mode,
  event = null,
}: CalendarEventFormClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    familyMembers,
    familyMembersLoading,
    familyMembersError,
    refreshFamilyMembers,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendar();
  const storageKey = useMemo(
    () => getDraftStorageKey(mode, event?.id),
    [event?.id, mode],
  );
  const defaultDraft = useMemo(() => getDefaultEventFormDraft(event), [event]);
  const [draft, setDraft] = useState<CalendarEventFormDraft>(
    () => defaultDraft,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedIcon = getIconOption(draft.iconId);
  const title = mode === "create" ? "Ny hendelse" : "Rediger hendelse";
  const isValid = draft.title.trim().length > 0 && draft.date.trim().length > 0;
  const participantSummary = getParticipantSummary(
    draft.participantIds,
    familyMembers,
  );
  const iconPickerHref = `/calendar/events/icon-picker?returnTo=${encodeURIComponent(pathname)}&draftKey=${encodeURIComponent(storageKey)}`;

  useEffect(() => {
    setDraft(readStoredDraft(storageKey, defaultDraft));
  }, [defaultDraft, storageKey]);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  useEffect(() => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      participantIds: remapLegacyMemberIds(
        currentDraft.participantIds,
        familyMembers,
      ),
    }));
  }, [familyMembers]);

  function updateDraft<Key extends keyof CalendarEventFormDraft>(
    key: Key,
    value: CalendarEventFormDraft[Key],
  ) {
    setSaveError(null);
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function toggleParticipant(memberId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      participantIds: currentDraft.participantIds.includes(memberId)
        ? currentDraft.participantIds.filter(
            (participantId) => participantId !== memberId,
          )
        : [...currentDraft.participantIds, memberId],
    }));
  }

  function handleCancel() {
    if (mode === "create") {
      router.push("/calendar");
      return;
    }

    router.back();
  }

  async function handleSave() {
    if (!isValid || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const eventInput = {
      title: draft.title.trim(),
      date: draft.date,
      startTime: draft.allDay ? null : draft.startTime || null,
      endTime: draft.allDay ? null : draft.endTime || null,
      allDay: draft.allDay,
      location: draft.location.trim() || null,
      description: draft.description.trim() || null,
      icon: mapEventFormIconToCalendarIcon(draft.iconId),
      participantIds: draft.participantIds,
      reminder: mapReminderLabelToReminder(draft.reminder),
      recurrence: draft.repeat === "Aldri" ? null : { rule: "FREQ=WEEKLY" },
    };

    try {
      if (mode === "edit" && event) {
        const savedEvent = await updateEvent(event.id, eventInput);
        window.sessionStorage.removeItem(storageKey);
        window.sessionStorage.removeItem(`${storageKey}:icon`);
        router.push(`/calendar/events/${savedEvent.id}`);
        return;
      }

      await createEvent(eventInput);
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(`${storageKey}:icon`);
      router.push("/calendar");
    } catch {
      setSaveError("Kunne ikke lagre hendelsen akkurat nå");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!event || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await deleteEvent(event.id);
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(`${storageKey}:icon`);
      router.push("/calendar");
    } catch {
      setSaveError("Kunne ikke slette hendelsen akkurat nå");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main
      className="husk-school-sheet husk-school-sheet--open calendar-event-form-sheet"
      aria-labelledby="event-form-title"
    >
      <button
        className="husk-school-sheet__backdrop"
        type="button"
        aria-label="Avbryt hendelse"
        onClick={handleCancel}
        disabled={isSaving}
      />
      <form
        className="husk-school-sheet__panel calendar-event-form-sheet__panel"
        onSubmit={(eventSubmit) => {
          eventSubmit.preventDefault();
          void handleSave();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
      >
        <div className="husk-school-sheet__handle" aria-hidden="true" />
        <header
          className="husk-school-sheet__header"
          aria-label="Hendelsesskjema"
        >
          <div>
            <p className="husk-school-sheet__eyebrow">Kalender</p>
            <h1 className="husk-school-sheet__title" id="event-form-title">
              {title}
            </h1>
          </div>
          <button
            className="husk-school-sheet__close"
            type="button"
            aria-label="Lukk"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X aria-hidden="true" size={18} strokeWidth={2.5} />
          </button>
        </header>

        <div className="husk-school-sheet__content calendar-event-form-sheet__content">
          {event?.isImported ? (
            <section
              className="event-form-card event-form-source-note"
              role="note"
              aria-label="Importert hendelse"
            >
              <p>
                Dette er en importert ICS-hendelse. Den eksterne kalenderen er
                fortsatt sannhet for tittel, tid og sted; FamilieAppen-lagring
                er lokal/mock i denne MVP-en.
              </p>
            </section>
          ) : null}
          <section
            className="event-form-card event-form-card--title"
            aria-label="Tittel og ikon"
          >
            <div className="event-form-field event-form-field--title">
              <label className="event-form-label" htmlFor="event-title">
                Tittel
              </label>
              <input
                className="event-form-title-input"
                id="event-title"
                name="title"
                type="text"
                value={draft.title}
                onChange={(changeEvent) =>
                  updateDraft("title", changeEvent.target.value)
                }
                placeholder="Tittel på hendelse"
                autoComplete="off"
              />
            </div>
            <Link
              className="event-form-icon-link"
              href={iconPickerHref}
              aria-label={
                selectedIcon
                  ? `Endre ikon, valgt ${selectedIcon.label}`
                  : "Velg ikon"
              }
            >
              {selectedIcon ? (
                <>
                  <span
                    className="event-form-icon-link__icon"
                    aria-hidden="true"
                  >
                    <selectedIcon.Icon size={24} strokeWidth={2.5} />
                  </span>
                  <span>{selectedIcon.label}</span>
                </>
              ) : (
                <span>+ Velg ikon</span>
              )}
            </Link>
          </section>

          <section
            className="event-form-card"
            aria-labelledby="event-participants-title"
          >
            <div className="event-form-section-heading">
              <Users aria-hidden="true" size={24} />
              <div>
                <h2 id="event-participants-title">Gjelder</h2>
                <p>{participantSummary}</p>
              </div>
            </div>
            {familyMembersLoading ? (
              <FamilyMembersLoadingState />
            ) : familyMembersError ? (
              <FamilyMembersErrorState
                onRetry={() => void refreshFamilyMembers()}
              />
            ) : familyMembers.length === 0 ? (
              <FamilyMembersEmptyState />
            ) : (
              <div
                className="event-form-avatar-list"
                role="group"
                aria-label="Velg deltakere"
              >
                <button
                  className={`event-form-avatar-chip event-form-avatar-chip--family ${draft.participantIds.length === 0 ? "event-form-avatar-chip--selected" : ""}`}
                  type="button"
                  onClick={() => updateDraft("participantIds", [])}
                  aria-pressed={draft.participantIds.length === 0}
                  aria-label={`Hele familien. ${draft.participantIds.length === 0 ? "Valgt" : "Ikke valgt"}`}
                >
                  <span className="event-form-avatar-chip__avatar event-form-avatar-chip__avatar--family event-form-avatar-chip__avatar-wrap">
                    <Users aria-hidden="true" size={22} />
                    {draft.participantIds.length === 0 ? (
                      <span className="event-form-avatar-chip__check">
                        <Check size={14} strokeWidth={3.2} />
                      </span>
                    ) : null}
                  </span>
                  <span>Alle</span>
                </button>
                {getOrderedFamilyMembers(familyMembers).map((member) => {
                  const isSelected = draft.participantIds.includes(member.id);
                  return (
                    <button
                      className={`event-form-avatar-chip ${isSelected ? "event-form-avatar-chip--selected" : ""}`}
                      key={member.id}
                      type="button"
                      onClick={() => toggleParticipant(member.id)}
                      aria-pressed={isSelected}
                      aria-label={`${member.name}. ${isSelected ? "Valgt" : "Ikke valgt"}`}
                    >
                      <span className="event-form-avatar-chip__avatar-wrap">
                        <UserAvatar
                          identity={{
                            displayName: member.displayName ?? member.name,
                          }}
                          avatarUrl={member.avatarUrl}
                          size="sm"
                          className={`event-form-avatar-chip__avatar event-form-avatar-chip__avatar--${member.avatarColor}`}
                          decorative
                        />
                        {isSelected ? (
                          <span className="event-form-avatar-chip__check">
                            <Check size={14} strokeWidth={3.2} />
                          </span>
                        ) : null}
                      </span>
                      <span>{member.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className="event-form-card event-form-card--rows"
            aria-labelledby="event-date-title"
          >
            <div className="event-form-section-heading event-form-section-heading--compact calendar-event-form-sheet__section-heading">
              <CalendarCheck aria-hidden="true" size={24} />
              <h2 id="event-date-title">Dato og tid</h2>
            </div>
            <label className="event-form-row" htmlFor="event-date">
              <CalendarCheck aria-hidden="true" size={24} />
              <span>Dato</span>
              <input
                id="event-date"
                type="date"
                value={draft.date}
                onChange={(changeEvent) =>
                  updateDraft("date", changeEvent.target.value)
                }
                required
              />
            </label>
            {!draft.allDay ? (
              <div className="event-form-time-grid">
                <label className="event-form-row" htmlFor="event-start-time">
                  <Clock aria-hidden="true" size={24} />
                  <span>Starttid</span>
                  <input
                    id="event-start-time"
                    type="time"
                    value={draft.startTime}
                    onChange={(changeEvent) =>
                      updateDraft("startTime", changeEvent.target.value)
                    }
                  />
                </label>
                <label className="event-form-row" htmlFor="event-end-time">
                  <Clock aria-hidden="true" size={24} />
                  <span>Sluttid</span>
                  <input
                    id="event-end-time"
                    type="time"
                    value={draft.endTime}
                    onChange={(changeEvent) =>
                      updateDraft("endTime", changeEvent.target.value)
                    }
                  />
                </label>
              </div>
            ) : null}
            <label
              className="event-form-row event-form-row--toggle"
              htmlFor="event-all-day"
            >
              <Clock aria-hidden="true" size={24} />
              <span>Heldag</span>
              <input
                id="event-all-day"
                className="event-form-toggle"
                type="checkbox"
                checked={draft.allDay}
                onChange={(changeEvent) =>
                  updateDraft("allDay", changeEvent.target.checked)
                }
              />
            </label>
          </section>

          <section
            className="event-form-card event-form-card--rows"
            aria-labelledby="event-repeat-title"
          >
            <div className="event-form-section-heading event-form-section-heading--compact">
              <Repeat aria-hidden="true" size={24} />
              <h2 id="event-repeat-title">Gjentakelse</h2>
            </div>
            <div
              className="event-form-options"
              role="radiogroup"
              aria-labelledby="event-repeat-title"
            >
              {repeatOptions.map((option) => (
                <label className="event-form-option" key={option}>
                  <input
                    type="radio"
                    name="repeat"
                    value={option}
                    checked={draft.repeat === option}
                    onChange={() => updateDraft("repeat", option)}
                  />
                  <span>
                    {option}
                    {option === "Tilpasset" ? " (TODO)" : ""}
                  </span>
                </label>
              ))}
            </div>
          </section>
          <section
            className="event-form-card event-form-card--rows"
            aria-labelledby="event-reminder-title"
          >
            <div className="event-form-section-heading event-form-section-heading--compact">
              <Clock aria-hidden="true" size={24} />
              <h2 id="event-reminder-title">Påminnelse</h2>
            </div>
            <div
              className="event-form-options"
              role="radiogroup"
              aria-labelledby="event-reminder-title"
            >
              {reminderOptions.map((option) => (
                <label className="event-form-option" key={option}>
                  <input
                    type="radio"
                    name="reminder"
                    value={option}
                    checked={draft.reminder === option}
                    onChange={() => updateDraft("reminder", option)}
                  />
                  <span>
                    {option}
                    {option === "Tilpasset" ? " (TODO)" : ""}
                  </span>
                </label>
              ))}
            </div>
          </section>
          <section
            className="event-form-card"
            aria-labelledby="event-location-title"
          >
            <div className="event-form-section-heading event-form-section-heading--compact">
              <MapPin aria-hidden="true" size={24} />
              <h2 id="event-location-title">Sted</h2>
            </div>
            <label className="sr-only" htmlFor="event-location">
              Sted
            </label>
            <input
              className="event-form-text-input"
              id="event-location"
              type="text"
              value={draft.location}
              onChange={(changeEvent) =>
                updateDraft("location", changeEvent.target.value)
              }
              placeholder="Legg til sted"
            />
          </section>
          <section
            className="event-form-card"
            aria-labelledby="event-description-title"
          >
            <div className="event-form-section-heading event-form-section-heading--compact">
              <FileText aria-hidden="true" size={24} />
              <h2 id="event-description-title">Beskrivelse</h2>
            </div>
            <label className="sr-only" htmlFor="event-description">
              Beskrivelse
            </label>
            <textarea
              className="event-form-textarea"
              id="event-description"
              value={draft.description}
              onChange={(changeEvent) =>
                updateDraft("description", changeEvent.target.value)
              }
              placeholder="Legg til beskrivelse, noter eller annen informasjon..."
              rows={7}
            />
          </section>
          {mode === "edit" ? (
            <button
              className="event-form-delete"
              type="button"
              onClick={() => void handleDelete()}
              aria-label="Slett hendelse"
              disabled={isSaving}
            >
              <Trash2 aria-hidden="true" size={20} />
              Slett hendelse
            </button>
          ) : null}
          {saveError ? (
            <p className="event-form-error" role="status">
              {saveError}
            </p>
          ) : null}
        </div>

        <div className="husk-school-sheet__actions">
          <button
            className="husk-school-sheet__action husk-school-sheet__action--secondary"
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Avbryt
          </button>
          <button
            className="husk-school-sheet__action husk-school-sheet__action--primary"
            type="submit"
            disabled={!isValid || isSaving}
            aria-disabled={!isValid || isSaving}
          >
            {isSaving ? "Lagrer …" : "Lagre"}
          </button>
        </div>
      </form>
    </main>
  );
}
