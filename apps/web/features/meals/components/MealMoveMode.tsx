import { ArrowUpDown, Check } from "lucide-react";

export function MealMoveModeButton({
  isMoveMode,
  onMoveAction,
}: {
  isMoveMode: boolean;
  onMoveAction: () => void;
}) {
  return (
    <button
      className={
        isMoveMode
          ? "meal-planner__move-button meal-planner__move-button--done"
          : "meal-planner__move-button"
      }
      type="button"
      aria-pressed={isMoveMode}
      onClick={onMoveAction}
    >
      {isMoveMode ? (
        <Check aria-hidden="true" size={18} />
      ) : (
        <ArrowUpDown aria-hidden="true" size={18} />
      )}
      {isMoveMode ? "Avslutt flyttemodus" : "Flytt middager"}
    </button>
  );
}

export function MealMoveToast({
  message,
  onUndo,
  retryLabel,
  onRetry,
}: {
  message: string | null;
  onUndo?: () => void;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className={
        message ? "meal-move-toast meal-move-toast--visible" : "meal-move-toast"
      }
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>{message}</span>
      {onUndo ? (
        <button type="button" onClick={onUndo}>
          Angre
        </button>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          {retryLabel ?? "Prøv igjen"}
        </button>
      ) : null}
    </div>
  );
}
