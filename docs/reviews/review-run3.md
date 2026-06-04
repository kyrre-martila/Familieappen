# Run 3 Review

Date: 2026-06-03

## Score

**6.4 / 10**

Run 3 has the right calm product direction, but it is not ready for backend integration without tightening several prototype-like behaviors first. Calendar remains the strongest UX baseline: it has a legible day/month/list structure, passive cross-module summaries, and low-pressure entry points. Husk, Lister, Skoleuka, and Meal Planner mostly follow that tone, but several interactions currently create false confidence, hidden state, or mobile friction.

The critical test is: **Would a stressed parent immediately understand this?** For Calendar: mostly yes. For Husk: usually yes. For Lister: yes after the latest checklist detail improvements, but list creation/editing still feels heavier than needed. For Skoleuka: not reliably, because week navigation and recurring edits imply more correctness than the data/model currently supports. For Meal Planner: the calm inline model is promising, but move mode is too desktop-like for real mobile families.

Backend persistence is intentionally out of scope for Run 3, so this review does **not** penalize missing backend storage. The concern is whether the frontend state model, UX language, and interaction contracts are clear enough to wire to real data in Run 4.

## Strengths

- **Calendar is a credible UX baseline.** Day, month, and list views cover the main parent mental models without feeling like an admin panel. Meal chips and reminder chips work as passive context rather than turning Calendar into another task inbox.
- **The product tone is mostly right.** Rounded cards, soft surfaces, restrained icons, small status text, and non-alarming copy support a calm, premium, family-first feel.
- **Husk has the right philosophy.** Passive reminders avoid completion pressure, which is appropriate for “remember this” content such as gym clothes, books, gifts, and family errands.
- **Lister is now closer to a real checklist.** The detail screen has local completion toggles, progress updates, undo for completion, inline editing, and a sticky add action. That removes the biggest checklist-failure risk from the earlier state.
- **Skoleuka’s one-child-at-a-time model is directionally correct.** A dense multi-child timetable would be too stressful on mobile. The child carousel is more parent-friendly than a spreadsheet-style school calendar.
- **Meal Planner has a strong MVP concept.** A timeline with inline editing is calmer than fullscreen forms. Autocomplete from prior meals supports tired-parent reuse, and the “snart tomt” reminder is appropriately gentle.
- **Session restoration shows care for real usage.** Storing selected Husk tab, search, filters, school child, detail section, and scroll positions is a good Run 3 signal for mobile continuity.

## P0 Issues

### P0.1 — Skoleuka shows “Lagret” without changing visible data

**Classification:** P0 — must fix before backend.

**Problem:** Creating a school item closes the sheet and shows `Lagret`, but the new item is not inserted into the visible week. Choosing a recurring edit scope also closes the sheet and shows `Lagret`, but no item is changed.

**Real-family risk:** This is more dangerous than an obviously mocked feature. A parent may believe gym clothes, books, food days, or equipment were saved when the plan did not actually change.

**Required fix before Run 4:**

- Mutate local mock state for create/edit/delete and reflect the result immediately in the week.
- Never show `Lagret` unless visible state changes.
- Add explicit local data structures for single occurrence vs recurring series before connecting backend persistence.
- If a backend-compatible recurrence model is not ready, label the screen as “ukentlig mal” instead of a dated week planner.

### P0.2 — Skoleuka week navigation implies date-specific accuracy that does not exist

**Classification:** P0 — must fix before backend.

**Problem:** The week strip changes week labels and dates, but the items are the same static weekly plan. This makes “Uke 24” and “Uke 25” look like separate real weeks when they are effectively the same template.

**Real-family risk:** Parents will assume the selected week is accurate. That can fail badly around holidays, school trips, end-of-term events, and exceptions.

**Required fix before Run 4:**

- Decide whether Skoleuka is a **weekly template** or a **dated occurrence planner**.
- If template: remove the dated week strip or make it secondary and clearly say “Fast ukeplan”.
- If dated planner: generate/filter occurrences per selected week, including exceptions.
- Align copy, data shape, and edit-scope UI before backend integration so Run 4 does not hard-code the wrong mental model.

### P0.3 — Meal Planner move mode depends on drag-and-drop, which is weak on mobile

**Classification:** P0 — must fix before backend if move/reorder is part of MVP.

