"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Cake,
  CalendarCheck,
  Check,
  Clock,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  MapPin,
  MoreHorizontal,
  Plane,
  StickyNote,
  Trash2,
  Users,
  Utensils,
  X,
} from "lucide-react";
import type { CalendarMvpEvent, CalendarMvpEventIcon } from "@familieappen/shared";

import { AppActionFooter, AppCard, AppListRow, AppSheet } from "../../../../components/app-ui";
import { UserAvatar } from "../../../../components/avatar/UserAvatar";
import { LockedFeatureState } from "../../../../components/PendingAccess";
import { useFamilyAccess } from "../../../../components/ProtectedFamilyRoute";
import { Button, Card, EmptyState, PageContainer } from "../../../../components/ui";
import { useCalendar } from "../../../../features/calendar/hooks/useCalendar";
import { HuskMobileSheet } from "../../../../features/husk/components/HuskMobileSheet";
import { remapLegacyMemberIds } from "../../../../features/family/familyMemberAdapters";
import {
  type CalendarEventFormDraft,
  getDefaultEventFormDraft,
  getIconOption,
  mapEventFormIconToCalendarIcon,
  mapReminderLabelToReminder,
  mapRepeatLabelToRecurrence,
  reminderOptions,
  repeatOptions,
} from "../eventFormModel";

const eventIcons = {
  birthday: Cake,
  family: Users,
  health: HeartPulse,
  meal: Utensils,
  school: GraduationCap,
  sport: Dumbbell,
  travel: Plane,
} satisfies Record<CalendarMvpEventIcon, typeof Cake>;

const eventDateFormatter = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", weekday: "long" });

function parseDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatEventDate(date: string) {
  const label = eventDateFormatter.format(parseDateString(date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatEventTime(event: CalendarMvpEvent) {
  const dateSuffix = event.endDate && event.endDate !== event.date ? ` (${formatEventDate(event.date)}–${formatEventDate(event.endDate)})` : "";
  if (event.allDay) return `Hele dagen${dateSuffix}`;
  if (!event.startTime) return "Tid ikke satt";
  return event.endTime ? `${event.startTime}–${event.endTime}${dateSuffix}` : `${event.startTime}${dateSuffix}`;
}

function getParticipants(participantIds: string[], familyMembers: ReturnType<typeof useCalendar>["familyMembers"]) {
  if (participantIds.length === 0) return familyMembers;
  const scopedParticipantIds = remapLegacyMemberIds(participantIds, familyMembers);
  return familyMembers.filter((member) => scopedParticipantIds.includes(member.id));
}

function EventDetailLoading() {
  return (
    <main className="event-detail event-detail--state" aria-live="polite">
      <PageContainer>
        <Card tone="default">
          <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
        </Card>
      </PageContainer>
    </main>
  );
}

function EventEditSheet({ event, onClose, onSaved }: { event: CalendarMvpEvent | null; onClose: () => void; onSaved: (event: CalendarMvpEvent) => void }) {
  const { familyMembers, updateEvent, deleteEvent } = useCalendar();
  const [draft, setDraft] = useState<CalendarEventFormDraft>(() => getDefaultEventFormDraft(event));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isOpen = Boolean(event);
  const selectedIcon = getIconOption(draft.iconId);
  const Icon = selectedIcon?.Icon ?? Users;
  const endDate = draft.endDate || draft.date;
  const hasValidWindow = draft.allDay
    ? !endDate || !draft.date || endDate >= draft.date
    : Boolean(draft.startTime && draft.endTime && endDate >= draft.date && `${endDate}T${draft.endTime}` > `${draft.date}T${draft.startTime}`);
  const isValid = draft.title.trim().length > 0 && draft.date.trim().length > 0 && hasValidWindow;

  useEffect(() => {
    setDraft(getDefaultEventFormDraft(event));
    setSaveError(null);
  }, [event]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function updateDraft<Key extends keyof CalendarEventFormDraft>(key: Key, value: CalendarEventFormDraft[Key]) {
    setSaveError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleParticipant(memberId: string) {
    setDraft((current) => ({
      ...current,
      participantIds: current.participantIds.includes(memberId)
        ? current.participantIds.filter((participantId) => participantId !== memberId)
        : [...current.participantIds, memberId],
    }));
  }

  async function handleSave() {
    if (!event || !isValid || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const savedEvent = await updateEvent(event.id, {
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
        recurrence: mapRepeatLabelToRecurrence(draft.repeat),
      });
      onSaved(savedEvent);
    } catch {
      setSaveError("Kunne ikke lagre hendelsen akkurat nå");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!event || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await deleteEvent(event.id);
      onClose();
    } catch {
      setSaveError("Kunne ikke slette hendelsen akkurat nå");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div aria-hidden={!isOpen} className={`husk-school-sheet${isOpen ? " husk-school-sheet--open" : ""}`}>
      <button className="husk-school-sheet__backdrop" type="button" aria-label="Lukk redigering" onClick={onClose} />
      <section aria-labelledby="calendar-event-edit-title" aria-modal="true" className="husk-school-sheet__panel husk-reminder-edit-sheet__panel calendar-event-edit-sheet__panel" role="dialog">
        <div className="husk-school-sheet__handle" aria-hidden="true" />
        <div className="husk-school-sheet__header">
          <div className="husk-reminder-edit-sheet__heading">
            <span className="husk-reminder-edit-sheet__icon" aria-hidden="true"><Icon size={22} strokeWidth={2.35} /></span>
            <div>
              <p className="husk-school-sheet__eyebrow">Kalender • {draft.date || "Velg dato"}</p>
              <h3 className="husk-school-sheet__title" id="calendar-event-edit-title">Rediger hendelse</h3>
            </div>
          </div>
          <button className="husk-school-sheet__close" type="button" aria-label="Lukk" onClick={onClose}><X aria-hidden="true" size={18} strokeWidth={2.5} /></button>
        </div>
        <div className="husk-school-sheet__content husk-reminder-edit-sheet__content">
          {event?.isImported ? <p className="calendar-event-sheet__note">Importert hendelse. Endringer lagres lokalt i FamilieAppen.</p> : null}
          <label className="husk-school-field"><span>Tittel</span><input value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} placeholder="Tittel på hendelse" /></label>
          <label className="husk-school-field"><span>Sted</span><input value={draft.location} onChange={(e) => updateDraft("location", e.target.value)} placeholder="Legg til sted" /></label>
          <label className="husk-school-field"><span>Beskrivelse/notat</span><textarea rows={3} value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} placeholder="Legg til beskrivelse …" /></label>
          <div className="event-form-avatar-list husk-reminder-edit-sheet__people" aria-label="Velg deltakere">
            {familyMembers.map((member) => {
              const isSelected = draft.participantIds.includes(member.id);
              return <button className={`event-form-avatar-chip${isSelected ? " event-form-avatar-chip--selected" : ""}`} type="button" key={member.id} onClick={() => toggleParticipant(member.id)} aria-pressed={isSelected}><span className="event-form-avatar-chip__avatar-wrap"><UserAvatar identity={member} avatarUrl={member.avatarUrl} size="sm" className="event-form-avatar-chip__avatar" decorative />{isSelected ? <span className="event-form-avatar-chip__check"><Check size={13} strokeWidth={3.2} /></span> : null}</span><span>{member.name}</span></button>;
            })}
          </div>
          <div className="event-form-card event-form-card--rows husk-reminder-edit-sheet__rows" aria-label="Dato, tid og påminnelse">
            <label className="event-form-row"><CalendarCheck aria-hidden="true" size={22} strokeWidth={2.4} /><span>Startdato</span><input type="date" value={draft.date} onChange={(e) => updateDraft("date", e.target.value)} /></label><label className="event-form-row"><CalendarCheck aria-hidden="true" size={22} strokeWidth={2.4} /><span>Sluttdato</span><input type="date" value={draft.endDate} onChange={(e) => updateDraft("endDate", e.target.value)} /></label>
            {!draft.allDay ? <><label className="event-form-row"><Clock aria-hidden="true" size={22} strokeWidth={2.4} /><span>Start</span><input type="time" value={draft.startTime} onChange={(e) => updateDraft("startTime", e.target.value)} /></label><label className="event-form-row"><Clock aria-hidden="true" size={22} strokeWidth={2.4} /><span>Slutt</span><input type="time" value={draft.endTime} onChange={(e) => updateDraft("endTime", e.target.value)} /></label></> : null}
            <label className="event-form-row event-form-row--toggle"><Clock aria-hidden="true" size={22} strokeWidth={2.4} /><span>Heldag</span><input className="event-form-toggle" type="checkbox" checked={draft.allDay} onChange={(e) => updateDraft("allDay", e.target.checked)} /></label>
            <label className="event-form-row"><Bell aria-hidden="true" size={22} strokeWidth={2.4} /><span>Påminnelse</span><select value={draft.reminder} onChange={(e) => updateDraft("reminder", e.target.value)}>{reminderOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="event-form-row"><StickyNote aria-hidden="true" size={22} strokeWidth={2.4} /><span>Gjentakelse</span><select value={draft.repeat} onChange={(e) => updateDraft("repeat", e.target.value)}>{repeatOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          </div>
          {!hasValidWindow && draft.date ? <p className="event-form-error" role="status">Slutt må være etter start.</p> : null}
          {saveError ? <p className="event-form-error" role="status">{saveError}</p> : null}
          <button className="calendar-event-sheet__delete" type="button" onClick={() => void handleDelete()} disabled={isSaving}><Trash2 aria-hidden="true" size={18} />Slett hendelse</button>
        </div>
        <div className="husk-school-sheet__actions"><button className="husk-school-sheet__action husk-school-sheet__action--secondary" type="button" onClick={onClose}>Avbryt</button><button className="husk-school-sheet__action husk-school-sheet__action--primary" type="button" onClick={() => void handleSave()} disabled={!isValid || isSaving}>{isSaving ? "Lagrer …" : "Lagre"}</button></div>
      </section>
    </div>
  );
}

function resolveCalendarEvent(events: CalendarMvpEvent[], eventId?: string, occurrenceDate?: string) {
  if (!eventId) {
    return null;
  }

  if (occurrenceDate) {
    const occurrence = events.find(
      (calendarEvent) =>
        calendarEvent.recurringEventId === eventId &&
        calendarEvent.occurrenceDate === occurrenceDate,
    );

    if (occurrence) {
      return occurrence;
    }
  }

  return events.find((calendarEvent) => calendarEvent.id === eventId) ?? null;
}

function getCalendarEventEditHref(event: CalendarMvpEvent, scope?: "occurrence" | "series") {
  if (event.isRecurringOccurrence && event.recurringEventId && event.occurrenceDate) {
    const seriesId = encodeURIComponent(event.recurringEventId);

    if (scope === "occurrence") {
      return `/calendar/events/${seriesId}/edit?occurrenceDate=${encodeURIComponent(event.occurrenceDate)}&scope=occurrence`;
    }

    return `/calendar/events/${seriesId}/edit?occurrenceDate=${encodeURIComponent(event.occurrenceDate)}&scope=series`;
  }

  return `/calendar/events/${encodeURIComponent(event.id)}/edit`;
}

export function EventDetailClient({ event: initialEvent = null, eventId, occurrenceDate }: { event?: CalendarMvpEvent | null; eventId?: string; occurrenceDate?: string }) {
  const router = useRouter();
  const familyAccess = useFamilyAccess();
  const { events, loading, error, refresh, familyMembers } = useCalendar();
  const event = initialEvent ?? resolveCalendarEvent(events, eventId, occurrenceDate);
  const participantIds = event ? remapLegacyMemberIds(event.participantIds, familyMembers) : [];
  const participants = event ? getParticipants(participantIds, familyMembers) : [];
  const EventIcon = event ? eventIcons[event.icon] : eventIcons.family;
  const isWholeFamily = event ? event.participantIds.length === 0 : false;
  const description = event?.description ?? "Ingen beskrivelse er lagt til ennå.";
  const sourceLabel = event?.source === "ics" ? "Importert kalender" : event?.source === "school-week" ? "Skoleuka" : "FamilieAppen";
  const [isEditScopeSheetOpen, setIsEditScopeSheetOpen] = useState(false);
  const needsEditScopeChoice = Boolean(event?.isRecurringOccurrence && event.recurringEventId && event.occurrenceDate);

  function handleEdit() {
    if (!event) return;

    if (needsEditScopeChoice) {
      setIsEditScopeSheetOpen(true);
      return;
    }

    router.push(getCalendarEventEditHref(event));
  }

  function openScopedEdit(scope: "occurrence" | "series") {
    if (!event) return;

    setIsEditScopeSheetOpen(false);
    router.push(getCalendarEventEditHref(event, scope));
  }

  const detailRows = useMemo(() => event ? [
    { icon: CalendarCheck, label: "Dato", value: formatEventDate(event.date) },
    { icon: Clock, label: "Tid", value: formatEventTime(event) },
    { icon: MapPin, label: "Sted", value: event.location ?? "Ingen lokasjon" },
    { icon: Bell, label: "Påminnelse", value: event.reminder?.label ?? "Ingen påminnelse" },
    { icon: StickyNote, label: "Notat", value: description },
  ] : [], [description, event]);

  if (familyAccess.status === "pending") return <LockedFeatureState />;
  if (familyAccess.status !== "approved" || loading) return <EventDetailLoading />;

  if (!event) {
    return <main className="event-detail event-detail--state" aria-live="polite"><PageContainer><Card tone="default"><EmptyState title={error ?? "Hendelsen finnes ikke lenger"} description="Prøv igjen, eller gå tilbake til kalenderen." /><Button onClick={() => void refresh()} variant="primary">Prøv igjen</Button></Card></PageContainer></main>;
  }

  return (
    <main className="calendar-event-sheet-host" aria-label="Kalenderhendelse">
      <HuskMobileSheet isOpen={true} labelledBy="calendar-event-detail-title" onClose={() => router.back()}>
        <div className="calendar-filter-sheet__header">
          <div className="husk-reminder-detail__heading"><span className="husk-reminder-detail__icon husk-reminder-card--blue" aria-hidden="true"><EventIcon size={24} strokeWidth={2.35} /></span><div><p className="calendar-filter-sheet__status">{sourceLabel} • {formatEventDate(event.date)}</p><h1 className="calendar-filter-sheet__title" id="calendar-event-detail-title">{event.title}</h1></div></div>
          <div className="calendar-event-sheet__header-actions"><button className="calendar-filter-sheet__close" type="button" aria-label="Flere valg for hendelsen"><MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.5} /></button><button className="calendar-filter-sheet__close" type="button" aria-label="Lukk hendelse" onClick={() => router.back()}><X aria-hidden="true" size={18} strokeWidth={2.5} /></button></div>
        </div>
        <div className="husk-reminder-detail__content calendar-event-sheet__content">
          <div className="event-form-card event-form-card--rows husk-reminder-edit-sheet__rows calendar-event-sheet__rows">
            {detailRows.map((row) => <div className="event-form-row calendar-event-sheet__row" key={row.label}><row.icon aria-hidden="true" size={22} strokeWidth={2.4} /><span>{row.label}</span><strong>{row.value}</strong></div>)}
          </div>
          {participants.length > 0 ? <div className="event-form-avatar-list calendar-event-sheet__people" aria-label={isWholeFamily ? "Deltakere: hele familien" : "Deltakere"}>{participants.map((member) => <span className="event-form-avatar-chip event-form-avatar-chip--selected" key={member.id}><UserAvatar identity={member} avatarUrl={member.avatarUrl} size="sm" className="event-form-avatar-chip__avatar" decorative /><span>{member.name}</span></span>)}</div> : null}
        </div>
        <AppActionFooter className="calendar-event-sheet__actions"><button className="calendar-filter-sheet__action calendar-filter-sheet__action--primary" type="button" onClick={handleEdit}>Rediger</button></AppActionFooter>
      </HuskMobileSheet>

      <AppSheet
        isOpen={isEditScopeSheetOpen}
        labelledBy="calendar-event-edit-scope-title"
        onClose={() => setIsEditScopeSheetOpen(false)}
        className="calendar-event-scope-sheet__panel"
        contentClassName="calendar-event-scope-sheet__content"
        actions={
          <button className="husk-school-sheet__action husk-school-sheet__action--secondary" type="button" onClick={() => setIsEditScopeSheetOpen(false)}>
            Avbryt
          </button>
        }
      >
        <AppCard className="calendar-event-scope-sheet__card">
          <p className="husk-school-sheet__eyebrow">Gjentakende hendelse</p>
          <h2 className="event-form-card-title" id="calendar-event-edit-scope-title">Hva vil du redigere?</h2>
          <p>Velg om endringen bare gjelder denne hendelsen eller hele serien.</p>
          <AppListRow as="button" type="button" onClick={() => openScopedEdit("occurrence")}>Kun denne hendelsen</AppListRow>
          <AppListRow as="button" type="button" onClick={() => openScopedEdit("series")}>Hele serien</AppListRow>
        </AppCard>
      </AppSheet>
    </main>
  );
}
