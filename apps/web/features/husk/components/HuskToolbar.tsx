import { SlidersHorizontal } from "lucide-react";

import type { HuskTab } from "../types";
import { titleByTab } from "./huskConfig";
import { HuskSearch } from "./HuskSearch";

export function HuskToolbar({
  activeFilterCount,
  onOpenFilters,
  onQueryChange,
  query,
  selectedTab,
  searchLabelOverride,
}: {
  activeFilterCount: number;
  onOpenFilters: () => void;
  onQueryChange: (query: string) => void;
  query: string;
  selectedTab: HuskTab;
  searchLabelOverride?: string;
}) {
  const searchLabel = searchLabelOverride ?? (selectedTab === "oppgaver" ? "Søk i oppgaver" : "Søk i påminnelser");
  const filterLabel =
    activeFilterCount > 0
      ? `Åpne filtre for ${titleByTab[selectedTab]}. ${activeFilterCount} aktive filter`
      : `Åpne filtre for ${titleByTab[selectedTab]}`;

  return (
    <div className="husk-toolbar" aria-label="Søk og filtrer">
      <HuskSearch
        onQueryChange={onQueryChange}
        query={query}
        searchLabel={searchLabel}
      />
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
