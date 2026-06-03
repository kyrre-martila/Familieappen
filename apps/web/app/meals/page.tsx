"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MoreHorizontal, Utensils } from "lucide-react";
import { Badge, Card, PageContainer, SectionHeader } from "../../components/ui";

type MockMealDay = {
  id: string;
  date: string;
  mealName: string;
  updatedAt: string;
};

type TimelineDay = {
  date: string;
  meal: MockMealDay | null;
};

type InlineEditorState = {
  date: string;
  dayId: string | null;
  value: string;
};

type ToastState = {
  action?: {
    label: string;
    onClick: () => void;
  };
  message: string;
};

const MOCK_TODAY = "2026-06-03";
const TIMELINE_DAY_COUNT = 8;
const PREVIOUS_MEALS = ["Taco", "Pizza", "Fiskegrateng", "Pasta med kylling", "Lasagne", "Fiskekaker", "Kjøttsuppe", "Hjemmelaget burger"];

const INITIAL_MEAL_DAYS: MockMealDay[] = [
  { id: "meal-2026-06-03", date: "2026-06-03", mealName: "Taco", updatedAt: "2026-06-02T17:30:00.000Z" },
  { id: "meal-2026-06-05", date: "2026-06-05", mealName: "Fiskegrateng", updatedAt: "2026-06-01T16:15:00.000Z" },
  { id: "meal-2026-06-07", date: "2026-06-07", mealName: "Pasta med kylling", updatedAt: "2026-05-31T15:45:00.000Z" }
];

