import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("health plan overview uses the established compact filter interaction", () => {
  const page = source("../../app/health-plans/page.tsx");
  const sheet = source("./HealthPlanFilterSheet.tsx");

  assert.match(page, /husk-filter-button/);
  assert.match(page, /HealthPlanFilterSheet/);
  assert.doesNotMatch(page, /className="health-chips"/);
  assert.doesNotMatch(page, /<label>Plan<select/);
  assert.match(sheet, /legend="Familiemedlem"/);
  assert.match(sheet, /legend="Plan"/);
  assert.match(sheet, /label: "Alle"/);
  assert.match(sheet, /label: "Alle planer"/);
  assert.match(sheet, /Nullstill/);
});

test("filter options constrain and wrap long labels at mobile widths", () => {
  const styles = source("../../app/globals.css");
  const optionRule = styles.slice(
    styles.indexOf(".calendar-filter-option {"),
    styles.indexOf(".calendar-filter-option--selected"),
  );
  const labelRule = styles.slice(
    styles.indexOf(".calendar-filter-option__label {"),
    styles.indexOf(".calendar-filter-sheet__actions"),
  );

  assert.match(optionRule, /max-width: 100%/);
  assert.match(optionRule, /min-width: 0/);
  assert.match(labelRule, /overflow-wrap: anywhere/);
});
