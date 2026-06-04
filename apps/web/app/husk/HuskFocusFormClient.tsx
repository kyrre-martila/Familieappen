"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  FileText,
  ListChecks,
  Trash2,
  Users,
} from "lucide-react";

import {
  eventIconOptions,
  getIconOption,
  type EventFormIconId,
} from "../calendar/events/eventFormModel";
import { Button, Card, EmptyState, PageContainer } from "../../components/ui";

import {
  type HuskFamilyMember,
  type HuskListGroup,
  type HuskReminder,
  type HuskReminderIcon,
  type HuskListIcon,
} from "../../features/husk/types";
import { remapLegacyMemberIds } from "../../features/family/familyMemberAdapters";
import { useReminders } from "../../features/husk/hooks/useReminders";
import { useLists } from "../../features/husk/hooks/useLists";

type HuskFocusKind = "reminder" | "list";
type HuskFocusMode = "create" | "edit";

type HuskFocusDraft = {
  title: string;
  iconId: EventFormIconId | "";
  audience: "family" | "people";
  participantIds: string[];
  date: string;
  reminderEnabled: boolean;
  description: string;
};

type HuskFocusFormClientProps = {
  kind: HuskFocusKind;
  mode: HuskFocusMode;
  reminderId?: string;
  reminder?: HuskReminder | null;
  list?: HuskListGroup | null;
};

const quickReminderExamples = [
  "Gymtøy",
  "Bibliotekbok",
  "Kjøp gave til Emma",
  "Husk pass",
  "Planlegg sommerferie",
];

function getOrderedFamilyMembers(familyMembers: HuskFamilyMember[]) {
  return familyMembers;
}

function getMembers(memberIds: string[], familyMembers: HuskFamilyMember[]) {
  return getOrderedFamilyMembers(familyMembers).filter((member) =>
    memberIds.includes(member.id),
  );
}

function getScopeSummary(
  audience: HuskFocusDraft["audience"],
  participantIds: string[],
  familyMembers: HuskFamilyMember[],
) {
  const selectedMembers = getMembers(participantIds, familyMembers);

  if (audience === "family") {
    return "Hele familien";
  }

  if (selectedMembers.length === 0) {
    return "Ingen valgt";
  }

  if (selectedMembers.length === 1) {
    return selectedMembers[0].name;
  }

  return `${selectedMembers.length} personer`;
}

