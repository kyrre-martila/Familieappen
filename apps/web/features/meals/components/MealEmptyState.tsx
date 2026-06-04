import { Plus, Utensils } from "lucide-react";

export function MealPlanEmptyState({
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

export function EmptyMealCta({
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
