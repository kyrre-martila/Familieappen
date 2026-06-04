"use client";

import { FamilyMembersEmptyState, FamilyMembersErrorState, FamilyMembersLoadingState } from "../../family/FamilyMembersEmptyState";
import { useLists } from "../hooks/useLists";
import type { HuskListGroup, ListFilters } from "../types";
import { matchesPersonFilter, normalizeSearch } from "./huskUtils";
import { HuskListCard } from "./HuskListCard";
import { HuskListsEmptyState } from "./HuskListsEmptyState";
import { SectionHeader } from "./shared/SectionHeader";

export function HuskListsSection({
  filters,
  query,
}: {
  filters: ListFilters;
  query: string;
}) {
  const { familyMembers, lists, loading, error, refresh } = useLists();
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

  if (loading) {
    return (
      <section className="husk-panel" id="husk-panel-lister" role="tabpanel" aria-labelledby="husk-tab-lister husk-lists-title">
        <FamilyMembersLoadingState />
      </section>
    );
  }

  if (error) {
    return (
      <section className="husk-panel" id="husk-panel-lister" role="tabpanel" aria-labelledby="husk-tab-lister husk-lists-title">
        <FamilyMembersErrorState onRetry={() => void refresh()} />
      </section>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <section className="husk-panel" id="husk-panel-lister" role="tabpanel" aria-labelledby="husk-tab-lister husk-lists-title">
        <FamilyMembersEmptyState />
      </section>
    );
  }

  return (
    <section
      className="husk-panel"
      id="husk-panel-lister"
      role="tabpanel"
      aria-labelledby="husk-tab-lister husk-lists-title"
    >
      <SectionHeader
        count={activeListGroups.length}
        countLabel={`${activeListGroups.length} aktive lister`}
        id="husk-lists-title"
        title="Aktive lister"
      />
      {activeListGroups.length > 0 ? (
        <div className="husk-card-list">
          {activeListGroups.map((group) => (
            <HuskListCard
              familyMembers={familyMembers}
              key={group.id}
              group={group}
            />
          ))}
        </div>
      ) : (
        <HuskListsEmptyState
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
          <SectionHeader
            count={archivedLists.length}
            countClassName="husk-reminder-group__count--later"
            countLabel={`${archivedLists.length} arkiverte lister`}
            id="husk-archived-lists-title"
            title="Arkiverte lister"
          />
          <div className="husk-card-list">
            {archivedLists.map((group) => (
              <HuskListCard
                familyMembers={familyMembers}
                key={group.id}
                group={group}
                isArchived
              />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
