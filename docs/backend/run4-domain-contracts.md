# Run 4 backend domain contracts

This document defines backend-ready domain contracts and mutation contracts for Run 4. It is intentionally a planning artifact only: no Prisma migrations, API route implementations, backend persistence, or UI behavior changes are included in this step.

## Scope and guardrails

- Keep current UI behavior identical while persistence is added behind it.
- Preserve the Run 4 boundaries from prompts 1-3: domain contracts should not depend on mock-only shapes, and feature modules own their own data.
- Calendar may display meal and Husk summaries as chips, but it does not own meals, reminders, lists, or school reminders.
- Backend routes should use the existing API convention: the Nest app owns controller paths such as `families`, `calendar/events`, `tasks`, and `meals`, while the deployed/global prefix supplies `/api`.
- All timestamps should be persisted as ISO strings. Date-only values should be persisted as ISO date strings (`YYYY-MM-DD`) unless a feature explicitly needs a timestamp.

## 1. Family/member model

### Domain objects

#### User

A `User` is a login-capable account.

Recommended fields:

- `id`
- `name`
- `email`
- `createdAt`
- `updatedAt`

Rules:

- A user may belong to one or more families through one `FamilyMember` row per family.
- A user is not the same thing as a family member. UI surfaces should reference family members when showing who an event, reminder, list item, or school reminder belongs to.

#### Family

A `Family` is the household/workspace container for all Run 4 feature data.

Recommended fields:

- `id`
- `name`
- `createdAt`
- `updatedAt`

Rules:

- Calendar events, Husk reminders, lists, list items, school-week plans, and meals are scoped to a family.
- All feature mutations must verify that the authenticated user has an active family membership before reading or changing family-owned data.

#### FamilyMember

A `FamilyMember` is the person shown in the app.

Recommended fields:

- `id`
- `familyId`
- `userId` (`null` for manual/non-login members)
- `displayName`
- `role` (`OWNER`, `PARENT`, `CHILD`, `GUEST`)
- `avatarColor` or `tone` (stable presentation token)
- `initials` may be derived from `displayName`; only persist if the app needs user-customized initials later.
- `createdAt`
- `updatedAt`

Rules:

- `displayName` is the canonical member display name used across Calendar, Husk, Lister, Skoleuka, and Meal Planner participant/assignment labels.
- `avatarColor`/`tone` is presentation metadata and should be stable per member once assigned. If not explicitly chosen, backend can assign a default color from the existing palette.
- `userId` links a login account to the person shown in the family. A login-capable adult can therefore act as a `FamilyMember` in feature data.
- Manual children and invited/non-login adults have `userId: null` until an invitation/claim flow links them to a `User`.

### Invited and non-login family members

Current product behavior supports adding family members who do not need login immediately. Backend persistence should model those as normal `FamilyMember` rows with `userId: null`.

Invitation/claim target:

- A future invite flow may create an invitation for an existing manual member or for a new member placeholder.
- When accepted, the accepting `User` should be linked to the intended `FamilyMember` rather than creating duplicate people.
- If a child never logs in, their `FamilyMember` still participates in assignments, school-week reminders, calendar participant chips, and list item ownership.

### Child/adult distinction

Current shared roles distinguish adults and children through `role`:

- `OWNER` and `PARENT` are adult roles.
- `CHILD` is a child role.
- `GUEST` is supported by the existing role vocabulary but should not be assumed to have child-specific behavior unless later requirements define it.

Skoleuka should only use members with child semantics. The MVP child set is currently represented by selected mock child IDs; backend implementation should instead filter by `role: CHILD` unless a later design introduces explicit school-profile settings.

## 2. Calendar contract

### Domain objects

#### CalendarEvent

A `CalendarEvent` is a manually created or imported dated event owned by Calendar.

Recommended fields:

