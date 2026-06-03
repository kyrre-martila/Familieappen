"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type RefObject } from "react";
import { ArrowUpDown, Check, GripVertical, MoreHorizontal, Plus, Utensils } from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { ProtectedFamilyRoute } from "../../components/ProtectedFamilyRoute";
import { PageContainer } from "../../components/ui";
import { getLatestPlannedOffset, getMockMealForOffset, type MockMeal } from "./mockMealPlanData";

const initialPastDays = 10;
const initialFutureDays = 21;
const loadChunkSize = 14;

const dayFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long" });
const futureDayFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "long" });

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setHours(12, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getToday() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

function capitalize(value: string) {
  return value.length > 0 ? `${value.charAt(0).toLocaleUpperCase("nb-NO")}${value.slice(1)}` : value;
}

function formatTimelineDate(date: Date, offset: number) {
  if (offset === 0) {
    return `I dag · ${dayFormatter.format(date)}`;
  }

  if (offset === 1) {
    return `I morgen · ${dayFormatter.format(date)}`;
  }

  return capitalize(dayFormatter.format(date));
}

function formatReminderDate(today: Date, latestOffset: number) {
  const latestDate = addDays(today, latestOffset);
  if (latestOffset <= 1) {
    return latestOffset === 0 ? "i dag" : "i morgen";
  }

  if (latestOffset <= 7) {
    return futureDayFormatter.format(latestDate);
  }

  return dayFormatter.format(latestDate);
}

export default function MealsPage() {
  const [startOffset, setStartOffset] = useState(-initialPastDays);
  const [endOffset, setEndOffset] = useState(initialFutureDays);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [draggedOffset, setDraggedOffset] = useState<number | null>(null);
  const [activeDropOffset, setActiveDropOffset] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mealsByOffset, setMealsByOffset] = useState(() => {
    const initialMeals = new Map<number, MockMeal>();

    for (let offset = -initialPastDays; offset <= initialFutureDays; offset += 1) {
      const meal = getMockMealForOffset(offset);

      if (meal) {
        initialMeals.set(offset, meal);
      }
    }

    return initialMeals;
  });
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLElement | null>(null);
  const hasInitialScrollRef = useRef(false);
  const today = useMemo(() => getToday(), []);

  const days = useMemo(
    () =>
      Array.from({ length: endOffset - startOffset + 1 }, (_, index) => {
        const offset = startOffset + index;
        return {
          date: addDays(today, offset),
          offset,
          meal: mealsByOffset.get(offset) ?? null,
        };
      }),
    [endOffset, mealsByOffset, startOffset, today]
  );

  const reminderText = useMemo(() => {
    const latestOffset = getLatestPlannedOffset();
    return `Du har planlagt frem til ${formatReminderDate(today, latestOffset)}`;
  }, [today]);

  useEffect(() => {
    if (hasInitialScrollRef.current) {
      return;
    }

    hasInitialScrollRef.current = true;
    window.requestAnimationFrame(() => {
      todayRef.current?.scrollIntoView({ block: "start" });
    });
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  function showToast(message: string) {
    setToastMessage(message);
  }

  function enterMoveMode() {
    setIsMoveMode(true);
  }

  function exitMoveMode() {
    setIsMoveMode(false);
    setDraggedOffset(null);
    setActiveDropOffset(null);
  }

  function handleMoveAction() {
    if (isMoveMode) {
      exitMoveMode();
      return;
    }

    enterMoveMode();
  }

  function handleMealDragStart(offset: number, event: DragEvent<HTMLDivElement>) {
    if (!isMoveMode || !mealsByOffset.has(offset)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(offset));
    setDraggedOffset(offset);
  }

  function handleDayDragOver(offset: number, event: DragEvent<HTMLElement>) {
    if (!isMoveMode || draggedOffset === null || draggedOffset === offset) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setActiveDropOffset(offset);
  }

  function handleDayDragLeave(offset: number) {
    setActiveDropOffset((currentOffset) => (currentOffset === offset ? null : currentOffset));
  }

  function handleDayDrop(targetOffset: number, event: DragEvent<HTMLElement>) {
    if (!isMoveMode) {
      return;
    }

    event.preventDefault();

    const sourceOffset = Number(event.dataTransfer.getData("text/plain"));

    setDraggedOffset(null);
    setActiveDropOffset(null);

    if (!Number.isFinite(sourceOffset) || sourceOffset === targetOffset) {
      return;
    }

    const sourceMeal = mealsByOffset.get(sourceOffset);

    if (!sourceMeal) {
      return;
    }

    const targetMeal = mealsByOffset.get(targetOffset) ?? null;

    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.set(targetOffset, sourceMeal);

      if (targetMeal) {
        nextMeals.set(sourceOffset, targetMeal);
      } else {
        nextMeals.delete(sourceOffset);
      }

      return nextMeals;
    });

    showToast(targetMeal ? "Middager byttet plass" : "Middag flyttet");
  }

  function handleDragEnd() {
    setDraggedOffset(null);
    setActiveDropOffset(null);
  }

  useEffect(() => {
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;

    if (!topSentinel || !bottomSentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          if (entry.target === topSentinel) {
            setStartOffset((current) => current - loadChunkSize);
          }

          if (entry.target === bottomSentinel) {
            setEndOffset((current) => current + loadChunkSize);
          }
        });
      },
      { rootMargin: "320px 0px" }
    );

    observer.observe(topSentinel);
    observer.observe(bottomSentinel);

    return () => observer.disconnect();
  }, []);

  return (
    <ProtectedFamilyRoute>
      <AppShell title="Måltidsplan">
        <PageContainer>
          <section className={isMoveMode ? "meal-planner meal-planner--move-mode" : "meal-planner"} aria-labelledby="meal-planner-title">
            <h2 className="sr-only" id="meal-planner-title">Måltidsplan</h2>

            <ReminderCard reminderText={reminderText} />

            <div className="meal-timeline" aria-label="Middag fremover og bakover i tid">
              <div className="meal-timeline__sentinel" ref={topSentinelRef} aria-hidden="true" />
              {days.map((day) => (
                <MealTimelineDay
                  activeDropOffset={activeDropOffset}
                  date={day.date}
                  draggedOffset={draggedOffset}
                  isMoveMode={isMoveMode}
                  key={day.offset}
                  meal={day.meal}
                  offset={day.offset}
                  onDayDragLeave={handleDayDragLeave}
                  onDayDragOver={handleDayDragOver}
                  onDayDrop={handleDayDrop}
                  onMealDragEnd={handleDragEnd}
                  onMealDragStart={handleMealDragStart}
                  todayRef={day.offset === 0 ? todayRef : undefined}
                />
              ))}
              <div className="meal-timeline__sentinel" ref={bottomSentinelRef} aria-hidden="true" />
            </div>

            <button
              className={isMoveMode ? "meal-planner__move-button meal-planner__move-button--done" : "meal-planner__move-button"}
              type="button"
              aria-pressed={isMoveMode}
              onClick={handleMoveAction}
            >
              {isMoveMode ? <Check aria-hidden="true" size={18} /> : <ArrowUpDown aria-hidden="true" size={18} />}
              {isMoveMode ? "Ferdig" : "Flytt middager"}
            </button>

            <MealMoveToast message={toastMessage} />
          </section>
        </PageContainer>
      </AppShell>
    </ProtectedFamilyRoute>
  );
}

