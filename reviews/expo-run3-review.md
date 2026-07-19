# Expo Run 3 Review

## Executive Summary

Calendar, Husk Reminders, Husk Tasks, and School Week were reviewed across web and Expo/mobile with web treated as the reference implementation. The previous release-candidate fixes appear to have landed: the core API-backed create, edit, delete, completion/undo, recurring school-week, cache-update, loading, empty, and error-state paths are present and coherent on Expo.

No Critical or High release-blocking defects were identified in the reviewed source. The mobile implementation is stable enough for release-candidate manual QA, and the targeted mobile Calendar/Husk test suites plus web/mobile typechecks passed.

The main remaining release consideration is feature parity: Expo covers the essential flows, but it is not a complete mirror of web. Web still has richer Calendar list filters, integrated Calendar summary chips for adjacent domains, a more complete School Week weekly navigation/detail model, and richer Husk filtering/search persistence. These differences are acceptable only if Expo Run 3 is intended to ship the mobile essential-flow subset rather than exact web parity.

---

## Calendar

### Reviewed areas

- Expo tab entry screen, Day/Month/List view switcher, week date navigation, pull-to-refresh, loading/error/missing-family/empty states, event card navigation, create route, detail route, edit route, recurrence-aware event identity, React Query event range loading, create/update/delete cache behaviour, and family-context usage.
- Web Calendar landing page, route/query-state handling, Day/Month/List view selection, selected-date syncing, month navigation, event detail overlay, loading/error states, AppShell integration, Calendar settings entry points by source review, list filtering components, and module boundary guidance from the Calendar MVP documentation.
- API-facing Calendar event usage through the mobile hooks and existing targeted Calendar model/cache/API tests.

### Findings

#### Finding 1

- **Severity:** Medium
- **Description:** Expo Calendar is functionally solid for event viewing and event CRUD, but it does not fully match web Calendar's reference surface. The web reference includes richer list filtering and summary affordances for adjacent domains such as reminders, tasks/school week, and meals, while Expo Calendar currently presents calendar events only in Day/Month/List views.
- **Recommendation:** Do not block release if Expo Run 3 scope intentionally targets essential event flows. If the milestone promise is exact parity with web Calendar, document this as a remaining parity gap and defer App Store release until Calendar filters and summary chips are implemented or explicitly descoped.

#### Finding 2

- **Severity:** Observation
- **Description:** React Query usage is appropriate for the mobile Calendar flow. The mobile hook keys event queries by active family and visible date range, gates calls on family/auth context, exposes refresh/loading/error states, and invalidates Calendar event queries after creation. No stale-cache blocker was identified in the reviewed create/update/delete paths or the targeted cache tests.
- **Recommendation:** Keep the existing cache strategy. During manual QA, verify recurrence create/edit/delete paths on a physical device because recurrence behaviour is the highest-risk data presentation area.

#### Finding 3

- **Severity:** Observation
- **Description:** Accessibility affordances are present on the mobile Calendar view switcher, month date buttons, and create action. The web reference also preserves accessible route/state semantics for date and detail handling.
- **Recommendation:** Include VoiceOver/TalkBack smoke testing for view switching, date strip navigation, opening an event, saving edits, and returning to the tab screen before release.

---

## Husk

### Reminders

#### Reviewed areas

- Expo reminders tab, active/history filter, search, loading/error/missing-family/empty states, reminder cards, create route, detail route, edit route, delete route, complete/undo flow, pull-to-refresh, React Query keys/cache mutations, and API contract tests.
- Web reminders tab, toolbar search/filter sheet, session persistence for tab/query/filter/scroll, detail sheet routing, create/edit sheets/routes by source review, and completion/history behaviour.

#### Findings

##### Finding 1

- **Severity:** Observation
- **Description:** Expo Reminders covers the important release-candidate flows: active/history grouping, text search, create/edit/detail/delete navigation, complete and undo, loading/error/empty states, and cache replacement/removal after mutations. No release-blocking reminder defect was identified.
- **Recommendation:** Proceed to manual device QA with real account/family data. Confirm that completing a reminder removes it from Active and that undo from History returns it to Active without needing an app restart.

##### Finding 2

