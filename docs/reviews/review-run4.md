# Run 4 Review

## Score

**6.8 / 10 — promising small-alpha candidate, not broader-beta ready.**

Run 4 moves FamilieAppen from polished prototype toward a real product: the main modules now have backend persistence, family scoping, optimistic UI, session restoration, and cross-module Calendar composition. That is a meaningful readiness jump.

The remaining concern is not feature completeness. Wishlist is intentionally out of scope and should not count against Run 4. The concern is **trust under normal messy family conditions**: slow mobile networks, two parents editing the same thing, stale tabs, deleted records, children/member changes, refresh during an edit, and accidental destructive taps.

Real families would likely understand and enjoy the product in a guided 3–5 family alpha. They would also hit enough uncertain save/delete/move states that a 10–20 family beta would risk trust loss unless Run 5 hardens failure, conflict, and mobile editing flows.

## Strengths

- **The product direction is coherent.** The app still feels calm, premium, family-focused, and mobile-first rather than like an admin panel.
- **Calendar is now a credible family hub.** It brings manual events together with reminders and meals, which is exactly the kind of cross-module mental-load reduction families need.
- **Backend boundaries are mostly in place.** Calendar, Husk, Lister, Skoleuka, Meal Planner, Family, and FamilyMember are no longer just screen-local concepts.
- **Family access is treated as a first-class constraint.** Protected routes and `X-Family-Id`-scoped API calls reduce the risk of showing or mutating the wrong family data.
- **Optimistic UI generally has rollback paths.** Create/update/delete flows usually revert visible state and surface calm error copy when backend writes fail.
- **Empty states are directionally good.** No meals, no reminders, no children, missing family access, and loading states usually give families a next step instead of dead space.
- **Session restoration helps continuity.** Returning to the same tab, list section, expanded row, scroll position, or date can feel thoughtful when it is correct.
- **The UI avoids dense configuration.** Most flows are task-first: add dinner, add reminder, check school week, complete a list item.

## P0 Issues

**P0 = must fix before real-family testing.**

- **No absolute P0 blocker found for a 3–5 guided alpha.** The app is testable with trusted families if expectations are clear and support is close.
- **However, do not run the alpha without a short tester script and recovery plan.** Testers should know that Calendar sync/export and Wishlist are not part of the test, and the team should be ready to inspect failed writes, deleted records, and stale sessions quickly.

## P1 Issues

**P1 = should fix soon, and should be fixed before a 10–20 family beta.**

### Product Review

- **Calendar: recurring events are still a trust gap if families expect a real family calendar.** Birthdays, sports practice, school routines, and shared custody patterns are weekly/monthly realities. If recurring events are intentionally postponed, keep the UI clear enough that families do not assume recurrence exists.
- **Calendar: cross-module chips are useful, but error ownership is blurry.** If meals or reminders fail to load, Calendar can inherit the error state. A parent may not know whether Calendar is broken or just one chip source is unavailable.
- **Husk: reminders and lists overlap conceptually.** Families may hesitate between “Husk” reminder, “Liste” item, and “Skoleuka” item. The UI should make the choice obvious with examples like “ta med sekk” vs. “handleliste” vs. “gymtøy mandag”.
- **Lister: list detail still feels too edit-heavy for tired use.** Title/description fields save immediately after changes. That is convenient when fast, but noisy and trust-sensitive on slow mobile networks. Add debounce, save-on-blur clarity, or explicit pending state.
- **Skoleuka: recurring-school logic needs clearer exception handling.** Families will hit “this week only” changes: no gym this Friday, bring boots only tomorrow, swimming every other week. If exception handling exists backend-side, the parent-facing flow still needs to make scope and consequence obvious.
- **Meal Planner: move mode is drag/drop-led.** “Dra middager” is high-friction on mobile and especially poor for one-handed tired-parent use. Add a tap-to-pick / tap-to-place fallback.
- **Meal Planner: hidden auto-save on editor switch can surprise users.** Opening another meal commits the current editor silently. That can be efficient, but it can also save half-written text if a parent taps away mid-thought.