function ScopePreview({
  audience,
  familyMembers,
  participantIds,
}: {
  audience: HuskFocusDraft["audience"];
  familyMembers: HuskFamilyMember[];
  participantIds: string[];
}) {
  const selectedMembers = getMembers(participantIds, familyMembers);
  const visibleMembers = selectedMembers.slice(0, 3);
  const hiddenCount = Math.max(
    selectedMembers.length - visibleMembers.length,
    0,
  );

  if (audience === "family") {
    return (
      <span className="event-form-scope-summary__family" aria-hidden="true">
        <Users size={18} strokeWidth={2.4} />
      </span>
    );
  }

  if (selectedMembers.length === 0) {
    return (
      <span className="event-form-scope-summary__empty" aria-hidden="true" />
    );
  }

  if (selectedMembers.length === 1) {
    return (
      <span
        className={`event-form-avatar-chip__avatar event-form-avatar-chip__avatar--${selectedMembers[0].tone}`}
        aria-hidden="true"
      >
        {selectedMembers[0].initials}
      </span>
    );
  }

  return (
    <span className="event-form-scope-stack" aria-hidden="true">
      {visibleMembers.map((member) => (
        <span
          className={`event-form-scope-stack__avatar event-form-avatar-chip__avatar--${member.tone}`}
          key={member.id}
        >
          {member.initials}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="event-form-scope-stack__count">+{hiddenCount}</span>
      ) : null}
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

function mapEventIconToReminderIcon(icon: EventFormIconId | ""): HuskReminderIcon {
  const iconMap: Partial<Record<EventFormIconId, HuskReminderIcon>> = {
    bursdag: "cake",
    gave: "gift",
    generelt: "backpack",
    kjoring: "car",
    lekser: "book",
    middag: "grill",
    reise: "passport",
    skole: "shirt",
    skolesekk: "backpack",
    tannlege: "tooth",
  };

  return icon ? (iconMap[icon] ?? "backpack") : "backpack";
}

function mapEventIconToListIcon(icon: EventFormIconId | ""): HuskListIcon {
  if (icon === "bursdag") return "birthday";
  if (icon === "gave") return "celebration";
  if (icon === "reise" || icon === "svomming") return "summer";
  return "home";
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

function getDraftStorageKey(
  kind: HuskFocusKind,
  mode: HuskFocusMode,
  itemId?: string,
) {
  return mode === "edit" && itemId
    ? `familieappen:husk-${kind}-form:edit:${itemId}`
    : `familieappen:husk-${kind}-form:new`;
}

function getDefaultDraft({
  familyMemberCount,
  kind,
  reminder,
  list,
}: Pick<
  HuskFocusFormClientProps,
  "kind" | "reminder" | "list"
> & { familyMemberCount: number }): HuskFocusDraft {
  if (kind === "reminder") {
    return {
      title: reminder?.title ?? "",
      iconId: reminder ? mapReminderIcon(reminder.icon) : "generelt",
      audience:
        !reminder || reminder.scopeText === "Hele familien"
          ? "family"
          : "people",
      participantIds:
        reminder?.scopeText === "Hele familien"
          ? []
          : (reminder?.memberIds ?? []),
      date: reminder?.dueDate ?? getTodayDate(),
      reminderEnabled: false,
      description: reminder?.note ?? "",
    };
  }

  return {
    title: list?.title ?? "",
    iconId: list ? mapListIcon(list.icon) : "generelt",
    audience:
      list && list.memberIds.length < familyMemberCount
        ? "people"
        : "family",
    participantIds:
      list && list.memberIds.length < familyMemberCount
        ? list.memberIds
        : [],
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
    return pickedIcon
      ? { ...fallback, iconId: pickedIcon as EventFormIconId }
      : fallback;
  }

  try {
    const parsedDraft = JSON.parse(storedDraft) as Partial<HuskFocusDraft>;
    const migratedDraft: HuskFocusDraft = {
      ...fallback,
      ...parsedDraft,
      audience:
        parsedDraft.audience ??
        ((parsedDraft.participantIds?.length ?? 0) > 0
          ? "people"
          : fallback.audience),
    };
    return pickedIcon
      ? { ...migratedDraft, iconId: pickedIcon as EventFormIconId }
      : migratedDraft;
  } catch {
    return fallback;
  }
}

export function HuskFocusFormClient({
  kind,
  mode,
  reminderId,
  reminder = null,
  list = null,
}: HuskFocusFormClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { familyMembers, reminders, loading: remindersLoading, error: remindersError, refresh: refreshReminders, createReminder, updateReminder, deleteReminder } = useReminders();
  const { lists, loading: listsLoading, error: listsError, refresh: refreshLists, createList, updateList, deleteList } = useLists();
  const resolvedList = kind === "list" && list?.id ? lists.find((candidate) => candidate.id === list.id) ?? list : list;
  const resolvedReminder = kind === "reminder" && reminderId ? reminders.find((candidate) => candidate.id === reminderId) ?? reminder : reminder;
  const itemId = kind === "reminder" ? resolvedReminder?.id ?? reminderId : resolvedList?.id;
  const storageKey = useMemo(
    () => getDraftStorageKey(kind, mode, itemId),
    [itemId, kind, mode],
  );
  const defaultDraft = useMemo(
    () =>
      getDefaultDraft({
        familyMemberCount: familyMembers.length,
        kind,
        reminder: resolvedReminder,
        list: resolvedList,
      }),
    [familyMembers.length, kind, resolvedList, resolvedReminder],
  );
  const [draft, setDraft] = useState<HuskFocusDraft>(() => defaultDraft);
  const selectedIcon = getIconOption(draft.iconId) ?? eventIconOptions[0];
  const isReminder = kind === "reminder";
  const title = isReminder
    ? mode === "create"
      ? "Ny husk"
      : "Rediger husk"
    : mode === "create"
      ? "Ny liste"
      : "Rediger liste";
  const titlePlaceholder = isReminder ? "Hva må huskes?" : "Navn på listen";
  const hasAudience =
    draft.audience === "family" || draft.participantIds.length > 0;
  const isValid =
    draft.title.trim().length > 0 &&
    hasAudience &&
    (!isReminder || draft.date.trim().length > 0);
  const iconPickerHref = `/calendar/events/icon-picker?returnTo=${encodeURIComponent(pathname)}&draftKey=${encodeURIComponent(storageKey)}`;
  const scopeSummary = getScopeSummary(draft.audience, draft.participantIds, familyMembers);
  const isLoadingExisting = mode === "edit" && (isReminder ? remindersLoading : listsLoading);
  const missingExistingItem = mode === "edit" && !isLoadingExisting && (isReminder ? !resolvedReminder : !resolvedList?.title);
  const existingItemError = isReminder ? remindersError : listsError;

  useEffect(() => {
    setDraft(readStoredDraft(storageKey, defaultDraft));
  }, [defaultDraft, storageKey]);

  useEffect(() => {
    if (kind === "list" && mode === "edit" && resolvedList?.title && !draft.title.trim()) {
      setDraft(defaultDraft);
    }
  }, [defaultDraft, draft.title, kind, mode, resolvedList?.title]);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  useEffect(() => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      participantIds: remapLegacyMemberIds(currentDraft.participantIds, familyMembers),
    }));
  }, [familyMembers]);

  if (isLoadingExisting) {
    return (
      <main className="event-form-screen" aria-live="polite">
        <PageContainer>
          <Card tone="default">
            <EmptyState title={isReminder ? "Henter husk" : "Henter liste"} description="Et lite øyeblikk." />
          </Card>
        </PageContainer>
      </main>
    );
  }

  if (missingExistingItem) {
    return (
      <main className="event-form-screen" aria-live="polite">
        <PageContainer>
          <Card tone="default">
            <EmptyState
              title={existingItemError ?? (isReminder ? "Kunne ikke hente husk akkurat nå" : "Kunne ikke hente listen akkurat nå")}
              description="Prøv igjen, eller gå tilbake til Husk."
            />
            <Button onClick={() => void (isReminder ? refreshReminders() : refreshLists())} variant="primary">Prøv igjen</Button>
          </Card>
        </PageContainer>
      </main>
    );
  }

  function updateDraft<Key extends keyof HuskFocusDraft>(
    key: Key,
    value: HuskFocusDraft[Key],
  ) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function selectFamilyAudience() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      audience: "family",
      participantIds: [],
    }));
  }

  function toggleParticipant(memberId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      audience: "people",
      participantIds: currentDraft.participantIds.includes(memberId)
        ? currentDraft.participantIds.filter(
            (participantId) => participantId !== memberId,
          )
        : [...currentDraft.participantIds, memberId],
    }));
  }

  async function handleSave() {
    if (!isValid) {
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));

    if (isReminder) {
      const reminderPayload = {
        title: draft.title,
        icon: mapEventIconToReminderIcon(draft.iconId),
        memberIds: draft.audience === "family" ? [] : draft.participantIds,
        scopeText: draft.audience === "family" ? "Hele familien" : scopeSummary,
        dueDate: draft.date,
        note: draft.description || undefined,
        reminderMinutesBefore: draft.reminderEnabled ? 1440 : null,
      };

      try {
        if (mode === "edit" && itemId) {
          await updateReminder(itemId, reminderPayload);
        } else {
          await createReminder(reminderPayload);
        }

        window.sessionStorage.removeItem(storageKey);
        router.push("/husk?tab=husk");
      } catch {
        // Provider keeps the optimistic state and calm error copy consistent across Husk.
        return;
      }

      return;
    }

    if (kind === "list") {
      const listPayload = {
        title: draft.title,
        icon: mapEventIconToListIcon(draft.iconId),
        memberIds: draft.audience === "family" ? familyMembers.map((member) => member.id) : draft.participantIds,
        scopeText: draft.audience === "family" ? "Hele familien" : scopeSummary,
        completedCount: resolvedList?.completedCount ?? 0,
        totalCount: resolvedList?.totalCount ?? 0,
        archived: resolvedList?.archived ?? false,
        tone: resolvedList?.tone ?? "blue" as const,
      };

      try {
        if (mode === "edit" && itemId) {
          await updateList(itemId, listPayload);
          window.sessionStorage.removeItem(storageKey);
          router.push(`/husk/lister/${itemId}`);
        } else {
          await createList(listPayload);
          window.sessionStorage.removeItem(storageKey);
          router.push("/husk?tab=lister");
        }
      } catch {
        // Provider keeps the optimistic state and calm error copy consistent across Lister.
        return;
      }

      return;
    }

    router.push("/husk?tab=husk");
  }

  async function handleDelete() {
    if (isReminder && itemId) {
      try {
        await deleteReminder(itemId);
        window.sessionStorage.removeItem(storageKey);
        router.push("/husk?tab=husk");
      } catch {
        return;
      }

      return;
    }

    if (kind === "list" && itemId) {
      try {
        await deleteList(itemId);
        window.sessionStorage.removeItem(storageKey);
        router.push("/husk?tab=lister");
      } catch {
        return;
      }
    }
  }

  return (
    <main className="event-form-screen" aria-labelledby="husk-focus-form-title">
      <header className="event-form-topbar" aria-label={title}>
        <button
          className="event-form-topbar__action"
          type="button"
          onClick={() => router.back()}
        >
          Avbryt
        </button>
        <h1 className="event-form-topbar__title" id="husk-focus-form-title">
          {title}
        </h1>
        <button
          className="event-form-topbar__action"
          type="button"
          onClick={handleSave}
          disabled={!isValid}
          aria-disabled={!isValid}
        >
          Lagre
        </button>
      </header>

      <form
        className="event-form"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          handleSave();
        }}
      >
        <section
          className="event-form-card event-form-card--title"
          aria-label="Tittel og ikon"
        >
          <div className="event-form-field event-form-field--title">
            <label className="event-form-label" htmlFor="husk-focus-title">
              Tittel
            </label>
            <input
              className="event-form-title-input"
              id="husk-focus-title"
              name="title"
              type="text"
              value={draft.title}
              onChange={(changeEvent) =>
                updateDraft("title", changeEvent.target.value)
              }
              placeholder={titlePlaceholder}
              autoComplete="off"
            />
          </div>
          <Link
            className="event-form-icon-link"
            href={iconPickerHref}
            aria-label={`Endre ikon, valgt ${selectedIcon.label}`}
          >
            <span className="event-form-icon-link__icon" aria-hidden="true">
              <selectedIcon.Icon size={25} strokeWidth={2.3} />
            </span>
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
                <button
                  className="husk-school-quick__chip"
                  key={example}
                  onClick={() => updateDraft("title", example)}
                  type="button"
                >
                  {example}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section
          className="event-form-card"
          aria-labelledby="husk-focus-people-title"
        >
          <div className="event-form-section-heading">
            <Users aria-hidden="true" size={22} strokeWidth={2.4} />
            <div>
              <h2 id="husk-focus-people-title">Hvem gjelder dette for?</h2>
              <p>Velg hele familien eller én/flere personer.</p>
            </div>
          </div>
          <div className="event-form-scope-summary" aria-live="polite">
            <ScopePreview
              audience={draft.audience}
              familyMembers={familyMembers}
              participantIds={draft.participantIds}
            />
            <span>{scopeSummary}</span>
          </div>
          <div className="event-form-avatar-list" aria-label="Velg personer">
            <button
              className={`event-form-avatar-chip event-form-avatar-chip--family${draft.audience === "family" ? " event-form-avatar-chip--selected" : ""}`}
              type="button"
              onClick={selectFamilyAudience}
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
            {getOrderedFamilyMembers(familyMembers).map((member: HuskFamilyMember) => {
              const isSelected = draft.participantIds.includes(member.id);

              return (
                <button
                  className={`event-form-avatar-chip${isSelected ? " event-form-avatar-chip--selected" : ""}`}
                  type="button"
                  key={member.id}
                  onClick={() => toggleParticipant(member.id)}
                  aria-pressed={isSelected}
                >
                  <span
                    className={`event-form-avatar-chip__avatar event-form-avatar-chip__avatar--${member.tone}`}
                    aria-hidden="true"
                  >
                    {member.initials}
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
        </section>

        <section
          className="event-form-card event-form-card--rows"
          aria-label={isReminder ? "Dato og påminnelse" : "Listevalg"}
        >
          {isReminder ? (
            <>
              <label className="event-form-row">
                <CalendarDays aria-hidden="true" size={22} strokeWidth={2.4} />
                <span>Dato</span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(changeEvent) =>
                    updateDraft("date", changeEvent.target.value)
                  }
                />
              </label>
              <label className="event-form-row event-form-row--toggle">
                <Bell aria-hidden="true" size={22} strokeWidth={2.4} />
                <span>Påminnelse</span>
                <input
                  className="event-form-toggle"
                  checked={draft.reminderEnabled}
                  onChange={(changeEvent) =>
                    updateDraft("reminderEnabled", changeEvent.target.checked)
                  }
                  type="checkbox"
                />
              </label>
            </>
          ) : (
            <div className="event-form-row event-form-row--toggle">
              <ListChecks aria-hidden="true" size={22} strokeWidth={2.4} />
              <span>Enkel familieliste</span>
              <strong className="event-form-row__muted">
                Ingen avanserte valg
              </strong>
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
            onChange={(changeEvent) =>
              updateDraft("description", changeEvent.target.value)
            }
            placeholder={
              isReminder ? "Valgfritt notat …" : "Valgfri beskrivelse …"
            }
          />
        </section>

        {mode === "edit" ? (
          <div className="event-form-actions event-form-actions--single">
            <button
              className="event-form-delete"
              type="button"
              onClick={handleDelete}
            >
              <Trash2 aria-hidden="true" size={19} strokeWidth={2.4} />
              {isReminder ? "Slett husk" : "Slett liste"}
            </button>
          </div>
        ) : null}
      </form>
    </main>
  );
}