- `id`
- `familyId`
- `title`
- `icon` / `category` (existing MVP values include sport, school, birthday, health, travel, family, meal)
- `date` for date-only UI grouping, or `startsAt` as the source timestamp plus a derived date for querying
- `startTime` (`HH:mm` or `null`)
- `endTime` (`HH:mm` or `null`)
- `allDay`
- `location` (`null` when absent)
- `reminder` (`null` or `{ minutesBefore, label }`)
- `recurrence` (`null` or placeholder rule object)
- `description` (`null` when absent)
- `source` (`manual` or future imported source such as `ics`)
- `isImported`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Rules:

- Required create fields: `title` and `date`.
- `allDay: true` means start/end times are not required and should not be used for ordering within the day beyond all-day placement.
- `startTime` and `endTime` remain optional in the MVP. If both are present, `endTime` should not be earlier than `startTime` for single-day events.
- `icon`/`category` is Calendar-owned display metadata, not a cross-feature ownership marker.
- `recurrence` remains a placeholder until recurrence creation/editing is implemented. Store `null` for non-recurring MVP events.

#### CalendarEventParticipant

A `CalendarEventParticipant` links a calendar event to family members.

Recommended fields:

- `id`
- `eventId`
- `familyMemberId`
- `createdAt`

Rules:

- Participants must be members of the same family as the event.
- Empty participants means no specific members selected; UI may treat this as no participant chips rather than "Hele familien" unless a future product decision defines a family-wide event flag.
- If the UI needs explicit "Hele familien", use either all current member IDs or a separate `audienceType: family` field. Do not infer it silently from an empty array without documenting that behavior.

### Calendar mutation behavior

- **Create:** validate family membership, create the event, create participant rows, return the full event including participants.
- **Update:** patch only submitted fields; replacing participant IDs should be atomic with the event update.
- **Delete:** remove the event and participant rows. Deleting a Calendar event must not delete meals, Husk reminders, lists, or school reminders.

### Calendar chips from other features

- Meal chips are read-only Calendar summaries derived from Meal Planner data for a date.
- Husk chips are read-only Calendar summaries derived from Husk reminder or school reminder data for a date.
- Calendar may route users to the owning feature in later work, but Calendar must not create, edit, delete, complete, or archive those objects.

## 3. Husk reminder contract

### Domain object: Reminder

A `Reminder` is a passive, dated Husk item that helps the family remember something without becoming a high-pressure task workflow.

Recommended fields:

- `id`
- `familyId`
- `title`
- `scopeType` (`family` or `selectedMembers`)
- `memberIds` (empty only when `scopeType: family`, otherwise one or more selected members)
- `date` (`YYYY-MM-DD`, nullable only for later unscheduled reminders if later allowed)
- `dateBucket` derived for UI grouping: `today`, `tomorrow`, `week`, `later`, `previous`
- `notification` / `reminderAt` optional future notification metadata
- `notes` (`null` when absent)
- `icon` / `category`
- `tone` or other presentation token if required by current UI
- `source` (`manual`, `school-week`, or future automation source)
- `sourceId` (`null` for manual reminders; links generated reminders to school-week source when needed)
- `archivedAt` or `expiredAt` placeholder for future history strategy
- `createdByUserId`
- `createdAt`
- `updatedAt`

### Passive behavior

- Husk reminders are passive reminders, not mandatory task assignments.
- Completion is not part of the current reminder MVP contract. If later introduced, it should be a separate state transition and not conflated with archive/history.
- UI copy should avoid implying push notifications exist unless notification persistence and delivery are implemented.

### Audience/scope behavior

- **Hele familien:** persist as `scopeType: family`; backend may return all member IDs for display, but the source of truth should remain family scope.
- **Selected family members:** persist as `scopeType: selectedMembers` with one or more `memberIds`.
- All member IDs must belong to the reminder's family.

### Date/due behavior

- `today`: reminders due on the current local family date.
- `tomorrow`: reminders due on the next local family date.
- `this week`: reminders due after tomorrow and through the end of the current week.
- `later`: reminders due after the current week.
- `previous/history`: reminders whose date is before today, or reminders moved to archive/history by a future strategy.

The backend should store the canonical date and let API response mapping derive the user-facing bucket labels for the family's locale/time zone.

### Husk reminder mutation behavior

