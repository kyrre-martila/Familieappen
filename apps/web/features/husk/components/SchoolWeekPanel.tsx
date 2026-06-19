"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  RotateCcw,
} from "lucide-react";

import { UserAvatar } from "../../../components/avatar/UserAvatar";
import { AppCard } from "../../../components/app-ui";
import {
  FamilyMembersErrorState,
  FamilyMembersLoadingState,
} from "../../family/FamilyMembersEmptyState";
import { useSchoolWeek } from "../hooks/useSchoolWeek";
import type {
  HuskFamilyMember,
  HuskSchoolWeekItem,
  SchoolCreateDraft,
} from "../types";
import { reminderIcons, schoolWeekdays } from "./huskConfig";
import {
  formatSchoolDate,
  formatWeekRange,
  getIsoWeekNumber,
  getIsoWeekStart,
} from "./huskUtils";
import { SavedBadge } from "./shared/SavedBadge";
import { SchoolWeekEmptyState } from "./SchoolWeekEmptyState";
import { SchoolWeekCreateSheet } from "./SchoolWeekCreateSheet";
import { SchoolWeekRecurringSheet } from "./SchoolWeekRecurringSheet";
import { SchoolWeekDetailSheet } from "./SchoolWeekDetailSheet";

const schoolChildStorageKey = "familieappen:husk:school-child-id";

function readStoredValue(storageKey: string, fallback = "") {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.sessionStorage.getItem(storageKey) ?? fallback;
}

