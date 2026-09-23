import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { WasteEvent } from "../../lib/api";
import { ALL_WASTE_FRACTIONS, availableWasteFractions, filterWasteEvents } from "./wasteCollectionView";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const events: WasteEvent[] = [
  { id: "paper", provider: "test", providerFractionId: "8", collectionDate: "2026-09-23", allDay: true, name: "Papir og papp", icon: null, standardFractionId: null, standardFractionIcon: null },
  { id: "food", provider: "test", providerFractionId: "2", collectionDate: "2026-09-23", allDay: true, name: "Matavfall", icon: null, standardFractionId: null, standardFractionIcon: null },
  { id: "food-next", provider: "test", providerFractionId: "2", collectionDate: "2026-10-07", allDay: true, name: "Matavfall", icon: null, standardFractionId: null, standardFractionIcon: null },
];

test("fraction filters are generated from events and Vis alle is the default", () => {
  assert.equal(ALL_WASTE_FRACTIONS, "all");
  assert.deepEqual(availableWasteFractions(events), [
    { id: "2", name: "Matavfall" },
    { id: "8", name: "Papir og papp" },
  ]);
  assert.equal(filterWasteEvents(events, ALL_WASTE_FRACTIONS).length, 3);
  assert.deepEqual(filterWasteEvents(events, "8").map((event) => event.id), ["paper"]);
});

test("calendar and home render every waste fraction as a chip, not an event card", () => {
  const chips = source("../../features/calendar/components/CalendarDayChips.tsx");
  const day = source("../../features/calendar/components/CalendarDayView.tsx");
  const list = source("../../features/calendar/components/CalendarListDayGroup.tsx");
  const home = source("../dashboard/page.tsx");

  assert.match(chips, /wasteEvents\.map/);
  assert.match(chips, /CalendarWasteChip/);
  assert.match(day, /event\.source !== "waste-collection"/);
  assert.match(list, /calendarEvents = group\.events\.filter\(\(event\) => event\.source !== "waste-collection"\)/);
  assert.match(home, /wasteEvents\.map\(event => <CalendarWasteChip/);
});

test("waste filtering does not hide genuine all-day calendar events", () => {
  const day = source("../../features/calendar/components/CalendarDayView.tsx");
  assert.doesNotMatch(day, /!event\.allDay/);
  assert.match(day, /event\.source !== "school-week" && event\.source !== "waste-collection"/);
});

test("renovation layout uses the full responsive container and scrollable filters", () => {
  const styles = source("../globals.css");
  const pageRule = styles.slice(styles.lastIndexOf(".waste-page {"), styles.indexOf(".waste-page h2", styles.lastIndexOf(".waste-page {")));
  assert.match(pageRule, /width:100%/);
  assert.match(pageRule, /min-width:0/);
  assert.doesNotMatch(pageRule, /max-width/);
  assert.match(styles, /\.waste-filters \{[^}]*overflow-x:auto/);
});
