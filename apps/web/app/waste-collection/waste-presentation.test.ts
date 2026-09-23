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
  const wasteChip = source("../../features/calendar/components/CalendarWasteChip.tsx");
  const day = source("../../features/calendar/components/CalendarDayView.tsx");
  const list = source("../../features/calendar/components/CalendarListDayGroup.tsx");
  const home = source("../dashboard/page.tsx");

  assert.match(chips, /wasteEvents\.map/);
  assert.match(chips, /CalendarWasteChip/);
  assert.match(day, /event\.source !== "waste-collection"/);
  assert.match(list, /calendarEvents = group\.events\.filter\(\(event\) => event\.source !== "waste-collection"\)/);
  assert.match(home, /wasteEvents\.map\(event => <CalendarWasteChip/);
  assert.match(wasteChip, /className="calendar-chip calendar-chip--waste"/);
  assert.match(wasteChip, /<Recycle/);
  assert.doesNotMatch(wasteChip, /♻/);
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
  assert.match(pageRule, /grid-auto-rows:max-content/);
  assert.match(pageRule, /align-content:start/);
  assert.doesNotMatch(pageRule, /max-width/);
  assert.match(styles, /\.waste-filters \{[^}]*overflow-x:auto/);
  assert.match(styles, /\.waste-page > \.card \{[^}]*min-height:0/);
  assert.match(styles, /\.waste-filter \{[^}]*flex:0 0 auto[^}]*align-self:center/);
});

test("family address helper can wrap while the edit action keeps its own column", () => {
  const styles = source("../globals.css");

  assert.match(styles, /\.family-settings-row__value \{[^}]*min-width: 0/);
  assert.match(styles, /\.family-settings-row__value small \{[^}]*overflow-wrap:anywhere[^}]*white-space:normal/);
  assert.match(styles, /@media \(max-width: 38rem\) \{[\s\S]*?\.family-settings-row \{\s*grid-template-columns: minmax\(0, 1fr\) auto;/);
});

test("waste chips use shared semantic tokens", () => {
  const styles = source("../globals.css");
  const tokens = source("../../../../packages/ui/src/tokens.css");
  const typedTokens = source("../../../../packages/ui/src/index.ts");

  assert.match(tokens, /--color-waste:/);
  assert.match(tokens, /--color-waste-soft:/);
  assert.match(typedTokens, /waste: "#3f7259"/);
  assert.match(typedTokens, /wasteSoft: "#e1eee5"/);
  assert.match(styles, /\.calendar-chip--waste \{[^}]*background: var\(--color-waste-soft\)[^}]*color: var\(--color-waste\)/);
});
