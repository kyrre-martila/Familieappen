"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
} from "lucide-react";

import { useSchoolWeek } from "../hooks/useSchoolWeek";
import type { HuskFamilyMember, SchoolCreateDraft } from "../types";
import { reminderIcons, schoolChildIds, schoolWeekdays } from "./huskConfig";
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

const schoolChildStorageKey = "familieappen:husk:school-child-id";

function readStoredValue(storageKey: string, fallback = "") {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.sessionStorage.getItem(storageKey) ?? fallback;
}

export function SchoolWeekPanel({
  shouldOpenPlanner,
}: {
  shouldOpenPlanner: boolean;
}) {
  const router = useRouter();
  const todayWeekStart = useMemo(() => getIsoWeekStart(new Date()), []);
  const todayWeekStartTime = todayWeekStart.getTime();
  const [selectedWeekStartTime, setSelectedWeekStartTime] =
    useState(todayWeekStartTime);
  const [selectedChildId, setSelectedChildId] = useState(() =>
    readStoredValue(schoolChildStorageKey, schoolChildIds[0]),
  );
  const [isEditing, setIsEditing] = useState(shouldOpenPlanner);
  const [createDraft, setCreateDraft] = useState<SchoolCreateDraft | null>(
    null,
  );
  const [recurringChoiceTitle, setRecurringChoiceTitle] = useState<
    string | null
  >(null);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const { children, weekItems } = useSchoolWeek();

  useEffect(() => {
    if (shouldOpenPlanner) {
      setIsEditing(true);
    }
  }, [shouldOpenPlanner]);

  useEffect(() => {
    window.sessionStorage.setItem(schoolChildStorageKey, selectedChildId);
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

  const selectedWeekStart = useMemo(
    () => new Date(selectedWeekStartTime),
    [selectedWeekStartTime],
  );
  const schoolChildren = schoolChildIds
    .map((childId) => children.find((member) => member.id === childId))
    .filter((member): member is HuskFamilyMember => Boolean(member));
  const selectedChildIndex = Math.max(
    0,
    schoolChildren.findIndex((child) => child.id === selectedChildId),
  );
  const selectedChild = schoolChildren[selectedChildIndex] ?? schoolChildren[0];
  const selectedPlan = weekItems.find(
    (plan) => plan.childId === selectedChild?.id,
  );
  const hasSchoolItems = schoolWeekdays.some(
    (weekday) => (selectedPlan?.days[weekday.value] ?? []).length > 0,
  );
  const selectedWeek = weekOptions.find(
    (week) => week.startTime === selectedWeekStartTime,
  );

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

  function toggleEditing() {
    if (isEditing) {
      if (shouldOpenPlanner) {
        router.back();
      } else {
        setIsEditing(false);
      }
      return;
    }

    router.push("/husk?tab=skoleuka&edit=1");
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
      icon: "shirt",
      recurring: true,
      endDate: "",
    });
  }

  function saveCreateDraft() {
    if (!createDraft?.title.trim()) {
      return;
    }

    setCreateDraft(null);
    showSaved();
  }

  function chooseRecurringScope() {
    setRecurringChoiceTitle(null);
    showSaved();
  }

  return (
    <section
      className={`husk-panel husk-school${isEditing ? " husk-school--editing" : ""}`}
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
          <button
            className={`husk-school__edit-button${isEditing ? " husk-school__edit-button--done" : ""}`}
            type="button"
            onClick={toggleEditing}
          >
            {isEditing ? "Ferdig" : "Rediger"}
          </button>
        </div>
      </div>

      <div className="husk-week-strip" aria-label="Velg uke">
        {weekOptions.map((week) => {
          const isSelected = week.startTime === selectedWeekStartTime;
          const isCurrent = week.startTime === todayWeekStart.getTime();

          return (
            <button
              className={`husk-week-strip__option${isSelected ? " husk-week-strip__option--selected" : ""}`}
              key={week.key}
              onClick={() => setSelectedWeekStartTime(week.startTime)}
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
            <span
              className={`husk-avatar husk-avatar--${selectedChild.tone}`}
              aria-hidden="true"
            >
              {selectedChild.initials}
            </span>
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
          actionHref="/husk?tab=skoleuka&edit=1"
          actionLabel="Legg til skolehusk"
        />
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
                {isEditing ? (
                  <button
                    className="husk-school-day__add"
                    type="button"
                    onClick={() => openCreateSheet(weekday, date)}
                    aria-label={`Legg til husk på ${weekday.label}`}
                  >
                    <Plus aria-hidden="true" size={22} strokeWidth={2.35} />
                  </button>
                ) : null}
              </header>
              <div className="husk-school-day__items">
                {items.length > 0 ? (
                  items.map((item) => {
                    const Icon = reminderIcons[item.icon];
                    const content = (
                      <>
                        <span
                          className="husk-school-item__icon"
                          aria-hidden="true"
                        >
                          <Icon size={20} strokeWidth={2.35} />
                        </span>
                        <span className="husk-school-item__copy">
                          <span>{item.title}</span>
                          {isEditing ? (
                            <small>
                              <RotateCcw size={12} strokeWidth={2.4} /> Hver uke
                              til 20. juni 2026
                            </small>
                          ) : null}
                        </span>
                        {isEditing ? (
                          <span className="husk-school-item__edit-label">
                            Endre
                          </span>
                        ) : null}
                      </>
                    );

                    return isEditing ? (
                      <button
                        className={`husk-school-item husk-school-item--${item.tone} husk-school-item--editable`}
                        key={item.id}
                        type="button"
                        onClick={() => setRecurringChoiceTitle(item.title)}
                      >
                        {content}
                      </button>
                    ) : (
                      <div
                        className={`husk-school-item husk-school-item--${item.tone}`}
                        key={item.id}
                      >
                        {content}
                      </div>
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

      {isEditing ? (
        <p className="husk-school__tip">
          Trykk + på riktig dag for å legge til. Trykk på et punkt for å endre
          gjentakelse.
        </p>
      ) : null}

      {createDraft && selectedChild ? (
        <SchoolWeekCreateSheet
          childName={selectedChild.name}
          draft={createDraft}
          onChange={setCreateDraft}
          onClose={() => setCreateDraft(null)}
          onSave={saveCreateDraft}
        />
      ) : null}

      {recurringChoiceTitle ? (
        <SchoolWeekRecurringSheet
          itemTitle={recurringChoiceTitle}
          onClose={() => setRecurringChoiceTitle(null)}
          onChoose={chooseRecurringScope}
        />
      ) : null}
    </section>
  );
}
