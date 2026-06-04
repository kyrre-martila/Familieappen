"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Backpack,
  BookOpen,
  Briefcase,
  Cake,
  Car,
  CalendarDays,
  Check,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Gift,
  Home,
  Plus,
  RotateCcw,
  Search,
  Shirt,
  SlidersHorizontal,
  Stethoscope,
  Tent,
  Users,
  Utensils,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer } from "../../components/ui";
import {
  type HuskFamilyMember,
  type HuskListGroup,
  type HuskListIcon,
  type HuskReminder,
  type HuskReminderGroup,
  type HuskReminderIcon,
  type HuskSchoolWeekday,
  type HuskTab,
} from "./mockHuskData";
import { useLists } from "../../features/husk/hooks/useLists";
import { useReminders } from "../../features/husk/hooks/useReminders";
import { useSchoolWeek } from "../../features/husk/hooks/useSchoolWeek";

const tabs = [
  { value: "husk", label: "Husk" },
  { value: "lister", label: "Lister" },
  { value: "skoleuka", label: "Skoleuka" },
] satisfies { value: HuskTab; label: string }[];

const titleByTab = {
  husk: "Husk",
  lister: "Lister",
  skoleuka: "Skoleuka",
} satisfies Record<HuskTab, string>;

const reminderGroupLabels = {
  today: "I dag",
  tomorrow: "I morgen",
  week: "Denne uka",
  later: "Senere",
} satisfies Record<HuskReminderGroup, string>;

const reminderGroupOrder: HuskReminderGroup[] = [
  "today",
  "tomorrow",
  "week",
  "later",
];

const reminderIcons = {
  backpack: Backpack,
  book: BookOpen,
  cake: Cake,
  car: Car,
  gift: Gift,
  grill: Utensils,
  passport: Briefcase,
  shirt: Shirt,
  summer: Tent,
  tooth: Stethoscope,
} satisfies Record<HuskReminderIcon, LucideIcon>;

const listIcons = {
  birthday: Cake,
  celebration: Gift,
  home: Home,
  summer: Tent,
} satisfies Record<HuskListIcon, LucideIcon>;

const schoolWeekdays = [
  { value: "monday", label: "Mandag", dayOffset: 0 },
  { value: "tuesday", label: "Tirsdag", dayOffset: 1 },
  { value: "wednesday", label: "Onsdag", dayOffset: 2 },
  { value: "thursday", label: "Torsdag", dayOffset: 3 },
  { value: "friday", label: "Fredag", dayOffset: 4 },
] satisfies { value: HuskSchoolWeekday; label: string; dayOffset: number }[];

const schoolQuickExamples = [
  "Gymtøy",
  "Bibliotekbok",
  "Ta med grillmat",
  "Mat og helse",
  "Kosedyrdag",
  "Fotballsko",
  "Matpakke",
] as const;

const schoolIconOptions = [
  { value: "shirt", label: "Gymtøy" },
  { value: "book", label: "Bok" },
  { value: "grill", label: "Mat" },
  { value: "backpack", label: "Sekk" },
  { value: "gift", label: "Dag" },
] satisfies { value: HuskReminderIcon; label: string }[];

type HuskPersonFilter =
  | "all"
  | "kyrre"
  | "elisabeth"
  | "fiona"
  | "alma"
  | "even-olai"
  | "family";

type HuskFilters = {
  person: HuskPersonFilter;
  showPrevious: boolean;
};

type ListFilters = {
  person: HuskPersonFilter;
  showArchived: boolean;
};

const personFilterOptions = [
  { value: "all", label: "Alle" },
  { value: "kyrre", label: "Kyrre" },
  { value: "elisabeth", label: "Elisabeth" },
  { value: "fiona", label: "Fiona" },
  { value: "alma", label: "Alma" },
  { value: "even-olai", label: "Even-Olai" },
  { value: "family", label: "Hele familien" },
] satisfies { value: HuskPersonFilter; label: string }[];

const defaultHuskFilters: HuskFilters = { person: "all", showPrevious: false };
const defaultListFilters: ListFilters = { person: "all", showArchived: false };
const huskTabStorageKey = "familieappen:husk:selected-tab";
const schoolChildStorageKey = "familieappen:husk:school-child-id";
const huskQueryStorageKey = "familieappen:husk:query";
const listQueryStorageKey = "familieappen:husk:lister:query";
const huskFiltersStorageKey = "familieappen:husk:filters";
const listFiltersStorageKey = "familieappen:husk:list-filters";
const huskScrollStorageKey = "familieappen:husk:scroll-y";

function isHuskTab(value: string | null): value is HuskTab {
  return value === "husk" || value === "lister" || value === "skoleuka";
}

function readStoredHuskTab() {
  if (typeof window === "undefined") {
    return "husk";
  }

  const storedTab = window.sessionStorage.getItem(huskTabStorageKey);
  return isHuskTab(storedTab) ? storedTab : "husk";
}

function readStoredValue(storageKey: string, fallback = "") {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.sessionStorage.getItem(storageKey) ?? fallback;
}

function readStoredJson<T>(storageKey: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedValue = window.sessionStorage.getItem(storageKey);
  if (!storedValue) {
    return fallback;
  }

  try {
    return { ...fallback, ...(JSON.parse(storedValue) as Partial<T>) };
  } catch {
    return fallback;
  }
}

