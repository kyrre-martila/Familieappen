import type { HuskListItem } from "@familieappen/shared";

export type HuskListItemCompletionAction = "complete" | "uncomplete";

export function huskListItemCompletionActionFor(
  item: Pick<HuskListItem, "completed">,
): HuskListItemCompletionAction {
  return item.completed ? "uncomplete" : "complete";
}

export function shouldShowHuskListItemCompletionAction(
  itemId: string,
  editingItemId: string | null,
) {
  return editingItemId !== itemId;
}

export function huskListItemCompletionTitle(
  action: HuskListItemCompletionAction,
  busy = false,
) {
  if (action === "complete") return busy ? "Fullfører …" : "Fullfør";
  return busy ? "Angrer …" : "Angre";
}

export function huskListItemCompletionAccessibilityLabel(
  action: HuskListItemCompletionAction,
  title: string,
) {
  return action === "complete"
    ? `Marker ${title} som fullført`
    : `Marker ${title} som ikke fullført`;
}

export function huskListItemCompletionAccessibilityHint(
  action: HuskListItemCompletionAction,
) {
  return action === "complete"
    ? "Flytter elementet til Fullført."
    : "Flytter elementet tilbake til Aktive.";
}
