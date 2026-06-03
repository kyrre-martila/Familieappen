"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
} from "react";
import {
  ArrowUpDown,
  Check,
  GripVertical,
  MoreHorizontal,
  Plus,
  Utensils,
  X,
} from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { ProtectedFamilyRoute } from "../../components/ProtectedFamilyRoute";
import { PageContainer } from "../../components/ui";
import {
  mockMeals,
  getMockMealForOffset,
  type MockMeal,
} from "./mockMealPlanData";

const initialPastDays = 10;
const initialFutureDays = 21;
const loadChunkSize = 14;

const dayFormatter = new Intl.DateTimeFormat("nb-NO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const futureDayFormatter = new Intl.DateTimeFormat("nb-NO", {
  weekday: "long",
});

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
  return value.length > 0
    ? `${value.charAt(0).toLocaleUpperCase("nb-NO")}${value.slice(1)}`
    : value;
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

function normalizeMealTitle(value: string) {
  return value.trim().toLocaleLowerCase("nb-NO");
}

function getMealVisual(title: string) {
  const normalizedTitle = normalizeMealTitle(title);
  return (
    mockMeals.find((meal) => normalizeMealTitle(meal.title) === normalizedTitle)
      ?.icon ?? "🍽️"
  );
}

function createMealFromTitle(title: string): MockMeal {
  const trimmedTitle = title.trim();
  const existingMeal = mockMeals.find(
    (meal) =>
      normalizeMealTitle(meal.title) === normalizeMealTitle(trimmedTitle),
  );

  return (
    existingMeal ?? {
      id: `custom-${normalizeMealTitle(trimmedTitle).replace(/\s+/g, "-")}`,
      title: trimmedTitle,
      icon: getMealVisual(trimmedTitle),
    }
  );
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
  const [editingOffset, setEditingOffset] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [mealsByOffset, setMealsByOffset] = useState(() => {
    const initialMeals = new Map<number, MockMeal>();

    for (
      let offset = -initialPastDays;
      offset <= initialFutureDays;
      offset += 1
    ) {
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
    [endOffset, mealsByOffset, startOffset, today],
  );

  const futurePlannedOffsets = useMemo(
    () =>
      Array.from(mealsByOffset.keys())
        .filter((offset) => offset >= 0)
        .sort((a, b) => a - b),
    [mealsByOffset],
  );
  const shouldShowReminder =
    futurePlannedOffsets.length > 0 && futurePlannedOffsets.length <= 2;
  const reminderText = futurePlannedOffsets.length
    ? `Du har planlagt frem til ${formatReminderDate(today, futurePlannedOffsets[futurePlannedOffsets.length - 1])}.`
    : "";
  const hasFutureMeals = futurePlannedOffsets.length > 0;
  const previousMealSuggestions = useMemo(() => {
    const seenMealIds = new Set<string>();

    return Array.from(mealsByOffset.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, meal]) => meal)
      .filter((meal) => {
        if (seenMealIds.has(meal.id)) {
          return false;
        }

        seenMealIds.add(meal.id);
        return true;
      });
  }, [mealsByOffset]);

  const visibleSuggestions = useMemo(() => {
    const normalizedQuery = normalizeMealTitle(inputValue);
    const suggestions = [
      ...previousMealSuggestions,
      ...mockMeals.filter(
        (meal) =>
          !previousMealSuggestions.some(
            (previousMeal) => previousMeal.id === meal.id,
          ),
      ),
    ];

    if (!normalizedQuery) {
      return suggestions.slice(0, 5);
    }

    return suggestions
      .filter((meal) => {
        const normalizedTitle = normalizeMealTitle(meal.title);
        return (
          normalizedTitle.startsWith(normalizedQuery) ||
          normalizedTitle.includes(normalizedQuery)
        );
      })
      .slice(0, 5);
  }, [inputValue, previousMealSuggestions]);

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

  function openEditor(offset: number, meal?: MockMeal | null) {
    setEditingOffset(offset);
    setInputValue(meal?.title ?? "");
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-meal-editor="${offset}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function closeEditor() {
    setEditingOffset(null);
    setInputValue("");
  }

  function saveMeal(offset: number, title: string) {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      closeEditor();
      return;
    }

    setMealsByOffset((currentMeals) => {
      const nextMeals = new Map(currentMeals);
      nextMeals.set(offset, createMealFromTitle(trimmedTitle));
      return nextMeals;
    });
    closeEditor();
    showToast("Middag lagret");
  }

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

  function handleMealDragStart(
    offset: number,
    event: DragEvent<HTMLDivElement>,
  ) {
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
    setActiveDropOffset((currentOffset) =>
      currentOffset === offset ? null : currentOffset,
    );
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
      { rootMargin: "320px 0px" },
    );

    observer.observe(topSentinel);
    observer.observe(bottomSentinel);

    return () => observer.disconnect();
  }, []);

  return (
    <ProtectedFamilyRoute>
      <AppShell title="Måltidsplan">
        <PageContainer>
          <section
            className={
              isMoveMode
                ? "meal-planner meal-planner--move-mode"
                : "meal-planner"
            }
            aria-labelledby="meal-planner-title"
          >
            <h2 className="sr-only" id="meal-planner-title">
              Måltidsplan
            </h2>

            {shouldShowReminder ? (
              <ReminderCard reminderText={reminderText} />
            ) : null}
            {!hasFutureMeals ? (
              <MealPlanEmptyState
                onCreateFirstMeal={() => openEditor(0, null)}
              />
            ) : null}

            <div
              className="meal-timeline"
              aria-label="Middag fremover og bakover i tid"
            >
              <div
                className="meal-timeline__sentinel"
                ref={topSentinelRef}
                aria-hidden="true"
              />
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
                  onOpenEditor={openEditor}
                  onSaveMeal={saveMeal}
                  suggestions={visibleSuggestions}
                  editingOffset={editingOffset}
                  inputValue={inputValue}
                  onInputValueChange={setInputValue}
                  onCloseEditor={closeEditor}
                  todayRef={day.offset === 0 ? todayRef : undefined}
                />
              ))}
              <div
                className="meal-timeline__sentinel"
                ref={bottomSentinelRef}
                aria-hidden="true"
              />
            </div>

            {isMoveMode ? (
              <p className="meal-planner__move-helper">
                Dra middager for å flytte eller bytte plass.
              </p>
            ) : null}

            <button
              className={
                isMoveMode
                  ? "meal-planner__move-button meal-planner__move-button--done"
                  : "meal-planner__move-button"
              }
              type="button"
              aria-pressed={isMoveMode}
              onClick={handleMoveAction}
            >
              {isMoveMode ? (
                <Check aria-hidden="true" size={18} />
              ) : (
                <ArrowUpDown aria-hidden="true" size={18} />
              )}
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
    <aside
      className="meal-reminder-card"
      aria-label="Påminnelse om måltidsplan"
    >
      <span className="meal-reminder-card__icon" aria-hidden="true">
        🍽️
      </span>
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
  onOpenEditor,
  onSaveMeal,
  suggestions,
  editingOffset,
  inputValue,
  onInputValueChange,
  onCloseEditor,
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
  onOpenEditor: (offset: number, meal?: MockMeal | null) => void;
  onSaveMeal: (offset: number, title: string) => void;
  suggestions: MockMeal[];
  editingOffset: number | null;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  onCloseEditor: () => void;
  todayRef?: RefObject<HTMLElement | null>;
}) {
  const isDropTarget =
    isMoveMode && activeDropOffset === offset && draggedOffset !== offset;
  const isPast = offset < 0;
  const isEditing = editingOffset === offset;
  const dayClassName = [
    "meal-day",
    isPast ? "meal-day--past" : "",
    isMoveMode ? "meal-day--move-mode" : "",
    isDropTarget ? "meal-day--drop-target" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
        <span
          className={
            offset === 0
              ? "meal-day__dot meal-day__dot--today"
              : "meal-day__dot"
          }
        />
      </div>
      <div className="meal-day__content">
        <h3 className="meal-day__date">{formatTimelineDate(date, offset)}</h3>
        {isEditing ? (
          <InlineMealEditor
            offset={offset}
            value={inputValue}
            suggestions={suggestions}
            onChange={onInputValueChange}
            onClose={onCloseEditor}
            onSave={onSaveMeal}
          />
        ) : meal ? (
          <PlannedMealCard
            isDragging={draggedOffset === offset}
            isMoveMode={isMoveMode}
            meal={meal}
            offset={offset}
            onDragEnd={onMealDragEnd}
            onDragStart={onMealDragStart}
            onOpenEditor={onOpenEditor}
          />
        ) : (
          <EmptyMealCta
            isMoveMode={isMoveMode}
            onOpenEditor={() => onOpenEditor(offset, null)}
          />
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
  onOpenEditor,
}: {
  isDragging: boolean;
  isMoveMode: boolean;
  meal: MockMeal;
  offset: number;
  onDragEnd: () => void;
  onDragStart: (offset: number, event: DragEvent<HTMLDivElement>) => void;
  onOpenEditor: (offset: number, meal: MockMeal) => void;
}) {
  const cardClassName = [
    "meal-card",
    isMoveMode ? "meal-card--move-mode" : "",
    isDragging ? "meal-card--dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
        <span
          className="meal-card__drag-handle"
          aria-label={`Flytt ${meal.title}`}
          role="img"
        >
          <GripVertical aria-hidden="true" size={20} strokeWidth={2.4} />
        </span>
      ) : (
        <button
          className="meal-card__menu"
          type="button"
          aria-label={`Rediger ${meal.title}`}
          onClick={() => onOpenEditor(offset, meal)}
        >
          <MoreHorizontal aria-hidden="true" size={20} />
        </button>
      )}
    </div>
  );
}

