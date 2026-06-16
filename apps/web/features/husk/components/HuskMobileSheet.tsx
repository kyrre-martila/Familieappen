import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const sheet = (
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

  return isMounted ? createPortal(sheet, document.body) : sheet;
}
