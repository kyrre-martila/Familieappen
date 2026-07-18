import {
  huskListItemCompletionAccessibilityHint,
  huskListItemCompletionAccessibilityLabel,
  huskListItemCompletionActionFor,
  huskListItemCompletionTitle,
  shouldShowHuskListItemCompletionAction,
} from "./listItemActions";

const assert = {
  equal(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected)
      throw new Error(message ?? `${actual} !== ${expected}`);
  },
};

assert.equal(
  huskListItemCompletionActionFor({ completed: false } as any),
  "complete",
  "active items get complete action",
);
assert.equal(
  huskListItemCompletionActionFor({ completed: true } as any),
  "uncomplete",
  "completed items get uncomplete action",
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
console.log("Husk list item action tests passed");