function EmptyMealCta({
  isMoveMode,
  onOpenEditor,
}: {
  isMoveMode: boolean;
  onOpenEditor: () => void;
}) {
  if (isMoveMode) {
    return (
      <div className="meal-empty-drop" aria-label="Tom dag for flytting">
        <span>Tom dag</span>
      </div>
    );
  }

  return (
    <button
      className="meal-empty-cta"
      type="button"
      aria-label="Legg til middag"
      onClick={onOpenEditor}
    >
      <Plus aria-hidden="true" size={17} />
      <span>Legg til middag</span>
      <Utensils className="meal-empty-cta__hint" aria-hidden="true" size={16} />
    </button>
  );
}

function MealPlanEmptyState({
  onCreateFirstMeal,
}: {
  onCreateFirstMeal: () => void;
}) {
  return (
    <section className="meal-empty-state" aria-label="Ingen middager planlagt">
      <span className="meal-empty-state__icon" aria-hidden="true">
        🍽️
      </span>
      <div className="meal-empty-state__copy">
        <h3>Ingen middager planlagt</h3>
        <p>Legg inn noen middager for å gjøre hverdagen enklere.</p>
      </div>
      <button type="button" onClick={onCreateFirstMeal}>
        + Legg til første middag
      </button>
    </section>
  );
}

