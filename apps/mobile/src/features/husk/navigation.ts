export type HuskBackAction = "back" | "husk";

export function getHuskListBackAction(canGoBack: boolean): HuskBackAction {
  return canGoBack ? "back" : "husk";
}
