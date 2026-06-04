import { useRef, type FocusEvent } from "react";
import { X } from "lucide-react";

import type { Meal } from "../../types";
import { MealSuggestionList } from "./MealSuggestionList";

export function MealInlineEditor({
  offset,
  value,
  suggestions,
  onChange,
  onClose,
  onCommit,
  onSave,
}: {
  offset: number;
  value: string;
  suggestions: Meal[];
  onChange: (value: string) => void;
  onClose: () => void;
  onCommit: (offset: number, title: string) => void;
  onSave: (offset: number, title: string) => void;
}) {
  const editorRef = useRef<HTMLFormElement | null>(null);
  const trimmedValue = value.trim();

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && editorRef.current?.contains(nextTarget)) {
      return;
    }

    if (trimmedValue) {
      onCommit(offset, trimmedValue);
      return;
    }

    onClose();
  }

  return (
    <form
      className="meal-inline-editor"
      data-meal-editor={offset}
      ref={editorRef}
      onBlur={handleBlur}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(offset, value);
      }}
    >
      <div className="meal-inline-editor__input-row">
        <input
          autoFocus
          enterKeyHint="done"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
          placeholder="Skriv middag…"
        />
        {value ? (
          <button
            type="button"
            aria-label="Tøm middag"
            onClick={() => onChange("")}
          >
            <X aria-hidden="true" size={18} />
          </button>
        ) : null}
      </div>
      <div className="meal-inline-editor__actions">
        <button type="button" onClick={onClose}>
          Avbryt
        </button>
        <button type="submit" disabled={!trimmedValue}>
          Lagre
        </button>
      </div>
      <MealSuggestionList offset={offset} suggestions={suggestions} onSave={onSave} />
    </form>
  );
}
