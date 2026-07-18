import type { HuskListItem } from "@familieappen/shared";

export type HuskListItemCompletionAction = "complete" | "uncomplete";

export type HuskListItemCompletionState = {
  action: HuskListItemCompletionAction;
  hidden: boolean;
  busy: boolean;
  disabled: boolean;
  title: string;
  accessibilityLabel: string;
  accessibilityHint: string;
};

export function isHuskListItemCompleted(
  item: Pick<HuskListItem, "completed" | "completedAt">,
) {
  return item.completed || Boolean(item.completedAt);
}

export function huskListItemCompletionActionFor(
  item: Pick<HuskListItem, "completed" | "completedAt">,
): HuskListItemCompletionAction {
  return isHuskListItemCompleted(item) ? "uncomplete" : "complete";
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

export function canStartHuskListItemCompletionAttempt(completionBusy: boolean) {
  return !completionBusy;
}

export function huskListItemCompletionStateFor({
  item,
  editingItemId,
  completingItemId,
  uncompletingItemId,
  completionBusy,
}: {
  item: Pick<HuskListItem, "id" | "title" | "completed" | "completedAt">;
  editingItemId: string | null;
  completingItemId: string | null;
  uncompletingItemId: string | null;
  completionBusy: boolean;
}): HuskListItemCompletionState {
  const action = huskListItemCompletionActionFor(item);
  const busy =
    action === "complete"
      ? completingItemId === item.id
      : uncompletingItemId === item.id;
  return {
    action,
    hidden: !shouldShowHuskListItemCompletionAction(item.id, editingItemId),
    busy,
    disabled: !canStartHuskListItemCompletionAttempt(completionBusy),
    title: huskListItemCompletionTitle(action, busy),
    accessibilityLabel: huskListItemCompletionAccessibilityLabel(
      action,
      item.title,
    ),
    accessibilityHint: huskListItemCompletionAccessibilityHint(action),
  };
}
