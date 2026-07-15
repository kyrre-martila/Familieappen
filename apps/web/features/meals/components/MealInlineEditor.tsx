import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import type { Meal } from "../../types";
import { MealSuggestionList } from "./MealSuggestionList";

type EditorRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

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
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLFormElement | null>(null);
  const [editorRect, setEditorRect] = useState<EditorRect | null>(null);
  const trimmedValue = value.trim();

  const updateEditorRect = useCallback(() => {
    const anchor = anchorRef.current;

    if (!anchor) {
      return;
    }

    const nextRect = anchor.getBoundingClientRect();

    setEditorRect((currentRect) => {
      const roundedRect = {
        height: nextRect.height,
        left: nextRect.left,
        top: nextRect.top,
        width: nextRect.width,
      };

      if (
        currentRect &&
        Math.abs(currentRect.height - roundedRect.height) < 0.5 &&
        Math.abs(currentRect.left - roundedRect.left) < 0.5 &&
        Math.abs(currentRect.top - roundedRect.top) < 0.5 &&
        Math.abs(currentRect.width - roundedRect.width) < 0.5
      ) {
        return currentRect;
      }

      return roundedRect;
    });
  }, []);

  useLayoutEffect(() => {
    updateEditorRect();

    const resizeObserver = new ResizeObserver(updateEditorRect);
    const anchor = anchorRef.current;

    if (anchor) {
      resizeObserver.observe(anchor);
    }

    window.addEventListener("resize", updateEditorRect);
    window.addEventListener("scroll", updateEditorRect, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateEditorRect);
      window.removeEventListener("scroll", updateEditorRect, true);
    };
  }, [updateEditorRect]);

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

  const editor = (
    <form
      className="meal-inline-editor"
      data-meal-editor={offset}
      ref={editorRef}
      style={
        editorRect
          ? {
              left: `${editorRect.left}px`,
              top: `${editorRect.top}px`,
              width: `${editorRect.width}px`,
            }
          : undefined
      }
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

  return (
    <>
      <div
        className="meal-inline-editor-anchor"
        data-meal-editor-anchor={offset}
        ref={anchorRef}
        aria-hidden="true"
      />
      {editorRect ? createPortal(editor, document.body) : null}
    </>
  );
}
