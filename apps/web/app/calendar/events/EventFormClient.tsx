"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Trash2, X } from "lucide-react";
import type { CalendarMvpEvent } from "@familieappen/shared";

import { useCalendar } from "../../../features/calendar/hooks/useCalendar";
import {
  AppActionFooter,
  AppCard,
  AppField,
  AppListRow,
  AppSelect,
  AppTextarea,
} from "../../../components/app-ui";
import { SharedAudienceSelector } from "../../../features/husk/components/SharedAudienceSelector";
import { remapLegacyMemberIds } from "../../../features/family/familyMemberAdapters";
import {
  type CalendarEventFormDraft,
  getDefaultEventFormDraft,
  getDraftStorageKey,
  getIconOption,
  mapEventFormIconToCalendarIcon,
  mapReminderLabelToReminder,
  mapRepeatLabelToRecurrence,
  reminderOptions,
  repeatOptions,
} from "./eventFormModel";

interface CalendarEventFormClientProps {
  mode: "create" | "edit";
  event?: CalendarMvpEvent | null;
  scope?: "occurrence" | "series";
}

function getCalendarEventDetailHref(event: CalendarMvpEvent) {
  if (event.isRecurringOccurrence && event.recurringEventId && event.occurrenceDate) {
    return `/calendar/events/${encodeURIComponent(event.recurringEventId)}?occurrenceDate=${encodeURIComponent(event.occurrenceDate)}`;
  }

  return `/calendar/events/${encodeURIComponent(event.id)}`;
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
  scope,
}: CalendarEventFormClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { familyMembers, createEvent, updateEvent, deleteEvent } =
    useCalendar();
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
  const [pendingRecurringAction, setPendingRecurringAction] = useState<
    "edit" | "delete" | null
  >(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const selectedIcon = getIconOption(draft.iconId);
  const SelectedIcon = selectedIcon?.Icon ?? CalendarCheck;
  const title = mode === "create" ? "Ny hendelse" : "Rediger hendelse";
  const endDate = draft.endDate || draft.date;
  const hasValidWindow = draft.allDay
    ? !endDate || !draft.date || endDate >= draft.date
    : Boolean(
        draft.startTime &&
        draft.endTime &&
        endDate >= draft.date &&
        `${endDate}T${draft.endTime}` > `${draft.date}T${draft.startTime}`,
      );
  const needsRecurrenceUntil = draft.repeat !== "Aldri";
  const hasRecurrenceUntil =
    !needsRecurrenceUntil || draft.recurrenceUntil.trim().length > 0;
  const isValid =
    draft.title.trim().length > 0 &&
    draft.date.trim().length > 0 &&
    hasValidWindow &&
    hasRecurrenceUntil;
  const isRecurringEvent = Boolean(
    event?.isRecurringOccurrence ||
    event?.recurringEventId ||
    event?.recurrence,
  );
  const lockedRecurringScope = mode === "edit" ? scope : undefined;
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

  function handleCancel() {
    if (mode === "create") {
      router.push("/calendar");
      return;
    }

    router.back();
  }

  function eventInputFromDraft(currentDraft: CalendarEventFormDraft) {
    return {
      title: currentDraft.title.trim(),
      date: currentDraft.date,
      endDate: currentDraft.endDate || currentDraft.date,
      startTime: currentDraft.allDay ? null : currentDraft.startTime || null,
      endTime: currentDraft.allDay ? null : currentDraft.endTime || null,
      allDay: currentDraft.allDay,
      location: currentDraft.location.trim() || null,
      description: currentDraft.description.trim() || null,
      icon: mapEventFormIconToCalendarIcon(currentDraft.iconId),
      participantIds: currentDraft.participantIds,
      reminder: mapReminderLabelToReminder(currentDraft.reminder),
      recurrence:
        currentDraft.repeat === "Aldri"
          ? null
          : {
              ...mapRepeatLabelToRecurrence(currentDraft.repeat)!,
              until: `${currentDraft.recurrenceUntil}T23:59:59.999Z`,
            },
      recurrenceUntil:
        currentDraft.repeat === "Aldri"
          ? null
          : `${currentDraft.recurrenceUntil}T23:59:59.999Z`,
    };
  }

  function getSaveErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (/300|max/i.test(message)) {
      return "Serien kan maks ha 300 hendelser. Velg en tidligere sluttdato.";
    }

    return "Kunne ikke lagre hendelsen akkurat nå";
  }

  async function saveWithScope(scope: "occurrence" | "series") {
    if (!event || !isValid || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const seriesId = event.recurringEventId ?? event.id;
      const occurrenceDate = event.occurrenceDate;
      const savedEvent = await updateEvent(
        scope === "occurrence" ? seriesId : event.id,
        eventInputFromDraft(draft),
        scope,
        scope === "occurrence" ? occurrenceDate : undefined,
      );
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(`${storageKey}:icon`);
      router.push(
        scope === "occurrence"
          ? getCalendarEventDetailHref(event)
          : getCalendarEventDetailHref(savedEvent),
      );
    } catch (error) {
      setSaveError(getSaveErrorMessage(error));
    } finally {
      setPendingRecurringAction(null);
      setIsSaving(false);
    }
  }

  async function deleteWithScope(scope: "occurrence" | "series") {
    if (!event || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await deleteEvent(event.id, scope);
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(`${storageKey}:icon`);
      router.push("/calendar");
    } catch {
      setSaveError("Kunne ikke slette hendelsen akkurat nå");
    } finally {
      setPendingRecurringAction(null);
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (!isValid || isSaving) {
      return;
    }

    if (mode === "edit" && event) {
      if (lockedRecurringScope) {
        await saveWithScope(lockedRecurringScope);
        return;
      }

      if (isRecurringEvent) {
        setPendingRecurringAction("edit");
        return;
      }

      await saveWithScope("series");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await createEvent(eventInputFromDraft(draft));
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(`${storageKey}:icon`);
      router.push("/calendar");
    } catch (error) {
      setSaveError(getSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!event || isSaving) {
      return;
    }

    if (lockedRecurringScope) {
      await deleteWithScope(lockedRecurringScope);
      return;
    }

    if (isRecurringEvent) {
      setPendingRecurringAction("delete");
      return;
    }

    await deleteWithScope("series");
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
            <AppCard
              className="event-form-source-note"
              role="note"
              aria-label="Importert hendelse"
            >
              <p>
                Dette er en importert ICS-hendelse. Den eksterne kalenderen er
                fortsatt sannhet for tittel, tid og sted; FamilieAppen-lagring
                er lokal/mock i denne MVP-en.
              </p>
            </AppCard>
          ) : null}

          <AppCard aria-labelledby="event-basics-title">
            <h2 className="event-form-card-title" id="event-basics-title">
              Grunnleggende informasjon
            </h2>
            <div className="event-form-title-row">
              <AppField
                htmlFor="event-title"
                className="event-form-title-field"
              >
                <span>Tittel</span>
                <input
                  id="event-title"
                  name="title"
                  type="text"
                  value={draft.title}
                  onChange={(changeEvent) =>
                    updateDraft("title", changeEvent.target.value)
                  }
                  placeholder="Tittel på hendelse"
                  autoComplete="off"
                  required
                />
              </AppField>
              <Link
                className="event-form-icon-selector"
                href={iconPickerHref}
                aria-label={
                  selectedIcon
                    ? `Endre ikon, valgt ${selectedIcon.label}`
                    : "Endre ikon, valgt avtale"
                }
                title={selectedIcon ? selectedIcon.label : "Avtale"}
              >
                <SelectedIcon aria-hidden="true" size={22} strokeWidth={2.5} />
                <span>Endre ikon</span>
              </Link>
            </div>
            <AppField htmlFor="event-location">
              <span>Sted</span>
              <input
                id="event-location"
                type="text"
                value={draft.location}
                onChange={(changeEvent) =>
                  updateDraft("location", changeEvent.target.value)
                }
                placeholder="Legg til sted"
              />
            </AppField>
          </AppCard>

          <AppCard aria-labelledby="event-time-title">
            <h2 className="event-form-card-title" id="event-time-title">
              Dato og tid
            </h2>
            <div className="event-form-field-grid">
              <AppField htmlFor="event-date">
                <span>Startdato</span>
                <input
                  id="event-date"
                  type="date"
                  value={draft.date}
                  onChange={(changeEvent) =>
                    updateDraft("date", changeEvent.target.value)
                  }
                  required
                />
              </AppField>
              <AppField htmlFor="event-end-date">
                <span>Sluttdato</span>
                <input
                  id="event-end-date"
                  type="date"
                  value={draft.endDate}
                  onChange={(changeEvent) =>
                    updateDraft("endDate", changeEvent.target.value)
                  }
                />
              </AppField>
              {!draft.allDay ? (
                <>
                  <AppField htmlFor="event-start-time">
                    <span>Starttid</span>
                    <input
                      id="event-start-time"
                      type="time"
                      value={draft.startTime}
                      onChange={(changeEvent) =>
                        updateDraft("startTime", changeEvent.target.value)
                      }
                    />
                  </AppField>
                  <AppField htmlFor="event-end-time">
                    <span>Sluttid</span>
                    <input
                      id="event-end-time"
                      type="time"
                      value={draft.endTime}
                      onChange={(changeEvent) =>
                        updateDraft("endTime", changeEvent.target.value)
                      }
                    />
                  </AppField>
                </>
              ) : null}
            </div>
            <AppListRow
              as="label"
              htmlFor="event-all-day"
              className="event-form-toggle-row"
            >
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
            </AppListRow>
            <AppField htmlFor="event-reminder">
              <span>Påminnelse</span>
              <AppSelect
                id="event-reminder"
                value={draft.reminder}
                onChange={(changeEvent) =>
                  updateDraft("reminder", changeEvent.target.value)
                }
              >
                {reminderOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </AppSelect>
            </AppField>
          </AppCard>

          <SharedAudienceSelector
            labelledBy="event-participants-title"
            isOpen={participantsOpen}
            members={familyMembers}
            onToggleOpen={() => setParticipantsOpen((isOpen) => !isOpen)}
            selectedMemberIds={draft.participantIds}
            setSelectedMemberIds={(value) => {
              if (typeof value === "function") {
                updateDraft("participantIds", value(draft.participantIds));
              } else {
                updateDraft("participantIds", value);
              }
            }}
            title="Gjelder"
          />

          <AppCard aria-labelledby="event-repeat-title">
            <h2 className="event-form-card-title" id="event-repeat-title">
              Gjentakelse
            </h2>
            <AppField htmlFor="event-repeat">
              <span>Hvor ofte gjentas hendelsen?</span>
              <AppSelect
                id="event-repeat"
                value={draft.repeat}
                onChange={(changeEvent) => {
                  updateDraft("repeat", changeEvent.target.value);
                  if (changeEvent.target.value === "Aldri") {
                    updateDraft("recurrenceUntil", "");
                  }
                }}
              >
                {repeatOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </AppSelect>
            </AppField>
            {draft.repeat !== "Aldri" ? (
              <AppField htmlFor="event-recurrence-until">
                <span>Gjentas til</span>
                <input
                  id="event-recurrence-until"
                  type="date"
                  value={draft.recurrenceUntil}
                  onChange={(changeEvent) =>
                    updateDraft("recurrenceUntil", changeEvent.target.value)
                  }
                  required
                />
              </AppField>
            ) : null}
          </AppCard>

          <AppCard aria-labelledby="event-description-title">
            <h2 className="event-form-card-title" id="event-description-title">
              Beskrivelse
            </h2>
            <AppTextarea
              id="event-description"
              aria-label="Beskrivelse"
              value={draft.description}
              onChange={(changeEvent) =>
                updateDraft("description", changeEvent.target.value)
              }
              placeholder="Legg til beskrivelse, noter eller annen informasjon …"
              rows={4}
            />
          </AppCard>

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
          {!hasValidWindow && draft.date ? (
            <p className="event-form-error" role="status">
              Slutt må være etter start.
            </p>
          ) : null}
          {!hasRecurrenceUntil ? (
            <p className="event-form-error" role="status">
              Velg når gjentakelsen skal stoppe.
            </p>
          ) : null}
          {saveError ? (
            <p className="event-form-error" role="status">
              {saveError}
            </p>
          ) : null}
        </div>

        {pendingRecurringAction ? (
          <AppCard
            role="dialog"
            aria-label="Velg gjentakelse"
            className="event-form-recurrence-choice"
          >
            <h2 className="event-form-card-title">
              {pendingRecurringAction === "edit"
                ? "Hva vil du redigere?"
                : "Hva vil du slette?"}
            </h2>
            <p>
              Velg om endringen bare gjelder denne hendelsen eller hele serien.
            </p>
            <AppListRow
              as="button"
              type="button"
              onClick={() =>
                pendingRecurringAction === "edit"
                  ? void saveWithScope("occurrence")
                  : void deleteWithScope("occurrence")
              }
            >
              Kun denne hendelsen
            </AppListRow>
            <AppListRow
              as="button"
              type="button"
              onClick={() =>
                pendingRecurringAction === "edit"
                  ? void saveWithScope("series")
                  : void deleteWithScope("series")
              }
            >
              Hele serien
            </AppListRow>
            <AppListRow
              as="button"
              type="button"
              onClick={() => setPendingRecurringAction(null)}
            >
              Avbryt
            </AppListRow>
          </AppCard>
        ) : null}

        <AppActionFooter>
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
        </AppActionFooter>
      </form>
    </main>
  );
}