**Problem:** Move mode tells users to drag meals to move or swap them. HTML drag-and-drop is unreliable and often unintuitive on touch devices. The affordance may work in desktop testing but fail for the mobile-first target.

**Real-family risk:** A parent planning dinners on a phone will try to move a meal, fail to drag correctly, and conclude the planner is fiddly. This directly conflicts with “low friction” and “tired-parent usability”.

**Required fix before Run 4:**

- Replace or supplement drag with a touch-safe action sheet: `Flytt til…`, `Bytt med…`, or quick date chips.
- Keep drag only as optional enhancement, not the primary mobile mechanism.
- Add a clear non-drag fallback for keyboard and accessibility users.
- Confirm move/edit collision behavior: entering move mode should save or cancel inline edits visibly, not silently.

## P1 Issues

### P1.1 — Primary creation is inconsistent across modules

**Classification:** P1 — should fix before beta.

Calendar uses clear top actions and creation routes. Meal Planner has inline “legg til” affordances. Lister detail has a sticky add button. Husk and Lister overview rely more on empty-state actions and global create behavior, which is less discoverable when data already exists.

**Recommendation:** Add contextual primary actions near the module heading:

- `Ny husk` on Husk.
- `Ny liste` on Lister.
- `Legg til skolehusk` or `Rediger ukeplan` on Skoleuka.
- Keep global create as a shortcut, not the only obvious route.

### P1.2 — Search and filters add admin-panel weight to a calm reminder module

**Classification:** P1 — should fix before beta.

Search + filter is useful, but on the Husk landing screen it can dominate the experience and make the module feel more like a database than a family memory aid. This is especially true when the reminder count is small.

**Recommendation:**

- Hide or collapse advanced filters until the family has enough content.
- Keep search visible only where it solves an immediate problem.
- Use family-friendly filter labels such as “Vis for” and “Ta med tidligere” instead of generic admin filter language.

### P1.3 — Person selection rules are not obvious enough

**Classification:** P1 — should fix before beta.

Several flows rely on distinctions between individual family members, “Hele familien”, and implied all-family scope. If “no one selected” means everyone in one place but “Alle” is a filter value elsewhere, parents can misunderstand whether an item is assigned, shared, or simply unfiltered.

**Recommendation:**

- Use explicit `Hele familien` selection in creation/editing.
- Reserve `Alle` for filtering only.
- Show the resulting scope in the review line before save.

### P1.4 — Lister is a hybrid of project planning and checklist; that needs sharper copy

**Classification:** P1 — should fix before beta.

The hybrid model is promising for birthdays, trips, and home projects, but the product language alternates between “liste”, “punkt”, “ansvarlig”, “frist”, progress, archive, and completion. That can feel task-management-heavy if not softened.

**Recommendation:**

- Keep the overview calm: title, progress, people.
- In detail, separate “quick checklist” from “optional details”.
- Make assigning people and deadlines clearly optional, not required admin work.

### P1.5 — Skoleuka edit scope is too abstract for parents

**Classification:** P1 — should fix before beta.

`Kun denne gangen` / `Hele serien` is technically correct, but parent context matters more. They need to know whether they are changing this Friday only, every Friday, or all future Fridays until a date.

**Recommendation:**

- Use concrete labels: `Bare fredag 12. juni`, `Hver fredag fremover`, `Hver fredag til 20. juni`.
- Preview the affected child, weekday, and date range in the sheet.
- Include delete behavior in the same mental model.

### P1.6 — Meal Planner needs stronger empty and “not enough dinners” behavior

**Classification:** P1 — should fix before beta.

The “snart tomt” reminder is good, but the planner needs clearer guidance for the first real week. A blank timeline can still be cognitively heavy: parents need to understand whether they should plan today, tomorrow, weekdays, or the whole week.

**Recommendation:**

- Add a low-pressure “Planlegg de neste 3 middagene” starter.
- Offer quick chips such as `I dag`, `I morgen`, `Mandag-fredag`.
- Keep this as help, not a required wizard.

### P1.7 — Mobile sheets need stricter interaction contracts

**Classification:** P1 — should fix before beta.

Filter sheets, reminder detail sheets, school create sheets, recurring choice sheets, and meal menus use similar bottom-sheet language but not always the same behavior. Some have explicit actions, some close on backdrop, some act immediately.

**Recommendation:**

- Standardize sheet anatomy: handle, title, close, content, sticky action row.
- Define when changes are live vs saved on `Ferdig`.
- Add escape/back behavior and focus return for every sheet.
- Prevent background scroll while sheets are open.

