"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Gift,
  MoreHorizontal,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { LockedFeatureState } from "../../../../components/PendingAccess";
import { Button, Card, EmptyState, PageContainer } from "../../../../components/ui";
import { useFamilyAccess } from "../../../../components/ProtectedFamilyRoute";
import type {
  HuskFamilyMember,
  HuskListDetail,
  HuskListDetailItem,
  HuskListSection,
} from "../../mockHuskData";
import { useLists } from "../../../../features/husk/hooks/useLists";

const sectionLabels = {
  active: "Pågår",
  completed: "Fullført",
} satisfies Record<HuskListSection, string>;

function getMembers(memberIds: string[], members: HuskFamilyMember[]) {
  return memberIds
    .map((memberId) => members.find((member) => member.id === memberId))
    .filter((member): member is HuskFamilyMember => Boolean(member));
}

function StackedAvatars({
  members,
  maxVisible = 3,
}: {
  members: HuskFamilyMember[];
  maxVisible?: number;
}) {
  const visibleMembers = members.slice(0, maxVisible);
  const hiddenCount = Math.max(members.length - visibleMembers.length, 0);

  return (
    <span
      className="list-detail-avatars"
      aria-label={members.map((member) => member.name).join(", ")}
    >
      {visibleMembers.map((member) => (
        <span
          className={`list-detail-avatar list-detail-avatar--${member.tone}`}
          key={member.id}
          aria-hidden="true"
        >
          {member.initials}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="list-detail-avatar-count" aria-hidden="true">
          +{hiddenCount}
        </span>
      ) : null}
    </span>
  );
}

function AssignedAvatars({ members }: { members: HuskFamilyMember[] }) {
  if (members.length === 0) {
    return (
      <span className="list-detail-row__empty-assignee" aria-hidden="true" />
    );
  }

  return <StackedAvatars members={members} maxVisible={3} />;
}

function ListStatusIcon({ completed }: { completed: boolean }) {
  return (
    <span
      className={`list-detail-status${completed ? " list-detail-status--done" : ""}`}
      aria-hidden="true"
    >
      {completed ? <Check size={22} strokeWidth={3} /> : null}
    </span>
  );
}

function ListItemRow({
  item,
  list,
  isExpanded,
  onToggleCompletion,
  onToggleExpansion,
  onTitleChange,
  onDescriptionChange,
  onDelete,
  isRecentlyCompleted,
}: {
  item: HuskListDetailItem;
  list: HuskListDetail;
  isExpanded: boolean;
  onToggleCompletion: () => void;
  onToggleExpansion: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onDelete: () => void;
  isRecentlyCompleted?: boolean;
}) {
  const assignedMembers = getMembers(
    item.assignedMemberIds,
    list.familyMembers,
  );
  const primaryAssignee = assignedMembers[0] ?? null;

  if (isExpanded) {
    return (
      <article
        className={`list-detail-item list-detail-item--expanded${isRecentlyCompleted ? " list-detail-item--just-completed" : ""}`}
      >
        <button
          className="list-detail-item__status-button"
          type="button"
          onClick={onToggleCompletion}
          aria-label={
            item.completed
              ? `Marker ${item.title} som ikke fullført`
              : `Marker ${item.title} som fullført`
          }
          aria-pressed={item.completed}
        >
          <ListStatusIcon completed={item.completed} />
        </button>
        <div
          className="list-detail-editor"
          aria-label={`Rediger punkt: ${item.title}`}
        >
          <div className="list-detail-editor__topline">
            <input
              className="list-detail-editor__title"
              aria-label="Tittel"
              value={item.title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Punktets tittel"
            />
            <button
              className="list-detail-editor__collapse"
              type="button"
              onClick={onToggleExpansion}
              aria-label="Lukk redigering"
            >
              <ChevronUp size={23} strokeWidth={2.5} />
            </button>
          </div>
          <label className="list-detail-field">
            <span>Beskrivelse</span>
            <textarea
              aria-label="Beskrivelse"
              value={item.description ?? ""}
              onChange={(event) => onDescriptionChange(event.target.value)}
              rows={2}
            />
          </label>
          <label className="list-detail-field">
            <span>Ansvarlig</span>
            <span className="list-detail-select-like">
              {primaryAssignee ? (
                <span
                  className={`list-detail-avatar list-detail-avatar--${primaryAssignee.tone}`}
                  aria-hidden="true"
                >
                  {primaryAssignee.initials}
                </span>
              ) : null}
              <strong>{primaryAssignee?.name ?? "Ikke valgt"}</strong>
              <ChevronDown
                className="list-detail-select-like__chevron"
                aria-hidden="true"
                size={21}
                strokeWidth={2.5}
              />
            </span>
          </label>
          <label className="list-detail-field">
            <span>Frist</span>
            <span className="list-detail-date-like">
              <CalendarDays aria-hidden="true" size={22} strokeWidth={2.35} />
              <strong>{item.dueLabel ?? "Ingen frist"}</strong>
              <X
                className="list-detail-date-like__clear"
                aria-hidden="true"
                size={20}
                strokeWidth={2.4}
              />
            </span>
          </label>
          <button
            className="list-detail-delete"
            type="button"
            onClick={onDelete}
          >
            Slett punkt
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`list-detail-row${item.completed ? " list-detail-row--completed" : ""}${isRecentlyCompleted ? " list-detail-row--just-completed" : ""}`}
    >
      <button
        className="list-detail-row__status-button"
        type="button"
        onClick={onToggleCompletion}
        aria-label={
          item.completed
            ? `Marker ${item.title} som ikke fullført`
            : `Marker ${item.title} som fullført`
        }
        aria-pressed={item.completed}
      >
        <ListStatusIcon completed={item.completed} />
      </button>
      <button
        className="list-detail-row__expand-button"
        type="button"
        onClick={onToggleExpansion}
        aria-expanded={false}
      >
        <span className="list-detail-row__title">{item.title}</span>
        <AssignedAvatars members={assignedMembers} />
        <ChevronDown
          className="list-detail-row__handle"
          aria-hidden="true"
          size={22}
          strokeWidth={2.4}
        />
      </button>
    </article>
  );
}

function getDetailStorageKey(listId: string, suffix: string) {
  return `familieappen:husk:list-detail:${listId}:${suffix}`;
}

function readStoredDetailValue(storageKey: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.sessionStorage.getItem(storageKey) ?? fallback;
}

export function HuskListDetailClient({ list }: { list: HuskListDetail }) {
  const router = useRouter();
  const familyAccess = useFamilyAccess();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [selectedSection, setSelectedSection] = useState<HuskListSection>(
    () =>
      readStoredDetailValue(
        getDetailStorageKey(list.id, "section"),
        "active",
      ) as HuskListSection,
  );
  const [expandedItemId, setExpandedItemId] = useState<string>(() =>
    readStoredDetailValue(
      getDetailStorageKey(list.id, "expanded"),
      "kirke-bekreftet",
    ),
  );
  const {
    familyMembers,
    loading,
    error,
    refresh,
    listDetails,
    listItems,
    createListItem,
    updateListItem,
    deleteListItem,
    completeListItem,
    uncompleteListItem,
  } = useLists(list);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const [undoItemId, setUndoItemId] = useState<string | null>(null);
  const [recentlyCompletedItemId, setRecentlyCompletedItemId] = useState<
    string | null
  >(null);
  const backendList = listDetails.find((candidate) => candidate.id === list.id);
  const activeList = { ...(backendList ?? list), familyMembers };
  const hasLoadedMissingList = !loading && !backendList;
  const sectionItems = listItems.filter((item) =>
    selectedSection === "completed" ? item.completed : !item.completed,
  );
  const completedCount = listItems.filter((item) => item.completed).length;
  const activeCount = listItems.length - completedCount;
  const totalCount = listItems.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    window.sessionStorage.setItem(
      getDetailStorageKey(list.id, "section"),
      selectedSection,
    );
  }, [list.id, selectedSection]);

  useEffect(() => {
    window.sessionStorage.setItem(
      getDetailStorageKey(list.id, "expanded"),
      expandedItemId,
    );
  }, [expandedItemId, list.id]);

  useEffect(() => {
    if (expandedItemId && !listItems.some((item) => item.id === expandedItemId)) {
      setExpandedItemId("");
    }
  }, [expandedItemId, listItems]);

  useEffect(() => {
    if (selectedSection === "completed" && completedCount === 0) {
      setSelectedSection("active");
    }
  }, [completedCount, selectedSection]);

  useEffect(() => {
    if (!showSavedBadge) {
      return;
    }

    const timeout = window.setTimeout(() => setShowSavedBadge(false), 1300);
    return () => window.clearTimeout(timeout);
  }, [showSavedBadge]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      return;
    }

    const storedScrollTop = Number(
      window.sessionStorage.getItem(getDetailStorageKey(list.id, "scroll")),
    );
    if (Number.isFinite(storedScrollTop) && storedScrollTop > 0) {
      window.requestAnimationFrame(() => {
        scrollElement.scrollTop = storedScrollTop;
      });
    }

    return () => {
      window.sessionStorage.setItem(
        getDetailStorageKey(list.id, "scroll"),
        String(scrollElement.scrollTop),
      );
    };
  }, [list.id]);

  function showSaved() {
    setShowSavedBadge(true);
  }

  function updateMockItem(
    itemId: string,
    update: Partial<Pick<HuskListDetailItem, "title" | "description">>,
  ) {
    updateListItem(itemId, update);
    showSaved();
  }

  function toggleMockCompletion(itemId: string) {
    const currentItem = listItems.find((item) => item.id === itemId);
    if (!currentItem) {
      return;
    }

    const nextCompleted = !currentItem.completed;
    if (nextCompleted) {
      completeListItem(itemId);
    } else {
      uncompleteListItem(itemId);
    }
    setExpandedItemId((currentId) => (currentId === itemId ? "" : currentId));
    setSelectedSection(nextCompleted ? "completed" : "active");
    setUndoItemId(nextCompleted ? itemId : null);
    setRecentlyCompletedItemId(nextCompleted ? itemId : null);
    window.setTimeout(() => setRecentlyCompletedItemId(null), 900);
  }

  function undoCompletion() {
    if (!undoItemId) {
      return;
    }

    uncompleteListItem(undoItemId);
    setSelectedSection("active");
    setUndoItemId(null);
    setRecentlyCompletedItemId(null);
  }

  function deleteMockItem(itemId: string) {
    deleteListItem(itemId);
    setExpandedItemId("");
    showSaved();
  }

  function addMockItem() {
    const nextItem: HuskListDetailItem = {
      id: `mock-item-${Date.now()}`,
      title: "Nytt punkt",
      completed: false,
      assignedMemberIds: [],
      description: "",
    };

    setSelectedSection("active");
    createListItem(nextItem);
    setExpandedItemId(nextItem.id);
    showSaved();
  }

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved" || loading) {
    return (
      <main className="list-detail list-detail--state" aria-live="polite">
        <PageContainer>
          <Card tone="default">
            <EmptyState title={loading ? "Henter liste" : "Sjekker familietilgang"} description="Et lite øyeblikk." />
          </Card>
        </PageContainer>
      </main>
    );
  }

  if (hasLoadedMissingList) {
    return (
      <main className="list-detail list-detail--state" aria-live="polite">
        <PageContainer>
          <Card tone="default">
            <EmptyState title={error ?? "Kunne ikke hente listen akkurat nå"} description="Prøv igjen, eller gå tilbake til Lister." />
            <Button onClick={() => void refresh()} variant="primary">Prøv igjen</Button>
          </Card>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="list-detail" aria-labelledby="list-detail-title">
      <div className="list-detail__topbar" aria-label="Listenavigasjon">
        <button
          className="list-detail__icon-button"
          type="button"
          onClick={() => router.back()}
          aria-label="Gå tilbake til Lister"
        >
          <ChevronLeft aria-hidden="true" size={30} strokeWidth={2.8} />
        </button>
        <Link
          className="list-detail__icon-button"
          href={`/husk/lister/${activeList.id}/edit`}
          aria-label="Rediger liste"
        >
          <MoreHorizontal aria-hidden="true" size={30} strokeWidth={2.8} />
        </Link>
      </div>

      <div className="list-detail__scroll" ref={scrollRef}>
        <header className="list-detail__hero">
          <span className="list-detail__list-icon" aria-hidden="true">
            <Gift size={48} strokeWidth={2.15} />
          </span>
          <div className="list-detail__headline">
            <div className="list-detail__title-row">
              <h1 className="list-detail__title" id="list-detail-title">
                {activeList.title}
              </h1>
              {showSavedBadge ? (
                <span className="list-detail__saved-badge" aria-live="polite">
                  <Check aria-hidden="true" size={17} strokeWidth={3} />
                  Punkt lagret
                </span>
              ) : null}
            </div>
            <p className="list-detail__scope">
              <Users aria-hidden="true" size={18} strokeWidth={2.4} />
              {activeList.scopeText}
            </p>
            <div className="list-detail__progress-row">
              <div className="list-detail__progress-copy">
                <p>
                  {completedCount} av {totalCount} fullført
                </p>
                <span className="list-detail__progress" aria-hidden="true">
                  <span
                    className="list-detail__progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </span>
              </div>
              <StackedAvatars members={activeList.familyMembers} maxVisible={3} />
            </div>
          </div>
        </header>

        <div
          className="list-detail-tabs"
          role="tablist"
          aria-label="Listepunkter"
        >
          {(["active", "completed"] as const).map((section) => {
            const isSelected = selectedSection === section;
            const count = section === "active" ? activeCount : completedCount;

            return (
              <button
                aria-selected={isSelected}
                className={`list-detail-tabs__button${isSelected ? " list-detail-tabs__button--selected" : ""}`}
                key={section}
                onClick={() => setSelectedSection(section)}
                role="tab"
                type="button"
              >
                {sectionLabels[section]}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <section
          className="list-detail-items"
          aria-label={sectionLabels[selectedSection]}
        >
          {sectionItems.map((item) => (
            <ListItemRow
              item={item}
              key={item.id}
              list={activeList}
              isExpanded={expandedItemId === item.id}
              onToggleCompletion={() => toggleMockCompletion(item.id)}
              onToggleExpansion={() =>
                setExpandedItemId((currentId) =>
                  currentId === item.id ? "" : item.id,
                )
              }
              onTitleChange={(title) => updateMockItem(item.id, { title })}
              onDescriptionChange={(description) =>
                updateMockItem(item.id, { description })
              }
              onDelete={() => deleteMockItem(item.id)}
              isRecentlyCompleted={recentlyCompletedItemId === item.id}
            />
          ))}
        </section>
      </div>

      {undoItemId ? (
        <div className="list-detail-undo" role="status" aria-live="polite">
          <span>Punkt fullført</span>
          <button type="button" onClick={undoCompletion}>
            Angre
          </button>
        </div>
      ) : null}

      <div className="list-detail__sticky-action">
        <button
          className="list-detail__add-button"
          type="button"
          onClick={addMockItem}
        >
          <Plus aria-hidden="true" size={21} strokeWidth={2.5} />
          Legg til punkt
        </button>
      </div>
    </main>
  );
}
