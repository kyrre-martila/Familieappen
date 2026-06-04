import type { Meal } from "../../types";
import { normalizeMealTitle } from "./mealFormatters";

export function MealSuggestionList({
  offset,
  suggestions,
  onSave,
}: {
  offset: number;
  suggestions: Meal[];
  onSave: (offset: number, title: string) => void;
}) {
  return (
    <div className="meal-suggestions" aria-label="Tidligere middager">
      {suggestions.length > 0 ? (
        suggestions.map((meal) => (
          <button
            className="meal-suggestions__row"
            key={normalizeMealTitle(meal.title)}
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onSave(offset, meal.title)}
          >
            <span className="meal-suggestions__visual" aria-hidden="true">
              {meal.icon}
            </span>
            <span>{meal.title}</span>
          </button>
        ))
      ) : (
        <p className="meal-suggestions__empty">Ingen treff ennå</p>
      )}
    </div>
  );
}
