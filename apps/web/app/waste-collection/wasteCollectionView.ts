import type { WasteEvent } from "../../lib/api";

export const ALL_WASTE_FRACTIONS = "all";

export function availableWasteFractions(events: WasteEvent[]) {
  const fractions = new Map<string, string>();
  events.forEach((event) => fractions.set(event.providerFractionId, event.name));
  return Array.from(fractions, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name, "nb"),
  );
}

export function filterWasteEvents(events: WasteEvent[], fractionId: string) {
  return fractionId === ALL_WASTE_FRACTIONS
    ? events
    : events.filter((event) => event.providerFractionId === fractionId);
}
