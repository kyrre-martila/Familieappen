import { useState, type DragEvent, type RefObject } from "react";
import { GripVertical, MoreHorizontal } from "lucide-react";

import type { Meal } from "../../types";
import { EmptyMealCta } from "./MealEmptyState";
import { MealInlineEditor } from "./MealInlineEditor";
import { formatTimelineDate } from "./mealFormatters";

export function MealDayCard({
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
  onDeleteMeal,
  onSaveMeal,
  suggestions,
  editingOffset,
  inputValue,
  onInputValueChange,
  onCloseEditor,
  onCommitEditor,
  todayRef,
}: {
  activeDropOffset: number | null;
  date: Date;
  draggedOffset: number | null;
  isMoveMode: boolean;
  meal: Meal | null;
  offset: number;
  onDayDragLeave: (offset: number) => void;
  onDayDragOver: (offset: number, event: DragEvent<HTMLElement>) => void;
  onDayDrop: (offset: number, event: DragEvent<HTMLElement>) => void;
  onMealDragEnd: () => void;
  onMealDragStart: (offset: number, event: DragEvent<HTMLDivElement>) => void;
  onOpenEditor: (offset: number, meal?: Meal | null) => void;
  onDeleteMeal: (offset: number) => void;
  onSaveMeal: (offset: number, title: string) => void;
  suggestions: Meal[];
  editingOffset: number | null;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  onCloseEditor: () => void;
  onCommitEditor: (offset: number, title: string) => void;
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
      data-meal-day={offset}
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
          <MealInlineEditor
            offset={offset}
            value={inputValue}
            suggestions={suggestions}
            onChange={onInputValueChange}
            onClose={onCloseEditor}
            onCommit={onCommitEditor}
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
            onDeleteMeal={onDeleteMeal}
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
  onDeleteMeal,
}: {
  isDragging: boolean;
  isMoveMode: boolean;
  meal: Meal;
  offset: number;
  onDragEnd: () => void;
  onDragStart: (offset: number, event: DragEvent<HTMLDivElement>) => void;
  onOpenEditor: (offset: number, meal: Meal) => void;
  onDeleteMeal: (offset: number) => void;
}) {
  const cardClassName = [
    "meal-card",
    isMoveMode ? "meal-card--move-mode" : "",
    isDragging ? "meal-card--dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const mealSummary = (
    <>
      <span className="meal-card__visual" aria-hidden="true">
        <span>{meal.icon}</span>
      </span>
      <span className="meal-card__copy">
        <span className="meal-card__eyebrow">Middag</span>
        <span className="meal-card__title">{meal.title}</span>
      </span>
    </>
  );

  return (
    <div
      className={cardClassName}
      draggable={isMoveMode}
      onDragEnd={onDragEnd}
      onDragStart={(event) => onDragStart(offset, event)}
    >
      {isMoveMode ? (
        mealSummary
      ) : (
        <button
          className="meal-card__tap-target"
          type="button"
          aria-label={`Rediger ${meal.title}`}
          onClick={() => onOpenEditor(offset, meal)}
        >
          {mealSummary}
        </button>
      )}
      {isMoveMode ? (
        <span
          className="meal-card__drag-handle"
          aria-label={`Flytt ${meal.title}`}
          role="img"
        >
          <GripVertical aria-hidden="true" size={20} strokeWidth={2.4} />
        </span>
      ) : (
        <span
          className="meal-card__menu-wrap"
          onBlur={(event) => {
            if (
              !(
                event.relatedTarget instanceof Node &&
                event.currentTarget.contains(event.relatedTarget)
              )
            ) {
              setIsMenuOpen(false);
            }
          }}
        >
          <button
            className="meal-card__menu"
            type="button"
            aria-expanded={isMenuOpen}
            aria-label={`Åpne meny for ${meal.title}`}
            title="Rediger / Slett"
            onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          >
            <MoreHorizontal aria-hidden="true" size={20} />
          </button>
          {isMenuOpen ? (
            <span className="meal-card__menu-popover" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenEditor(offset, meal);
                }}
              >
                Rediger
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onDeleteMeal(offset);
                }}
              >
                Slett
              </button>
            </span>
          ) : null}
        </span>
      )}
    </div>
  );
}