## P2 Improvements

### P2.1 — Calendar list filters include categories with no results

The Calendar category filter includes options such as music/general handling that can produce no results or special-case logic. This is acceptable for mock data but should be tightened before real data so parents do not see dead filters.

### P2.2 — Long labels and names need more stress testing

Run 3 uses realistic Norwegian content, but not enough extreme content. Test long child names, compound school reminders, long meal names, and lists with many people.

### P2.3 — Avatar density should be capped consistently

Calendar, Husk reminder cards, Lister cards, and list detail use avatars differently. Most are pleasant with 3–4 members, but larger families will create visual noise.

### P2.4 — Green accent use should be more intentional

Green appears as selected state, success, action, and brand accent. It still feels calm, but the system should distinguish “selected”, “saved”, “positive completion”, and “primary action” more carefully.

### P2.5 — Completion animation in Lister should stay subtle

The recently-completed state and undo are good, but avoid celebratory motion or gamified pressure. The app philosophy is calm completion, not productivity scoring.

### P2.6 — Meal autocomplete should tolerate messy family input

Autocomplete should handle spelling variants, plural/singular, Norwegian characters, and partial words. It should not make custom meals feel like second-class entries.

## Product Concerns

### Calendar

- **Day/month/list structure is right.** This is the most mature Run 3 module.
- **Meal chips are useful but must remain passive.** Calendar should show dinner context without becoming the meal-planning workflow.
- **Husk integration is product-correct.** Reminders belong in Calendar as awareness, not pressure.
- **Risk:** Calendar could become cluttered when real families have school, meals, reminders, birthdays, sports, shared events, and recurring items. The list view will need strong grouping and filters without looking administrative.

### Husk

- **Passive reminders are the right choice.** Do not add aggressive completion states just because tasks have completion.
- **Risk:** If Husk becomes a second task manager, it will increase mental load. Keep it closer to “things we should remember” than “things we must finish”.
- **Risk:** Previous reminders need careful treatment. Showing old reminders can be useful, but too much old content can make parents feel behind.

### Lister

- **The project/checklist hybrid is useful.** It fits birthdays, trips, packing, seasonal chores, and family events.
- **Risk:** Assignment, due date, archive, editing, progress, and sections can drift toward productivity-app complexity.
- **Risk:** Families may use lists collaboratively. Run 4 must handle concurrent edits, completed-item movement, undo windows, and optimistic state clearly.

### Skoleuka

- **One-child mobile flow is the right foundation.** It avoids a dense multi-child schedule.
- **Biggest product risk:** The module is currently caught between recurring weekly template and dated calendar. Real school life has exceptions. This needs a clean model before backend work.
- **Risk:** Families with no school-age children, one child, many children, alternating-week plans, SFO, school holidays, and divorced-family routines need clear states.

### Meal Planner

- **Timeline + inline editing is right.** It avoids heavy forms and supports quick planning.
- **Autocomplete is important.** Reusing prior meals reduces mental load.
- **Move mode is conceptually useful but mechanically risky.** Drag-and-drop is not enough for mobile-first.
- **Risk:** The planner may become too open-ended. Parents often need “just help me fill the next few dinners”, not an infinite timeline.

## Architecture Notes

- **Provider/mock strategy is adequate for Run 3, but Run 4 needs a boundary now.** Mock data is imported directly into feature pages. Before backend integration, introduce feature-level providers/hooks with the same shape expected from the API. This will reduce rewrites and make optimistic state testable.
- **Local mutable state should match backend contracts.** Lister detail now mutates local state in a useful way. Skoleuka does not. Meal Planner mutates a local map. Calendar mostly reads static imports. These should converge on a shared pattern: query state, optimistic mutation, rollback/error state, and visible confirmation only after state changes.
- **Route organization is understandable but could become fragmented.** Calendar has event routes, Husk has reminders/lister/skoleuka in one section, Meal Planner is standalone. That is fine, but shared primitives should be extracted before adding backend states to every page.
- **Shared primitives are emerging but not formal enough.** Bottom sheets, chips, avatars, empty states, progress bars, search/filter toolbars, saved badges, sticky actions, and inline editors repeat across modules. Extracting too early can slow product work, but Run 4 will otherwise duplicate loading/error/dirty-state behavior.
- **Session storage is useful but fragile.** It is fine for Run 3 continuity. With backend data and multi-device families, it must not become the source of truth. Also validate stale stored IDs when families, children, or lists change.
- **Accessibility needs a pass before beta.** There are many aria labels and roles, which is good, but dialogs need focus management, background scroll locking, keyboard escape behavior, and consistent focus return.
- **Direct route handling needs hardening.** Detail routes should handle missing IDs, unavailable family access, archived/deleted records, no children, and stale session-selected tabs.

