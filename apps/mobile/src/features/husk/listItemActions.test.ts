import {
  canStartHuskListItemCompletionAttempt,
  huskListItemCompletionAccessibilityHint,
  huskListItemCompletionAccessibilityLabel,
  huskListItemCompletionActionFor,
  huskListItemCompletionStateFor,
  huskListItemCompletionTitle,
  isHuskListItemCompleted,
  shouldShowHuskListItemCompletionAction,
} from "./listItemActions";

const assert = {
  equal(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected)
      throw new Error(message ?? `${actual} !== ${expected}`);
  },
};

const item = (
  overrides: Partial<{
    id: string;
    title: string;
    completed: boolean;
    completedAt: string | null;
  }> = {},
) => ({
  id: overrides.id ?? "i1",
  title: overrides.title ?? "Pass",
  completed: overrides.completed ?? false,
  completedAt: overrides.completedAt ?? null,
});

assert.equal(
  isHuskListItemCompleted(item({ completed: true, completedAt: null }) as any),
  true,
  "completed true is canonical complete even without completedAt",
);
assert.equal(
  isHuskListItemCompleted(
    item({ completed: false, completedAt: "2026-07-18T10:00:00.000Z" }) as any,
  ),
  true,
  "completedAt is canonical complete even when completed is false",
);
assert.equal(
  isHuskListItemCompleted(
    item({ completed: true, completedAt: "2026-07-18T10:00:00.000Z" }) as any,
  ),
  true,
  "both fields active is complete",
);
assert.equal(
  isHuskListItemCompleted(item({ completed: false, completedAt: null }) as any),
  false,
  "both fields inactive is active",
);
assert.equal(
  huskListItemCompletionActionFor(
    item({ completed: false, completedAt: null }) as any,
  ),
  "complete",
  "active items get complete action",
);
assert.equal(
  huskListItemCompletionActionFor(
    item({ completed: true, completedAt: null }) as any,
  ),
  "uncomplete",
  "completed items get uncomplete action",
);
assert.equal(
  huskListItemCompletionActionFor(
    item({ completed: false, completedAt: "2026-07-18T10:00:00.000Z" }) as any,
  ),
  "uncomplete",
  "completedAt-only items get uncomplete action",
);
assert.equal(
  shouldShowHuskListItemCompletionAction("i1", null),
  true,
  "completion action is visible outside edit mode",
);
assert.equal(
  shouldShowHuskListItemCompletionAction("i1", "i1"),
  false,
  "edit mode hides completion action for the edited item",
);
assert.equal(
  huskListItemCompletionTitle("complete"),
  "Fullfør",
  "only complete label is shown for active item",
);
assert.equal(
  huskListItemCompletionTitle("uncomplete"),
  "Angre",
  "only undo label is shown for completed item",
);
assert.equal(
  huskListItemCompletionTitle("complete", true),
  "Fullfører …",
  "complete pending label is item-specific",
);
assert.equal(
  huskListItemCompletionTitle("uncomplete", true),
  "Angrer …",
  "uncomplete pending label is item-specific",
);
assert.equal(
  huskListItemCompletionAccessibilityLabel("complete", "Pass"),
  "Marker Pass som fullført",
  "complete accessibility label names the item",
);
assert.equal(
  huskListItemCompletionAccessibilityLabel("uncomplete", "Pass"),
  "Marker Pass som ikke fullført",
  "uncomplete accessibility label names the item",
);
assert.equal(
  huskListItemCompletionAccessibilityHint("complete"),
  "Flytter elementet til Fullført.",
  "complete hint explains destination",
);
assert.equal(
  huskListItemCompletionAccessibilityHint("uncomplete"),
  "Flytter elementet tilbake til Aktive.",
  "uncomplete hint explains destination",
);
assert.equal(
  canStartHuskListItemCompletionAttempt(false),
  true,
  "first completion attempt can start when no completion is pending",
);
assert.equal(
  canStartHuskListItemCompletionAttempt(true),
  false,
  "a rapid second completion attempt is blocked while another completion is pending",
);
const busyState = huskListItemCompletionStateFor({
  item: item({ id: "i1", completed: false }) as any,
  editingItemId: null,
  completingItemId: "i1",
  uncompletingItemId: null,
  completionBusy: true,
});
assert.equal(busyState.busy, true, "the item being completed is busy");
assert.equal(busyState.disabled, true, "the item being completed is disabled");
assert.equal(
  busyState.title,
  "Fullfører …",
  "busy complete item keeps item-specific pending label",
);
const otherState = huskListItemCompletionStateFor({
  item: item({ id: "i2", completed: false }) as any,
  editingItemId: null,
  completingItemId: "i1",
  uncompletingItemId: null,
  completionBusy: true,
});
assert.equal(otherState.busy, false, "other items are not labelled as busy");
assert.equal(
  otherState.disabled,
  true,
  "other completion actions are disabled while one completion is pending",
);
console.log("Husk list item action tests passed");