const previousReminders: HuskReminder[] = [
  {
    id: "previous-gymtoy",
    title: "Gymtøy",
    scopeText: "Fiona",
    dateLabel: "I går",
    group: "today",
    icon: "shirt",
    tone: "yellow",
    memberIds: ["fiona"],
  },
  {
    id: "previous-library-book",
    title: "Bibliotekbok",
    scopeText: "Fiona",
    dateLabel: "Mandag",
    group: "today",
    icon: "book",
    tone: "blue",
    memberIds: ["fiona"],
  },
  {
    id: "previous-rainwear",
    title: "Ta med regntøy",
    scopeText: "Alma",
    dateLabel: "Forrige uke",
    group: "today",
    icon: "backpack",
    tone: "purple",
    memberIds: ["alma"],
  },
];

type SchoolCreateDraft = {
  weekday: HuskSchoolWeekday;
  dateLabel: string;
  title: string;
  icon: HuskReminderIcon;
  recurring: boolean;
  endDate: string;
};

const schoolChildIds = ["fiona", "alma", "even-olai"] as const;
const oneDayInMs = 24 * 60 * 60 * 1000;

function getIsoWeekStart(date: Date) {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  return utcDate;
}

function getIsoWeekNumber(date: Date) {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / oneDayInMs + 1) / 7,
  );
}

