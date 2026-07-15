export type VisibleViewportRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type AnchorRect = {
  bottom: number;
  height: number;
  left: number;
  top: number;
  width: number;
};

export type MealEditorPlacement = {
  left: number;
  maxHeight: number;
  placement: "above" | "below" | "clamped";
  shouldScroll: boolean;
  top: number;
  width: number;
};

export type MealEditorPlacementOptions = {
  anchorRect: AnchorRect;
  editorHeight: number;
  gap?: number;
  margin?: number;
  minUsableHeight?: number;
  previousPlacement?: MealEditorPlacement["placement"];
  viewport: VisibleViewportRect;
};

const DEFAULT_MARGIN = 12;
const DEFAULT_GAP = 8;
const DEFAULT_MIN_USABLE_HEIGHT = 220;
const PLACEMENT_HYSTERESIS = 16;

export function getVisibleViewportRect(win: Window = window): VisibleViewportRect {
  const visualViewport = win.visualViewport;

  if (visualViewport) {
    return {
      height: visualViewport.height,
      left: visualViewport.offsetLeft,
      top: visualViewport.offsetTop,
      width: visualViewport.width,
    };
  }

  return {
    height: win.innerHeight,
    left: 0,
    top: 0,
    width: win.innerWidth,
  };
}

export function getReducedMotionScrollBehavior(
  win: Window = window,
): ScrollBehavior {
  return win.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

export function computeMealEditorPlacement({
  anchorRect,
  editorHeight,
  gap = DEFAULT_GAP,
  margin = DEFAULT_MARGIN,
  minUsableHeight = DEFAULT_MIN_USABLE_HEIGHT,
  previousPlacement,
  viewport,
}: MealEditorPlacementOptions): MealEditorPlacement {
  const visibleTop = viewport.top + margin;
  const visibleBottom = viewport.top + viewport.height - margin;
  const availableHeight = Math.max(0, visibleBottom - visibleTop);
  const measuredHeight = Math.max(0, editorHeight);
  const maxHeight = Math.max(0, availableHeight);
  const effectiveHeight = Math.min(measuredHeight || anchorRect.height, maxHeight);
  const belowTop = anchorRect.top;
  const belowBottom = belowTop + effectiveHeight;
  const aboveTop = anchorRect.bottom - effectiveHeight;
  const belowFits = belowBottom <= visibleBottom;
  const aboveFits = aboveTop >= visibleTop;
  const belowSpace = visibleBottom - belowTop;
  const aboveSpace = anchorRect.bottom - visibleTop;

  let placement: MealEditorPlacement["placement"] = "below";
  let desiredTop = belowTop;

  if (measuredHeight > availableHeight) {
    placement = "clamped";
    desiredTop = visibleTop;
  } else if (belowFits) {
    placement = "below";
    desiredTop = belowTop;
  } else if (aboveFits) {
    placement = "above";
    desiredTop = aboveTop;
  } else if (
    previousPlacement === "above" &&
    aboveSpace + PLACEMENT_HYSTERESIS >= belowSpace
  ) {
    placement = "above";
    desiredTop = aboveTop;
  } else if (aboveSpace > belowSpace + PLACEMENT_HYSTERESIS) {
    placement = "above";
    desiredTop = aboveTop;
  } else {
    placement = "clamped";
    desiredTop = belowTop;
  }

  const top = clamp(desiredTop, visibleTop, Math.max(visibleTop, visibleBottom - effectiveHeight));
  const left = clamp(anchorRect.left, viewport.left + margin, Math.max(viewport.left + margin, viewport.left + viewport.width - margin - anchorRect.width));
  const editorBottom = top + effectiveHeight;
  const shouldScroll =
    belowSpace < Math.min(minUsableHeight, availableHeight) ||
    top < visibleTop ||
    editorBottom > visibleBottom;

  return {
    left,
    maxHeight,
    placement,
    shouldScroll,
    top,
    width: Math.min(anchorRect.width, Math.max(0, viewport.width - margin * 2)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
