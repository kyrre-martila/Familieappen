"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Check, FileText, ListChecks, Save, Trash2, Users } from "lucide-react";

import { eventIconOptions, getIconOption, type EventFormIconId } from "../calendar/events/eventFormModel";
import { huskMockData, type HuskFamilyMember, type HuskListGroup, type HuskReminder, type HuskReminderIcon, type HuskListIcon } from "./mockHuskData";

type HuskFocusKind = "reminder" | "list";
type HuskFocusMode = "create" | "edit";

type HuskFocusDraft = {
  title: string;
  iconId: EventFormIconId | "";
  participantIds: string[];
  date: string;
  reminderEnabled: boolean;
  description: string;
};

type HuskFocusFormClientProps = {
  kind: HuskFocusKind;
  mode: HuskFocusMode;
  reminder?: HuskReminder | null;
  list?: HuskListGroup | null;
};

const familyMemberOrder = ["elisabeth", "kyrre", "fiona", "alma", "even-olai"];

const quickReminderExamples = ["Gymtøy", "Bibliotekbok", "Kjøp gave til Emma", "Husk pass", "Planlegg sommerferie"];

function getOrderedFamilyMembers() {
  return [...huskMockData.familyMembers].sort((memberA, memberB) => familyMemberOrder.indexOf(memberA.id) - familyMemberOrder.indexOf(memberB.id));
}

function getMembers(memberIds: string[]) {
  return getOrderedFamilyMembers().filter((member) => memberIds.includes(member.id));
}

function getScopeSummary(participantIds: string[]) {
  const selectedMembers = getMembers(participantIds);

  if (selectedMembers.length === 0) {
    return "Hele familien";
  }

  if (selectedMembers.length === 1) {
    return selectedMembers[0].name;
  }

  return `${selectedMembers.length} personer`;
}

