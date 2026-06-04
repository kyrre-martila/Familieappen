# Run 4 Review

## Score
7/10

The app is close to a family-testable beta, but it still needs a narrow trust pass before broader use. Calendar and the core backend hooks feel coherent, but several flows still depend on optimistic UI and local/session state in ways that can confuse a tired parent if the network is slow or a backend write fails.

## Strengths

- Calendar is the strongest baseline: the visual language, chips, loading/error copy, and cross-module meal/reminder surfacing are clear enough for stressful weekend planning.
- Backend persistence is now present across the important Run 4 modules, and optimistic rollbacks exist in the main hooks for Calendar, Husk, Lister, Meal Planner, and Skoleuka.
- Empty states are generally calm and practical: no children in Skoleuka, no meals in Meal Planner, empty reminders, and missing family access all give a next step instead of dead UI.
- Mobile-first spacing is mostly consistent. Primary taps are large, bottom actions are reachable, and card language is familiar across modules.
- Error tone is appropriately non-technical in most user-facing paths.

## P0 Issues
Must fix before family testing

- No open P0 blocker remains from this pass.
- The biggest P0 candidate found was false success feedback in Lister detail and Meal Planner. Those flows now only show saved/deleted/moved/restored messages after the backend operation resolves successfully.

## P1 Issues
Should fix before broader beta

- Lister detail still saves title/description edits on every keystroke. That is trustworthy after this pass, but it can feel noisy on slow mobile networks and may cause unnecessary backend traffic. Prefer a small debounce or save-on-blur model before a broader beta.
- Meal Planner move mode depends on drag/drop. This is awkward for one-handed mobile use and should get a simple tap-to-pick/tap-to-place fallback before larger beta cohorts.
- Some route-level fallback data still comes from old module mock files for static route generation and icons. This is acceptable for local development, but production routes should avoid displaying any stale mock detail while backend data is still resolving.
- Calendar settings still clearly labels ICS export as mock/local. That is honest, but if families see it in beta it may reduce trust. Hide or gate that setting unless it is intentionally part of beta scope.
- Session storage remembers tabs, expanded rows, scroll positions, and drafts. Most stale values are handled safely, but old drafts can still surprise users after a refresh during edit.

## P2 Improvements
Nice improvements

- Add disabled/busy states to per-item Lister actions while a write is in flight, especially complete/delete.
- Add a compact conflict message when an optimistic write rolls back because another device changed or deleted the same item.
- Add long-title stress CSS tests for names, reminders, list items, and meal titles.
- Add skeleton consistency review so loading states feel identical across Calendar, Husk, Lister, Skoleuka, and Meal Planner.
- Add a small offline banner when repeated API failures occur, rather than only per-action messages.

## Trust Concerns

- Families will lose trust quickly if the app says “saved” while a backend write is still pending. This pass fixed the obvious false-success paths in Meal Planner and Lister detail.
- Optimistic UI is useful, but rollback needs to be visible and calm. The main hooks already rollback, but some UI surfaces still rely on global error copy instead of action-local feedback.
- Delete actions are still too lightweight in some places. Avoid accidental destructive actions by keeping undo available and making failure recovery obvious.
- Refresh during edit remains a mild risk because session storage can restore a draft/context that is no longer accurate after backend data changes.

## Architecture Notes

- The API hooks are reasonably separated by module and keep backend mapping logic out of page components.
- Calendar composes meals/reminders/family members well, but it can trigger multiple module fetches. This is acceptable for beta, but watch for duplicated refreshes as more cross-module chips are added.
- Several frontend types still import from old mock data files. That is a cleanup smell: move shared UI/domain types into feature-level types to reduce accidental mock coupling.
- Error handling is duplicated across pages and hooks. A small shared action-feedback helper could keep tone and retry behavior consistent without redesigning UX.

## Beta Readiness

Ready for a small internal family test after this hardening pass, assuming testers understand that calendar export/sync settings are not production-ready. Not ready for a broad beta yet.

Recommended beta scope:

- 2-3 trusted families.
- Normal weekday usage for one week.
- Focus on morning school planning, dinner planning, birthday/shopping lists, and weekend calendar review.
- Ask testers specifically whether any screen claimed success before they trusted that the change was really saved.

## Recommended Run 5 Focus

1. Replace remaining mock-coupled frontend types and route fallbacks with backend-first loading or not-found states.
2. Add save debouncing/busy states for Lister detail item edits.
3. Add mobile-friendly Meal Planner move fallback without redesigning the page.
4. Add action-level conflict/offline recovery patterns across Calendar, Husk, Lister, Skoleuka, and Meals.
5. Decide whether calendar export is beta scope; if not, hide it behind a clearly internal flag.
6. Add targeted tests for empty family, adults-only family, one child, many children, deleted data, and failed optimistic writes.

## Hardening Completed

- Lister detail no longer shows “Punkt lagret” until create/update/delete operations resolve successfully.
- Lister detail now shows local action feedback when item create/update/delete/complete/undo fails.
- Meal Planner no longer shows “Middag lagret”, “Middag slettet”, “Middag lagt tilbake”, “Middag flyttet”, or “Middager byttet plass” until the backend operation resolves successfully.
- Meal Planner undo now keeps the undo affordance available if restore fails.
- Added styling for the Lister detail inline failure message so errors are visible without modal chaos.

## Files Modified

- `apps/web/app/husk/lister/[id]/HuskListDetailClient.tsx`
- `apps/web/app/meals/page.tsx`
- `apps/web/app/globals.css`
- `docs/reviews/review-run4.md`

## Remaining Blockers

- No P0 blocker remains for a small internal family test.
- Broader beta should wait for save debouncing/busy states in Lister detail and a mobile-friendly non-drag Meal Planner move fallback.
