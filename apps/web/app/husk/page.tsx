"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Backpack,
  BookOpen,
  Briefcase,
  Cake,
  Car,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  Home,
  Search,
  Shirt,
  SlidersHorizontal,
  Stethoscope,
  Tent,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer } from "../../components/ui";
import {
  huskMockData,
  type HuskFamilyMember,
  type HuskListGroup,
  type HuskListIcon,
  type HuskReminder,
  type HuskReminderGroup,
  type HuskReminderIcon,
  type HuskSchoolWeekday,
  type HuskTab,
} from "./mockHuskData";

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

const reminderGroupOrder: HuskReminderGroup[] = ["today", "tomorrow", "week", "later"];

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

const schoolChildIds = ["fiona", "alma", "even-olai"] as const;
const oneDayInMs = 24 * 60 * 60 * 1000;

function getIsoWeekStart(date: Date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  return utcDate;
}

function getIsoWeekNumber(date: Date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / oneDayInMs + 1) / 7);
}

function formatSchoolDate(date: Date) {
  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 4);
  const formatter = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${formatter.format(weekStart)}–${formatter.format(weekEnd)}`;
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("nb-NO");
}

function HuskTabs({ selectedTab, onSelectTab }: { selectedTab: HuskTab; onSelectTab: (tab: HuskTab) => void }) {
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

function HuskToolbar({ query, selectedTab, onQueryChange }: { query: string; selectedTab: HuskTab; onQueryChange: (query: string) => void }) {
  const searchLabel = selectedTab === "lister" ? "Søk i lister" : selectedTab === "skoleuka" ? "Søk i skoleuka" : "Søk i husk";
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
      <button className="husk-filter-button" type="button" aria-label={`Åpne filtre for ${titleByTab[selectedTab]}`}>
        <SlidersHorizontal aria-hidden="true" size={20} strokeWidth={2.4} />
        <span>Filter</span>
      </button>
    </div>
  );
}

function ReminderAvatars({ members }: { members: HuskFamilyMember[] }) {
  return (
    <span className="husk-reminder-card__avatars" aria-label={members.map((member) => member.name).join(", ")}>
      {members.map((member) => (
        <span className={`husk-avatar husk-avatar--${member.tone}`} key={member.id} aria-hidden="true">
          {member.initials}
        </span>
      ))}
    </span>
  );
}

function HuskReminderCard({ reminder }: { reminder: HuskReminder }) {
  const Icon = reminderIcons[reminder.icon];
  const members = reminder.memberIds
    .map((memberId) => huskMockData.familyMembers.find((member) => member.id === memberId))
    .filter((member): member is HuskFamilyMember => Boolean(member));

  return (
    <button className={`husk-reminder-card husk-reminder-card--${reminder.tone}`} type="button">
      <span className="husk-reminder-card__icon" aria-hidden="true">
        <Icon size={23} strokeWidth={2.25} />
      </span>
      <span className="husk-reminder-card__content">
        <span className="husk-reminder-card__title">{reminder.title}</span>
        <span className="husk-reminder-card__meta">
          {reminder.scopeText} <span aria-hidden="true">•</span> {reminder.dateLabel}
        </span>
      </span>
      <ReminderAvatars members={members} />
    </button>
  );
}

function HuskReminders({ query }: { query: string }) {
  const normalizedQuery = normalizeSearch(query);
  const reminders = huskMockData.reminders.filter((reminder) => {
    if (!normalizedQuery) {
      return true;
    }

    return [reminder.title, reminder.scopeText, reminder.dateLabel].some((value) =>
      value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
    );
  });

  const groupedReminders = reminderGroupOrder
    .map((group) => ({
      group,
      reminders: reminders.filter((reminder) => reminder.group === group),
    }))
    .filter(({ reminders: groupReminders }) => groupReminders.length > 0);

  return (
    <section className="husk-panel" id="husk-panel-husk" role="tabpanel" aria-labelledby="husk-tab-husk">
      <div className="husk-reminder-groups">
        {groupedReminders.map(({ group, reminders: groupReminders }) => (
          <section className="husk-reminder-group" key={group} aria-labelledby={`husk-reminder-group-${group}`}>
            <div className="husk-reminder-group__heading">
              <h2 className="husk-reminder-group__title" id={`husk-reminder-group-${group}`}>
                {reminderGroupLabels[group]}
              </h2>
              <span className={`husk-reminder-group__count husk-reminder-group__count--${group}`} aria-label={`${groupReminders.length} påminnelser`}>
                {groupReminders.length}
              </span>
            </div>
            <div className="husk-card-list">
              {groupReminders.map((reminder) => (
                <HuskReminderCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function ListCardAvatars({ members }: { members: HuskFamilyMember[] }) {
  const visibleMembers = members.slice(0, 4);
  const hiddenCount = Math.max(members.length - visibleMembers.length, 0);

  return (
    <span className="husk-list-card__avatars" aria-label={members.map((member) => member.name).join(", ")}>
      {visibleMembers.map((member) => (
        <span className={`husk-avatar husk-avatar--${member.tone}`} key={member.id} aria-hidden="true">
          {member.initials}
        </span>
      ))}
      {hiddenCount > 0 ? <span className="husk-list-card__avatar-count" aria-hidden="true">+{hiddenCount}</span> : null}
    </span>
  );
}

function HuskListCard({ group }: { group: HuskListGroup }) {
  const Icon = listIcons[group.icon];
  const members = group.memberIds
    .map((memberId) => huskMockData.familyMembers.find((member) => member.id === memberId))
    .filter((member): member is HuskFamilyMember => Boolean(member));
  const progressPercent = group.totalCount > 0 ? Math.round((group.completedCount / group.totalCount) * 100) : 0;
  const progressText = `${group.completedCount} av ${group.totalCount} fullført`;

  return (
    <Link
      className={`husk-list-card husk-list-card--${group.tone}`}
      href={`/husk/lister/${group.id}`}
      aria-label={`Åpne listen ${group.title}. ${progressText}`}
    >
      <span className="husk-list-card__icon" aria-hidden="true">
        <Icon size={26} strokeWidth={2.25} />
      </span>
      <span className="husk-list-card__copy">
        <span className="husk-list-card__title">{group.title}</span>
        <span className="husk-list-card__progress-text">{progressText}</span>
        <span className="husk-list-card__progress" aria-hidden="true">
          <span className="husk-list-card__progress-fill" style={{ width: `${progressPercent}%` }} />
        </span>
      </span>
      <ListCardAvatars members={members} />
      <ChevronRight className="husk-list-card__chevron" aria-hidden="true" size={22} strokeWidth={2.4} />
    </Link>
  );
}

function HuskLists({ query }: { query: string }) {
  const normalizedQuery = normalizeSearch(query);
  const activeListGroups = huskMockData.listGroups.filter((group) => !group.archived);
  const listGroups = activeListGroups.filter((group) => {
    if (!normalizedQuery) {
      return true;
    }

    const memberNames = group.memberIds
      .map((memberId) => huskMockData.familyMembers.find((member) => member.id === memberId)?.name ?? "")
      .filter(Boolean);

    return [group.title, `${group.completedCount} av ${group.totalCount} fullført`, ...memberNames].some((value) =>
      value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
    );
  });

  return (
    <section className="husk-panel" id="husk-panel-lister" role="tabpanel" aria-labelledby="husk-tab-lister husk-lists-title">
      <div className="husk-reminder-group__heading">
        <h2 className="husk-reminder-group__title" id="husk-lists-title">Aktive lister</h2>
        <span className="husk-reminder-group__count" aria-label={`${activeListGroups.length} aktive lister`}>
          {activeListGroups.length}
        </span>
      </div>
      <div className="husk-card-list">
        {listGroups.map((group) => (
          <HuskListCard key={group.id} group={group} />
        ))}
      </div>
    </section>
  );
}

function HuskSchoolWeek() {
  const todayWeekStart = useMemo(() => getIsoWeekStart(new Date()), []);
  const [selectedWeekStartTime, setSelectedWeekStartTime] = useState(() => todayWeekStart.getTime());
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

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

  const selectedWeekStart = useMemo(() => new Date(selectedWeekStartTime), [selectedWeekStartTime]);
  const schoolChildren = schoolChildIds
    .map((childId) => huskMockData.familyMembers.find((member) => member.id === childId))
    .filter((member): member is HuskFamilyMember => Boolean(member));
  const selectedChild = schoolChildren[selectedChildIndex] ?? schoolChildren[0];
  const selectedPlan = huskMockData.schoolWeek.find((plan) => plan.childId === selectedChild?.id);
  const selectedWeek = weekOptions.find((week) => week.startTime === selectedWeekStartTime);

  function showPreviousChild() {
    setSelectedChildIndex((currentIndex) => (currentIndex - 1 + schoolChildren.length) % schoolChildren.length);
  }

  function showNextChild() {
    setSelectedChildIndex((currentIndex) => (currentIndex + 1) % schoolChildren.length);
  }

  return (
    <section className="husk-panel husk-school" id="husk-panel-skoleuka" role="tabpanel" aria-labelledby="husk-tab-skoleuka husk-school-title">
      <div className="husk-school__topline">
        <div className="husk-section-heading">
          <p className="husk-section-heading__eyebrow">Skoleplan</p>
          <h2 className="husk-section-heading__title" id="husk-school-title">Skoleuka</h2>
        </div>
        <button className="husk-school__edit-button" type="button">Rediger</button>
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
          <button className="husk-school-child__button" type="button" onClick={showPreviousChild} aria-label="Vis forrige barn">
            <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.5} />
          </button>
          <div className="husk-school-child__identity">
            <span className={`husk-avatar husk-avatar--${selectedChild.tone}`} aria-hidden="true">{selectedChild.initials}</span>
            <span className="husk-school-child__copy">
              <strong>{selectedChild.name}</strong>
              <span>{selectedChildIndex + 1} av {schoolChildren.length}</span>
            </span>
          </div>
          <button className="husk-school-child__button" type="button" onClick={showNextChild} aria-label="Vis neste barn">
            <ChevronRight aria-hidden="true" size={22} strokeWidth={2.5} />
          </button>
        </div>
      ) : null}

      <div className="husk-school-week" aria-label={`${selectedWeek?.label ?? "Valgt uke"} for ${selectedChild?.name ?? "valgt barn"}`}>
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
              </header>
              <div className="husk-school-day__items">
                {items.length > 0 ? (
                  items.map((item) => {
                    const Icon = reminderIcons[item.icon];

                    return (
                      <div className={`husk-school-item husk-school-item--${item.tone}`} key={item.id}>
                        <span className="husk-school-item__icon" aria-hidden="true">
                          <Icon size={20} strokeWidth={2.35} />
                        </span>
                        <span>{item.title}</span>
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
    </section>
  );
}


export default function HuskPage() {
  const familyAccess = useFamilyAccess();
  const [selectedTab, setSelectedTab] = useState<HuskTab>("husk");
  const [query, setQuery] = useState("");
  const title = useMemo(() => titleByTab[selectedTab], [selectedTab]);

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Husk">
        <PageContainer>
          <Card tone="default">
            <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
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
          {selectedTab !== "skoleuka" ? <HuskToolbar query={query} selectedTab={selectedTab} onQueryChange={setQuery} /> : null}
          {selectedTab === "husk" ? <HuskReminders query={query} /> : null}
          {selectedTab === "lister" ? <HuskLists query={query} /> : null}
          {selectedTab === "skoleuka" ? <HuskSchoolWeek /> : null}
        </div>
      </PageContainer>
    </AppShell>
  );
}