### Backend Readiness Review

- **Optimistic updates use whole-snapshot rollback in several hooks.** This can overwrite newer local changes when two operations overlap or when a refresh lands during a write.
- **No visible conflict model.** Deleted-by-other-parent, edited-on-other-device, and stale version conflicts mostly collapse into generic “could not save” messages. That is acceptable for alpha, not for broader beta.
- **Participant/audience updates are not transactionally wrapped everywhere.** Calendar participant replacement and Husk audience replacement delete then recreate related rows. If a mid-sequence failure happens, families may see partially updated participants/audiences.
- **Stale/deleted detail fallback remains risky.** Lister detail can render the initial route-provided detail while backend data is loading or missing. That can briefly show deleted/stale list content.
- **There is no durable offline queue.** Optimistic UI makes the app feel fast, but network drops still depend on rollback and generic retry copy rather than a clear “waiting to save” model.

### Mobile UX Review

- **Keyboard flows need stress testing.** Meal inline editing, list detail textareas, and reminder forms should be tested on small iPhones and Android devices with keyboard open.
- **Modal/sheet stacking risk remains.** Husk filters, reminder detail, school week create/recurring sheets, and edit routes are individually reasonable, but the combined mental model can become modal-heavy.
- **Destructive actions are still lightweight in places.** Delete meal has undo, but list item deletion and some event/list destructive actions need stronger local affordance or undo if used by real families.
- **Scroll restoration can become stale.** Restoring scroll and expanded rows is nice until the item was deleted, moved, or replaced by another family member’s edit.

## P2 Improvements

**P2 = polish, not required before alpha.**

- Add long-content stress tests for event titles, child names, meal titles, list names, list items, descriptions, and notes.
- Make loading skeletons visually consistent across Calendar, Husk, Lister, Skoleuka, and Meal Planner.
- Add a global calm offline/degraded banner after repeated API failures instead of only per-action messages.
- Add disabled/busy states on per-item actions while writes are in flight, especially complete, delete, undo, and move.
- Tighten Norwegian microcopy around saved/pending/failed states so the app never sounds more certain than the backend is.
- Add “recently changed” or “updated elsewhere” hints later if multi-device use becomes common.
- Gate unfinished Calendar export/sync settings from beta families unless it is explicitly part of the test scope.
- Move remaining UI/domain types away from old mock data files to reduce accidental mock coupling.

## Trust Risks

- **False certainty is the biggest risk.** Families will forgive a failed save if the app is honest. They will not forgive “saved” followed by missing dinner, missing school item, or a resurrected deleted list.
- **Concurrent edits are not yet family-safe.** Two adults can plausibly update dinner, complete shopping items, or change a child’s school reminder at the same time. Last-write-wins plus generic rollback is not enough for beta trust.
- **Deleted records need better UX.** If a parent opens a stale link to a deleted event/list/item, the app should clearly say it was removed and offer a calm path back, not briefly show old data.
- **Session restoration can preserve wrong context.** Restored tabs, expanded rows, scroll, route actions, and drafts reduce friction when fresh but can mislead after data changes.
- **Calendar cross-module reliability determines perceived app reliability.** If Husk or Meals fails, Calendar can feel broken even when events are fine. Calendar needs partial-data resilience.
- **Family/member changes are under-tested.** Empty family, adults-only family, child removed, renamed members, and invited/pending members can all break assumptions in assignment, audience, and Skoleuka flows.

## Architecture Notes

