"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer } from "../../components/ui";
import { HuskFilterSheet } from "../../features/husk/components/HuskFilterSheet";
import { HuskListsSection } from "../../features/husk/components/HuskListsSection";
import { HuskRemindersSection } from "../../features/husk/components/HuskRemindersSection";
import { HuskTabs } from "../../features/husk/components/HuskTabs";
import { HuskToolbar } from "../../features/husk/components/HuskToolbar";
import { SchoolWeekPanel } from "../../features/husk/components/SchoolWeekPanel";
import {
  defaultHuskFilters,
  defaultListFilters,
  titleByTab,
} from "../../features/husk/components/huskConfig";
import type {
  HuskFilters,
  HuskTab,
  ListFilters,
} from "../../features/husk/types";

const huskTabStorageKey = "familieappen:husk:selected-tab";
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
            <HuskRemindersSection filters={huskFilters} query={huskQuery} />
          ) : null}
          {selectedTab === "lister" ? (
            <HuskListsSection filters={listFilters} query={listQuery} />
          ) : null}
          {selectedTab === "skoleuka" ? (
            <SchoolWeekPanel shouldOpenPlanner={shouldOpenSchoolPlanner} />
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
