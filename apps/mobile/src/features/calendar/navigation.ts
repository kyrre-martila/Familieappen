export function getCalendarEventBackAction(canGoBack: boolean): "back" | "fallback" {
  return canGoBack ? "back" : "fallback";
}
