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