- **Severity:** Low
- **Description:** Web has richer filter persistence and a bottom-sheet filter model, while Expo currently keeps a simpler active/history switch plus in-memory search. This is not a correctness defect, but it is a parity difference if the release requires identical filter behaviour.
- **Recommendation:** Accept for release if mobile is allowed to be simpler. If exact parity is required, add this to the parity backlog rather than treating it as a release-blocking bug.

### Tasks

#### Reviewed areas

- Expo Tasks tab, create/edit modal, inline completion toggle, undo by toggling completed tasks, delete button, grouped open/completed display, loading/error/missing-family/empty states, task query enabling, family-member metadata mapping, cache create/update/toggle/delete helpers, and task model tests.
- Web Oppgaver section, create/edit sheet, detail selection via query parameter, family context loading, search/person/completed filters, sorting, grouping, delete/menu behaviour by source review, and API usage.

#### Findings

##### Finding 1

- **Severity:** Observation
- **Description:** Expo Tasks has the required task lifecycle: create, edit, complete, undo, and delete are wired to API mutations and cache updates. The open/completed grouping is clear and matches the expected low-pressure Husk style. No release-blocking task defect was identified.
- **Recommendation:** Ship with manual QA coverage for rapid toggle/delete sequences and error recovery, because those are the most likely real-world stale-state risks.

##### Finding 2

- **Severity:** Low
- **Description:** Expo task creation/editing currently exposes title, note, and raw `YYYY-MM-DD` due-date entry, but does not expose the richer web audience/person selector in the same way. The submitted payload supports assignment fields, but the mobile modal does not present family-member assignment controls in the reviewed shell.
- **Recommendation:** Treat as a parity gap, not a blocker, unless assigned tasks are a must-have Expo release requirement. If assignment is required for App Store release, this would become High because users could not complete the same task flow on mobile as on web.

### School Week

#### Reviewed areas

- Expo School Week tab, school-week list rendering, add/edit/delete modal, recurring toggle, selected current week start, child-member filtering by school-week participation, API mutations, query invalidation after delete, loading/error/missing-family/empty states, and React Query query-key usage.
- Web School Week panel, week strip, child carousel, per-day grouped display, day add buttons, detail sheet, edit/delete menu, recurring edit/delete scope sheet, saved feedback, empty child state, detail deep-link handling, and school-week cache hook behaviour by source review.

#### Findings

##### Finding 1

- **Severity:** Medium
- **Description:** Expo School Week is API-backed and includes create/edit/delete plus recurrence fields, but it is materially less complete than the web reference. Web provides a five-week selector, child carousel, per-day grouping, item detail sheet, day-specific add actions, and explicit recurring occurrence-vs-series choice. Expo shows the current week as a flat list and applies series scope automatically for recurring edits/deletes.
- **Recommendation:** Do not claim full web parity for School Week on Expo. If recurring occurrence-level edits/deletes are required for release, this should be resolved before shipping. If mobile Run 3 scope accepts series-level recurring edits, document it clearly in release notes and manual QA scripts.

##### Finding 2

- **Severity:** Low
- **Description:** Expo School Week uses only the current week start from the hook, with no user-facing week navigation. This avoids the previous static-week false-confidence issue, but it also means mobile users cannot review adjacent weeks the way they can on web.
- **Recommendation:** Accept as a scoped mobile limitation if intentional. If families must plan future school weeks on mobile for launch, add week navigation to the release backlog before App Store submission.

##### Finding 3

- **Severity:** Observation
- **Description:** Cache handling is acceptable for the reviewed School Week flows: create/update place returned reminders in the active week cache, delete removes the item and invalidates the week query. No obvious stale-cache release blocker was identified.
- **Recommendation:** During manual QA, verify recurring delete responses for both occurrence and series behaviour against backend data, because the client removes by returned id and then invalidates.

---

## Feature Parity Assessment

Expo has achieved practical parity for the essential release-candidate lifecycle flows, but it has **not** achieved exact feature parity with web.

Remaining differences:

