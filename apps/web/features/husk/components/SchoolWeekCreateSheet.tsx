import { Check, X } from "lucide-react";

import type { SchoolCreateDraft } from "../types";
import {
  reminderIcons,
  schoolIconOptions,
  schoolQuickExamples,
} from "./huskConfig";

export function SchoolWeekCreateSheet({
  childName,
  draft,
  onChange,
  onClose,
  onSave,
}: {
  childName: string;
  draft: SchoolCreateDraft;
  onChange: (draft: SchoolCreateDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      aria-hidden={!draft}
      className="husk-school-sheet husk-school-sheet--open"
    >
      <button
        className="husk-school-sheet__backdrop"
        type="button"
        aria-label="Lukk opprett husk"
        onClick={onClose}
      />
      <section
        aria-labelledby="husk-school-create-title"
        aria-modal="true"
        className="husk-school-sheet__panel"
        role="dialog"
      >
        <div className="husk-school-sheet__handle" aria-hidden="true" />
        <div className="husk-school-sheet__header">
          <div>
            <p className="husk-school-sheet__eyebrow">
              {childName} • {draft.dateLabel}
            </p>
            <h3
              className="husk-school-sheet__title"
              id="husk-school-create-title"
            >
              Hva må huskes?
            </h3>
          </div>
          <button
            className="husk-school-sheet__close"
            type="button"
            aria-label="Lukk"
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="husk-school-sheet__content">
          <label className="husk-school-field">
            <span>Tittel</span>
            <input
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              placeholder="Hva må huskes?"
              type="text"
              value={draft.title}
            />
          </label>

          <div className="husk-school-field">
            <span>Ikon</span>
            <div className="husk-school-icon-grid">
              {schoolIconOptions.map((option) => {
                const Icon = reminderIcons[option.value];
                const isSelected = draft.icon === option.value;

                return (
                  <button
                    className={`husk-school-icon-option${isSelected ? " husk-school-icon-option--selected" : ""}`}
                    key={option.value}
                    onClick={() => onChange({ ...draft, icon: option.value })}
                    type="button"
                    aria-pressed={isSelected}
                  >
                    <Icon aria-hidden="true" size={19} strokeWidth={2.3} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="husk-school-quick" aria-label="Raske forslag">
            {schoolQuickExamples.map((example) => (
              <button
                className="husk-school-quick__chip"
                key={example}
                onClick={() => onChange({ ...draft, title: example })}
                type="button"
              >
                {example}
              </button>
            ))}
          </div>

          <label className="husk-school-repeat">
            <input
              checked={draft.recurring}
              onChange={(event) =>
                onChange({ ...draft, recurring: event.target.checked })
              }
              type="checkbox"
            />
            <span className="husk-school-repeat__box" aria-hidden="true">
              {draft.recurring ? <Check size={17} strokeWidth={3} /> : null}
            </span>
            <span>Gjenta ukentlig</span>
          </label>

          {draft.recurring ? (
            <label className="husk-school-field">
              <span>Valgfri sluttdato</span>
              <input
                aria-label="Valgfri sluttdato for ukentlig gjentakelse"
                onChange={(event) =>
                  onChange({ ...draft, endDate: event.target.value })
                }
                type="date"
                value={draft.endDate}
              />
            </label>
          ) : null}
        </div>

        <div className="husk-school-sheet__actions">
          <button
            className="husk-school-sheet__action husk-school-sheet__action--secondary"
            type="button"
            onClick={onClose}
          >
            Avbryt
          </button>
          <button
            className="husk-school-sheet__action husk-school-sheet__action--primary"
            type="button"
            onClick={onSave}
            disabled={!draft.title.trim()}
          >
            Lagre
          </button>
        </div>
      </section>
    </div>
  );
}
