"use client";

import { useState } from "react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer } from "../../components/ui";
import { HuskFilterSheet } from "../../features/husk/components/HuskFilterSheet";
import { HuskListsSection } from "../../features/husk/components/HuskListsSection";
import { HuskToolbar } from "../../features/husk/components/HuskToolbar";
import { defaultListFilters } from "../../features/husk/components/huskConfig";
import type { ListFilters } from "../../features/husk/types";

export default function ListerPage() {
  const familyAccess = useFamilyAccess();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ListFilters>(defaultListFilters);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const activeFilterCount = Number(filters.person !== defaultListFilters.person) + Number(filters.showArchived !== defaultListFilters.showArchived);

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Lister">
        <PageContainer>
          <Card tone="default">
            <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell title="Lister">
      <PageContainer>
        <div className="husk-page">
          <Card tone="default">
            <EmptyState
              title="Lister"
              description="Samle pakkelister, ferieplaner, bursdag, oppussing og andre sjekklister på ett sted. Handleliste ligger i egen modul."
            />
          </Card>
          <HuskToolbar activeFilterCount={activeFilterCount} onOpenFilters={() => setIsFilterSheetOpen(true)} query={query} selectedTab="paminnelser" searchLabelOverride="Søk i lister" onQueryChange={setQuery} />
          <HuskListsSection filters={filters} query={query} />
        </div>
      </PageContainer>
      <HuskFilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        onPersonChange={(person) => setFilters((current) => ({ ...current, person }))}
        onReset={() => setFilters(defaultListFilters)}
        onToggleChange={(showArchived) => setFilters((current) => ({ ...current, showArchived }))}
        person={filters.person}
        status="Velg person og om arkiverte lister skal vises."
        title="Filter for Lister"
        toggleChecked={filters.showArchived}
        toggleLabel="Vis arkiverte lister"
      />
    </AppShell>
  );
}