1. **Calendar list filters and cross-module summaries:** Web Calendar includes richer list filtering and reference-level summary concepts for reminders/school/tasks/meals. Expo Calendar currently focuses on calendar events only.
2. **Calendar settings/import/export:** Web has Calendar settings, import, and export surfaces. Expo review did not identify equivalent mobile settings surfaces in the Calendar tab flow.
3. **Reminders filters/persistence:** Web persists Husk tab, query, filters, and scroll in session storage and uses richer filter sheets. Expo uses a simpler in-session state model.
4. **Tasks assignment UX:** Web exposes richer audience/person selection. Expo task form does not expose assignment controls in the reviewed shell.
5. **School Week navigation/detail model:** Web has week navigation, child carousel, per-day grouping, item detail sheet, and recurring scope choice. Expo has current-week list rendering and modal create/edit/delete with automatic series scope for recurring items.

Conclusion: Expo is parity-ready for core CRUD and state-transition QA, but not exact web feature parity.

---

## Release Readiness

- **Calendar:** Ready with minor observations. Core mobile event flows, API usage, cache behaviour, loading/error/empty states, and accessibility affordances are in place. The only material caveat is exact parity with web's richer filters/settings/summary surface.
- **Husk Reminders:** Ready. The reviewed mobile flows cover active/history, search, create, edit, delete, complete, undo, errors, empty states, and cache updates without an identified blocker.
- **Husk Tasks:** Ready with minor observations. Task lifecycle and grouping are present and tested, but assignment UX is less complete on Expo than web.
- **School Week:** Ready with minor observations if scoped as a mobile current-week planner; not exact parity with web. No blocker was found in the implemented create/edit/delete/recurrence API wiring, but web remains richer for week navigation and recurring scope selection.

---

## Manual QA Checklist

### Calendar

- Open Calendar on Expo with an approved family and confirm Day view loads today's events.
- Pull to refresh Calendar and confirm no duplicate events appear.
- Switch Day → Month → List → Day and confirm selected date/event grouping remains coherent.
- Create a one-off event with title, date, time, location, participants, icon, reminder, and description; verify it appears after returning to Calendar.
- Open event detail from Day/List views and verify all metadata is displayed correctly.
- Edit the event and verify the updated event replaces the old values without restart.
- Delete the event and verify it disappears from Day, Month, and List after cache refresh.
- Create/edit/delete a recurring event occurrence and series, including an occurrence date from a list/detail route.
- Test loading, API error, and missing-family states.
- Run VoiceOver/TalkBack through view switcher, date navigation, event cards, create form, detail, edit, and delete confirmation.

### Husk Reminders

- Open Husk → Påminnelser with active reminders and verify search filters by title/person/date/time.
- Complete an active reminder and verify it leaves Active.
- Switch to History, undo the same reminder, and verify it returns to Active.
- Create a reminder for the whole family and for a specific person; verify detail and card metadata.
- Edit reminder title/date/time/person/note and confirm list/detail update immediately.
- Delete a reminder and confirm it is removed after navigation back.
- Verify empty states for no active reminders, no history, and no search results.
- Test retry behaviour after simulated API failure.

### Husk Tasks

- Create a task with title, note, and due date.
- Edit the task and verify updated metadata in the list.
- Complete and undo the task using the checkbox control.
- Delete a task and verify it is removed without duplicate stale rows.
- Confirm open/completed grouping and empty state copy.
- Test rapid toggle and delete while a mutation is saving.
- Test API error display and retry/reopen behaviour.

### School Week

- Open Husk → Skoleuka for a family with school-week-enabled children.
- Confirm current-week items display child, weekday, title, and note correctly.
- Create a non-recurring school reminder for each weekday and verify it appears.
- Create a recurring school reminder and verify recurrence metadata survives refresh.
- Edit a non-recurring item and verify visible state updates.
- Edit a recurring item and verify expected mobile scope behaviour against backend data.
- Delete non-recurring and recurring items and confirm cache refresh removes them correctly.
- Verify empty state when no school-week-enabled children exist.
- Test loading, error, pull-to-refresh, and accessibility labels for item cards and modal controls.

---

## Final Verdict

Would you ship this version to production?

**Yes, with documented scope notes.** I would ship this release candidate if the App Store release definition is “Expo supports the core Calendar and Husk lifecycle flows with stable API-backed behaviour.” The reviewed source and targeted checks show no Critical or High blockers, and the major user state transitions are implemented consistently enough for production manual QA.

I would **not** describe the release as exact web parity. Web remains ahead in richer Calendar filters/settings/summary surfaces and School Week's full planning/detail/recurrence interaction model. Those are important parity differences, but they are not release-blocking defects unless exact parity is a launch requirement.