- **Provider architecture is the right direction.** Feature hooks keep backend mapping and optimistic state mostly out of page components.
- **But hook composition can cause duplicate work.** Calendar uses family members, reminders, and meals; those hooks also fetch their own family/member context. This is okay for alpha, but it will become harder to reason about as cross-module surfaces grow.
- **Optimistic state should become a shared pattern.** Each feature currently implements its own previous-state rollback, pending flags, and error copy. A shared mutation helper could standardize pending, rollback, conflict, retry, and user-facing messages.
- **Backend authorization is simple and appropriate for Run 4.** Requiring membership per family-scoped operation is the right baseline.
- **Backend mutations need more transactional consistency.** Related-row replacement for participants/audiences and move/swap operations should be consistently wrapped in transactions where partial writes would break trust.
- **Mock coupling is still a scaling smell.** Some frontend types and fallback visuals still originate from mock module files. It is not a blocker for alpha, but it increases the chance that mock assumptions leak into real beta data.
- **API errors are user-facing enough, but not structured enough for UX decisions.** The frontend needs to distinguish not found, stale/deleted, unauthorized, validation, network, and conflict-like states without string matching.

## Beta Readiness

### 3–5 family alpha test

**Go, with guardrails.**

Recommended alpha shape:

- 3–5 trusted families.
- 7–10 days of real weekday use.
- Test only the implemented Run 4 modules: Calendar, Husk, Lister, Skoleuka, and Meal Planner.
- Explicitly exclude Wishlist and unfinished Calendar sync/export expectations.
- Ask every family to use at least two devices/adults where possible.
- Ask testers to report any case where the app felt like it saved something but later did not.
- Have a support/debug plan for failed saves, deleted records, and stale sessions.

Expected weekly use:

- **Calendar:** yes, if families accept that recurrence/sync is limited.
- **Husk:** yes, for reminders and lightweight family memory.
- **Lister:** yes, especially shopping, birthday, packing, and chores; needs smoother edit confidence.
- **Skoleuka:** yes for families with children; irrelevant but harmless for adults-only/no-child families if empty state is clear.
- **Meal Planner:** yes, likely high value; move mode must become easier on mobile before wider beta.

### 10–20 broader beta

**No-go for now.**

The product is close, but broader beta will expose concurrency, stale sessions, mobile keyboard issues, deleted-record handling, and unclear conflict states. These are trust issues, not polish issues.

## Recommended Run 5 Scope

1. **Trust hardening pass across all mutations.** Add consistent pending, success-after-confirmation, rollback, retry, and not-found/deleted messaging for Calendar, Husk, Lister, Skoleuka, and Meals.
2. **Add conflict/stale handling.** Detect or at least clearly handle deleted records, stale detail routes, refresh during edit, and concurrent edit failures.
3. **Make Meal Planner move mobile-first.** Add tap-to-select/tap-to-place and keep drag/drop as optional desktop enhancement.
4. **Reduce Lister edit noise.** Add debounce, save-on-blur, or explicit “saving/saved/failed” row-level state for item title and description edits.
5. **Clarify Calendar partial-data states.** If meals/reminders fail, show Calendar events and a scoped chip warning instead of making the whole calendar feel broken.
6. **Wrap multi-row backend writes in transactions.** Prioritize participant/audience replacements, list item reorder/move if added, meal swaps, and recurring school exceptions.
7. **Edge-case test matrix.** Add tests/manual scripts for empty family, adults-only family, one child, many children, invited/pending members, removed members, long content, deleted records, stale session, failed save, concurrent edits, refresh mid-edit, move conflicts, and recurring exceptions.
8. **Remove mock fallback coupling.** Move shared UI/domain types into feature/domain files and avoid rendering stale mock detail while backend truth is unknown.
9. **Gate unfinished settings.** Hide or clearly label Calendar export/sync features from external beta unless they are intentionally being tested.

## Go / No-Go Recommendation

- **3–5 family alpha:** **GO WITH GUARDRAILS.** The app is useful enough to learn from real families now, as long as testers are trusted, scope is controlled, and the team is ready to respond quickly.
- **10–20 family beta:** **NO-GO.** Run 5 should first harden trust, stale data, mobile move/edit flows, conflict handling, and backend transactional consistency.

Bottom line: **FamilieAppen is ready to learn from real families, but not yet ready to be trusted by many families without close support.**