- **Create:** validate title, scope, date, icon/category, and member IDs; return the created reminder.
- **Update:** patch title, scope, date, optional notification metadata, notes, and icon/category.
- **Delete:** remove the reminder or soft-delete it if history/audit is later required. MVP can hard-delete unless product decides history must include deleted reminders.
- **Archive/auto-expire placeholder:** future backend work should decide whether previous reminders remain visible automatically, auto-archive after a retention window, or require manual archive.

## 4. Lister contract

### Domain objects

#### List

A `List` is a shared family checklist container.

Recommended fields:

- `id`
- `familyId`
- `title`
- `scopeType` (`family` or `selectedMembers`)
- `memberIds`
- `icon`
- `tone`
- `archivedAt` (`null` for active lists)
- `createdByUserId`
- `createdAt`
- `updatedAt`

Rules:

- Active lists have `archivedAt: null`.
- Archived lists have `archivedAt` set and should only appear when the archived filter is enabled.
- `completedCount`, `totalCount`, and progress labels should be derived from list items, not manually trusted as source-of-truth counters.

#### ListItem

A `ListItem` is an item inside one list.

Recommended fields:

- `id`
- `listId`
- `title`
- `completed`
- `completedAt`
- `completedByUserId`
- `assignedMemberIds`
- `dueDate` (`YYYY-MM-DD` or `null`)
- `description` (`null` when absent)
- `sortOrder` placeholder if manual ordering is introduced
- `createdByUserId`
- `createdAt`
- `updatedAt`

Rules:

- Item assignment is optional. An empty `assignedMemberIds` array means unassigned, not family-wide responsibility.
- Item due date is optional and independent from list archive state.
- Item description is optional supporting text.

### Progress calculation

- `totalCount` is the count of all non-deleted items in the list.
- `completedCount` is the count of items where `completed: true`.
- Progress percentage is `completedCount / totalCount`, with `0%` when `totalCount` is `0`.
- Archived lists still keep item completion state.

### Lister mutation behavior

- **Create list:** validate title, scope, member IDs, icon, and tone; return the new list summary.
- **Update list:** patch title, scope, icon, tone, and archive state when supported.
- **Delete list:** delete the list and its items, or soft-delete if history is later required.
- **Create item:** validate list ownership, title, assignments, optional due date, and description; return the item.
- **Update item:** patch title, assignments, due date, description, and future sort order.
- **Delete item:** remove item from progress calculation.
- **Complete item:** set `completed: true`, `completedAt`, and `completedByUserId`.
- **Uncomplete item:** set `completed: false` and clear `completedAt`/`completedByUserId`.
- **Archive/unarchive placeholder:** add list-level archive/unarchive mutations when backend support is implemented. Item-level archive is not part of the current MVP contract.

## 5. Skoleuka contract

### Current chosen MVP behavior

Skoleuka is the school-week planning surface inside Husk. The current MVP behavior is intentionally simple and should be documented before backend design changes it:

- Skoleuka shows child/member plans. The visible child carousel currently uses the mock child IDs Fiona, Alma, and Even-Olai.
- Week selection is a five-week strip: two weeks before the current week, the current week, and two weeks after the current week.
- The selected week is local UI state. The selected child is stored in session storage so the current browser session remembers the child.
- Each child has weekday buckets for Monday through Friday.
- Each school reminder has a title, icon, and tone.
- Edit mode is entered through the Skoleuka edit route/query state and can also be opened from the empty state.
- In edit mode, tapping `+` on a weekday opens a create sheet for that child/day.
- Create sheet fields are title, icon, recurring weekly toggle, and optional end date when recurring is enabled.
- The recurring weekly toggle defaults to enabled.
- Saving an empty title is disabled.
- Current create/save behavior closes the sheet and shows `Lagret`, but the mock hook is not yet wired to persist the new item into visible week state.
- In edit mode, existing items show recurring copy (`Hver uke til 20. juni 2026`) and tapping an item opens a recurrence-scope sheet.
- The recurrence-scope sheet offers `Kun denne gangen`, `Hele serien`, and `Avbryt`.
- Choosing either edit scope currently closes the sheet and shows `Lagret`; it does not yet change visible item data.
- Do not redesign Skoleuka in this prompt.