export default function MealsPage() {
  const [mealDays, setMealDays] = useState<MockMealDay[]>(INITIAL_MEAL_DAYS);
  const [activeEditor, setActiveEditor] = useState<InlineEditorState | null>(null);
  const [menuMeal, setMenuMeal] = useState<MockMealDay | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const timelineDays = useMemo(() => buildTimeline(MOCK_TODAY, TIMELINE_DAY_COUNT, mealDays), [mealDays]);
  const plannedDays = mealDays.length;
  const suggestionMeals = useMemo(() => getSuggestionSource(mealDays), [mealDays]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showToast(nextToast: ToastState) {
    setToast(nextToast);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => setToast(null), nextToast.action ? 6500 : 2800);
  }

  function startCreate(date: string) {
    setMenuMeal(null);
    setActiveEditor({ date, dayId: null, value: "" });
  }

  function startEdit(meal: MockMealDay) {
    setMenuMeal(null);
    setActiveEditor({ date: meal.date, dayId: meal.id, value: meal.mealName });
  }

  function saveInlineMeal(editor: InlineEditorState, nextValue = editor.value) {
    const mealName = nextValue.trim();

    if (!mealName) {
      setActiveEditor(null);
      return;
    }

    const updatedAt = new Date().toISOString();

    setMealDays((currentDays) => {
      const existingDay = editor.dayId ? currentDays.find((meal) => meal.id === editor.dayId) : currentDays.find((meal) => meal.date === editor.date);
      const savedMeal: MockMealDay = existingDay
        ? { ...existingDay, mealName, updatedAt }
        : { id: `mock-meal-${editor.date}-${Date.now()}`, date: editor.date, mealName, updatedAt };

      return [savedMeal, ...currentDays.filter((meal) => meal.id !== savedMeal.id && meal.date !== savedMeal.date)].sort(sortMealDays);
    });

    setActiveEditor(null);
    showToast({ message: "Middag lagret" });
  }

  function cancelInlineMeal() {
    setActiveEditor(null);
  }

  function updateEditorValue(value: string) {
    setActiveEditor((current) => (current ? { ...current, value } : current));
  }

  function deleteMeal(meal: MockMealDay) {
    setMenuMeal(null);
    setActiveEditor((current) => (current?.dayId === meal.id ? null : current));
    setMealDays((currentDays) => currentDays.filter((day) => day.id !== meal.id));
    showToast({
      action: {
        label: "Angre",
        onClick: () => {
          setMealDays((currentDays) => [meal, ...currentDays.filter((day) => day.id !== meal.id && day.date !== meal.date)].sort(sortMealDays));
          setToast(null);
        }
      },
      message: "Middag slettet — Angre"
    });
  }

  return (
    <PageContainer>
      <section className="meals-page meals-page--inline" aria-labelledby="meals-title">
        <div className="meals-page__header">
          <div className="meals-page__copy">
            <Badge tone="accent">Middagsplan</Badge>
            <h1 id="meals-title" className="meals-page__title">
              Planlegg middag
            </h1>
            <p className="meals-page__description">En rolig tidslinje for enkle middager. Skriv bare hva dere skal spise.</p>
          </div>
          <Badge tone="neutral">Mock/provider state</Badge>
        </div>

        <Card className="meals-card meals-timeline-card" tone="soft">
          <SectionHeader action={<Badge tone="success">{plannedDays} planlagt</Badge>} eyebrow="Denne uken" title="Middager" />

          <ul className="meals-timeline" aria-label="Middagstidslinje">
            {timelineDays.map((day) => {
              const editor = activeEditor?.date === day.date ? activeEditor : null;

              return (
                <li className="meals-timeline__item" key={day.date}>
                  <div className="meals-timeline__date" aria-label={formatFullDate(day.date)}>
                    <span className="meals-timeline__weekday">{formatWeekday(day.date)}</span>
                    <span className="meals-timeline__day">{formatDayNumber(day.date)}</span>
                  </div>

                  <div className="meals-timeline__content">
                    {editor ? (
                      <InlineMealEditor
                        editor={editor}
                        onCancel={cancelInlineMeal}
                        onChange={updateEditorValue}
                        onSave={saveInlineMeal}
                        suggestions={suggestionMeals}
                      />
                    ) : day.meal ? (
                      <MealCard meal={day.meal} onOpenMenu={setMenuMeal} />
                    ) : (
                      <button className="meal-empty-card" onClick={() => startCreate(day.date)} type="button">
                        <span className="meal-empty-card__plus">+</span>
                        <span>Legg til middag</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {toast ? (
          <div className="meals-toast" role="status">
            <span>{toast.message}</span>
            {toast.action ? (
              <button className="meals-toast__action" onClick={toast.action.onClick} type="button">
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}

        {menuMeal ? <MealActionSheet meal={menuMeal} onClose={() => setMenuMeal(null)} onDelete={deleteMeal} onEdit={startEdit} /> : null}
      </section>
    </PageContainer>
  );
}

function MealCard({ meal, onOpenMenu }: { meal: MockMealDay; onOpenMenu: (meal: MockMealDay) => void }) {
  return (
    <article className="meal-plan-card">
      <span className="meal-plan-card__visual" aria-hidden="true">
        <Utensils size={19} strokeWidth={2.4} />
      </span>
      <div className="meal-plan-card__body">
        <p className="meal-plan-card__label">Middag</p>
        <h2 className="meal-plan-card__title">{meal.mealName}</h2>
      </div>
      <button className="meal-plan-card__menu" onClick={() => onOpenMenu(meal)} type="button" aria-label={`Åpne meny for ${meal.mealName}`}>
        <MoreHorizontal size={21} strokeWidth={2.5} />
      </button>
    </article>
  );
}

function InlineMealEditor({
  editor,
  onCancel,
  onChange,
  onSave,
  suggestions
}: {
  editor: InlineEditorState;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: (editor: InlineEditorState, value?: string) => void;
  suggestions: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const filteredSuggestions = filterSuggestions(suggestions, editor.value);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editor.dayId, editor.date]);

  function finishEditor() {
    if (editor.value.trim()) {
      onSave(editor);
    } else {
      onCancel();
    }
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (!editorRef.current?.contains(document.activeElement)) {
        finishEditor();
      }
    }, 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSave(editor);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="meal-inline-editor" onBlur={handleBlur} ref={editorRef}>
      <label className="meal-inline-editor__label">
        <span className="sr-only">Middag</span>
        <input
          className="meal-inline-editor__input"
          maxLength={120}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Skriv middag…"
          ref={inputRef}
          value={editor.value}
        />
      </label>
      <div className="meal-suggestions" aria-label="Tidligere middager">
        {filteredSuggestions.map((suggestion) => (
          <button
            className="meal-suggestions__item"
            key={suggestion}
            onClick={() => onSave(editor, suggestion)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            {suggestion}
          </button>
        ))}
        <button className="meal-suggestions__all" onMouseDown={(event) => event.preventDefault()} type="button">
          Se alle tidligere middager
        </button>
      </div>
    </div>
  );
}

function MealActionSheet({
  meal,
  onClose,
  onDelete,
  onEdit
}: {
  meal: MockMealDay;
  onClose: () => void;
  onDelete: (meal: MockMealDay) => void;
  onEdit: (meal: MockMealDay) => void;
}) {
  return (
    <div className="meal-sheet" role="presentation" onClick={onClose}>
      <div className="meal-sheet__panel" role="dialog" aria-label={`Valg for ${meal.mealName}`} onClick={(event) => event.stopPropagation()}>
        <div className="meal-sheet__handle" aria-hidden="true" />
        <p className="meal-sheet__title">{meal.mealName}</p>
        <button className="meal-sheet__button" onClick={() => onEdit(meal)} type="button">
          Rediger
        </button>
        <button className="meal-sheet__button meal-sheet__button--danger" onClick={() => onDelete(meal)} type="button">
          Slett middag
        </button>
        <button className="meal-sheet__button meal-sheet__button--muted" onClick={onClose} type="button">
          Avbryt
        </button>
      </div>
    </div>
  );
}

function buildTimeline(startDate: string, dayCount: number, mealDays: MockMealDay[]): TimelineDay[] {
  const start = parseDate(startDate);

  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(start, index).toISOString().slice(0, 10);

    return {
      date,
      meal: mealDays.find((meal) => meal.date === date) ?? null
    };
  });
}

function filterSuggestions(suggestions: string[], query: string): string[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("nb-NO");

  if (!normalizedQuery) {
    return suggestions;
  }

  return suggestions.filter((suggestion) => suggestion.toLocaleLowerCase("nb-NO").includes(normalizedQuery));
}

function getSuggestionSource(mealDays: MockMealDay[]): string[] {
  const source = [...mealDays]
    .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
    .map((meal) => meal.mealName);

  return [...source, ...PREVIOUS_MEALS].filter((mealName, index, allMeals) => allMeals.indexOf(mealName) === index);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatFullDate(date: string): string {
  return parseDate(date).toLocaleDateString("nb-NO", { day: "numeric", month: "long", timeZone: "UTC", weekday: "long" });
}

function formatWeekday(date: string): string {
  return parseDate(date).toLocaleDateString("nb-NO", { timeZone: "UTC", weekday: "short" });
}

function formatDayNumber(date: string): string {
  return parseDate(date).toLocaleDateString("nb-NO", { day: "2-digit", timeZone: "UTC" });
}

function sortMealDays(first: MockMealDay, second: MockMealDay) {
  return first.date.localeCompare(second.date);
}