function InlineMealEditor({
  offset,
  value,
  suggestions,
  onChange,
  onClose,
  onSave,
}: {
  offset: number;
  value: string;
  suggestions: MockMeal[];
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: (offset: number, title: string) => void;
}) {
  return (
    <form
      className="meal-inline-editor"
      data-meal-editor={offset}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(offset, value);
      }}
    >
      <div className="meal-inline-editor__input-row">
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
          placeholder="Skriv middag…"
        />
        {value ? (
          <button
            type="button"
            aria-label="Tøm middag"
            onClick={() => onChange("")}
          >
            <X aria-hidden="true" size={18} />
          </button>
        ) : null}
      </div>
      <div className="meal-suggestions" aria-label="Tidligere middager">
        {suggestions.map((meal) => (
          <button
            className="meal-suggestions__row"
            key={meal.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSave(offset, meal.title)}
          >
            <span className="meal-suggestions__visual" aria-hidden="true">
              {meal.icon}
            </span>
            <span>{meal.title}</span>
          </button>
        ))}
        <button
          className="meal-suggestions__all"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
        >
          Se alle tidligere middager
        </button>
      </div>
    </form>
  );
}

function MealMoveToast({ message }: { message: string | null }) {
  return (
    <div
      className={
        message ? "meal-move-toast meal-move-toast--visible" : "meal-move-toast"
      }
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
