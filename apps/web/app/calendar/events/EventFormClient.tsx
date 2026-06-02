"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, Clock, FileText, MapPin, Repeat, Save, Trash2, Users } from "lucide-react";
import type { CalendarMvpEvent } from "@familieappen/shared";

import { familyMembers } from "../mockCalendarData";
import {
  type CalendarEventFormDraft,
  getDefaultEventFormDraft,
  getDraftStorageKey,
  getIconOption,
  reminderOptions,
  repeatOptions
} from "./eventFormModel";

interface CalendarEventFormClientProps {
  mode: "create" | "edit";
  event?: CalendarMvpEvent | null;
}

const participantOrder = ["alma", "fiona", "even-olai", "kyrre", "elisabeth"];

function getOrderedFamilyMembers() {
  return [...familyMembers].sort((memberA, memberB) => participantOrder.indexOf(memberA.id) - participantOrder.indexOf(memberB.id));
}

function getParticipantSummary(participantIds: string[]) {
  if (participantIds.length === 0) {
    return "Gjelder hele familien";
  }

  const selectedMembers = getOrderedFamilyMembers().filter((member) => participantIds.includes(member.id));
  const [firstMember] = selectedMembers;

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
    return pickedIcon ? { ...fallback, iconId: pickedIcon as CalendarEventFormDraft["iconId"] } : fallback;
  }

  try {
    const parsedDraft = JSON.parse(storedDraft) as CalendarEventFormDraft;
    return pickedIcon ? { ...parsedDraft, iconId: pickedIcon as CalendarEventFormDraft["iconId"] } : parsedDraft;
  } catch {
    return fallback;
  }
}