export function SchoolWeekPanel({
  detailDate,
  detailItemId,
  shouldOpenPlanner,
}: {
  detailDate?: string | null;
  detailItemId?: string | null;
  shouldOpenPlanner: boolean;
}) {
  void shouldOpenPlanner;
  const todayWeekStart = useMemo(() => getIsoWeekStart(new Date()), []);
  const todayWeekStartTime = todayWeekStart.getTime();
  const [selectedWeekStartTime, setSelectedWeekStartTime] =
    useState(todayWeekStartTime);
  const [selectedChildId, setSelectedChildId] = useState(() =>
    readStoredValue(schoolChildStorageKey),
  );
  const [createDraft, setCreateDraft] = useState<SchoolCreateDraft | null>(
    null,
  );
  const [editDraft, setEditDraft] = useState<{
    item: HuskSchoolWeekItem;
    draft: SchoolCreateDraft;
  } | null>(null);
  const [pendingEditDraft, setPendingEditDraft] = useState<{
    item: HuskSchoolWeekItem;
    draft: SchoolCreateDraft;
  } | null>(null);
  const [recurringChoice, setRecurringChoice] = useState<{
    item: HuskSchoolWeekItem;
    action: "edit" | "delete";
  } | null>(null);
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<HuskSchoolWeekItem | null>(null);
  const [schoolFeedback, setSchoolFeedback] = useState<string | null>(null);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const selectedWeekStart = useMemo(
    () => new Date(selectedWeekStartTime),
    [selectedWeekStartTime],
  );
  const {
    children,
    weekItems,
    loading,
    error,
    refresh,
    createSchoolReminder,
    updateSchoolReminder,
    deleteSchoolReminder,
  } = useSchoolWeek(selectedWeekStart);
  const weekStripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedChildId) {
      window.sessionStorage.setItem(schoolChildStorageKey, selectedChildId);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (!showSavedBadge) {
      return;
    }

    const timeout = window.setTimeout(() => setShowSavedBadge(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [showSavedBadge]);

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

  const schoolChildren = children;
  const selectedChildIndex = Math.max(
    0,
    schoolChildren.findIndex((child) => child.id === selectedChildId),
  );
  const selectedChild =
    schoolChildren.find((child) => child.id === selectedChildId) ??
    schoolChildren[0];
  const selectedPlan = weekItems.find(
    (plan) => plan.childId === selectedChild?.id,
  );
  const hasSchoolItems = schoolWeekdays.some(
    (weekday) => (selectedPlan?.days[weekday.value] ?? []).length > 0,
  );
  useEffect(() => {
    if (!detailDate) return;
    const targetWeekStart = getIsoWeekStart(
      new Date(`${detailDate}T00:00:00.000Z`),
    );
    setSelectedWeekStartTime(targetWeekStart.getTime());
  }, [detailDate]);

  useEffect(() => {
    if (!detailDate && !detailItemId) return;
    for (const plan of weekItems) {
      for (const items of Object.values(plan.days)) {
        const match = items.find((item) => {
          const itemDate = item.occurrenceDate ?? item.date;
          return (
            (detailItemId ? item.id === detailItemId : true) &&
            (detailDate ? itemDate === detailDate : true)
          );
        });
        if (match) {
          setSelectedChildId(plan.childId);
          setDetailItem(match);
          return;
        }
      }
    }
  }, [detailDate, detailItemId, weekItems]);

  const selectedWeek = weekOptions.find(
    (week) => week.startTime === selectedWeekStartTime,
  );

  useEffect(() => {
    if (schoolChildren.length === 0) {
      return;
    }

    if (!schoolChildren.some((child) => child.id === selectedChildId)) {
      setSelectedChildId(schoolChildren[0].id);
    }
  }, [schoolChildren, selectedChildId]);

  function showPreviousChild() {
    const previousChild =
      schoolChildren[
        (selectedChildIndex - 1 + schoolChildren.length) % schoolChildren.length
      ];
    if (previousChild) {
      setSelectedChildId(previousChild.id);
    }
  }

  function showNextChild() {
    const nextChild =
      schoolChildren[(selectedChildIndex + 1) % schoolChildren.length];
    if (nextChild) {
      setSelectedChildId(nextChild.id);
    }
  }

  function handleWeekSelect(weekStartTime: number, button: HTMLButtonElement) {
    setSelectedWeekStartTime(weekStartTime);
    button.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  function showSaved() {
    setShowSavedBadge(true);
  }

  function openCreateSheet(
    weekday: (typeof schoolWeekdays)[number],
    date: Date,
  ) {
    setCreateDraft({
      weekday: weekday.value,
      dateLabel: `${weekday.label} ${formatSchoolDate(date)}`,
      title: "",
      note: "",
      icon: "shirt",
      recurring: false,
      endDate: "",
    });
  }

  async function saveCreateDraft() {
    if (!createDraft?.title.trim() || !selectedChild) {
      return;
    }

    const date = new Date(selectedWeekStart);
    const weekday = schoolWeekdays.find(
      (option) => option.value === createDraft.weekday,
    );
    date.setUTCDate(date.getUTCDate() + (weekday?.dayOffset ?? 0));

    try {
      await createSchoolReminder({
        childId: selectedChild.id,
        weekday: createDraft.weekday,
        date: date.toISOString().slice(0, 10),
        title: createDraft.title,
        note: createDraft.note,
        icon: createDraft.icon,
        isRecurring: createDraft.recurring,
        recurrenceEndDate: createDraft.recurring
          ? createDraft.endDate || null
          : null,
      });
      setCreateDraft(null);
      setSchoolFeedback(null);
      showSaved();
    } catch {
      setSchoolFeedback("Skolehusk ble ikke lagret. Prøv igjen om litt.");
    }
  }

  async function chooseRecurringScope(scope: "occurrence" | "series") {
    if (!recurringChoice) {
      return;
    }

    const { item, action } = recurringChoice;

    try {
      if (action === "delete") {
        await deleteSchoolReminder(item.id, {
          scope,
          occurrenceDate: item.occurrenceDate,
        });
        setSchoolFeedback(null);
        showSaved();
      } else if (pendingEditDraft) {
        await saveEditDraft(pendingEditDraft, scope);
      }
      setRecurringChoice(null);
      setPendingEditDraft(null);
    } catch {
      setSchoolFeedback(
        action === "delete"
          ? "Skolehusk ble ikke slettet. Prøv igjen om litt."
          : "Endringen ble ikke lagret. Prøv igjen om litt.",
      );
    }
  }

  async function deleteSingleReminder(item: HuskSchoolWeekItem) {
    try {
      await deleteSchoolReminder(item.id, {
        occurrenceDate: item.occurrenceDate,
      });
      setOpenItemMenuId(null);
      setSchoolFeedback(null);
      showSaved();
    } catch {
      setSchoolFeedback("Skolehusk ble ikke slettet. Prøv igjen om litt.");
    }
  }

  function createDraftFromItem(item: HuskSchoolWeekItem): SchoolCreateDraft {
    const itemWeekday = item.weekday ?? "monday";
    const weekday = schoolWeekdays.find(
      (option) => option.value === itemWeekday,
    );
    const itemDate =
      item.occurrenceDate ??
      item.date ??
      selectedWeekStart.toISOString().slice(0, 10);
    const date = new Date(`${itemDate}T00:00:00.000Z`);

    return {
      weekday: itemWeekday,
      dateLabel: `${weekday?.label ?? "Skoledag"} ${formatSchoolDate(date)}`,
      title: item.title,
      note: item.note ?? "",
      icon: item.icon,
      recurring: Boolean(item.isRecurring),
      endDate: item.recurrenceEndDate ?? "",
    };
  }

  async function saveEditDraft(
    edit: { item: HuskSchoolWeekItem; draft: SchoolCreateDraft },
    scope?: "occurrence" | "series",
  ) {
    if (!edit.draft.title.trim()) {
      return;
    }

    await updateSchoolReminder(edit.item.id, {
      scope,
      occurrenceDate: edit.item.occurrenceDate,
      childFamilyMemberId: edit.item.childFamilyMemberId,
      weekday: edit.draft.weekday,
      date: edit.item.date ?? edit.item.occurrenceDate,
      title: edit.draft.title,
      note: edit.draft.note || null,
      icon: edit.draft.icon,
      isRecurring: edit.draft.recurring,
      recurrenceEndDate: edit.draft.recurring
        ? edit.draft.endDate || null
        : null,
    });
    setEditDraft(null);
    setSchoolFeedback(null);
    showSaved();
  }

  async function handleSaveEditDraft() {
    if (!editDraft) {
      return;
    }

    if (editDraft.item.isRecurring) {
      setPendingEditDraft(editDraft);
      setRecurringChoice({ item: editDraft.item, action: "edit" });
      setEditDraft(null);
      return;
    }

    try {
      await saveEditDraft(editDraft);
    } catch {
      setSchoolFeedback("Endringen ble ikke lagret. Prøv igjen om litt.");
    }
  }

  function openEditFlow(item: HuskSchoolWeekItem) {
    setOpenItemMenuId(null);
    setDetailItem(null);
    setSchoolFeedback(null);
    setEditDraft({ item, draft: createDraftFromItem(item) });
  }

  function openDeleteFlow(item: HuskSchoolWeekItem) {
    setOpenItemMenuId(null);
    if (item.isRecurring) {
      setRecurringChoice({ item, action: "delete" });
      return;
    }

    void deleteSingleReminder(item);
  }

  function closeRecurringChoice() {
    if (recurringChoice?.action === "edit" && pendingEditDraft) {
      setEditDraft(pendingEditDraft);
      setPendingEditDraft(null);
    }
    setRecurringChoice(null);
  }

  if (loading) {
    return (
      <section
        className="husk-panel husk-school"
        id="husk-panel-skoleuka"
        role="tabpanel"
        aria-labelledby="husk-tab-skoleuka husk-school-title"
      >
        <FamilyMembersLoadingState />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="husk-panel husk-school"
        id="husk-panel-skoleuka"
        role="tabpanel"
        aria-labelledby="husk-tab-skoleuka husk-school-title"
      >
        <FamilyMembersErrorState onRetry={() => void refresh()} />
      </section>
    );
  }

  if (schoolChildren.length === 0) {
    return (
      <section
        className="husk-panel husk-school"
        id="husk-panel-skoleuka"
        role="tabpanel"
        aria-labelledby="husk-tab-skoleuka husk-school-title"
      >
        <div className="husk-school__topline">
          <div className="husk-section-heading">
            <p className="husk-section-heading__eyebrow">Skoleplan</p>
            <h2 className="husk-section-heading__title" id="husk-school-title">
              Skoleuka
            </h2>
          </div>
        </div>
        <SchoolWeekEmptyState
          title="Ingen barn med skoleuke ennå"
          description="Legg til barn i familien før skoleuka kan planlegges."
          actionHref="/onboarding/add-members"
          actionLabel="Legg til familiemedlem"
        />
      </section>
    );
  }

  return (
    <section
      className="husk-panel husk-school"
      id="husk-panel-skoleuka"
      role="tabpanel"
      aria-labelledby="husk-tab-skoleuka husk-school-title"
    >
      <div className="husk-school__topline">
        <div className="husk-section-heading">
          <p className="husk-section-heading__eyebrow">Skoleplan</p>
          <h2 className="husk-section-heading__title" id="husk-school-title">
            Skoleuka
          </h2>
        </div>
        <div className="husk-school__actions">
          <SavedBadge isVisible={showSavedBadge} />
        </div>
      </div>

      <div className="husk-week-strip" aria-label="Velg uke" ref={weekStripRef}>
        {weekOptions.map((week) => {
          const isSelected = week.startTime === selectedWeekStartTime;
          const isCurrent = week.startTime === todayWeekStart.getTime();

          return (
            <button
              className={`husk-week-strip__option${isSelected ? " husk-week-strip__option--selected" : ""}`}
              key={week.key}
              onClick={(event) =>
                handleWeekSelect(week.startTime, event.currentTarget)
              }
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
          <button
            className="husk-school-child__button"
            type="button"
            onClick={showPreviousChild}
            aria-label="Vis forrige barn"
          >
            <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.5} />
          </button>
          <div className="husk-school-child__identity">
            <UserAvatar
              identity={selectedChild}
              avatarUrl={selectedChild.avatarUrl}
              size="sm"
              className="husk-avatar"
              decorative
            />
            <span className="husk-school-child__copy">
              <strong>{selectedChild.name}</strong>
              <span>
                {selectedChildIndex + 1} av {schoolChildren.length}
              </span>
            </span>
          </div>
          <button
            className="husk-school-child__button"
            type="button"
            onClick={showNextChild}
            aria-label="Vis neste barn"
          >
            <ChevronRight aria-hidden="true" size={22} strokeWidth={2.5} />
          </button>
        </div>
      ) : null}

      {!hasSchoolItems ? (
        <SchoolWeekEmptyState
          title="Ingen skolehusk denne uka"
          description="Legg til det som må huskes til skoledagene."
          actionHref="/husk?tab=skoleuka"
          actionLabel="Legg til skolehusk"
        />
      ) : null}

      {schoolFeedback ? (
        <p className="husk-school__tip" role="status">
          {schoolFeedback}
        </p>
      ) : null}

      <div
        className="husk-school-week"
        aria-label={`${selectedWeek?.label ?? "Valgt uke"} for ${selectedChild?.name ?? "valgt barn"}`}
      >
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
                <button
                  className="husk-school-day__add"
                  type="button"
                  onClick={() => openCreateSheet(weekday, date)}
                  aria-label={`Legg til husk på ${weekday.label}`}
                >
                  <Plus aria-hidden="true" size={22} strokeWidth={2.35} />
                </button>
              </header>
              <div className="husk-school-day__items">
                {items.length > 0 ? (
                  items.map((item) => {
                    const Icon = reminderIcons[item.icon];
                    const isMenuOpen = openItemMenuId === item.id;

                    return (
                      <AppCard
                        as="div"
                        className={`husk-school-item husk-school-item--${item.tone}`}
                        key={item.id}
                      >
                        <button
                          className="husk-school-item__tap-target"
                          type="button"
                          onClick={() => setDetailItem(item)}
                        >
                          <span
                            className="husk-school-item__icon"
                            aria-hidden="true"
                          >
                            <Icon size={20} strokeWidth={2.35} />
                          </span>
                          <span className="husk-school-item__copy">
                            <span>{item.title}</span>
                            {item.isRecurring ? (
                              <small>
                                <RotateCcw size={12} strokeWidth={2.4} /> Hver
                                uke
                                {item.recurrenceEndDate
                                  ? ` til ${formatSchoolDate(new Date(`${item.recurrenceEndDate}T00:00:00.000Z`))}`
                                  : ""}
                              </small>
                            ) : null}
                          </span>
                        </button>
                        <span
                          className="husk-school-item__menu-wrap"
                          onBlur={(event) => {
                            if (
                              !(
                                event.relatedTarget instanceof Node &&
                                event.currentTarget.contains(
                                  event.relatedTarget,
                                )
                              )
                            ) {
                              setOpenItemMenuId(null);
                            }
                          }}
                        >
                          <button
                            className="husk-school-item__menu"
                            type="button"
                            aria-expanded={isMenuOpen}
                            aria-label={`Åpne meny for ${item.title}`}
                            title="Rediger / Slett"
                            onClick={() =>
                              setOpenItemMenuId((currentId) =>
                                currentId === item.id ? null : item.id,
                              )
                            }
                          >
                            <MoreHorizontal aria-hidden="true" size={20} />
                          </button>
                          {isMenuOpen ? (
                            <span
                              className="husk-school-item__menu-popover"
                              role="menu"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openEditFlow(item)}
                              >
                                Rediger
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openDeleteFlow(item)}
                              >
                                Slett
                              </button>
                            </span>
                          ) : null}
                        </span>
                      </AppCard>
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

      <p className="husk-school__tip">
        Trykk + på riktig dag for å legge til. Bruk menyen på et punkt for å
        redigere eller slette.
      </p>

      {createDraft && selectedChild ? (
        <SchoolWeekCreateSheet
          childName={selectedChild.name}
          draft={createDraft}
          onChange={setCreateDraft}
          onClose={() => setCreateDraft(null)}
          onSave={saveCreateDraft}
        />
      ) : null}

      {editDraft && selectedChild ? (
        <SchoolWeekCreateSheet
          childName={selectedChild.name}
          draft={editDraft.draft}
          onChange={(draft) => setEditDraft({ ...editDraft, draft })}
          onClose={() => setEditDraft(null)}
          onSave={() => void handleSaveEditDraft()}
        />
      ) : null}

      {detailItem ? (
        <SchoolWeekDetailSheet
          child={selectedChild ?? null}
          reminder={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={openEditFlow}
        />
      ) : null}

      {recurringChoice ? (
        <SchoolWeekRecurringSheet
          itemTitle={recurringChoice.item.title}
          actionLabel={recurringChoice.action === "delete" ? "slette" : "endre"}
          onClose={closeRecurringChoice}
          onChoose={chooseRecurringScope}
        />
      ) : null}
    </section>
  );
}
