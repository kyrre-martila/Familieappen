import assert from "node:assert/strict";
import { test } from "node:test";

import { computeMealEditorPlacement, getReducedMotionScrollBehavior } from "./mealEditorPlacement";

const viewport = { top: 0, left: 0, width: 390, height: 700 };
const anchor = (top: number) => ({ top, bottom: top + 120, left: 16, width: 358, height: 120 });

test("places editor below when anchor is high in viewport", () => {
  const result = computeMealEditorPlacement({ anchorRect: anchor(80), editorHeight: 260, viewport });
  assert.equal(result.placement, "below");
  assert.equal(result.top, 80);
});

test("places editor above or clamps visible when anchor is low", () => {
  const result = computeMealEditorPlacement({ anchorRect: anchor(560), editorHeight: 260, viewport });
  assert.equal(result.placement, "above");
  assert.ok(result.top >= 12);
  assert.ok(result.top + 260 <= 688);
});

test("respects reduced visual viewport from keyboard", () => {
  const result = computeMealEditorPlacement({ anchorRect: anchor(330), editorHeight: 240, viewport: { ...viewport, height: 430 } });
  assert.ok(result.top + 240 <= 418);
});

test("clamps oversized editor and exposes maxHeight for internal scroll", () => {
  const result = computeMealEditorPlacement({ anchorRect: anchor(100), editorHeight: 900, viewport });
  assert.equal(result.placement, "clamped");
  assert.equal(result.top, 12);
  assert.equal(result.maxHeight, 676);
});

test("uses visualViewport offsetTop as top boundary", () => {
  const result = computeMealEditorPlacement({ anchorRect: anchor(20), editorHeight: 160, viewport: { ...viewport, top: 44, height: 600 } });
  assert.ok(result.top >= 56);
});

test("resize of editor can recompute placement", () => {
  const small = computeMealEditorPlacement({ anchorRect: anchor(420), editorHeight: 120, viewport });
  const large = computeMealEditorPlacement({ anchorRect: anchor(420), editorHeight: 280, viewport, previousPlacement: small.placement });
  assert.notEqual(small.top, large.top);
  assert.ok(large.top + 280 <= 688);
});

test("keeps normal below placement on large desktop viewport", () => {
  const result = computeMealEditorPlacement({ anchorRect: { top: 300, bottom: 420, left: 200, width: 560, height: 120 }, editorHeight: 320, viewport: { top: 0, left: 0, width: 1280, height: 900 } });
  assert.equal(result.placement, "below");
  assert.equal(result.top, 300);
});

test("reduced motion returns auto scrolling", () => {
  const behavior = getReducedMotionScrollBehavior({ matchMedia: () => ({ matches: true }) } as unknown as Window);
  assert.equal(behavior, "auto");
});

test("does not request auto-scroll when editor is already visible with usable space", () => {
  const result = computeMealEditorPlacement({ anchorRect: anchor(100), editorHeight: 180, viewport });
  assert.equal(result.shouldScroll, false);
});

test("requests one opening scroll when low anchor has too little below space", () => {
  const result = computeMealEditorPlacement({ anchorRect: anchor(620), editorHeight: 180, viewport });
  assert.equal(result.shouldScroll, true);
});