function ReminderCard({ reminderText }: { reminderText: string }) {
  return (
    <aside className="meal-reminder-card" aria-label="Påminnelse om måltidsplan">
      <span className="meal-reminder-card__icon" aria-hidden="true">🍽️</span>
      <div className="meal-reminder-card__copy">
        <p className="meal-reminder-card__title">Snart tomt for middager</p>
        <p className="meal-reminder-card__text">{reminderText}</p>
      </div>
    </aside>
  );
}

function MealTimelineDay({
  activeDropOffset,
  date,
  draggedOffset,
  isMoveMode,
  meal,
  offset,
  onDayDragLeave,
  onDayDragOver,
  onDayDrop,
  onMealDragEnd,
  onMealDragStart,
  todayRef,
}: {
  activeDropOffset: number | null;
  date: Date;
  draggedOffset: number | null;
  isMoveMode: boolean;
  meal: MockMeal | null;
  offset: number;
  onDayDragLeave: (offset: number) => void;
  onDayDragOver: (offset: number, event: DragEvent<HTMLElement>) => void;
  onDayDrop: (offset: number, event: DragEvent<HTMLElement>) => void;
  onMealDragEnd: () => void;
  onMealDragStart: (offset: number, event: DragEvent<HTMLDivElement>) => void;
  todayRef?: RefObject<HTMLElement | null>;
}) {
  const isDropTarget = isMoveMode && activeDropOffset === offset && draggedOffset !== offset;
  const dayClassName = ["meal-day", isMoveMode ? "meal-day--move-mode" : "", isDropTarget ? "meal-day--drop-target" : ""].filter(Boolean).join(" ");

  return (
    <article
      className={dayClassName}
      aria-label={formatTimelineDate(date, offset)}
      onDragLeave={() => onDayDragLeave(offset)}
      onDragOver={(event) => onDayDragOver(offset, event)}
      onDrop={(event) => onDayDrop(offset, event)}
      ref={todayRef}
    >
      <div className="meal-day__rail" aria-hidden="true">
        <span className={offset === 0 ? "meal-day__dot meal-day__dot--today" : "meal-day__dot"} />
      </div>
      <div className="meal-day__content">
        <h3 className="meal-day__date">{formatTimelineDate(date, offset)}</h3>
        {meal ? (
          <PlannedMealCard
            isDragging={draggedOffset === offset}
            isMoveMode={isMoveMode}
            meal={meal}
            offset={offset}
            onDragEnd={onMealDragEnd}
            onDragStart={onMealDragStart}
          />
        ) : (
          <EmptyMealCta isMoveMode={isMoveMode} />
        )}
      </div>
    </article>
  );
}

