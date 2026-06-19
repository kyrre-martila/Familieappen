import type { DragEvent, RefObject } from "react";

import type { Meal } from "../../types";
import { MealDayCard } from "./MealDayCard";

export type MealTimelineDay = {
  date: Date;
  offset: number;
  meal: Meal | null;
};

export function MealTimeline({
  activeDropOffset,
  bottomSentinelRef,
  days,
  draggedOffset,
  editingOffset,
  inputValue,
  isMoveMode,
  suggestions,
  timelineRef,
  todayRef,
  topSentinelRef,
  onCloseEditor,
  onCommitEditor,
  onDayDragLeave,
  onDayDragOver,
  onDayDrop,
  onDeleteMeal,
  onInputValueChange,
  onMealDragEnd,
  onMealDragStart,
  onOpenEditor,
  onSaveMeal,
}: {
  activeDropOffset: number | null;
  bottomSentinelRef: RefObject<HTMLDivElement | null>;
  days: MealTimelineDay[];
  draggedOffset: number | null;
  editingOffset: number | null;
  inputValue: string;
  isMoveMode: boolean;
  suggestions: Meal[];
  timelineRef: RefObject<HTMLDivElement | null>;
  todayRef: RefObject<HTMLElement | null>;
  topSentinelRef: RefObject<HTMLDivElement | null>;
  onCloseEditor: () => void;
  onCommitEditor: (offset: number, title: string) => void;
  onDayDragLeave: (offset: number) => void;
  onDayDragOver: (offset: number, event: DragEvent<HTMLElement>) => void;
  onDayDrop: (offset: number, event: DragEvent<HTMLElement>) => void;
  onDeleteMeal: (offset: number) => void;
  onInputValueChange: (value: string) => void;
  onMealDragEnd: () => void;
  onMealDragStart: (offset: number, event: DragEvent<HTMLDivElement>) => void;
  onOpenEditor: (offset: number, meal?: Meal | null) => void;
  onSaveMeal: (offset: number, title: string) => void;
}) {
  return (
    <div
      className="meal-timeline"
      ref={timelineRef}
      aria-label="Middag fremover og bakover i tid"
    >
      <div
        className="meal-timeline__sentinel"
        ref={topSentinelRef}
        aria-hidden="true"
      />
      {days.map((day) => (
        <MealDayCard
          activeDropOffset={activeDropOffset}
          date={day.date}
          draggedOffset={draggedOffset}
          isMoveMode={isMoveMode}
          key={day.offset}
          meal={day.meal}
          offset={day.offset}
          onDayDragLeave={onDayDragLeave}
          onDayDragOver={onDayDragOver}
          onDayDrop={onDayDrop}
          onMealDragEnd={onMealDragEnd}
          onMealDragStart={onMealDragStart}
          onOpenEditor={onOpenEditor}
          onDeleteMeal={onDeleteMeal}
          onSaveMeal={onSaveMeal}
          suggestions={suggestions}
          editingOffset={editingOffset}
          inputValue={inputValue}
          onInputValueChange={onInputValueChange}
          onCloseEditor={onCloseEditor}
          onCommitEditor={onCommitEditor}
          todayRef={day.offset === 0 ? todayRef : undefined}
        />
      ))}
      <div
        className="meal-timeline__sentinel"
        ref={bottomSentinelRef}
        aria-hidden="true"
      />
    </div>
  );
}
