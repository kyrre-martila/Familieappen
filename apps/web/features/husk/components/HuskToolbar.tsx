import Link from "next/link";
import { BellPlus, ListTodo, SlidersHorizontal } from "lucide-react";

import type { HuskTab } from "../types";
import { titleByTab } from "./huskConfig";
import { HuskSearch } from "./HuskSearch";

export function HuskToolbar({
  activeFilterCount,
  onOpenFilters,
  onQueryChange,
  query,
  selectedTab,
  onNewTask,
  searchLabelOverride,
}: {
  activeFilterCount: number;
  onOpenFilters: () => void;
  onQueryChange: (query: string) => void;
  query: string;
  selectedTab: HuskTab;
  onNewTask?: () => void;
  searchLabelOverride?: string;
}) {
  const searchLabel = searchLabelOverride ?? (selectedTab === "oppgaver" ? "Søk i oppgaver" : "Søk i påminnelser");
  const filterLabel =
    activeFilterCount > 0
      ? `Åpne filtre for ${titleByTab[selectedTab]}. ${activeFilterCount} aktive filter`
      : `Åpne filtre for ${titleByTab[selectedTab]}`;

  const NewIcon = selectedTab === "oppgaver" ? ListTodo : BellPlus;
  const newHref = selectedTab === "oppgaver" ? undefined : "/husk/reminders/new";
  const newLabel = selectedTab === "oppgaver" ? "Ny oppgave" : "Ny påminnelse";

  const newButton = newHref ? (
    <Link className="calendar-title-action husk-new-button" href={newHref} aria-label={newLabel}>
      <NewIcon aria-hidden="true" size={18} strokeWidth={2.4} />
      <span>Ny</span>
    </Link>
  ) : (
    <button className="calendar-title-action husk-new-button" type="button" onClick={onNewTask} aria-label={newLabel}>
      <NewIcon aria-hidden="true" size={18} strokeWidth={2.4} />
      <span>Ny</span>
    </button>
  );

  return (
    <div className="husk-toolbar" aria-label="Søk og filtrer">
      <HuskSearch
        onQueryChange={onQueryChange}
        query={query}
        searchLabel={searchLabel}
      />
      <div className="husk-toolbar__actions">
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
      {newButton}
      </div>
    </div>
  );
}
