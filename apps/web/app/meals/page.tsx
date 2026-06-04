"use client";

import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  Suspense,
  useState,
  type DragEvent,
} from "react";

import { AppShell } from "../../components/AppShell";
import { ProtectedFamilyRoute } from "../../components/ProtectedFamilyRoute";
import { PageContainer } from "../../components/ui";
import { MealPlanEmptyState } from "../../features/meals/components/MealEmptyState";
import {
  MealMoveModeButton,
  MealMoveModeHelper,
  MealMoveToast,
} from "../../features/meals/components/MealMoveMode";
import { MealReminderCard } from "../../features/meals/components/MealReminderCard";
import { MealTimeline } from "../../features/meals/components/MealTimeline";
import { normalizeMealTitle } from "../../features/meals/components/mealFormatters";
import { useMeals } from "../../features/meals/hooks/useMeals";
import type { Meal } from "../../features/types";

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

function parseDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

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

function getDateOffset(fromDate: Date, targetDateString: string) {
  const targetDate = parseDateString(targetDateString);

  if (!targetDate) {
    return null;
  }

  return Math.round((targetDate.getTime() - fromDate.getTime()) / 86400000);
}

function getInitialFocusOffset(today: Date, dateParam: string | null) {
  return dateParam ? getDateOffset(today, dateParam) : null;
}