function ScopePreview({ participantIds }: { participantIds: string[] }) {
  const selectedMembers = getMembers(participantIds);
  const visibleMembers = selectedMembers.slice(0, 3);
  const hiddenCount = Math.max(selectedMembers.length - visibleMembers.length, 0);

  if (selectedMembers.length === 0) {
    return (
      <span className="event-form-scope-summary__family" aria-hidden="true">
        <Users size={18} strokeWidth={2.4} />
      </span>
    );
  }

  if (selectedMembers.length === 1) {
    return <span className={`event-form-avatar-chip__avatar event-form-avatar-chip__avatar--${selectedMembers[0].tone}`} aria-hidden="true">{selectedMembers[0].initials}</span>;
  }

  return (
    <span className="event-form-scope-stack" aria-hidden="true">
      {visibleMembers.map((member) => (
        <span className={`event-form-scope-stack__avatar event-form-avatar-chip__avatar--${member.tone}`} key={member.id}>{member.initials}</span>
      ))}
      {hiddenCount > 0 ? <span className="event-form-scope-stack__count">+{hiddenCount}</span> : null}
    </span>
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapReminderIcon(icon: HuskReminderIcon): EventFormIconId {
  const iconMap = {
    backpack: "skolesekk",
    book: "lekser",
    cake: "bursdag",
    car: "kjoring",
    gift: "gave",
    grill: "middag",
    passport: "reise",
    shirt: "skole",
    summer: "reise",
    tooth: "tannlege",
  } satisfies Record<HuskReminderIcon, EventFormIconId>;

  return iconMap[icon];
}

function mapListIcon(icon: HuskListIcon): EventFormIconId {
  const iconMap = {
    birthday: "bursdag",
    celebration: "gave",
    home: "hjemme",
    summer: "reise",
  } satisfies Record<HuskListIcon, EventFormIconId>;

  return iconMap[icon];
}

function getDraftStorageKey(kind: HuskFocusKind, mode: HuskFocusMode, itemId?: string) {
  return mode === "edit" && itemId ? `familieappen:husk-${kind}-form:edit:${itemId}` : `familieappen:husk-${kind}-form:new`;
}

function getDefaultDraft({ kind, reminder, list }: Pick<HuskFocusFormClientProps, "kind" | "reminder" | "list">): HuskFocusDraft {
  if (kind === "reminder") {
    return {
      title: reminder?.title ?? "",
      iconId: reminder ? mapReminderIcon(reminder.icon) : "generelt",
      participantIds: reminder?.scopeText === "Hele familien" ? [] : reminder?.memberIds ?? [],
      date: reminder ? "2026-06-03" : getTodayDate(),
      reminderEnabled: false,
      description: "",
    };
  }

  return {
    title: list?.title ?? "",
    iconId: list ? mapListIcon(list.icon) : "generelt",
    participantIds: list && list.memberIds.length < huskMockData.familyMembers.length ? list.memberIds : [],
    date: "",
    reminderEnabled: false,
    description: "",
  };
}

function readStoredDraft(storageKey: string, fallback: HuskFocusDraft) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedDraft = window.sessionStorage.getItem(storageKey);
  const pickedIcon = window.sessionStorage.getItem(`${storageKey}:icon`);

  if (!storedDraft) {
    return pickedIcon ? { ...fallback, iconId: pickedIcon as EventFormIconId } : fallback;
  }

  try {
    const parsedDraft = JSON.parse(storedDraft) as HuskFocusDraft;
    return pickedIcon ? { ...parsedDraft, iconId: pickedIcon as EventFormIconId } : parsedDraft;
  } catch {
    return fallback;
  }
}

export function HuskFocusFormClient({ kind, mode, reminder = null, list = null }: HuskFocusFormClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const itemId = kind === "reminder" ? reminder?.id : list?.id;
  const storageKey = useMemo(() => getDraftStorageKey(kind, mode, itemId), [itemId, kind, mode]);
  const defaultDraft = useMemo(() => getDefaultDraft({ kind, reminder, list }), [kind, list, reminder]);
  const [draft, setDraft] = useState<HuskFocusDraft>(() => defaultDraft);
  const selectedIcon = getIconOption(draft.iconId) ?? eventIconOptions[0];
  const isReminder = kind === "reminder";
  const title = isReminder ? (mode === "create" ? "Ny husk" : "Rediger husk") : (mode === "create" ? "Ny liste" : "Rediger liste");
  const titlePlaceholder = isReminder ? "Hva må huskes?" : "Navn på listen";
  const isValid = draft.title.trim().length > 0 && (!isReminder || draft.date.trim().length > 0);
  const iconPickerHref = `/calendar/events/icon-picker?returnTo=${encodeURIComponent(pathname)}&draftKey=${encodeURIComponent(storageKey)}`;
  const scopeSummary = getScopeSummary(draft.participantIds);

  useEffect(() => {
    setDraft(readStoredDraft(storageKey, defaultDraft));
  }, [defaultDraft, storageKey]);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  function updateDraft<Key extends keyof HuskFocusDraft>(key: Key, value: HuskFocusDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function toggleParticipant(memberId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      participantIds: currentDraft.participantIds.includes(memberId)
        ? currentDraft.participantIds.filter((participantId) => participantId !== memberId)
        : [...currentDraft.participantIds, memberId],
    }));
  }

  function handleSave() {
    if (!isValid) {
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
    if (kind === "list" && mode === "edit" && list) {
      router.push(`/husk/lister/${list.id}`);
      return;
    }

    router.push(kind === "list" ? "/husk?tab=lister" : "/husk?tab=husk");
  }

  function handleDelete() {
    window.alert(isReminder ? "Slett husk kommer senere." : "Slett liste kommer senere.");
  }

  return (
    <main className="event-form-screen" aria-labelledby="husk-focus-form-title">
      <header className="event-form-topbar" aria-label={title}>
        <button className="event-form-topbar__action" type="button" onClick={() => router.back()}>Avbryt</button>
        <h1 className="event-form-topbar__title" id="husk-focus-form-title">{title}</h1>
        <button className="event-form-topbar__action" type="button" onClick={handleSave} disabled={!isValid} aria-disabled={!isValid}>Lagre</button>
      </header>

      <form className="event-form" onSubmit={(submitEvent) => { submitEvent.preventDefault(); handleSave(); }}>
        <section className="event-form-card event-form-card--title" aria-label="Tittel og ikon">
          <div className="event-form-field event-form-field--title">
            <label className="event-form-label" htmlFor="husk-focus-title">Tittel</label>
            <input
              className="event-form-title-input"
              id="husk-focus-title"
              name="title"
              type="text"
              value={draft.title}
              onChange={(changeEvent) => updateDraft("title", changeEvent.target.value)}
              placeholder={titlePlaceholder}
              autoComplete="off"
            />
          </div>
          <Link className="event-form-icon-link" href={iconPickerHref} aria-label={`Endre ikon, valgt ${selectedIcon.label}`}>
            <span className="event-form-icon-link__icon" aria-hidden="true"><selectedIcon.Icon size={25} strokeWidth={2.3} /></span>
            <span>{selectedIcon.label}</span>
          </Link>
        </section>

        {isReminder && mode === "create" ? (
          <section className="event-form-card" aria-label="Raske forslag">
            <div className="event-form-section-heading event-form-section-heading--compact">
              <ListChecks aria-hidden="true" size={22} strokeWidth={2.4} />
              <h2>Raske forslag</h2>
            </div>
            <div className="husk-school-quick">
              {quickReminderExamples.map((example) => (
                <button className="husk-school-quick__chip" key={example} onClick={() => updateDraft("title", example)} type="button">
                  {example}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="event-form-card" aria-labelledby="husk-focus-people-title">
          <div className="event-form-section-heading">
            <Users aria-hidden="true" size={22} strokeWidth={2.4} />
            <div>
              <h2 id="husk-focus-people-title">Hvem gjelder dette for?</h2>
              <p>Ingen valgt betyr hele familien.</p>
            </div>
          </div>
          <div className="event-form-scope-summary" aria-live="polite">
            <ScopePreview participantIds={draft.participantIds} />
            <span>{scopeSummary}</span>
          </div>
          <div className="event-form-avatar-list" aria-label="Velg personer">
            {getOrderedFamilyMembers().map((member: HuskFamilyMember) => {
              const isSelected = draft.participantIds.includes(member.id);

              return (
                <button
                  className={`event-form-avatar-chip${isSelected ? " event-form-avatar-chip--selected" : ""}`}
                  type="button"
                  key={member.id}
                  onClick={() => toggleParticipant(member.id)}
                  aria-pressed={isSelected}
                >
                  <span className={`event-form-avatar-chip__avatar event-form-avatar-chip__avatar--${member.tone}`} aria-hidden="true">
                    {member.initials}
                    {isSelected ? <span className="event-form-avatar-chip__check"><Check size={13} strokeWidth={3.2} /></span> : null}
                  </span>
                  <span>{member.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="event-form-card event-form-card--rows" aria-label={isReminder ? "Dato og påminnelse" : "Listevalg"}>
          {isReminder ? (
            <>
              <label className="event-form-row">
                <CalendarDays aria-hidden="true" size={22} strokeWidth={2.4} />
                <span>Dato</span>
                <input type="date" value={draft.date} onChange={(changeEvent) => updateDraft("date", changeEvent.target.value)} />
              </label>
              <label className="event-form-row event-form-row--toggle">
                <Bell aria-hidden="true" size={22} strokeWidth={2.4} />
                <span>Påminnelse</span>
                <input className="event-form-toggle" checked={draft.reminderEnabled} onChange={(changeEvent) => updateDraft("reminderEnabled", changeEvent.target.checked)} type="checkbox" />
              </label>
            </>
          ) : (
            <div className="event-form-row event-form-row--toggle">
              <ListChecks aria-hidden="true" size={22} strokeWidth={2.4} />
              <span>Enkel familieliste</span>
              <strong className="event-form-row__muted">Ingen avanserte valg</strong>
            </div>
          )}
        </section>

        <section className="event-form-card" aria-label="Beskrivelse">
          <div className="event-form-section-heading event-form-section-heading--compact">
            <FileText aria-hidden="true" size={22} strokeWidth={2.4} />
            <h2>{isReminder ? "Notat" : "Beskrivelse"}</h2>
          </div>
          <textarea
            className="event-form-textarea"
            value={draft.description}
            onChange={(changeEvent) => updateDraft("description", changeEvent.target.value)}
            placeholder={isReminder ? "Valgfritt notat …" : "Valgfri beskrivelse …"}
          />
        </section>

        <div className="event-form-actions">
          <button className="event-form-primary" type="submit" disabled={!isValid}>
            <Save aria-hidden="true" size={22} strokeWidth={2.5} />
            Lagre
          </button>
          {mode === "edit" ? (
            <button className="event-form-delete" type="button" onClick={handleDelete}>
              <Trash2 aria-hidden="true" size={19} strokeWidth={2.4} />
              {isReminder ? "Slett husk" : "Slett liste"}
            </button>
          ) : null}
        </div>
      </form>
    </main>
  );
}
