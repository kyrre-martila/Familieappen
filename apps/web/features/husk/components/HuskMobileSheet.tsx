import type { ReactNode } from "react";

export function HuskMobileSheet({
  children,
  isOpen,
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  isOpen: boolean;
  labelledBy: string;
  onClose: () => void;
}) {
  return (
    <div
      aria-hidden={!isOpen}
      className={`calendar-filter-sheet${isOpen ? " calendar-filter-sheet--open" : ""}`}
    >
      <button
        className="calendar-filter-sheet__backdrop"
        type="button"
        aria-label="Lukk"
        onClick={onClose}
      />
      <section
        aria-labelledby={labelledBy}
        aria-modal="true"
        className="calendar-filter-sheet__panel"
        role="dialog"
      >
        <div className="calendar-filter-sheet__handle" aria-hidden="true" />
        {children}
      </section>
    </div>
  );
}