export function CalendarEventFormClient({ mode, event = null }: CalendarEventFormClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const storageKey = useMemo(() => getDraftStorageKey(mode, event?.id), [event?.id, mode]);
  const defaultDraft = useMemo(() => getDefaultEventFormDraft(event), [event]);
  const [draft, setDraft] = useState<CalendarEventFormDraft>(() => defaultDraft);
  const selectedIcon = getIconOption(draft.iconId);
  const title = mode === "create" ? "Ny hendelse" : "Rediger hendelse";
  const isValid = draft.title.trim().length > 0 && draft.date.trim().length > 0;
  const participantSummary = getParticipantSummary(draft.participantIds);
  const iconPickerHref = `/calendar/events/icon-picker?returnTo=${encodeURIComponent(pathname)}&draftKey=${encodeURIComponent(storageKey)}`;

  useEffect(() => {
    setDraft(readStoredDraft(storageKey, defaultDraft));
  }, [defaultDraft, storageKey]);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  function updateDraft<Key extends keyof CalendarEventFormDraft>(key: Key, value: CalendarEventFormDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function toggleParticipant(memberId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      participantIds: currentDraft.participantIds.includes(memberId)
        ? currentDraft.participantIds.filter((participantId) => participantId !== memberId)
        : [...currentDraft.participantIds, memberId]
    }));
  }

  function handleCancel() {
    router.back();
  }

  function handleSave() {
    if (!isValid) {
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
    if (mode === "edit" && event) {
      router.push(`/calendar/events/${event.id}`);
      return;
    }

    router.push("/calendar");
  }

  function handleDelete() {
    window.alert("Slett hendelse kommer senere.");
  }

  return (
    <main className="event-form-screen" aria-labelledby="event-form-title">
      <header className="event-form-topbar" aria-label="Hendelsesskjema">
        <button className="event-form-topbar__action" type="button" onClick={handleCancel}>Avbryt</button>
        <h1 className="event-form-topbar__title" id="event-form-title">{title}</h1>
        <button className="event-form-topbar__action" type="button" onClick={handleSave} disabled={!isValid} aria-disabled={!isValid}>Lagre</button>
      </header>

      <form className="event-form" onSubmit={(eventSubmit) => { eventSubmit.preventDefault(); handleSave(); }}>
        <section className="event-form-card event-form-card--title" aria-label="Tittel og ikon">
          <div className="event-form-field event-form-field--title">
            <label className="event-form-label" htmlFor="event-title">Tittel</label>
            <input
              className="event-form-title-input"
              id="event-title"
              name="title"
              type="text"
              value={draft.title}
              onChange={(changeEvent) => updateDraft("title", changeEvent.target.value)}
              placeholder="Tittel på hendelse"
              autoComplete="off"
            />
          </div>
          <Link className="event-form-icon-link" href={iconPickerHref} aria-label={selectedIcon ? `Endre ikon, valgt ${selectedIcon.label}` : "Velg ikon"}>
            {selectedIcon ? (
              <>
                <span className="event-form-icon-link__icon" aria-hidden="true"><selectedIcon.Icon size={24} strokeWidth={2.5} /></span>
                <span>{selectedIcon.label}</span>
              </>
            ) : (
              <span>+ Velg ikon</span>
            )}
          </Link>
        </section>

        <section className="event-form-card" aria-labelledby="event-participants-title">
          <div className="event-form-section-heading">
            <Users aria-hidden="true" size={24} />
            <div>
              <h2 id="event-participants-title">Hvem gjelder dette for?</h2>
              <p>{participantSummary}</p>
            </div>
          </div>
          <div className="event-form-avatar-list" role="group" aria-label="Velg deltakere">
            {getOrderedFamilyMembers().map((member) => {
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
                  <span className={`event-form-avatar-chip__avatar event-form-avatar-chip__avatar--${member.avatarColor}`} aria-hidden="true">
                    {member.initials}
                    {isSelected ? <span className="event-form-avatar-chip__check"><Check size={14} strokeWidth={3.2} /></span> : null}
                  </span>
                  <span>{member.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="event-form-card event-form-card--rows" aria-labelledby="event-date-title">
          <h2 className="sr-only" id="event-date-title">Dato og tid</h2>
          <label className="event-form-row" htmlFor="event-date">
            <CalendarCheck aria-hidden="true" size={24} />
            <span>Dato</span>
            <input id="event-date" type="date" value={draft.date} onChange={(changeEvent) => updateDraft("date", changeEvent.target.value)} required />
          </label>
          {!draft.allDay ? (
            <div className="event-form-time-grid">
              <label className="event-form-row" htmlFor="event-start-time">
                <Clock aria-hidden="true" size={24} />
                <span>Starttid</span>
                <input id="event-start-time" type="time" value={draft.startTime} onChange={(changeEvent) => updateDraft("startTime", changeEvent.target.value)} />
              </label>
              <label className="event-form-row" htmlFor="event-end-time">
                <Clock aria-hidden="true" size={24} />
                <span>Sluttid</span>
                <input id="event-end-time" type="time" value={draft.endTime} onChange={(changeEvent) => updateDraft("endTime", changeEvent.target.value)} />
              </label>
            </div>
          ) : null}
          <label className="event-form-row event-form-row--toggle" htmlFor="event-all-day">
            <Clock aria-hidden="true" size={24} />
            <span>Heldag</span>
            <input id="event-all-day" className="event-form-toggle" type="checkbox" checked={draft.allDay} onChange={(changeEvent) => updateDraft("allDay", changeEvent.target.checked)} />
          </label>
        </section>

        <section className="event-form-card event-form-card--rows" aria-labelledby="event-repeat-title">
          <div className="event-form-section-heading event-form-section-heading--compact">
            <Repeat aria-hidden="true" size={24} />
            <h2 id="event-repeat-title">Gjentakelse</h2>
          </div>
          <div className="event-form-options" role="radiogroup" aria-labelledby="event-repeat-title">
            {repeatOptions.map((option) => (
              <label className="event-form-option" key={option}>
                <input type="radio" name="repeat" value={option} checked={draft.repeat === option} onChange={() => updateDraft("repeat", option)} />
                <span>{option}{option === "Tilpasset" ? " (TODO)" : ""}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="event-form-card event-form-card--rows" aria-labelledby="event-reminder-title">
          <div className="event-form-section-heading event-form-section-heading--compact">
            <Clock aria-hidden="true" size={24} />
            <h2 id="event-reminder-title">Påminnelse</h2>
          </div>
          <div className="event-form-options" role="radiogroup" aria-labelledby="event-reminder-title">
            {reminderOptions.map((option) => (
              <label className="event-form-option" key={option}>
                <input type="radio" name="reminder" value={option} checked={draft.reminder === option} onChange={() => updateDraft("reminder", option)} />
                <span>{option}{option === "Tilpasset" ? " (TODO)" : ""}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="event-form-card" aria-labelledby="event-location-title">
          <div className="event-form-section-heading event-form-section-heading--compact">
            <MapPin aria-hidden="true" size={24} />
            <h2 id="event-location-title">Sted</h2>
          </div>
          <label className="sr-only" htmlFor="event-location">Sted</label>
          <input className="event-form-text-input" id="event-location" type="text" value={draft.location} onChange={(changeEvent) => updateDraft("location", changeEvent.target.value)} placeholder="Legg til sted" />
        </section>

        <section className="event-form-card" aria-labelledby="event-description-title">
          <div className="event-form-section-heading event-form-section-heading--compact">
            <FileText aria-hidden="true" size={24} />
            <h2 id="event-description-title">Beskrivelse</h2>
          </div>
          <label className="sr-only" htmlFor="event-description">Beskrivelse</label>
          <textarea className="event-form-textarea" id="event-description" value={draft.description} onChange={(changeEvent) => updateDraft("description", changeEvent.target.value)} placeholder="Legg til beskrivelse, noter eller annen informasjon..." rows={7} />
        </section>

        <div className="event-form-actions">
          <button className="event-form-primary" type="submit" disabled={!isValid} aria-disabled={!isValid}>
            <Save aria-hidden="true" size={24} />
            Lagre hendelse
          </button>
          {mode === "edit" ? (
            <button className="event-form-delete" type="button" onClick={handleDelete} aria-label="Slett hendelse">
              <Trash2 aria-hidden="true" size={20} />
              Slett hendelse
            </button>
          ) : null}
        </div>
      </form>
    </main>
  );
}
