"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  ClipboardList,
  GraduationCap,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer } from "../../components/ui";
import { huskMockData, type HuskTab } from "./mockHuskData";

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

function HuskToolbar({ query, onQueryChange }: { query: string; onQueryChange: (query: string) => void }) {
  return (
    <div className="husk-toolbar" aria-label="Søk og filtrer">
      <label className="husk-search">
        <Search aria-hidden="true" size={20} strokeWidth={2.4} />
        <span className="sr-only">Søk i Husk</span>
        <input
          className="husk-search__input"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Søk i husk, lister og skoleuka"
          type="search"
          value={query}
        />
      </label>
      <button className="husk-filter-button" type="button" aria-label="Åpne filtre for Husk">
        <SlidersHorizontal aria-hidden="true" size={20} strokeWidth={2.4} />
        <span>Filter</span>
      </button>
    </div>
  );
}

function HuskReminders({ query }: { query: string }) {
  const normalizedQuery = normalizeSearch(query);
  const reminders = huskMockData.reminders.filter((reminder) => {
    if (!normalizedQuery) {
      return true;
    }

    return [reminder.title, reminder.note, reminder.dueLabel, reminder.audience].some((value) =>
      value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
    );
  });

  return (
    <section className="husk-panel" id="husk-panel-husk" role="tabpanel" aria-labelledby="husk-tab-husk husk-reminders-title">
      <div className="husk-section-heading">
        <p className="husk-section-heading__eyebrow">Passive påminnelser</p>
        <h2 className="husk-section-heading__title" id="husk-reminders-title">Kommende husk</h2>
      </div>
      <div className="husk-card-list">
        {reminders.map((reminder) => (
          <article className={`husk-reminder-card husk-reminder-card--${reminder.tone}`} key={reminder.id}>
            <span className="husk-reminder-card__icon" aria-hidden="true">
              <Bell size={21} strokeWidth={2.4} />
            </span>
            <span className="husk-reminder-card__content">
              <span className="husk-reminder-card__title">{reminder.title}</span>
              <span className="husk-reminder-card__note">{reminder.note}</span>
              <span className="husk-reminder-card__meta">{reminder.dueLabel} · {reminder.audience}</span>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function HuskLists({ query }: { query: string }) {
  const normalizedQuery = normalizeSearch(query);
  const listGroups = huskMockData.listGroups
    .filter((group) => !group.archived)
    .filter((group) => {
      if (!normalizedQuery) {
        return true;
      }

      return [group.title, group.description, group.owner, ...group.items.map((item) => item.label)].some((value) =>
        value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
      );
    });

  return (
    <section className="husk-panel" id="husk-panel-lister" role="tabpanel" aria-labelledby="husk-tab-lister husk-lists-title">
      <div className="husk-section-heading">
        <p className="husk-section-heading__eyebrow">Aktive lister</p>
        <h2 className="husk-section-heading__title" id="husk-lists-title">Listemaler og grupper</h2>
      </div>
      <div className="husk-card-list">
        {listGroups.map((group) => (
          <article className="husk-list-card" key={group.id}>
            <div className="husk-list-card__header">
              <span className="husk-list-card__icon" aria-hidden="true">
                <ClipboardList size={22} strokeWidth={2.4} />
              </span>
              <span className="husk-list-card__copy">
                <span className="husk-list-card__title">{group.title}</span>
                <span className="husk-list-card__description">{group.description}</span>
              </span>
              <span className="husk-list-card__count">{group.itemCount}</span>
            </div>
            <div className="husk-list-card__items" aria-label={`Eksempler fra ${group.title}`}>
              {group.items.slice(0, 3).map((item) => (
                <span className="husk-list-card__item" key={item.id}>
                  <span>{item.label}</span>
                  {item.meta ? <span className="husk-list-card__item-meta">{item.meta}</span> : null}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HuskSchoolWeek({ query }: { query: string }) {
  const normalizedQuery = normalizeSearch(query);
  const schoolDays = huskMockData.schoolWeek.filter((day) => {
    if (!normalizedQuery) {
      return true;
    }

    return [day.dayLabel, day.dateLabel, day.focus, day.notes, ...day.packing].some((value) =>
      value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
    );
  });

  return (
    <section className="husk-panel" id="husk-panel-skoleuka" role="tabpanel" aria-labelledby="husk-tab-skoleuka husk-school-title">
      <div className="husk-section-heading">
        <p className="husk-section-heading__eyebrow">Skoleplan</p>
        <h2 className="husk-section-heading__title" id="husk-school-title">Denne skoleuka</h2>
      </div>
      <div className="husk-school-week">
        {schoolDays.map((day) => (
          <article className="husk-school-day" key={day.id}>
            <div className="husk-school-day__date">
              <span>{day.dayLabel}</span>
              <strong>{day.dateLabel}</strong>
            </div>
            <div className="husk-school-day__content">
              <span className="husk-school-day__focus">
                <GraduationCap aria-hidden="true" size={20} strokeWidth={2.4} />
                {day.focus}
              </span>
              <div className="husk-school-day__chips" aria-label="Pakkeliste">
                {day.packing.map((item) => (
                  <span className="husk-school-day__chip" key={item}>{item}</span>
                ))}
              </div>
              <p className="husk-school-day__notes">{day.notes}</p>
            </div>
          </article>
        ))}
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
          <HuskToolbar query={query} onQueryChange={setQuery} />
          {selectedTab === "husk" ? <HuskReminders query={query} /> : null}
          {selectedTab === "lister" ? <HuskLists query={query} /> : null}
          {selectedTab === "skoleuka" ? <HuskSchoolWeek query={query} /> : null}
        </div>
      </PageContainer>
    </AppShell>
  );
}
