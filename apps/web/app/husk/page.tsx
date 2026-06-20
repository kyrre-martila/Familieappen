"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer } from "../../components/ui";
import { HuskFilterSheet } from "../../features/husk/components/HuskFilterSheet";
import { HuskRemindersSection } from "../../features/husk/components/HuskRemindersSection";
import { OppgaverSection } from "../../features/husk/components/OppgaverSection";
import { HuskTabs } from "../../features/husk/components/HuskTabs";
import { HuskToolbar } from "../../features/husk/components/HuskToolbar";
import { SchoolWeekPanel } from "../../features/husk/components/SchoolWeekPanel";
import {
  defaultHuskFilters,
  titleByTab,
} from "../../features/husk/components/huskConfig";
import type { HuskFilters, HuskTab } from "../../features/husk/types";

const huskTabStorageKey = "familieappen:husk:selected-tab";
const huskQueryStorageKey = "familieappen:husk:query";
const huskFiltersStorageKey = "familieappen:husk:filters";
const taskFiltersStorageKey = "familieappen:husk:task-filters";
const huskScrollStorageKey = "familieappen:husk:scroll-y";

function isHuskTab(value: string | null): value is HuskTab | "husk" | "reminders" | "tasks" | "school" {
  return (
    value === "paminnelser" ||
    value === "oppgaver" ||
    value === "skoleuka" ||
    value === "husk" ||
    value === "reminders" ||
    value === "tasks" ||
    value === "school"
  );
}

function readStoredHuskTab() {
  if (typeof window === "undefined") {
    return "paminnelser";
  }

  const storedTab = window.sessionStorage.getItem(huskTabStorageKey);
  return isHuskTab(storedTab) ? normalizeHuskTab(storedTab) : "paminnelser";
}

function normalizeHuskTab(tab: HuskTab | "husk" | "reminders" | "tasks" | "school"): HuskTab {
  if (tab === "husk" || tab === "reminders") return "paminnelser";
  if (tab === "tasks") return "oppgaver";
  if (tab === "school") return "skoleuka";
  return tab;
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

function normalizeStoredHuskFilters(filters: HuskFilters): HuskFilters {
  return filters.person === "all" ? { ...filters, person: "family" } : filters;
}

function getHuskActiveFilterCount(filters: HuskFilters) {
  return (
    Number(filters.person !== defaultHuskFilters.person) +
    Number(filters.showPrevious !== defaultHuskFilters.showPrevious)
  );
}

function HuskPageContent() {
  const familyAccess = useFamilyAccess();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const shouldOpenSchoolPlanner =
    requestedTab === "skoleuka" && searchParams.get("edit") === "1";
  const schoolDetailDate = searchParams.get("date");
  const detailId = searchParams.get("detailId");
  const schoolDetailItemId = searchParams.get("schoolItemId") ?? detailId;
  const [selectedTab, setSelectedTab] = useState<HuskTab>(() =>
    isHuskTab(requestedTab)
      ? normalizeHuskTab(requestedTab)
      : readStoredHuskTab(),
  );
  const [huskQuery, setHuskQuery] = useState(() =>
    readStoredValue(huskQueryStorageKey),
  );
  const [huskFilters, setHuskFilters] = useState<HuskFilters>(() =>
    normalizeStoredHuskFilters(
      readStoredJson(huskFiltersStorageKey, defaultHuskFilters),
    ),
  );
  const [taskFilters, setTaskFilters] = useState<HuskFilters>(() =>
    normalizeStoredHuskFilters(
      readStoredJson(taskFiltersStorageKey, defaultHuskFilters),
    ),
  );
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [taskCreateRequest, setTaskCreateRequest] = useState(0);
  const title = useMemo(() => titleByTab[selectedTab], [selectedTab]);
  const activeFilters = selectedTab === "oppgaver" ? taskFilters : huskFilters;
  const activeFilterCount = getHuskActiveFilterCount(activeFilters);

  useEffect(() => {
    if (isHuskTab(requestedTab)) {
      setSelectedTab(normalizeHuskTab(requestedTab));
    }
  }, [requestedTab]);

  useEffect(() => {
    window.sessionStorage.setItem(huskTabStorageKey, selectedTab);
  }, [selectedTab]);

  useEffect(() => {
    window.sessionStorage.setItem(huskQueryStorageKey, huskQuery);
  }, [huskQuery]);

  useEffect(() => {
    window.sessionStorage.setItem(
      huskFiltersStorageKey,
      JSON.stringify(huskFilters),
    );
  }, [huskFilters]);

  useEffect(() => {
    window.sessionStorage.setItem(
      taskFiltersStorageKey,
      JSON.stringify(taskFilters),
    );
  }, [taskFilters]);

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
    <AppShell title={title} mobileTitle="Husk">
      <PageContainer>
        <div className="husk-page">
          <HuskTabs selectedTab={selectedTab} onSelectTab={setSelectedTab} />
          {selectedTab !== "skoleuka" ? (
            <HuskToolbar
              activeFilterCount={activeFilterCount}
              onOpenFilters={() => setIsFilterSheetOpen(true)}
              query={huskQuery}
              selectedTab={selectedTab}
              onQueryChange={setHuskQuery}
              onNewTask={() => setTaskCreateRequest((request) => request + 1)}
            />
          ) : null}
          {selectedTab === "paminnelser" ? (
            <HuskRemindersSection
              detailId={detailId}
              filters={huskFilters}
              query={huskQuery}
            />
          ) : null}
          {selectedTab === "oppgaver" ? (
            <OppgaverSection
              detailId={detailId}
              query={huskQuery}
              createRequest={taskCreateRequest}
              filters={taskFilters}
            />
          ) : null}
          {selectedTab === "skoleuka" ? (
            <SchoolWeekPanel
              detailDate={schoolDetailDate}
              detailItemId={schoolDetailItemId}
              shouldOpenPlanner={shouldOpenSchoolPlanner}
            />
          ) : null}
        </div>
      </PageContainer>
      {selectedTab === "paminnelser" ? (
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
          title="Filter for Påminnelser"
          toggleChecked={huskFilters.showPrevious}
          toggleLabel="Vis tidligere"
        />
      ) : null}
      {selectedTab === "oppgaver" ? (
        <HuskFilterSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          onPersonChange={(person) =>
            setTaskFilters((current) => ({ ...current, person }))
          }
          onReset={() => setTaskFilters(defaultHuskFilters)}
          person={taskFilters.person}
          status="Velg hvem oppgavene er tildelt."
          title="Filter for Oppgaver"
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