function formatSchoolDate(date: Date) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 4);
  const formatter = new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${formatter.format(weekStart)}–${formatter.format(weekEnd)}`;
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("nb-NO");
}

function matchesPersonFilter(
  memberIds: string[],
  scopeText: string,
  person: HuskPersonFilter,
) {
  if (person === "all") {
    return true;
  }

  if (person === "family") {
    return scopeText === "Hele familien";
  }

  return memberIds.includes(person);
}

function getHuskActiveFilterCount(filters: HuskFilters) {
  return (
    Number(filters.person !== defaultHuskFilters.person) +
    Number(filters.showPrevious !== defaultHuskFilters.showPrevious)
  );
}

function getListActiveFilterCount(filters: ListFilters) {
  return (
    Number(filters.person !== defaultListFilters.person) +
    Number(filters.showArchived !== defaultListFilters.showArchived)
  );
}

function HuskTabs({
  selectedTab,
  onSelectTab,
}: {
  selectedTab: HuskTab;
  onSelectTab: (tab: HuskTab) => void;
}) {
  return (
    <div className="husk-tabs" role="tablist" aria-label="Velg husk-visning">
      {tabs.map((tab) => {
        const isSelected = selectedTab === tab.value;

        return (
          <button
            aria-selected={isSelected}
            className={`husk-tabs__option${isSelected ? " husk-tabs__option--selected" : ""}`}
            aria-controls={`husk-panel-${tab.value}`}
            id={`husk-tab-${tab.value}`}
            key={tab.value}
            onClick={() => onSelectTab(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function HuskToolbar({
  activeFilterCount,
  onOpenFilters,
  onQueryChange,
  query,
  selectedTab,
}: {
  activeFilterCount: number;
  onOpenFilters: () => void;
  onQueryChange: (query: string) => void;
  query: string;
  selectedTab: HuskTab;
}) {
  const searchLabel = selectedTab === "lister" ? "Søk i lister" : "Søk i husk";
  const filterLabel =
    activeFilterCount > 0
      ? `Åpne filtre for ${titleByTab[selectedTab]}. ${activeFilterCount} aktive filter`
      : `Åpne filtre for ${titleByTab[selectedTab]}`;

  return (
    <div className="husk-toolbar" aria-label="Søk og filtrer">
      <label className="husk-search">
        <Search aria-hidden="true" size={20} strokeWidth={2.4} />
        <span className="sr-only">{searchLabel}</span>
        <input
          className="husk-search__input"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchLabel}
          type="search"
          value={query}
        />
      </label>
      <button
        className={`husk-filter-button${activeFilterCount > 0 ? " husk-filter-button--active" : ""}`}
        type="button"
        aria-label={filterLabel}
        onClick={onOpenFilters}
      >
        <SlidersHorizontal aria-hidden="true" size={20} strokeWidth={2.4} />
        <span>Filter</span>
        {activeFilterCount > 0 ? (
          <span className="husk-filter-button__count" aria-hidden="true">
            {activeFilterCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function HuskMobileSheet({
  children,
  isOpen,
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  isOpen: boolean;
  labelledBy: string;
  onClose: () => void;
}) {
  return (
    <div
      aria-hidden={!isOpen}
      className={`calendar-filter-sheet${isOpen ? " calendar-filter-sheet--open" : ""}`}
    >
      <button
        className="calendar-filter-sheet__backdrop"
        type="button"
        aria-label="Lukk"
        onClick={onClose}
      />
      <section
        aria-labelledby={labelledBy}
        aria-modal="true"
        className="calendar-filter-sheet__panel"
        role="dialog"
      >
        <div className="calendar-filter-sheet__handle" aria-hidden="true" />
        {children}
      </section>
    </div>
  );
}

function HuskFilterSheet({
  isOpen,
  onClose,
  onPersonChange,
  onReset,
  onToggleChange,
  person,
  status,
  title,
  toggleChecked,
  toggleLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPersonChange: (person: HuskPersonFilter) => void;
  onReset: () => void;
  onToggleChange: (checked: boolean) => void;
  person: HuskPersonFilter;
  status: string;
  title: string;
  toggleChecked: boolean;
  toggleLabel: string;
}) {
  return (
    <HuskMobileSheet
      isOpen={isOpen}
      labelledBy="husk-filter-title"
      onClose={onClose}
    >
      <div className="calendar-filter-sheet__header">
        <div>
          <h3 className="calendar-filter-sheet__title" id="husk-filter-title">
            {title}
          </h3>
          <p className="calendar-filter-sheet__status">{status}</p>
        </div>
        <button
          className="calendar-filter-sheet__close"
          type="button"
          aria-label="Lukk filter"
          onClick={onClose}
        >
          <X aria-hidden="true" size={18} strokeWidth={2.5} />
        </button>
      </div>
      <div className="calendar-filter-sheet__content">
        <fieldset className="calendar-filter-group">
          <legend className="calendar-filter-group__legend">Person</legend>
          <div className="calendar-filter-group__options">
            {personFilterOptions.map((option) => {
              const isSelected = person === option.value;

              return (
                <label
                  className={`calendar-filter-option${isSelected ? " calendar-filter-option--selected" : ""}`}
                  key={option.value}
                >
                  <input
                    checked={isSelected}
                    className="calendar-filter-option__input"
                    name="husk-person-filter"
                    onChange={() => onPersonChange(option.value)}
                    type="radio"
                  />
                  <span className="calendar-filter-option__label">
                    {option.label}
                  </span>
                  {isSelected ? (
                    <Check
                      className="calendar-filter-option__check"
                      aria-hidden="true"
                      size={16}
                      strokeWidth={2.8}
                    />
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="husk-filter-toggle">
          <span>{toggleLabel}</span>
          <input
            checked={toggleChecked}
            onChange={(event) => onToggleChange(event.target.checked)}
            type="checkbox"
          />
        </label>
      </div>
      <div className="calendar-filter-sheet__actions">
        <button
          className="calendar-filter-sheet__action calendar-filter-sheet__action--secondary"
          type="button"
          onClick={onReset}
        >
          Nullstill
        </button>
        <button
          className="calendar-filter-sheet__action calendar-filter-sheet__action--primary"
          type="button"
          onClick={onClose}
        >
          Ferdig
        </button>
      </div>
    </HuskMobileSheet>
  );
}

function ReminderAvatars({ members }: { members: HuskFamilyMember[] }) {
  return (
    <span
      className="husk-reminder-card__avatars"
      aria-label={members.map((member) => member.name).join(", ")}
    >
      {members.map((member) => (
        <span
          className={`husk-avatar husk-avatar--${member.tone}`}
          key={member.id}
          aria-hidden="true"
        >
          {member.initials}
        </span>
      ))}
    </span>
  );
}

function HuskReminderCard({
  onOpen,
  reminder,
}: {
  onOpen: (reminder: HuskReminder) => void;
  reminder: HuskReminder;
}) {
  const Icon = reminderIcons[reminder.icon];
  const { familyMembers } = useReminders();
  const members = reminder.memberIds
    .map((memberId) =>
      familyMembers.find((member) => member.id === memberId),
    )
    .filter((member): member is HuskFamilyMember => Boolean(member));

  return (
    <button
      className={`husk-reminder-card husk-reminder-card--${reminder.tone}`}
      type="button"
      onClick={() => onOpen(reminder)}
      aria-label={`Vis husk ${reminder.title}`}
    >
      <span className="husk-reminder-card__icon" aria-hidden="true">
        <Icon size={23} strokeWidth={2.25} />
      </span>
      <span className="husk-reminder-card__content">
        <span className="husk-reminder-card__title">{reminder.title}</span>
        <span className="husk-reminder-card__meta">
          {reminder.scopeText} <span aria-hidden="true">•</span>{" "}
          {reminder.dateLabel}
        </span>
      </span>
      <ReminderAvatars members={members} />
    </button>
  );
}

function HuskReminderDetailSheet({
  onClose,
  reminder,
}: {
  onClose: () => void;
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
            <Link
              className="calendar-filter-sheet__action calendar-filter-sheet__action--primary"
              href={`/husk/reminders/${reminder.id}/edit`}
            >
              Endre
            </Link>
          </div>
        </>
      ) : null}
    </HuskMobileSheet>
  );
}

function HuskEmptyState({
  actionHref,
  actionLabel,
  title,
  description,
}: {
  actionHref?: string;
  actionLabel?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="husk-empty-state" role="status">
      <span className="husk-empty-state__icon" aria-hidden="true">
        <ClipboardList size={28} strokeWidth={2.25} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link className="husk-empty-state__action" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function HuskReminders({
  filters,
  query,
}: {
  filters: HuskFilters;
  query: string;
}) {
  const [selectedReminder, setSelectedReminder] = useState<HuskReminder | null>(
    null,
  );
  const { reminders } = useReminders();
  const normalizedQuery = normalizeSearch(query);
  const filteredReminders = reminders.filter((reminder) => {
    if (
      !matchesPersonFilter(
        reminder.memberIds,
        reminder.scopeText,
        filters.person,
      )
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [reminder.title, reminder.scopeText, reminder.dateLabel].some(
      (value) => value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
    );
  });

  const filteredPreviousReminders = previousReminders.filter((reminder) => {
    if (
      !filters.showPrevious ||
      !matchesPersonFilter(
        reminder.memberIds,
        reminder.scopeText,
        filters.person,
      )
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [reminder.title, reminder.scopeText, reminder.dateLabel].some(
      (value) => value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
    );
  });

  const groupedReminders = reminderGroupOrder
    .map((group) => ({
      group,
      reminders: filteredReminders.filter((reminder) => reminder.group === group),
    }))
    .filter(({ reminders: groupReminders }) => groupReminders.length > 0);

  const hasReminders =
    groupedReminders.length > 0 ||
    (filters.showPrevious && filteredPreviousReminders.length > 0);

  return (
    <section
      className="husk-panel"
      id="husk-panel-husk"
      role="tabpanel"
      aria-labelledby="husk-tab-husk"
    >
      {hasReminders ? (
        <div className="husk-reminder-groups">
          {filters.showPrevious && filteredPreviousReminders.length > 0 ? (
            <section
              className="husk-reminder-group"
              aria-labelledby="husk-reminder-group-previous"
            >
              <div className="husk-reminder-group__heading">
                <h2
                  className="husk-reminder-group__title"
                  id="husk-reminder-group-previous"
                >
                  Tidligere
                </h2>
                <span
                  className="husk-reminder-group__count husk-reminder-group__count--previous"
                  aria-label={`${filteredPreviousReminders.length} tidligere påminnelser`}
                >
                  {filteredPreviousReminders.length}
                </span>
              </div>
              <div className="husk-card-list">
                {filteredPreviousReminders.map((reminder) => (
                  <HuskReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onOpen={setSelectedReminder}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {groupedReminders.map(({ group, reminders: groupReminders }) => (
            <section
              className="husk-reminder-group"
              key={group}
              aria-labelledby={`husk-reminder-group-${group}`}
            >
              <div className="husk-reminder-group__heading">
                <h2
                  className="husk-reminder-group__title"
                  id={`husk-reminder-group-${group}`}
                >
                  {reminderGroupLabels[group]}
                </h2>
                <span
                  className={`husk-reminder-group__count husk-reminder-group__count--${group}`}
                  aria-label={`${groupReminders.length} påminnelser`}
                >
                  {groupReminders.length}
                </span>
              </div>
              <div className="husk-card-list">
                {groupReminders.map((reminder) => (
                  <HuskReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onOpen={setSelectedReminder}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <HuskEmptyState
          title="Ingen husk ennå"
          description="Legg inn små ting familien ikke skal glemme."
          actionHref="/husk/reminders/new"
          actionLabel="+ Ny husk"
        />
      )}
      <HuskReminderDetailSheet
        reminder={selectedReminder}
        onClose={() => setSelectedReminder(null)}
      />
    </section>
  );
}

function ListCardAvatars({ members }: { members: HuskFamilyMember[] }) {
  const visibleMembers = members.slice(0, 4);
  const hiddenCount = Math.max(members.length - visibleMembers.length, 0);

  return (
    <span
      className="husk-list-card__avatars"
      aria-label={members.map((member) => member.name).join(", ")}
    >
      {visibleMembers.map((member) => (
        <span
          className={`husk-avatar husk-avatar--${member.tone}`}
          key={member.id}
          aria-hidden="true"
        >
          {member.initials}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="husk-list-card__avatar-count" aria-hidden="true">
          +{hiddenCount}
        </span>
      ) : null}
    </span>
  );
}

function HuskListCard({
  group,
  isArchived = false,
}: {
  group: HuskListGroup;
  isArchived?: boolean;
}) {
  const Icon = listIcons[group.icon];
  const { familyMembers } = useLists();
  const members = group.memberIds
    .map((memberId) =>
      familyMembers.find((member) => member.id === memberId),
    )
    .filter((member): member is HuskFamilyMember => Boolean(member));
  const progressPercent =
    group.totalCount > 0
      ? Math.round((group.completedCount / group.totalCount) * 100)
      : 0;
  const progressText = `${group.completedCount} av ${group.totalCount} fullført`;

  const cardContent = (
    <>
      <span className="husk-list-card__icon" aria-hidden="true">
        <Icon size={26} strokeWidth={2.25} />
      </span>
      <span className="husk-list-card__copy">
        <span className="husk-list-card__title">{group.title}</span>
        <span className="husk-list-card__progress-text">{progressText}</span>
        <span className="husk-list-card__progress" aria-hidden="true">
          <span
            className="husk-list-card__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </span>
      </span>
      <ListCardAvatars members={members} />
      {isArchived ? (
        <span className="husk-list-card__archived-label">Arkivert</span>
      ) : (
        <ChevronRight
          className="husk-list-card__chevron"
          aria-hidden="true"
          size={22}
          strokeWidth={2.4}
        />
      )}
    </>
  );

  if (isArchived) {
    return (
      <article
        className={`husk-list-card husk-list-card--${group.tone} husk-list-card--archived`}
      >
        {cardContent}
      </article>
    );
  }

  return (
    <Link
      className={`husk-list-card husk-list-card--${group.tone}`}
      href={`/husk/lister/${group.id}`}
      aria-label={`Åpne listen ${group.title}. ${progressText}`}
    >
      {cardContent}
    </Link>
  );
}

function HuskLists({
  filters,
  query,
}: {
  filters: ListFilters;
  query: string;
}) {
  const { familyMembers, lists } = useLists();
  const normalizedQuery = normalizeSearch(query);
  const filterListGroups = (groups: HuskListGroup[]) =>
    groups.filter((group) => {
      if (
        !matchesPersonFilter(
          group.memberIds,
          group.memberIds.length > 2 ? "Hele familien" : "",
          filters.person,
        )
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const memberNames = group.memberIds
        .map(
          (memberId) =>
            familyMembers.find((member) => member.id === memberId)?.name ?? "",
        )
        .filter(Boolean);

      return [
        group.title,
        `${group.completedCount} av ${group.totalCount} fullført`,
        ...memberNames,
      ].some((value) =>
        value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
      );
    });
  const activeListGroups = filterListGroups(
    lists.filter((group) => !group.archived),
  );
  const archivedLists = filters.showArchived
    ? filterListGroups(lists.filter((group) => group.archived))
    : [];

  return (
    <section
      className="husk-panel"
      id="husk-panel-lister"
      role="tabpanel"
      aria-labelledby="husk-tab-lister husk-lists-title"
    >
      <div className="husk-reminder-group__heading">
        <h2 className="husk-reminder-group__title" id="husk-lists-title">
          Aktive lister
        </h2>
        <span
          className="husk-reminder-group__count"
          aria-label={`${activeListGroups.length} aktive lister`}
        >
          {activeListGroups.length}
        </span>
      </div>
      {activeListGroups.length > 0 ? (
        <div className="husk-card-list">
          {activeListGroups.map((group) => (
            <HuskListCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <HuskEmptyState
          title="Ingen lister ennå"
          description="Lag en rolig oversikt for noe familien planlegger."
          actionHref="/husk/lister/new"
          actionLabel="+ Ny liste"
        />
      )}
      {filters.showArchived ? (
        <section
          className="husk-reminder-group"
          aria-labelledby="husk-archived-lists-title"
        >
          <div className="husk-reminder-group__heading">
            <h2
              className="husk-reminder-group__title"
              id="husk-archived-lists-title"
            >
              Arkiverte lister
            </h2>
            <span
              className="husk-reminder-group__count husk-reminder-group__count--later"
              aria-label={`${archivedLists.length} arkiverte lister`}
            >
              {archivedLists.length}
            </span>
          </div>
          <div className="husk-card-list">
            {archivedLists.map((group) => (
              <HuskListCard key={group.id} group={group} isArchived />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function HuskSchoolCreateSheet({
  childName,
  draft,
  onChange,
  onClose,
  onSave,
}: {
  childName: string;
  draft: SchoolCreateDraft;
  onChange: (draft: SchoolCreateDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      aria-hidden={!draft}
      className="husk-school-sheet husk-school-sheet--open"
    >
      <button
        className="husk-school-sheet__backdrop"
        type="button"
        aria-label="Lukk opprett husk"
        onClick={onClose}
      />
      <section
        aria-labelledby="husk-school-create-title"
        aria-modal="true"
        className="husk-school-sheet__panel"
        role="dialog"
      >
        <div className="husk-school-sheet__handle" aria-hidden="true" />
        <div className="husk-school-sheet__header">
          <div>
            <p className="husk-school-sheet__eyebrow">
              {childName} • {draft.dateLabel}
            </p>
            <h3
              className="husk-school-sheet__title"
              id="husk-school-create-title"
            >
              Hva må huskes?
            </h3>
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

        <div className="husk-school-sheet__content">
          <label className="husk-school-field">
            <span>Tittel</span>
            <input
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              placeholder="Hva må huskes?"
              type="text"
              value={draft.title}
            />
          </label>

          <div className="husk-school-field">
            <span>Ikon</span>
            <div className="husk-school-icon-grid">
              {schoolIconOptions.map((option) => {
                const Icon = reminderIcons[option.value];
                const isSelected = draft.icon === option.value;

                return (
                  <button
                    className={`husk-school-icon-option${isSelected ? " husk-school-icon-option--selected" : ""}`}
                    key={option.value}
                    onClick={() => onChange({ ...draft, icon: option.value })}
                    type="button"
                    aria-pressed={isSelected}
                  >
                    <Icon aria-hidden="true" size={19} strokeWidth={2.3} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="husk-school-quick" aria-label="Raske forslag">
            {schoolQuickExamples.map((example) => (
              <button
                className="husk-school-quick__chip"
                key={example}
                onClick={() => onChange({ ...draft, title: example })}
                type="button"
              >
                {example}
              </button>
            ))}
          </div>

          <label className="husk-school-repeat">
            <input
              checked={draft.recurring}
              onChange={(event) =>
                onChange({ ...draft, recurring: event.target.checked })
              }
              type="checkbox"
            />
            <span className="husk-school-repeat__box" aria-hidden="true">
              {draft.recurring ? <Check size={17} strokeWidth={3} /> : null}
            </span>
            <span>Gjenta ukentlig</span>
          </label>

          {draft.recurring ? (
            <label className="husk-school-field">
              <span>Valgfri sluttdato</span>
              <input
                aria-label="Valgfri sluttdato for ukentlig gjentakelse"
                onChange={(event) =>
                  onChange({ ...draft, endDate: event.target.value })
                }
                type="date"
                value={draft.endDate}
              />
            </label>
          ) : null}
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
            onClick={onSave}
            disabled={!draft.title.trim()}
          >
            Lagre
          </button>
        </div>
      </section>
    </div>
  );
}

function HuskSchoolRecurringChoiceSheet({
  itemTitle,
  onClose,
  onChoose,
}: {
  itemTitle: string;
  onClose: () => void;
  onChoose: () => void;
}) {
  return (
    <div className="husk-school-sheet husk-school-sheet--open">
      <button
        className="husk-school-sheet__backdrop"
        type="button"
        aria-label="Lukk valg for gjentakelse"
        onClick={onClose}
      />
      <section
        aria-labelledby="husk-school-recurring-title"
        aria-modal="true"
        className="husk-school-sheet__panel husk-school-sheet__panel--choice"
        role="dialog"
      >
        <div className="husk-school-sheet__handle" aria-hidden="true" />
        <div className="husk-school-choice__intro">
          <span className="husk-school-choice__icon" aria-hidden="true">
            <RotateCcw size={20} strokeWidth={2.4} />
          </span>
          <p>Dette er en gjentakende husk</p>
          <h3 id="husk-school-recurring-title">Hva vil du endre?</h3>
          <span>{itemTitle}</span>
        </div>
        <div className="husk-school-choice__options">
          <button type="button" onClick={onChoose}>
            Kun denne gangen
          </button>
          <button type="button" onClick={onChoose}>
            Hele serien
          </button>
          <button type="button" onClick={onClose}>
            Avbryt
          </button>
        </div>
      </section>
    </div>
  );
}

function HuskSchoolWeek({ shouldOpenPlanner }: { shouldOpenPlanner: boolean }) {
  const router = useRouter();
  const todayWeekStart = useMemo(() => getIsoWeekStart(new Date()), []);
  const todayWeekStartTime = todayWeekStart.getTime();
  const [selectedWeekStartTime, setSelectedWeekStartTime] =
    useState(todayWeekStartTime);
  const [selectedChildId, setSelectedChildId] = useState(() =>
    readStoredValue(schoolChildStorageKey, schoolChildIds[0]),
  );
  const [isEditing, setIsEditing] = useState(shouldOpenPlanner);
  const [createDraft, setCreateDraft] = useState<SchoolCreateDraft | null>(
    null,
  );
  const [recurringChoiceTitle, setRecurringChoiceTitle] = useState<
    string | null
  >(null);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const { children, weekItems } = useSchoolWeek();

  useEffect(() => {
    if (shouldOpenPlanner) {
      setIsEditing(true);
    }
  }, [shouldOpenPlanner]);

  useEffect(() => {
    window.sessionStorage.setItem(schoolChildStorageKey, selectedChildId);
  }, [selectedChildId]);

  useEffect(() => {
    if (!showSavedBadge) {
      return;
    }

    const timeout = window.setTimeout(() => setShowSavedBadge(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [showSavedBadge]);

  const weekOptions = useMemo(() => {
    return [-2, -1, 0, 1, 2].map((offset) => {
      const weekStart = new Date(todayWeekStart);
      weekStart.setUTCDate(weekStart.getUTCDate() + offset * 7);

      return {
        key: weekStart.toISOString(),
        label: `Uke ${getIsoWeekNumber(weekStart)}`,
        rangeLabel: formatWeekRange(weekStart),
        startTime: weekStart.getTime(),
      };
    });
  }, [todayWeekStart]);

  const selectedWeekStart = useMemo(
    () => new Date(selectedWeekStartTime),
    [selectedWeekStartTime],
  );
  const schoolChildren = schoolChildIds
    .map((childId) => children.find((member) => member.id === childId))
    .filter((member): member is HuskFamilyMember => Boolean(member));
  const selectedChildIndex = Math.max(
    0,
    schoolChildren.findIndex((child) => child.id === selectedChildId),
  );
  const selectedChild = schoolChildren[selectedChildIndex] ?? schoolChildren[0];
  const selectedPlan = weekItems.find(
    (plan) => plan.childId === selectedChild?.id,
  );
  const hasSchoolItems = schoolWeekdays.some(
    (weekday) => (selectedPlan?.days[weekday.value] ?? []).length > 0,
  );
  const selectedWeek = weekOptions.find(
    (week) => week.startTime === selectedWeekStartTime,
  );

  function showPreviousChild() {
    const previousChild =
      schoolChildren[
        (selectedChildIndex - 1 + schoolChildren.length) % schoolChildren.length
      ];
    if (previousChild) {
      setSelectedChildId(previousChild.id);
    }
  }

  function showNextChild() {
    const nextChild =
      schoolChildren[(selectedChildIndex + 1) % schoolChildren.length];
    if (nextChild) {
      setSelectedChildId(nextChild.id);
    }
  }

  function toggleEditing() {
    if (isEditing) {
      if (shouldOpenPlanner) {
        router.back();
      } else {
        setIsEditing(false);
      }
      return;
    }

    router.push("/husk?tab=skoleuka&edit=1");
  }

  function showSaved() {
    setShowSavedBadge(true);
  }

  function openCreateSheet(
    weekday: (typeof schoolWeekdays)[number],
    date: Date,
  ) {
    setCreateDraft({
      weekday: weekday.value,
      dateLabel: `${weekday.label} ${formatSchoolDate(date)}`,
      title: "",
      icon: "shirt",
      recurring: true,
      endDate: "",
    });
  }

  function saveCreateDraft() {
    if (!createDraft?.title.trim()) {
      return;
    }

    setCreateDraft(null);
    showSaved();
  }

  function chooseRecurringScope() {
    setRecurringChoiceTitle(null);
    showSaved();
  }

  return (
    <section
      className={`husk-panel husk-school${isEditing ? " husk-school--editing" : ""}`}
      id="husk-panel-skoleuka"
      role="tabpanel"
      aria-labelledby="husk-tab-skoleuka husk-school-title"
    >
      <div className="husk-school__topline">
        <div className="husk-section-heading">
          <p className="husk-section-heading__eyebrow">Skoleplan</p>
          <h2 className="husk-section-heading__title" id="husk-school-title">
            Skoleuka
          </h2>
        </div>
        <div className="husk-school__actions">
          {showSavedBadge ? (
            <span className="husk-school__saved" role="status">
              Lagret
            </span>
          ) : null}
          <button
            className={`husk-school__edit-button${isEditing ? " husk-school__edit-button--done" : ""}`}
            type="button"
            onClick={toggleEditing}
          >
            {isEditing ? "Ferdig" : "Rediger"}
          </button>
        </div>
      </div>

      <div className="husk-week-strip" aria-label="Velg uke">
        {weekOptions.map((week) => {
          const isSelected = week.startTime === selectedWeekStartTime;
          const isCurrent = week.startTime === todayWeekStart.getTime();

          return (
            <button
              className={`husk-week-strip__option${isSelected ? " husk-week-strip__option--selected" : ""}`}
              key={week.key}
              onClick={() => setSelectedWeekStartTime(week.startTime)}
              type="button"
              aria-current={isCurrent ? "date" : undefined}
              aria-pressed={isSelected}
            >
              <span>{week.label}</span>
              <small>{week.rangeLabel}</small>
            </button>
          );
        })}
      </div>

      {selectedChild ? (
        <div className="husk-school-child" aria-label="Velg barn">
          <button
            className="husk-school-child__button"
            type="button"
            onClick={showPreviousChild}
            aria-label="Vis forrige barn"
          >
            <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.5} />
          </button>
          <div className="husk-school-child__identity">
            <span
              className={`husk-avatar husk-avatar--${selectedChild.tone}`}
              aria-hidden="true"
            >
              {selectedChild.initials}
            </span>
            <span className="husk-school-child__copy">
              <strong>{selectedChild.name}</strong>
              <span>
                {selectedChildIndex + 1} av {schoolChildren.length}
              </span>
            </span>
          </div>
          <button
            className="husk-school-child__button"
            type="button"
            onClick={showNextChild}
            aria-label="Vis neste barn"
          >
            <ChevronRight aria-hidden="true" size={22} strokeWidth={2.5} />
          </button>
        </div>
      ) : null}

      {!hasSchoolItems ? (
        <HuskEmptyState
          title="Ingen skolehusk denne uka"
          description="Legg til det som må huskes til skoledagene."
          actionHref="/husk?tab=skoleuka&edit=1"
          actionLabel="Legg til skolehusk"
        />
      ) : null}

      <div
        className="husk-school-week"
        aria-label={`${selectedWeek?.label ?? "Valgt uke"} for ${selectedChild?.name ?? "valgt barn"}`}
      >
        {schoolWeekdays.map((weekday) => {
          const date = new Date(selectedWeekStart);
          date.setUTCDate(date.getUTCDate() + weekday.dayOffset);
          const items = selectedPlan?.days[weekday.value] ?? [];

          return (
            <article className="husk-school-day" key={weekday.value}>
              <header className="husk-school-day__header">
                <span className="husk-school-day__date-icon" aria-hidden="true">
                  <CalendarDays size={19} strokeWidth={2.3} />
                </span>
                <div className="husk-school-day__heading">
                  <h3>{weekday.label}</h3>
                  <span>{formatSchoolDate(date)}</span>
                </div>
                {isEditing ? (
                  <button
                    className="husk-school-day__add"
                    type="button"
                    onClick={() => openCreateSheet(weekday, date)}
                    aria-label={`Legg til husk på ${weekday.label}`}
                  >
                    <Plus aria-hidden="true" size={22} strokeWidth={2.35} />
                  </button>
                ) : null}
              </header>
              <div className="husk-school-day__items">
                {items.length > 0 ? (
                  items.map((item) => {
                    const Icon = reminderIcons[item.icon];
                    const content = (
                      <>
                        <span
                          className="husk-school-item__icon"
                          aria-hidden="true"
                        >
                          <Icon size={20} strokeWidth={2.35} />
                        </span>
                        <span className="husk-school-item__copy">
                          <span>{item.title}</span>
                          {isEditing ? (
                            <small>
                              <RotateCcw size={12} strokeWidth={2.4} /> Hver uke
                              til 20. juni 2026
                            </small>
                          ) : null}
                        </span>
                        {isEditing ? (
                          <span className="husk-school-item__edit-label">
                            Endre
                          </span>
                        ) : null}
                      </>
                    );

                    return isEditing ? (
                      <button
                        className={`husk-school-item husk-school-item--${item.tone} husk-school-item--editable`}
                        key={item.id}
                        type="button"
                        onClick={() => setRecurringChoiceTitle(item.title)}
                      >
                        {content}
                      </button>
                    ) : (
                      <div
                        className={`husk-school-item husk-school-item--${item.tone}`}
                        key={item.id}
                      >
                        {content}
                      </div>
                    );
                  })
                ) : (
                  <p className="husk-school-day__empty">Ingen husk</p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {isEditing ? (
        <p className="husk-school__tip">
          Trykk + på riktig dag for å legge til. Trykk på et punkt for å endre
          gjentakelse.
        </p>
      ) : null}

      {createDraft && selectedChild ? (
        <HuskSchoolCreateSheet
          childName={selectedChild.name}
          draft={createDraft}
          onChange={setCreateDraft}
          onClose={() => setCreateDraft(null)}
          onSave={saveCreateDraft}
        />
      ) : null}

      {recurringChoiceTitle ? (
        <HuskSchoolRecurringChoiceSheet
          itemTitle={recurringChoiceTitle}
          onClose={() => setRecurringChoiceTitle(null)}
          onChoose={chooseRecurringScope}
        />
      ) : null}
    </section>
  );
}

function HuskPageContent() {
  const familyAccess = useFamilyAccess();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const shouldOpenSchoolPlanner =
    requestedTab === "skoleuka" && searchParams.get("edit") === "1";
  const [selectedTab, setSelectedTab] = useState<HuskTab>(() =>
    isHuskTab(requestedTab) ? requestedTab : readStoredHuskTab(),
  );
  const [huskQuery, setHuskQuery] = useState(() =>
    readStoredValue(huskQueryStorageKey),
  );
  const [listQuery, setListQuery] = useState(() =>
    readStoredValue(listQueryStorageKey),
  );
  const [huskFilters, setHuskFilters] = useState<HuskFilters>(() =>
    readStoredJson(huskFiltersStorageKey, defaultHuskFilters),
  );
  const [listFilters, setListFilters] = useState<ListFilters>(() =>
    readStoredJson(listFiltersStorageKey, defaultListFilters),
  );
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const title = useMemo(() => titleByTab[selectedTab], [selectedTab]);
  const activeFilterCount =
    selectedTab === "lister"
      ? getListActiveFilterCount(listFilters)
      : getHuskActiveFilterCount(huskFilters);

  useEffect(() => {
    if (isHuskTab(requestedTab)) {
      setSelectedTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    window.sessionStorage.setItem(huskTabStorageKey, selectedTab);
  }, [selectedTab]);

  useEffect(() => {
    window.sessionStorage.setItem(huskQueryStorageKey, huskQuery);
  }, [huskQuery]);

  useEffect(() => {
    window.sessionStorage.setItem(listQueryStorageKey, listQuery);
  }, [listQuery]);

  useEffect(() => {
    window.sessionStorage.setItem(
      huskFiltersStorageKey,
      JSON.stringify(huskFilters),
    );
  }, [huskFilters]);

  useEffect(() => {
    window.sessionStorage.setItem(
      listFiltersStorageKey,
      JSON.stringify(listFilters),
    );
  }, [listFilters]);

  useEffect(() => {
    const storedScrollY = Number(
      window.sessionStorage.getItem(huskScrollStorageKey),
    );
    if (Number.isFinite(storedScrollY) && storedScrollY > 0) {
      window.requestAnimationFrame(() =>
        window.scrollTo({ top: storedScrollY }),
      );
    }

    const storeScroll = () =>
      window.sessionStorage.setItem(
        huskScrollStorageKey,
        String(window.scrollY),
      );
    window.addEventListener("pagehide", storeScroll);
    return () => {
      storeScroll();
      window.removeEventListener("pagehide", storeScroll);
    };
  }, []);

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Husk">
        <PageContainer>
          <Card tone="default">
            <EmptyState
              title="Sjekker familietilgang"
              description="Vent litt mens vi bekrefter familietilknytningen din."
            />
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell title={title}>
      <PageContainer>
        <div className="husk-page">
          <HuskTabs selectedTab={selectedTab} onSelectTab={setSelectedTab} />
          {selectedTab !== "skoleuka" ? (
            <HuskToolbar
              activeFilterCount={activeFilterCount}
              onOpenFilters={() => setIsFilterSheetOpen(true)}
              query={selectedTab === "lister" ? listQuery : huskQuery}
              selectedTab={selectedTab}
              onQueryChange={
                selectedTab === "lister" ? setListQuery : setHuskQuery
              }
            />
          ) : null}
          {selectedTab === "husk" ? (
            <HuskReminders filters={huskFilters} query={huskQuery} />
          ) : null}
          {selectedTab === "lister" ? (
            <HuskLists filters={listFilters} query={listQuery} />
          ) : null}
          {selectedTab === "skoleuka" ? (
            <HuskSchoolWeek shouldOpenPlanner={shouldOpenSchoolPlanner} />
          ) : null}
        </div>
      </PageContainer>
      {selectedTab === "husk" ? (
        <HuskFilterSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          onPersonChange={(person) =>
            setHuskFilters((current) => ({ ...current, person }))
          }
          onReset={() => setHuskFilters(defaultHuskFilters)}
          onToggleChange={(showPrevious) =>
            setHuskFilters((current) => ({ ...current, showPrevious }))
          }
          person={huskFilters.person}
          status="Velg person og om tidligere påminnelser skal vises."
          title="Filter for Husk"
          toggleChecked={huskFilters.showPrevious}
          toggleLabel="Vis tidligere"
        />
      ) : null}
      {selectedTab === "lister" ? (
        <HuskFilterSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          onPersonChange={(person) =>
            setListFilters((current) => ({ ...current, person }))
          }
          onReset={() => setListFilters(defaultListFilters)}
          onToggleChange={(showArchived) =>
            setListFilters((current) => ({ ...current, showArchived }))
          }
          person={listFilters.person}
          status="Velg person og om arkiverte lister skal vises."
          title="Filter for Lister"
          toggleChecked={listFilters.showArchived}
          toggleLabel="Vis arkiverte lister"
        />
      ) : null}
    </AppShell>
  );
}

export default function HuskPage() {
  return (
    <Suspense fallback={<LockedFeatureState />}>
      <HuskPageContent />
    </Suspense>
  );
}
