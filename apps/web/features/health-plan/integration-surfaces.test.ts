import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

test("home uses one linked, aggregated health-plan chip and no large health card", () => {
  const home = source("../../app/dashboard/page.tsx");
  const chip = source("../calendar/components/CalendarHealthPlanChip.tsx");
  assert.match(home, /<CalendarHealthPlanChip summary={healthSummary}/);
  assert.doesNotMatch(home, /health-plan-card|home-card--health/);
  assert.match(chip, /href="\/health-plans"/);
});

test("calendar surfaces aggregate occurrences without CalendarEvent conversion", () => {
  const day = source("../calendar/components/CalendarDayChips.tsx");
  const list = source("../calendar/components/CalendarListDayGroup.tsx");
  const provider = source("../calendar/hooks/useCalendar.tsx");
  assert.equal((day.match(/<CalendarHealthPlanChip/g) ?? []).length, 1);
  assert.equal((list.match(/<CalendarHealthPlanChip/g) ?? []).length, 1);
  assert.doesNotMatch(provider, /healthPlanOccurrenceToCalendarEvent/);
  assert.match(provider, /getHealthPlanOccurrences/);
});

test("calendar chip groups use durable content labels", () => {
  const day = source("../calendar/components/CalendarDayChips.tsx");
  const list = source("../calendar/components/CalendarListDayGroup.tsx");
  assert.match(day, /aria-label={calendarDayContentAriaLabel}/);
  assert.match(list, /aria-label={calendarListContentAriaLabel/);
  assert.doesNotMatch(day, /Middag, skoleuke og påminnelser/);
  assert.doesNotMatch(list, /Middag og husk for/);
});

test("menu contains Helseplan once while bottom navigation and global create stay unchanged", () => {
  const options = source("../../components/navigation-options.ts");
  const menu = source("../../app/menu/page.tsx");
  assert.equal((menu.match(/title: "Helseplan"/g) ?? []).length, 1);
  assert.match(menu, /href: "\/health-plans"/);
  const bottomBlock = options.slice(
    options.indexOf("bottomNavigationItems"),
    options.indexOf("menuNavigationItems"),
  );
  assert.doesNotMatch(bottomBlock, /health-plans/);
  const createBlock = options.slice(options.indexOf("defaultCreateOptions"));
  assert.doesNotMatch(createBlock, /helseplan/i);
});

test("health-plan tabs and forms use shared mobile UI primitives", () => {
  const overview = source("../../app/health-plans/page.tsx");
  const detail = source("../../app/health-plans/[id]/page.tsx");
  const huskTabs = source("../husk/components/HuskTabs.tsx");
  const appUi = source("../../components/app-ui/index.tsx");

  assert.match(overview, /<AppTabs[^>]+className="health-tabs"/);
  assert.match(detail, /<AppTabs[^>]+className="health-tabs"/);
  assert.match(huskTabs, /<AppTabs[^>]+className="husk-tabs"/);
  assert.equal((overview.match(/actionFooterBottomNavAware/g) ?? []).length, 1);
  assert.equal((detail.match(/actionFooterBottomNavAware/g) ?? []).length, 1);
  assert.match(
    detail,
    /className="button button--primary"[^>]+type="submit">Lagre/,
  );
  assert.match(appUi, /document\.body\.style\.position = "fixed"/);
  assert.match(appUi, /window\.scrollTo\(0, scrollY\)/);
});

test("shared tabs size their grid dynamically and preserve Husk panel relationships", () => {
  const css = source("../../app/globals.css");
  const appUi = source("../../components/app-ui/index.tsx");
  const huskTabs = source("../husk/components/HuskTabs.tsx");
  const reminders = source("../husk/components/HuskRemindersSection.tsx");
  const tasks = source("../husk/components/OppgaverSection.tsx");
  const schoolWeek = source("../husk/components/SchoolWeekPanel.tsx");

  assert.match(css, /repeat\(var\(--app-tabs-count\), minmax\(0, 1fr\)\)/);
  assert.match(appUi, /"--app-tabs-count": options\.length/);
  assert.match(appUi, /aria-controls={option\.panelId}/);
  assert.match(appUi, /id={option\.tabId}/);
  assert.match(huskTabs, /tabId: `husk-tab-\${idSuffix}`/);
  assert.match(huskTabs, /panelId: `husk-panel-\${idSuffix}`/);
  assert.match(reminders, /aria-labelledby="husk-tab-husk"/);
  assert.match(tasks, /aria-labelledby="husk-tab-oppgaver tasks-title"/);
  assert.match(
    schoolWeek,
    /aria-labelledby="husk-tab-skoleuka husk-school-title"/,
  );
});
