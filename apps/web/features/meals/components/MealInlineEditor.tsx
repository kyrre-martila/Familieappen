import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import type { Meal } from "../../types";
import { MealSuggestionList } from "./MealSuggestionList";
import {
  computeMealEditorPlacement,
  getReducedMotionScrollBehavior,
  getVisibleViewportRect,
  type MealEditorPlacement,
} from "./mealEditorPlacement";

type EditorAnchorRect = {
  bottom: number;
  height: number;
  left: number;
  top: number;
  width: number;
};

const EDITOR_VIEWPORT_MARGIN = 12;

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const didAutoScrollRef = useRef(false);
  const didFocusRef = useRef(false);
  const placementRef = useRef<MealEditorPlacement["placement"] | undefined>(undefined);
  const [anchorRect, setAnchorRect] = useState<EditorAnchorRect | null>(null);
  const [editorHeight, setEditorHeight] = useState(0);
  const [placement, setPlacement] = useState<MealEditorPlacement | null>(null);
  const trimmedValue = value.trim();

  const measureAnchor = useCallback(() => {
    const anchor = anchorRef.current;

    if (!anchor) return;

    const nextRect = anchor.getBoundingClientRect();
    const roundedRect = {
      bottom: nextRect.bottom,
      height: nextRect.height,
      left: nextRect.left,
      top: nextRect.top,
      width: nextRect.width,
    };

    setAnchorRect((currentRect) => {
      if (
        currentRect &&
        Math.abs(currentRect.bottom - roundedRect.bottom) < 0.5 &&
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
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return () => {
      restoreFocusRef.current?.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    measureAnchor();

    const resizeObserver = new ResizeObserver(measureAnchor);
    const anchor = anchorRef.current;

    if (anchor) resizeObserver.observe(anchor);

    const visualViewport = window.visualViewport;
    window.addEventListener("resize", measureAnchor);
    window.addEventListener("scroll", measureAnchor, true);
    visualViewport?.addEventListener("resize", measureAnchor);
    visualViewport?.addEventListener("scroll", measureAnchor);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureAnchor);
      window.removeEventListener("scroll", measureAnchor, true);
      visualViewport?.removeEventListener("resize", measureAnchor);
      visualViewport?.removeEventListener("scroll", measureAnchor);
    };
  }, [measureAnchor]);

  useLayoutEffect(() => {
    const editor = editorRef.current;

    if (!editor) return;

    const updateEditorHeight = () => {
      setEditorHeight(editor.getBoundingClientRect().height);
    };

    updateEditorHeight();

    const resizeObserver = new ResizeObserver(updateEditorHeight);
    resizeObserver.observe(editor);

    return () => resizeObserver.disconnect();
  }, [anchorRect]);

  useLayoutEffect(() => {
    if (!anchorRect) return;

    const nextPlacement = computeMealEditorPlacement({
      anchorRect,
      editorHeight,
      margin: EDITOR_VIEWPORT_MARGIN,
      previousPlacement: placementRef.current,
      viewport: getVisibleViewportRect(),
    });

    placementRef.current = nextPlacement.placement;
    setPlacement((currentPlacement) => {
      if (
        currentPlacement &&
        Math.abs(currentPlacement.left - nextPlacement.left) < 0.5 &&
        Math.abs(currentPlacement.maxHeight - nextPlacement.maxHeight) < 0.5 &&
        Math.abs(currentPlacement.top - nextPlacement.top) < 0.5 &&
        Math.abs(currentPlacement.width - nextPlacement.width) < 0.5 &&
        currentPlacement.placement === nextPlacement.placement &&
        currentPlacement.shouldScroll === nextPlacement.shouldScroll
      ) {
        return currentPlacement;
      }

      return nextPlacement;
    });
  }, [anchorRect, editorHeight]);

  useLayoutEffect(() => {
    if (!placement || !placement.shouldScroll || didAutoScrollRef.current) return;

    didAutoScrollRef.current = true;
    anchorRef.current?.scrollIntoView({
      behavior: getReducedMotionScrollBehavior(),
      block: "center",
      inline: "nearest",
    });

    requestAnimationFrame(() => {
      measureAnchor();
    });
  }, [measureAnchor, placement]);

  useEffect(() => {
    if (!placement || didFocusRef.current) return;

    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (!didFocusRef.current) {
          didFocusRef.current = true;
          inputRef.current?.focus({ preventScroll: true });
        }
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
    };
  }, [placement]);

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
      data-placement={placement?.placement}
      ref={editorRef}
      style={
        placement
          ? {
              left: `${placement.left}px`,
              maxHeight: `${placement.maxHeight}px`,
              top: `${placement.top}px`,
              width: `${placement.width}px`,
            }
          : anchorRect
            ? {
                left: `${anchorRect.left}px`,
                top: `${anchorRect.top}px`,
                visibility: "hidden",
                width: `${anchorRect.width}px`,
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
          ref={inputRef}
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
      {anchorRect ? createPortal(editor, document.body) : null}
    </>
  );
}
