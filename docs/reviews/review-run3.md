# Run 3.2 Review

Date: 2026-06-03

## Score

**6.2 / 10**

Run 3.2 has the right product direction, but it is not beta-ready yet. The surface is calm and generally aligned with the Calendar baseline, but several flows currently feel like a polished prototype rather than a reliable family tool. The highest-risk pattern is that the UI says or implies changes are saved while the underlying behavior is incomplete, hidden, or not reflected back to the parent.

A stressed parent would understand the broad intent of **Husk**, **Lister**, and **Skoleuka** quickly. They would not always understand what happened after tapping, saving, editing a recurring school item, or trying to complete a list item.

## Strengths

- **The three-tab mental model is understandable.** `Husk`, `Lister`, and `Skoleuka` are distinct enough for parents and avoid an admin-panel feeling.
- **The visual tone is calm and premium.** Cards, rounded controls, soft backgrounds, and restrained iconography are broadly consistent with the Calendar module.
- **Husk reminders avoid checkbox pressure.** Passive reminders fit the low-stress philosophy better than turning every reminder into a task.
- **List detail is more focused than a dashboard.** The fullscreen route helps parents stay inside one list instead of juggling multiple panels.
- **Skoleuka has a promising mobile-first concept.** A one-child-at-a-time view is preferable to a dense school timetable on phone screens.
- **Session-based tab and scroll preservation show good intent.** Returning to the same tab/scroll position is important for mobile family use.

## P0 Issues

### P0.1 — Skoleuka edit actions create false confidence

**Problem:** Skoleuka lets users add an item, choose recurring edit scope, and see `Lagret`, but the new item is not inserted into the visible school week data. Existing recurring edits also do not change anything; both `Kun denne gangen` and `Hele serien` close the sheet and show saved.

**Why this is serious:** This is worse than a missing feature because the UI tells parents that school information was saved. For a real family, this can cause missed gym clothes, books, food days, or equipment.

**Fix before beta/backend integration:**

- Either make the mock state mutate locally and reflect immediately, or clearly mark these actions as unavailable.
- Do not show `Lagret` unless the visible UI changes.
- For recurring changes, separate `edit single occurrence`, `edit series`, and `delete` paths, even if backed by mock state initially.

### P0.2 — List detail looks like a checklist but cannot reliably complete items

**Problem:** `Lister` cards show progress and the detail route has `Pågår` / `Fullført`, check-style status circles, and completed counts. But tapping a row expands editing instead of completing. In the expanded state, tapping the status circle collapses the editor rather than marking the item complete. There is no obvious way to move an item from `Pågår` to `Fullført`.

**Why this is serious:** A list app without an understandable completion action fails the core promise of `Lister`. This will confuse parents immediately because the UI strongly suggests checklist behavior.

**Fix before beta/backend integration:**

- Make the status circle a real completion toggle.
- Keep row expansion as a separate affordance, such as a chevron, `Detaljer`, or long press only if tested.
- Update counts/progress instantly when completion changes.
- Add undo or a gentle completed-state transition so accidental taps are recoverable.

### P0.3 — Week selector in Skoleuka is misleading

**Problem:** The week selector changes dates and week labels, but the displayed school items come from the same static child plan regardless of selected week. A parent can move two weeks forward and still see the same items as if they belong to that week.

**Why this is serious:** The module is named `Skoleuka`, and week context is central. Showing repeated items across all weeks without clearly indicating recurrence can lead to wrong assumptions.

**Fix before beta/backend integration:**

- If all items are recurring weekly, label the view explicitly as a weekly template rather than a dated week.
- If dated weeks are intended, store/render occurrences per selected week.
- Current-week default is good, but the current week selector must not imply date-specific accuracy until the data model supports it.

## P1 Issues

### P1.1 — Primary creation paths are too hidden

The main page has no visible `+` action in the reviewed Husk/Lister shell. Empty states say `Trykk +`, but the visible code path does not render a clear add button for `Husk` or `Lister` in the tab content. If the plus lives in global navigation, it is too detached from the context and not discoverable enough for tired parents.