### Child/member relationship

Backend target:

- A school plan belongs to a `FamilyMember` with child semantics, normally `role: CHILD`.
- School reminders must reference both `familyId` and `childFamilyMemberId`.
- If a child is removed or archived from the family later, school reminders should be hidden or archived according to a future member lifecycle decision.

### Backend target model

Skoleuka should support recurring school reminders without flattening all future weeks into independent records.

Recommended objects:

#### SchoolReminderSeries

- `id`
- `familyId`
- `childFamilyMemberId`
- `title`
- `icon`
- `tone`
- `weekday` (`monday` through `friday` in MVP)
- `startsOn`
- `recursWeekly`
- `endsOn` (`null` for no end date)
- `createdByUserId`
- `createdAt`
- `updatedAt`

#### SchoolReminderOccurrence

- `id`
- `seriesId` (`null` for one-off reminders if allowed)
- `familyId`
- `childFamilyMemberId`
- `date`
- `title`
- `icon`
- `tone`
- `generatedFromSeries`
- `createdAt`
- `updatedAt`

#### SchoolReminderException

- `id`
- `seriesId`
- `date`
- `type` (`updated`, `deleted`, `skipped`)
- `overrideTitle`
- `overrideIcon`
- `overrideTone`
- `createdAt`
- `updatedAt`

Rules:

- API reads for a selected week should return concrete occurrences for each selected child/day, generated from series plus exceptions.
- One-off reminders can be represented as non-recurring series or standalone occurrences. Choose one representation during backend implementation and keep API responses stable.
- The current mock limitation is that week selection displays the same weekday buckets regardless of selected week; backend should generate date-specific occurrences.

### Skoleuka mutation behavior

- **Create:** create a weekly series when recurring is enabled; create a one-off occurrence or non-recurring series when recurring is disabled.
- **Update only this occurrence:** create or update an exception for the selected date.
- **Update whole series:** update the series and regenerate future read results without rewriting historical occurrences unless explicitly required.
- **Delete only this occurrence:** create a `deleted`/`skipped` exception for the selected date.
- **Delete whole series:** delete or archive the series and hide future generated occurrences; keep history rules as a later decision.
- **Optional end date:** store as `endsOn` and stop occurrence generation after that date.

### Relationship to Husk reminders

- Skoleuka can generate passive Husk reminders or school reminders for Calendar/Husk display.
- Backend should avoid duplicating ownership: Skoleuka remains source of truth for school-week series and exceptions.
- Husk/Calendar can consume generated reminder summaries for the relevant date and child.
- If persisted Husk reminders are generated from Skoleuka, use `source: school-week` and `sourceId` to prevent duplicate reminders and support updates/deletes from the source series.

## 6. Meal Planner contract

### Domain object: Meal

A `Meal` is a planned dinner for one family date.

Recommended fields:

- `id`
- `familyId`
- `date` (`YYYY-MM-DD`)
- `title` / `mealName`
- `notes` (`null` when absent)
- `createdByUserId`
- `createdAt`
- `updatedAt`

Rules:

- MVP supports one dinner per date.
- The timeline is date-based and includes history, today, and future dates.
- Past meals stay visible in the history/future timeline and can be used for autocomplete suggestions.
- Autocomplete suggestions should be derived from previous meal names plus any static fallback suggestions still needed by the UI.
- Inline create/edit should map to create or patch based on whether a meal exists for the date.

### Meal mutation behavior

- **Create:** create a meal for an empty date. If the date already has a meal, return a conflict unless the route explicitly means replace/update.
- **Update:** edit title/notes for the meal on that date.
- **Delete:** remove the meal from the date and return enough data for UI undo.
- **Undo delete:** either recreate with the returned snapshot or call a future restore endpoint if soft-delete is used.
- **Move to empty date:** move the meal to the target empty date.
- **Swap meals:** when the target date already has a meal, swap the source and target meal dates atomically.

### Timeline and reminder logic