function PlannedMealCard({
  isDragging,
  isMoveMode,
  meal,
  offset,
  onDragEnd,
  onDragStart,
}: {
  isDragging: boolean;
  isMoveMode: boolean;
  meal: MockMeal;
  offset: number;
  onDragEnd: () => void;
  onDragStart: (offset: number, event: DragEvent<HTMLDivElement>) => void;
}) {
  const cardClassName = ["meal-card", isMoveMode ? "meal-card--move-mode" : "", isDragging ? "meal-card--dragging" : ""].filter(Boolean).join(" ");

  return (
    <div
      className={cardClassName}
      draggable={isMoveMode}
      onDragEnd={onDragEnd}
      onDragStart={(event) => onDragStart(offset, event)}
    >
      <span className="meal-card__visual" aria-hidden="true">
        <span>{meal.icon}</span>
      </span>
      <div className="meal-card__copy">
        <p className="meal-card__eyebrow">Middag</p>
        <p className="meal-card__title">{meal.title}</p>
      </div>
      {isMoveMode ? (
        <span className="meal-card__drag-handle" aria-label={`Flytt ${meal.title}`} role="img">
          <GripVertical aria-hidden="true" size={20} strokeWidth={2.4} />
        </span>
      ) : (
        <button className="meal-card__menu" type="button" aria-label={`Flere valg for ${meal.title}`}>
          <MoreHorizontal aria-hidden="true" size={20} />
        </button>
      )}
    </div>
  );
}

function EmptyMealCta({ isMoveMode }: { isMoveMode: boolean }) {
  if (isMoveMode) {
    return (
      <div className="meal-empty-drop" aria-label="Tom dag for flytting">
        <span>Tom dag</span>
      </div>
    );
  }

  return (
    <button className="meal-empty-cta" type="button" aria-label="Legg til middag kommer senere">
      <Plus aria-hidden="true" size={17} />
      <span>Legg til middag</span>
      <Utensils className="meal-empty-cta__hint" aria-hidden="true" size={16} />
    </button>
  );
}

function MealMoveToast({ message }: { message: string | null }) {
  return (
    <div className={message ? "meal-move-toast meal-move-toast--visible" : "meal-move-toast"} role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