**Recommendation:** Add a contextual primary action per tab:

- `Ny husk` on Husk.
- `Ny liste` on Lister.
- `Rediger skoleuka` / `Legg til skolehusk` on Skoleuka.

### P1.2 — Duplicate save actions make forms feel heavier than Calendar

Create/edit flows have both a topbar `Lagre` and a bottom primary `Lagre`. Calendar can tolerate this on larger forms, but Husk and Lister are meant to be lighter. On mobile, two save buttons increase cognitive load and make users wonder if one has a different meaning.

**Recommendation:** Keep the topbar `Lagre` for fullscreen focus routes and remove the bottom duplicate for simple Husk/List forms, or make the bottom action sticky only when the topbar is off-screen.

### P1.3 — `Ingen valgt betyr hele familien` is clever but not parent-friendly

The person picker uses an implicit rule: selecting nobody means the whole family. This saves one chip but increases mental load. Parents may interpret no selected person as incomplete or private, especially when the filter sheet has an explicit `Hele familien` option.

**Recommendation:** Add an explicit `Hele familien` chip selected by default. Keep individual family members as alternatives.

### P1.4 — Search state is shared between Husk and Lister

The search query is persisted globally for the Husk module. A search entered on `Husk` carries into `Lister`, where it can create an unexpected empty or filtered state. This is subtle but frustrating on phones because users may not notice the search text after switching tabs.

**Recommendation:** Use separate search state per tab, or clear the query when changing between content types after confirming this with product.

### P1.5 — Filter semantics are inconsistent and brittle

The filter sheet visually reuses Calendar patterns, which is good, but the actual person semantics are not consistent:

- `Hele familien` filtering depends on scope text or member-count heuristics.
- Lists infer family scope from more than two members in one place.
- Reminder forms use no selected participants to mean the family.

**Recommendation:** Introduce explicit audience/scope data before backend integration: `family`, `members[]`, and eventually `household adults`, `children`, or `custom` if needed.

### P1.6 — Archived lists are visible but inert

Archived lists render as non-clickable cards. This avoids editing old lists, but it gives parents no obvious way to inspect, restore, or understand why an archived list is shown.

**Recommendation:** Either make archived cards open read-only detail with restore/unarchive later, or hide archived lists entirely until archive management exists.

### P1.7 — Reminder cards only open edit; there is no lightweight read state

Tapping a Husk reminder jumps straight to edit mode. For passive reminders, a parent often wants to read context, not edit. The direct-edit behavior makes the module feel more like data administration than a calm family memory aid.

**Recommendation:** Consider a lightweight detail/bottom sheet with `Endre` as secondary, especially for reminders with notes, dates, or multiple people.

### P1.8 — Delete actions are fake alerts

Edit forms expose `Slett husk` / `Slett liste`, but deletion only shows an alert saying it comes later. This is acceptable for an internal prototype, but not for beta.

**Recommendation:** Remove delete buttons until implemented, or implement local mock deletion with a confirmation and undo.

### P1.9 — Date handling loses original reminder specificity

Editing a reminder maps all existing reminders to a hardcoded ISO date. Date labels such as `I morgen`, `Tirsdag 10. juni`, and `Uke 26` are not faithfully represented. This will become backend debt if the form model does not distinguish exact dates, relative labels, weeks, and recurrence.

**Recommendation:** Define the reminder date model before integrating backend APIs.

### P1.10 — Skoleuka child navigation is discoverable but inefficient for many children

The one-child flow is right for mobile, but previous/next arrows do not scale well once a family has many children or if a parent needs to jump directly to one child.

**Recommendation:** Keep arrows, but add a compact child chip row or child switcher sheet when there are more than two children.

### P1.11 — Bottom sheets need stronger mobile interaction handling

Filter and Skoleuka sheets look good, but they need production-level interaction behavior:

- focus should move into the sheet when opened;
- background content should not be screen-reader reachable;
- body scroll should be locked;
- Escape/back behavior should close the sheet predictably;
- keyboard should not obscure primary actions.