- The `snart tomt for middager` reminder is based on the last planned future meal.
- Current UI shows the reminder when there are one or two future meal days remaining and can point to the date of the last planned future meal.
- Backend should return enough date-sorted meal data for the client to compute the reminder, or provide a derived summary after implementation.
- Empty future timeline states should stay calm and prompt adding the first dinner without implying failure.

### Calendar meal chip display

- Calendar meal chips are read-only summaries derived from meals by date.
- Calendar must not own meal create/edit/delete, move, swap, or undo logic.

## 7. Optimistic UI contract

Optimistic updates are allowed only when the visible local state can be changed immediately and rolled back safely. Never show `Lagret` unless visible local state has changed.

### Shared optimistic rules

- Capture the previous local state before applying an optimistic mutation.
- Apply the local change immediately only after client-side validation passes.
- Show `Lagret` only after the visible local state reflects the requested change. It may appear before backend confirmation if the operation is explicitly optimistic.
- Show toast/badge feedback near the action that changed state; avoid global noisy success messages for passive planning flows.
- If the backend save succeeds, reconcile local temporary IDs and server-normalized fields.
- If the backend save fails, rollback to the previous visible state and show a calm error toast such as `Kunne ikke lagre. Prøv igjen.`
- Loading states should feel lightweight: disable the specific action being saved when needed, avoid blocking unrelated browsing, and avoid layout jumps.
- Error states should preserve the user's input when possible so retry does not require retyping.

### Calendar optimistic behavior

- **Create:** optimistically add event to the selected day/list/month indicators after validation. Roll back by removing the temporary event on failure.
- **Update:** optimistically patch event details and day placement. Roll back to the previous event, including previous participant IDs, on failure.
- **Delete:** optimistically remove the event from Calendar views. Roll back by restoring it on failure.
- **Move/swap:** not part of current Calendar MVP beyond changing date/time in edit. Treat as update and roll back the previous date/time on failure.
- **Complete/uncomplete:** not applicable to Calendar events.
- **Recurrence edit:** placeholder only. Once implemented, show scope choice before mutation and roll back generated visible occurrences on failure.

### Husk reminder optimistic behavior

- **Create:** optimistically insert the reminder into the correct date bucket only after visible state can show it.
- **Update:** optimistically move the reminder between buckets/scopes if date or audience changes.
- **Delete:** optimistically remove the reminder. Roll back by restoring its previous bucket/order on failure.
- **Move/swap:** moving is a date update; swap is not applicable.
- **Complete/uncomplete:** not part of current passive reminder MVP.
- **Recurrence edit:** not applicable except for Skoleuka-generated reminders; source edits should happen in Skoleuka.

### Lister optimistic behavior

- **Create:** optimistically insert the new list or item with a temporary ID.
- **Update:** optimistically patch list metadata or item fields.
- **Delete:** optimistically remove list or item and recalculate progress.
- **Move/swap:** placeholder for future item ordering; if introduced, reorder optimistically and roll back order on failure.
- **Complete/uncomplete:** optimistically toggle item completion and recalculate `completedCount`, progress, `completedAt`, and `completedByUserId` display.
- **Recurrence edit:** not applicable.

### Skoleuka optimistic behavior

- **Create:** do not show `Lagret` unless the new school reminder appears in the selected child/day. The current mock limitation violates this target and should be fixed when persistence/mutation wiring is implemented.
- **Update only this occurrence:** optimistically update the selected date's occurrence only.
- **Update whole series:** optimistically update all visible occurrences in the selected week that are generated from the same series.
- **Delete only this occurrence:** optimistically remove only the selected date's occurrence.
- **Delete whole series:** optimistically remove all visible occurrences in the selected week that come from the series.
- **Move/swap:** moving a school reminder to another weekday/date is a recurrence-aware update; swap is not part of MVP.
- **Complete/uncomplete:** not applicable.
- **Recurrence edit:** always require the edit-scope sheet before applying local state; rollback the affected occurrence(s) or series-generated view on failure.

### Meal Planner optimistic behavior

