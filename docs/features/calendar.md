# Calendar MVP

## Scope and ownership

Calendar MVP is the family calendar surface for dated calendar events. It can also show lightweight summaries from nearby modules, but each module keeps ownership of its own domain:

- **Calendar owns calendar events**: manual events, imported event display metadata, event detail, event create/edit, icon picker, and calendar settings.
- **Husk owns reminders/tasks**: reminder/task editing stays in Husk. Calendar may show summaries only.
- **Meal planner owns meals**: meal editing stays in the meal planner. Calendar may show dinner summaries only.
- **Calendar only shows Husk/Meal summaries for now** and must not take over reminder or meal creation/editing logic.

These boundaries keep the calendar modular enough to support future Husk and Meals integration without duplicating business logic.

## UX decisions

- `/calendar` opens **Day View** by default.
- The primary view switcher exposes **Dag**, **Måned**, and **Liste** as explicit selectable states.
- Fullscreen focus routes (`/calendar/events/...`) hide the AppShell header and bottom navigation so the user can focus on event detail, create/edit, or icon selection.
- Mobile layout prioritizes safe-area spacing, sticky top bars where needed, and bottom padding so sticky actions and bottom navigation do not cover content.
- Calendar screens use the FamilieAppen green and existing card/chip styling from the locked MVP direction rather than introducing a new visual language.

## Day View rules

- Day View is the default calendar entry point.
- The horizontal date strip is the only intentional horizontal scroller.
- Tapping a date updates the selected day without changing route.
- The selected day heading reflects the active date.
- Summary chips may show dinner and Husk summaries for that date, but they are summary-only affordances until Husk/Meals deep integration exists.
- Event cards for the selected date open fullscreen event detail.
- Empty days show an empty state instead of placeholder event cards.

## Month View rules

- Month View shows a Monday-start month grid with week numbers.
- Date cells expose accessible labels describing the date and whether it has dinner, Husk summaries, or calendar events.
- Indicators are compact: meal icon, Husk icon, and up to four event dots.
- Tapping a date selects that date and switches back to Day View.
- Dates outside the visible month may be tapped, and the visible month follows the selected date.

## List View rules

- List View derives from the same calendar events, meal summaries, and Husk summaries as Day/Month views.
- Empty days are hidden.
- Filtering supports content type, family member, and icon/category.
- Applying filters updates the list; resetting filters restores all content.
- Summary chips are stacked above event cards for each day.
- List View does not own Husk or Meal editing. Husk and meal chips are summary affordances only in the MVP.

## Event detail rules

- Event cards open fullscreen detail routes.
- Event detail hides the AppShell header and bottom nav.
- The detail screen shows the event icon, source label, date, time, location, participants, reminder, and description.
- The edit button opens the fullscreen edit screen for that event.
- Imported ICS events may be displayed in the same detail UI, but the imported source remains the source of truth for title, time, and location.

## Create/edit rules

- `/calendar/events/new` opens the fullscreen create form.
- `/calendar/events/[id]/edit` opens the fullscreen edit form.
- Create/edit screens hide the AppShell header and bottom nav.
- Form state is stored in session storage during the MVP so navigation to the icon picker does not clear the draft.
- Required create/edit fields are title and date.
- Delete, custom recurrence, custom reminders, persistence, and backend synchronization are later work.
- Imported ICS event edits must be presented as local/mock enrichment until backend sync rules exist; the external ICS source remains authoritative for title, time, and location.

## Icon picker rules

- The icon picker is a fullscreen focus route.
- Opening it from the form passes both the return route and draft key.
- Choosing an icon writes back to the current form draft and returns to the form.
- Icon selection must not lose form state.
- Selected icon state is exposed with accessible pressed/selected semantics.

## Calendar settings

Calendar settings live at `/settings/calendar` and are reachable from the calendar header action.

Settings cover:

- Default calendar view preference for future persistence.
- Week number display preference.
- Default reminder preference.
- Calendar export/subscribable feed mock controls.
- ICS import mock controls.

All settings are local/mock in the MVP unless explicitly backed by later backend work.

## ICS import plan

- ICS import UI is a mock/local configuration surface in the MVP.
- Future backend work should fetch and normalize external ICS sources.
- Imported ICS source remains source of truth for title/time/location.
- FamilieAppen may enrich imported events locally with default participant and icon/category.
- Deleting or disabling an import should be safe and should not imply that the external calendar was changed.

## Calendar export plan

- Export calendar is planned as a **subscribable private ICS feed**, not a one-time download.
- The private URL should be treated like a secret: anyone with the URL can see the included calendar content.
- Regenerating the private URL should invalidate the old token when backend support exists.
- Disabling export should stop the feed from serving content when backend support exists.
- MVP copy must avoid production claims; current actions are mock/local previews until a real feed endpoint exists.