**Recommendation:** Extract one shared mobile sheet primitive and reuse it for filters, Skoleuka create, recurring choice, and future detail sheets.

## P2 Improvements

- **Add active-filter empty-state copy.** `Ingen husk akkurat nå` is misleading when filters/search hide existing content. Say `Ingen treff` and offer `Nullstill filter`.
- **Make empty states actionable.** Empty states should include the actual action button, not only instructional text.
- **Reduce decorative icon variance.** Husk, Skoleuka, List detail, and Calendar use similar but not identical icon sizes and tones. Normalize to a smaller set of icon container sizes.
- **Clarify wording.** `Husk` as both module and item label works in Norwegian, but `Ny husk`, `Rediger husk`, and `Hva må huskes?` should be user-tested. `Påminnelse` toggle also needs to explain what happens when it is off.
- **Use softer archived/list progress language.** `fullført` is clear, but for family lists it may feel project-management-like. Test `klart`, `ferdig`, or `gjort`.
- **Add long-title stress tests.** Some wrapping fixes exist, but list cards with many avatars and very long titles still need real phone review.
- **Add saved-state nuance.** `Lagret` appears after every keystroke/change in list detail. That can feel noisy. Consider quieter autosave copy such as `Endringer lagres automatisk` plus only show `Lagret` after meaningful actions.
- **Add transition consistency.** Fullscreen routes and sheets should use the same duration/easing as Calendar focus routes.
- **Consider a today/current-week reset.** If users navigate weeks in Skoleuka, provide a small `Denne uka` reset.
- **Improve direct-entry back behavior.** `router.back()` can leave a user stranded if they open a detail route directly. Add deterministic fallback links.

## Architecture Notes

### Component structure

- `apps/web/app/husk/page.tsx` is doing too much: tab orchestration, filters, search, reminder cards, list cards, school week date logic, child navigation, sheets, and session storage. This should be split before backend integration.
- `HuskListDetailClient` mixes fullscreen shell, item editing, local persistence, progress calculations, scroll restoration, and family access handling. It is manageable now but will become fragile once backend mutations are added.
- `HuskFocusFormClient` reuses Calendar form classes and icon picker paths, which is efficient, but it couples Husk creation to Calendar event form concepts. This should be made explicit through a shared `FocusForm` primitive instead of hidden reuse.

### State handling

- Session storage is used for selected tab, search query, filters, selected school child, scroll position, expanded list item, selected section, and form drafts. This is useful for a prototype, but it is not a backend-ready state strategy.
- Form drafts persist after saving. Without cleanup, a parent can return to a stale draft and see data that was already “saved”.
- Local state mutations are inconsistent: list detail mutates local items, Skoleuka create does not update displayed items, and edit forms save drafts without changing the source mock data.

### Route organization

- Fullscreen routes exist for list detail and create/edit flows, but they do not share one route-shell abstraction.
- The `Skoleuka` edit mode is encoded as a query parameter instead of a clear route/sheet state. That can work, but the current `router.back()` behavior is risky if the user lands directly on `?edit=1`.
- Icon picking goes through `/calendar/events/icon-picker`, which leaks Calendar implementation details into Husk. This is acceptable temporarily, but the route should become shared or renamed before broader use.

### Mock/provider organization

- Mock data is static and route-local. It does not model real operations such as create, update, complete, archive, restore, or recurring occurrence updates.
- Hardcoded school child IDs assume specific demo children. This will fail for empty families, families with no children, blended families, and children added later.
- Family member color/avatar handling is duplicated across Calendar, Husk, and List detail with slightly different class names.

### Backend readiness

Before backend integration, define these domain models explicitly:

- Reminder: title, audience, due date/date label, optional notification, passive/dismissed state, notes, icon.
- List: title, audience, archived state, items, item completion, item assignment, due date, description.
- School week: child, weekday, recurrence rule, occurrence exceptions, school-year boundaries, end dates, and conflict behavior.

Without this, the backend will inherit UI shortcuts such as “no selected people means family” and “all school items repeat every displayed week”.

## Product Concerns