- **Create:** optimistically show the meal inline on the date after validation.
- **Update:** optimistically replace the visible meal title/notes.
- **Delete:** optimistically clear the date and show undo toast. If backend delete fails, restore the meal and dismiss/adjust undo state.
- **Move to empty date:** optimistically move the meal and clear the source date; rollback both dates on failure.
- **Swap meals:** optimistically swap both dates atomically; rollback both dates on failure.
- **Complete/uncomplete:** not applicable.
- **Recurrence edit:** not applicable.

## 8. API route proposal

Route names only; do not implement in this step. Paths below assume the existing global `/api` prefix, so controller-relative paths omit `/api`.

### Family members

- `GET /families/:familyId/members`
- `POST /families/:familyId/members`
- `PATCH /families/:familyId/members/:memberId`
- `DELETE /families/:familyId/members/:memberId`
- `POST /families/:familyId/members/:memberId/invite` (later invitation flow)

### Calendar

- `GET /calendar/events?familyId=:familyId&from=:date&to=:date`
- `POST /calendar/events`
- `PATCH /calendar/events/:eventId`
- `DELETE /calendar/events/:eventId`

### Husk reminders

The existing backend has `tasks`; Run 4 should decide whether to keep `tasks` as an internal legacy name or introduce explicit Husk routes. Product/domain naming should prefer `husk/reminders` for passive reminders.

- `GET /husk/reminders?familyId=:familyId&from=:date&to=:date&includePrevious=:boolean`
- `POST /husk/reminders`
- `PATCH /husk/reminders/:reminderId`
- `DELETE /husk/reminders/:reminderId`

### Lister/list items

- `GET /husk/lists?familyId=:familyId&includeArchived=:boolean`
- `POST /husk/lists`
- `GET /husk/lists/:listId`
- `PATCH /husk/lists/:listId`
- `DELETE /husk/lists/:listId`
- `POST /husk/lists/:listId/archive` (placeholder)
- `POST /husk/lists/:listId/unarchive` (placeholder)
- `POST /husk/lists/:listId/items`
- `PATCH /husk/lists/:listId/items/:itemId`
- `DELETE /husk/lists/:listId/items/:itemId`
- `POST /husk/lists/:listId/items/:itemId/complete`
- `POST /husk/lists/:listId/items/:itemId/uncomplete`

### Skoleuka

- `GET /school-week?familyId=:familyId&weekStart=:date&childId=:memberId`
- `POST /school-week`
- `PATCH /school-week/:id`
- `DELETE /school-week/:id`
- `PATCH /school-week/:id/occurrences/:date`
- `DELETE /school-week/:id/occurrences/:date`

### Meal Planner

The existing backend uses `meals` and `meals/day`; Run 4 can either preserve that shape or introduce cleaner meal IDs. Product/domain naming should prefer `meals` with explicit move/swap.

- `GET /meals?familyId=:familyId&from=:date&to=:date`
- `POST /meals`
- `PATCH /meals/:mealId`
- `DELETE /meals/:mealId`
- `POST /meals/move`

### Calendar chips integration

- `GET /calendar/summaries?familyId=:familyId&from=:date&to=:date` (optional aggregation endpoint)

Notifications are intentionally later and should not be implemented in Run 4 persistence setup unless a separate prompt authorizes it.

## 9. Run 4 implementation order

1. Family members
2. Calendar events
3. Husk reminders
4. Lister/list items
5. Skoleuka
6. Meal Planner
7. Calendar chips integration
8. Notifications later
9. Final QA/review

## Open questions before implementation

- Should `Hele familien` be persisted as explicit all-member assignments or as a separate `scopeType: family`? This document recommends `scopeType: family`.
- Should Husk reminders be implemented as a replacement for existing `Task` contracts or as a parallel domain with migration later?
- Should list deletion be hard-delete in MVP, or should it be soft-delete to preserve family history?
- Should Skoleuka one-off reminders be standalone occurrences or non-recurring series? Either can work if API responses remain occurrence-based.
- Should Meal Planner keep the existing `MealPlanDay` naming internally or move to a simpler `Meal` contract for Run 4? This document recommends `Meal` as the domain contract while allowing backend compatibility mapping.
