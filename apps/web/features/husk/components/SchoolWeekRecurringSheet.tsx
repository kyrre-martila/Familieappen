import { RotateCcw } from "lucide-react";

export function SchoolWeekRecurringSheet({
  itemTitle,
  onClose,
  onChoose,
}: {
  itemTitle: string;
  onClose: () => void;
  onChoose: (scope: "occurrence" | "series") => void;
}) {
  return (
    <div className="husk-school-sheet husk-school-sheet--open">
      <button
        className="husk-school-sheet__backdrop"
        type="button"
        aria-label="Lukk valg for gjentakelse"
        onClick={onClose}
      />
      <section
        aria-labelledby="husk-school-recurring-title"
        aria-modal="true"
        className="husk-school-sheet__panel husk-school-sheet__panel--choice"
        role="dialog"
      >
        <div className="husk-school-sheet__handle" aria-hidden="true" />
        <div className="husk-school-choice__intro">
          <span className="husk-school-choice__icon" aria-hidden="true">
            <RotateCcw size={20} strokeWidth={2.4} />
          </span>
          <p>Dette er en gjentakende husk</p>
          <h3 id="husk-school-recurring-title">Hva vil du endre?</h3>
          <span>{itemTitle}</span>
        </div>
        <div className="husk-school-choice__options">
          <button type="button" onClick={() => onChoose("occurrence")}>
            Kun denne gangen
          </button>
          <button type="button" onClick={() => onChoose("series")}>
            Hele serien
          </button>
          <button type="button" onClick={onClose}>
            Avbryt
          </button>
        </div>
      </section>
    </div>
  );
}