function getInitialOffsetRange(focusOffset: number | null) {
  return {
    start: Math.min(-initialPastDays, focusOffset ?? -initialPastDays),
    end: Math.max(initialFutureDays, focusOffset ?? initialFutureDays),
  };
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

function MealsPageContent() {
  const searchParams = useSearchParams();
  const today = useMemo(() => getToday(), []);
  const initialFocusOffset = useMemo(
    () => getInitialFocusOffset(today, searchParams.get("date")),
    [searchParams, today],
  );
  const initialOffsetRange = useMemo(
    () => getInitialOffsetRange(initialFocusOffset),
    [initialFocusOffset],
  );
  const [startOffset, setStartOffset] = useState(initialOffsetRange.start);
  const [endOffset, setEndOffset] = useState(initialOffsetRange.end);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [draggedOffset, setDraggedOffset] = useState<number | null>(null);
  const [activeDropOffset, setActiveDropOffset] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoMeal, setUndoMeal] = useState<{
    offset: number;
    meal: Meal;
  } | null>(null);
  const [editingOffset, setEditingOffset] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const editingOffsetRef = useRef<number | null>(null);
  const inputValueRef = useRef("");
  const {
    mealCatalog,
    mealsByOffset,
    updateMeal,
    deleteMeal: deleteMealFromStore,
    restoreMeal,
    moveMeal,
    error: mealError,
    refresh: refreshMeals,
  } = useMeals();
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLElement | null>(null);
  const hasInitialScrollRef = useRef(false);
  const handledRouteActionRef = useRef<string | null>(null);

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
  const plannedMealCount = mealsByOffset.size;
  const previousMealSuggestions = useMemo(() => {
    const seenMealTitles = new Set<string>();

    return Array.from(mealsByOffset.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, meal]) => meal)
      .filter((meal) => {
        const normalizedTitle = normalizeMealTitle(meal.title);

        if (seenMealTitles.has(normalizedTitle)) {
          return false;
        }

        seenMealTitles.add(normalizedTitle);
        return true;
      });
  }, [mealsByOffset]);

  const visibleSuggestions = useMemo(() => {
    const normalizedQuery = normalizeMealTitle(inputValue);
    const suggestions = [
      ...previousMealSuggestions,
      ...mealCatalog.filter(
        (meal) =>
          !previousMealSuggestions.some(
            (previousMeal) =>
              normalizeMealTitle(previousMeal.title) ===
              normalizeMealTitle(meal.title),
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
  }, [inputValue, mealCatalog, previousMealSuggestions]);

  useEffect(() => {
    editingOffsetRef.current = editingOffset;
  }, [editingOffset]);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    if (hasInitialScrollRef.current) {
      return;
    }

    hasInitialScrollRef.current = true;
    window.requestAnimationFrame(() => {
      if (initialFocusOffset !== null) {
        document
          .querySelector(`[data-meal-day="${initialFocusOffset}"]`)
          ?.scrollIntoView({ block: "start" });
        return;
      }

      todayRef.current?.scrollIntoView({ block: "start" });
    });
  }, [initialFocusOffset]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    if (mealError) {
      showToast(mealError);
    }
  }, [mealError]);

  useEffect(() => {
    const createMode = searchParams.get("create") === "1";
    const dateParam = searchParams.get("date");
    const routeActionKey = `${dateParam ?? "today"}:${createMode ? "create" : "focus"}`;

    if (handledRouteActionRef.current === routeActionKey) {
      return;
    }

    handledRouteActionRef.current = routeActionKey;

    if (createMode) {
      const preferredOffset = dateParam ? getDateOffset(today, dateParam) : 0;
      const startSearchOffset = preferredOffset ?? 0;
      let firstEmptyOffset = startSearchOffset;

      while (mealsByOffset.has(firstEmptyOffset)) {
        firstEmptyOffset += 1;
      }

      openEditor(firstEmptyOffset, null);
      return;
    }

    if (dateParam) {
      const focusOffset = getDateOffset(today, dateParam);

      if (focusOffset === null) {
        return;
      }

      setStartOffset((currentOffset) => Math.min(currentOffset, focusOffset));
      setEndOffset((currentOffset) => Math.max(currentOffset, focusOffset));
      window.requestAnimationFrame(() => {
        document
          .querySelector(`[data-meal-day="${focusOffset}"]`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, [mealsByOffset, searchParams, today]);

  function commitOpenEditor() {
    const currentEditingOffset = editingOffsetRef.current;
    const currentInputValue = inputValueRef.current.trim();

    if (currentEditingOffset === null) {
      return false;
    }

    if (!currentInputValue) {
      closeEditor();
      return false;
    }

    saveMeal(currentEditingOffset, currentInputValue, { silent: true });
    return true;
  }

  function openEditor(offset: number, meal?: Meal | null) {
    commitOpenEditor();
    exitMoveMode();
    setStartOffset((currentOffset) => Math.min(currentOffset, offset));
    setEndOffset((currentOffset) => Math.max(currentOffset, offset));
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

  function saveMeal(
    offset: number,
    title: string,
    options: { silent?: boolean } = {},
  ) {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      closeEditor();
      return;
    }

    const existingMeal = mealsByOffset.get(offset);
    const visibleStateChanged = !existingMeal || normalizeMealTitle(existingMeal.title) !== normalizeMealTitle(trimmedTitle);

    if (!visibleStateChanged) {
      closeEditor();
      return;
    }

    void updateMeal({ offset, title: trimmedTitle }).catch(() => undefined);
    closeEditor();

    if (!options.silent) {
      showToast("Middag lagret");
    }
  }

  function deleteMeal(offset: number) {
    const mealToDelete = mealsByOffset.get(offset);

    if (!mealToDelete) {
      closeEditor();
      return;
    }

    void deleteMealFromStore({ offset }).catch(() => undefined);
    setUndoMeal({ offset, meal: mealToDelete });
    closeEditor();
    showToast("Middag slettet");
  }

  function undoDeleteMeal() {
    if (!undoMeal) {
      return;
    }

    void restoreMeal(undoMeal.offset, undoMeal.meal).catch(() => undefined);
    setUndoMeal(null);
    showToast("Middag lagt tilbake");
  }

  function showToast(message: string) {
    if (message !== "Middag slettet") {
      setUndoMeal(null);
    }

    setToastMessage(message);
  }

  function enterMoveMode() {
    const savedInlineMeal = commitOpenEditor();

    if (plannedMealCount === 0 && !savedInlineMeal) {
      showToast("Legg til en middag før du flytter");
      return;
    }

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

    if (!Number.isInteger(sourceOffset) || sourceOffset === targetOffset) {
      return;
    }

    const sourceMeal = mealsByOffset.get(sourceOffset);

    if (!sourceMeal) {
      return;
    }

    const targetMeal = mealsByOffset.get(targetOffset);

    void moveMeal({ sourceOffset, targetOffset }).catch(() => undefined);

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
              <MealReminderCard reminderText={reminderText} />
            ) : null}
            {!hasFutureMeals ? (
              <MealPlanEmptyState
                onCreateFirstMeal={() => openEditor(0, null)}
              />
            ) : null}

            <MealTimeline
              activeDropOffset={activeDropOffset}
              bottomSentinelRef={bottomSentinelRef}
              days={days}
              draggedOffset={draggedOffset}
              editingOffset={editingOffset}
              inputValue={inputValue}
              isMoveMode={isMoveMode}
              suggestions={visibleSuggestions}
              todayRef={todayRef}
              topSentinelRef={topSentinelRef}
              onCloseEditor={closeEditor}
              onCommitEditor={saveMeal}
              onDayDragLeave={handleDayDragLeave}
              onDayDragOver={handleDayDragOver}
              onDayDrop={handleDayDrop}
              onDeleteMeal={deleteMeal}
              onInputValueChange={setInputValue}
              onMealDragEnd={handleDragEnd}
              onMealDragStart={handleMealDragStart}
              onOpenEditor={openEditor}
              onSaveMeal={saveMeal}
            />

            <MealMoveModeHelper isMoveMode={isMoveMode} />

            <MealMoveModeButton
              isMoveMode={isMoveMode}
              plannedMealCount={plannedMealCount}
              onMoveAction={handleMoveAction}
            />

            <MealMoveToast
              message={toastMessage}
              onUndo={
                toastMessage === "Middag slettet" && undoMeal
                  ? undoDeleteMeal
                  : undefined
              }
              onRetry={mealError ? () => void refreshMeals() : undefined}
            />
          </section>
        </PageContainer>
      </AppShell>
    </ProtectedFamilyRoute>
  );
}

export default function MealsPage() {
  return (
    <Suspense fallback={null}>
      <MealsPageContent />
    </Suspense>
  );
}