## Missing Edge Cases

- **Long titles:** Event names, list titles, school reminders, and meal names can overflow card layouts or push actions off-screen.
- **Empty families:** Modules assume usable family/member data. Empty household states need explicit onboarding-like copy.
- **Many family members:** Avatar stacks and person filters need overflow behavior beyond 4–5 people.
- **No children:** Skoleuka must not show an empty carousel or school-specific copy if there are no school-age children.
- **Huge datasets:** Calendar list, Husk reminders, and Lister overview need pagination/windowing or at least tested performance with hundreds of items.
- **Switching tabs:** Stored tab/query/filter state is good, but users may be confused if they return to a filtered empty list and forget filters are active.
- **Direct routes:** `/husk?tab=skoleuka&edit=1`, list detail routes, and calendar event routes need robust unavailable-record states.
- **Keyboard overlap:** Inline meal editing, school create sheet fields, and fullscreen list editing need mobile keyboard tests, especially with sticky bottom navigation.
- **Scroll restoration:** Session scroll restoration is useful but can restore to the wrong place after filtering, adding items, or switching tabs.
- **Move/edit collisions:** Meal Planner must clearly handle entering move mode while an inline editor is open, dragging to an occupied day, cancelling move mode, and undoing after a move.
- **Recurring exceptions:** Skoleuka needs single occurrence changes, skipped weeks, holidays, and end dates before real data.
- **Concurrent family edits:** Lister and Meal Planner need conflict behavior if two parents edit the same item.

## Recommended Next Steps

1. **Fix Skoleuka’s product/data contract first.** Choose weekly template vs dated occurrence planner, then make create/edit/delete mutate local state accordingly.
2. **Replace mobile drag dependency in Meal Planner.** Add a tap-based move/swap fallback before backend work.
3. **Introduce feature providers/hooks before Run 4 backend.** Calendar, Husk, Lister, Skoleuka, and Meals should consume provider APIs instead of importing mock data directly inside UI components.
4. **Standardize bottom sheets and saved-state behavior.** No `Lagret` unless state changes. Define live vs committed edits consistently.
5. **Add contextual creation actions.** Each module should have an obvious creation path even when data is not empty.
6. **Run a mobile edge-case QA pass.** Test small screens, keyboard overlap, long content, many members, no children, empty family, and direct routes.
7. **Create backend-ready mutation specs.** For each module, document create/update/delete/complete/move/recurrence operations and expected optimistic UI behavior.
8. **Do a copy pass for tired parents.** Replace technical/admin labels with concrete family language where possible.

## Founder Recommendation

### A. Must fix before Run 4 backend

- Skoleuka must stop showing saved state without visible changes.
- Skoleuka must choose and reflect one model: weekly template or dated week occurrences.
- Meal Planner needs a mobile-safe move/swap mechanism that does not depend on drag-and-drop.
- Feature-level provider/hooks should be introduced so backend integration does not require rewriting page components.
- Saved badges, optimistic updates, and local state changes must follow one reliable rule across modules.

### B. Can wait until beta

- Contextual creation buttons for Husk and Lister overviews.
- Better first-use guidance in Meal Planner.
- More parent-friendly copy for filters, assignment, recurrence, and scopes.
- Full bottom-sheet standardization and accessibility focus management.
- Edge-case QA for long titles, many members, no children, and stale routes.

### C. Post-MVP only

- Advanced meal planning features such as grocery generation, nutrition, recipes, and meal categories.
- Complex school scheduling such as alternating weeks, holiday calendars, and school-system integrations.
- Advanced list automation, templates, dependencies, or productivity-style reminders.
- Deep Calendar analytics or dense agenda customization.

**Bottom line:** Run 3 is directionally strong but still behaves like a polished prototype in the riskiest places. Calendar can remain the benchmark. Before Run 4, prioritize interaction truthfulness, mobile-safe meal moving, and a backend-ready Skoleuka model over more surface polish.