### Husk

The passive reminder direction is good, but the product still needs a clear answer to: **what does a parent do after the thing is no longer relevant?** No checkboxes is calm, but there still needs to be archive, dismiss, expires-after-date, or auto-expire behavior.

### Lister

The product decision to make Lister a checklist/project container is strong, but the current detail interaction undermines it because completion is not obvious. `Detail view editing only` can work, but list rows must still support quick completion. Otherwise parents are forced into an editor for simple tasks.

### Skoleuka

Current-week default and one-child mobile flow are good. The risk is that `Skoleuka` mixes two concepts:

1. a weekly template for recurring school routines;
2. a dated current-week planner.

Both are useful, but combining them without clear labels will confuse families. Recurring weekly only is fine for MVP, but exceptions must be planned because school weeks are full of one-off events.

### Filters

Filters are useful, but they may be too prominent for a calm MVP if most families only have a handful of items. Search plus filters on both Husk and Lister can make the module feel more like an admin tool. Consider keeping filters, but make defaults and reset behavior extremely forgiving.

## Missing Edge Cases

- Empty family.
- Approved user with no family members loaded.
- Family with adults only and no children.
- Family with one child.
- Family with more than five children.
- Child removed from a family after school week items exist.
- Multiple people selected on reminders and lists.
- Very long reminder titles, list titles, item titles, and child names.
- Many reminders in `I dag` causing long scroll and sticky navigation needs.
- Search active while switching tabs.
- Filters active while creating a new item that does not match the current filter.
- Archived lists with restore/delete/read-only needs.
- Direct URL entry to list detail, edit forms, and `?edit=1` school planner.
- Browser back from fullscreen routes when there is no in-app history.
- Keyboard covering Skoleuka sheet save action.
- Recurring item conflicts, exceptions, holidays, and end dates before selected occurrence.
- Reminder dates in past/current week/future week with different labels.
- Duplicate list item titles.
- List with zero items.
- List where all items are completed.
- Offline or failed backend save after optimistic UI says `Lagret`.

## Recommended Next Steps

1. **Fix the P0 trust issues first.** Make Skoleuka create/edit reflect changes or remove the fake saved paths. Make list item completion obvious and functional.
2. **Define backend-ready domain models before API work.** Especially audience/scope, reminder dates, list item completion, archive state, and recurring school week rules.
3. **Split `husk/page.tsx` into maintainable components.** Suggested slices: `HuskTabs`, `HuskToolbar`, `HuskFilters`, `HuskReminders`, `HuskLists`, `SchoolWeek`, and shared sheet primitives.
4. **Create a shared fullscreen focus shell.** Reuse it for Calendar event forms, Husk forms, and List detail instead of hand-rolling each route.
5. **Add contextual primary actions and actionable empty states.** Parents should never have to search for `+`.
6. **Normalize filter/search behavior.** Separate query state per tab, show active-filter empty copy, and add one-tap reset.
7. **Make audience selection explicit.** Replace the implicit “none means family” rule with a selected-by-default `Hele familien` option.
8. **Harden mobile sheets.** Add focus trapping, scroll lock, keyboard-safe actions, and predictable back behavior.
9. **Add edge-case fixtures.** Test empty family, one child, many children, long text, no items, all items completed, and many reminders.
10. **Postpone advanced post-MVP work.** Wait on custom recurrence, complex school calendars, collaboration history, comments, attachments, and sophisticated archive management until after MVP usage data.

## Founder Recommendation

**Fix before backend integration:**

- List completion interaction.
- Skoleuka save/edit truthfulness.
- Reminder/list/school domain models.
- Shared fullscreen and sheet primitives.
- Explicit audience model.

**Can wait until beta polish:**

- Copy refinements.
- Transition tuning.
- Better active-filter empty states.
- Archived read-only detail.
- Child switcher sheet for larger families.

**Postpone until post-MVP:**

- Custom recurrence rules beyond weekly school items.
- Full project-management features for lists.
- Comments, attachments, activity logs, and per-item notifications.
- Advanced school calendar import/sync.
