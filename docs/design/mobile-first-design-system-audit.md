# Mobile-first design system audit: FamilieAppen

Date: 2026-06-18

## Source-of-truth visual language

This audit treats these current surfaces as the product baseline, not as redesign targets:

1. **Ny oppgave sheet** in the Husk/Oppgaver flow.
2. **Handleliste page**.
3. **Current bottom navigation**.
4. **Current floating center plus button**.

The shared design language observed in those references is:

- Warm, soft app background with rounded white/off-white cards.
- Mobile-first content width, comfortable side padding, and clear bottom safe-area clearance.
- Large rounded bottom sheets with dim backdrop, centered handle, compact header, and sticky action footer when forms are long.
- Friendly typography: clear page/sheet titles, small muted metadata, semibold card titles, and concise helper copy.
- Rows and cards that rely on spacing, rounded corners, subtle borders, and light shadows rather than dense dividers.
- Bottom navigation as the persistent app anchor, with the center plus button as the primary creation entry point.

## Scope reviewed

Reviewed route and component areas include:

- Home/dashboard: `apps/web/app/dashboard/page.tsx`, `apps/web/app/page.tsx`.
- Calendar: `apps/web/app/calendar/page.tsx`, `apps/web/features/calendar/components/*`.
- Event create/edit/detail/icon picker: `apps/web/app/calendar/events/*`.
- ICS import/settings: `apps/web/app/settings/calendar/*`.
- Husk/Oppgaver/Skoleuka: `apps/web/app/husk/*`, `apps/web/features/husk/components/*`, `apps/web/app/tasks/page.tsx`.
- Handleliste: `apps/web/app/shopping/page.tsx`.
- Meals: `apps/web/app/meals/page.tsx`, `apps/web/features/meals/components/*`.
- Wishlist: `apps/web/app/wishlist/*`, `apps/web/app/wishlists/page.tsx`, `apps/web/features/wishlist/*`.
- Family screens: onboarding family flows and `apps/web/app/settings/family/*`.
- Settings: `apps/web/app/settings/*`, `apps/web/components/settings/*`.
- Feedback/bug-report status: no dedicated feedback or bug report route/component was found; these should be accounted for before launch if planned.
- Login/registration/reset: `apps/web/app/login/page.tsx`, `apps/web/app/register/*`, `apps/web/app/forgot-password/page.tsx`, `apps/web/app/reset-password/page.tsx`.
- Onboarding: `apps/web/app/onboarding/*`, `apps/web/components/*Onboarding*`, family invitation pages.
- Navigation shell: `apps/web/components/AppShell.tsx`, `apps/web/components/Navigation.tsx`, `apps/web/components/navigation-options.ts`.
- Current primitives: `apps/web/components/ui.tsx`, `apps/web/app/globals.css`.

## P0 issues: visibly break the current design language

### 1. Wishlist create/edit is its own visual system

**Files/components involved**

- `apps/web/features/wishlist/WishlistFormClient.tsx`
- `apps/web/app/wishlist/new/page.tsx`
- `apps/web/app/wishlist/[id]/edit/page.tsx`
- `apps/web/app/globals.css` (`wishlist-form-*` selectors)

**Findings**

- Uses a bespoke full-screen form shell, topbar, media grid, field classes, buttons, messages, and delete action styling.
- Form density, field shape, action placement, and validation styling do not appear aligned with Ny oppgave sheet or Handleliste sheet patterns.
- The action row is local to the form instead of using a shared sticky `AppActionFooter` pattern.
- The media/icon picker behaves like a separate design language instead of an `AppAvatarPicker`/media picker primitive.

**Expected alignment**

- Keep the same functional layout, but map fields, messages, media card, buttons, and footer into shared primitives.
- Use the same card radius, border, input height, label typography, helper/error text, and footer spacing as Ny oppgave.

### 2. Calendar event create/edit/detail focus screens diverge from app shell rhythm

**Files/components involved**

- `apps/web/app/calendar/events/EventFormClient.tsx`
- `apps/web/app/calendar/events/CalendarEventEditClient.tsx`
- `apps/web/app/calendar/events/eventFormModel.ts`
- `apps/web/app/calendar/events/[id]/EventDetailClient.tsx`
- `apps/web/app/calendar/events/icon-picker/IconPickerClient.tsx`
- `apps/web/app/calendar/events/new/page.tsx`
- `apps/web/app/calendar/events/[id]/edit/page.tsx`
- `apps/web/app/calendar/events/[id]/page.tsx`
- `apps/web/app/calendar/events/icon-picker/page.tsx`
- `apps/web/components/AppShell.tsx` focus-route handling

**Findings**

- Event flows are routed as focus pages with bottom navigation removed, while creation in the source-of-truth system is anchored by the bottom nav plus sheet pattern.
- Field groups, icon picker, back/cancel handling, and footer actions need to match the Ny oppgave sheet grammar.
- Event detail should read as an `AppCard`/`AppListRow` detail composition rather than an isolated focus page if it remains full-screen.

**Expected alignment**

- Standardize focus pages with `AppFocusShell`, or move creation/editing to `AppSheet` where possible.
- Ensure close/back/cancel language and primary actions mirror Ny oppgave.

### 3. Settings section/detail pages use a separate settings design system

**Files/components involved**

- `apps/web/app/settings/page.tsx`
- `apps/web/app/settings/profile/ProfileSettingsClient.tsx`
- `apps/web/app/settings/family/FamilySettingsClient.tsx`
- `apps/web/app/settings/notifications/NotificationsSettingsClient.tsx`
- `apps/web/app/settings/calendar/CalendarSettingsClient.tsx`
- `apps/web/app/settings/about/AppInfoSettingsClient.tsx`
- `apps/web/components/settings/SettingsCard.tsx`
- `apps/web/components/settings/SettingsRow.tsx`
- `apps/web/components/settings/SettingsSection.tsx`
- `apps/web/components/settings/SettingsPlaceholderPage.tsx`
- `apps/web/components/avatar/ProfileImageCropper.tsx`

**Findings**

- Settings has custom cards, rows, detail hero, back link, and profile edit sheet/action button styles.
- Rows may be acceptable conceptually, but they need to share `AppListRow`, metadata, chevron, and card spacing tokens with Handleliste/Husk rows.
- Profile image cropper actions use `profile-edit-sheet__button` rather than shared sheet footer buttons.
- Calendar settings/ICS surfaces need the same form/card primitives as other app settings.

**Expected alignment**

- Convert settings cards/rows to aliases of `AppCard`, `AppListRow`, and `AppSectionHeader`.
- Normalize detail headers and back navigation under a shared focus/header primitive.

### 4. Auth, registration, reset-password, and onboarding screens feel like a separate product

**Files/components involved**

- `apps/web/components/AuthForm.tsx`
- `apps/web/components/LoginFormFields.tsx`
- `apps/web/components/CreateFamilyForm.tsx`
- `apps/web/components/AddMembersForm.tsx`
- `apps/web/components/FamilyMembersOnboarding.tsx`
- `apps/web/components/OnboardingProgress.tsx`
- `apps/web/app/login/page.tsx`
- `apps/web/app/register/RegisterForm.tsx`
- `apps/web/app/onboarding/*`
- `apps/web/app/forgot-password/page.tsx`
- `apps/web/app/reset-password/page.tsx`
- `apps/web/app/invite/[token]/*`

**Findings**

- Immersive auth/onboarding can be more editorial than app screens, but current cards/forms/progress/modals use bespoke names and spacing.
- Form inputs/buttons/errors are not guaranteed to match app form controls.
- Family member modal/sheet styling should align with `AppSheet` handles, headers, close placement, and footers.

**Expected alignment**

- Preserve brand illustrations and onboarding sequence, but share `AppField`, `AppCard`, `AppActionFooter`, `AppAvatarPicker`, and `AppSheet` where applicable.

### 5. Family member modal and avatar/cropper sheets are inconsistent bottom-sheet implementations

**Files/components involved**

- `apps/web/components/FamilyMembersOnboarding.tsx`
- `apps/web/components/avatar/ProfileImageCropper.tsx`
- `apps/web/app/settings/profile/ProfileSettingsClient.tsx`
- `apps/web/app/settings/family/FamilySettingsClient.tsx`

**Findings**

- Uses local modal/sheet/card/action classes.
- Handle, header, scroll body, close affordance, and footer actions should be identical to Husk/Handleliste sheet language.

**Expected alignment**

- Use `AppSheet` and `AppActionFooter`; keep avatar-specific UI as `AppAvatarPicker`.

## P1 issues: mostly fit but need refinement

### 1. Calendar overview

**Files/components involved**

- `apps/web/app/calendar/page.tsx`
- `apps/web/features/calendar/components/CalendarHeader.tsx`
- `apps/web/features/calendar/components/CalendarFilterSheet.tsx`
- `apps/web/features/calendar/components/CalendarViewSwitcher.tsx`
- `apps/web/features/calendar/components/CalendarListView.tsx`
- `apps/web/features/calendar/components/CalendarEventCard.tsx`
- `apps/web/features/calendar/components/CalendarMonthGrid.tsx`

**Findings**

- Calendar already has mobile sheet structure for filters and mostly coherent cards/chips.
- Filter sheet should become the shared `AppSheet` implementation used by Husk and shopping sheets.
- Month grid/list cards need final token alignment for radii, selected states, metadata, and empty states.

### 2. Husk/Oppgaver/Skoleuka overview and sheets

**Files/components involved**

- `apps/web/app/husk/page.tsx`
- `apps/web/app/tasks/page.tsx`
- `apps/web/features/husk/components/HuskMobileSheet.tsx`
- `apps/web/features/husk/components/HuskReminderEditSheet.tsx`
- `apps/web/features/husk/components/HuskReminderDetailSheet.tsx`
- `apps/web/features/husk/components/HuskFilterSheet.tsx`
- `apps/web/features/husk/components/SchoolWeekCreateSheet.tsx`
- `apps/web/features/husk/components/SchoolWeekDetailSheet.tsx`
- `apps/web/features/husk/components/SchoolWeekRecurringSheet.tsx`
- `apps/web/features/husk/components/OppgaverSection.tsx`
- `apps/web/features/husk/components/HuskReminderCard.tsx`
- `apps/web/features/husk/components/HuskListCard.tsx`

**Findings**

- This area is closest to the Ny oppgave source of truth and should be treated as a pattern donor.
- There are still multiple sheet contents and card/list variants that should share common headers, rows, fields, selected states, and action footers.
- `HuskMobileSheet` reuses calendar filter class names, which signals that the primitive is already implicit but not formalized.

### 3. Handleliste page

**Files/components involved**

- `apps/web/app/shopping/page.tsx`
- `apps/web/features/husk/components/HuskMobileSheet.tsx` as reused sheet shell

**Findings**

- This is a reference screen and should remain visually authoritative.
- It contains many local row, catalog, collaborator, menu, and sheet classes that should be extracted into shared primitives rather than copied.
- Share/list/create/recent-item sheets should use the same bottom-sheet anatomy as Ny oppgave.

### 4. Meals

**Files/components involved**

- `apps/web/app/meals/page.tsx`
- `apps/web/features/meals/components/MealTimeline.tsx`
- `apps/web/features/meals/components/MealDayCard.tsx`
- `apps/web/features/meals/components/MealInlineEditor.tsx`
- `apps/web/features/meals/components/MealSuggestionList.tsx`
- `apps/web/features/meals/components/MealReminderCard.tsx`
- `apps/web/features/meals/components/MealEmptyState.tsx`
- `apps/web/features/meals/components/MealMoveMode.tsx`

**Findings**

- Friendly tone fits the app, but timeline/card density, inline editor, menu popover, and empty/drop states are locally styled.
- Inline editor fields/buttons should map to `AppField` and compact `AppActionFooter` or row actions.
- Meal cards should align radius/shadow/border/title/meta hierarchy with Handleliste cards.

### 5. Wishlist overview/shared/invite pages

**Files/components involved**

- `apps/web/app/wishlist/page.tsx`
- `apps/web/app/wishlists/page.tsx`
- `apps/web/app/wishlist/shared/[memberId]/SharedWishlistClient.tsx`
- `apps/web/app/wishlist/invite/[token]/WishlistInviteClient.tsx`
- `apps/web/app/shared/wishlist/[token]/page.tsx`

**Findings**

- Overview/list pages can likely align with shared cards and rows without structural changes.
- Create/edit is P0, but the list/detail/invite surfaces are P1 due to local card/list/empty-state styling.

### 6. Navigation shell, menu overlay, and create sheet

**Files/components involved**

- `apps/web/components/AppShell.tsx`
- `apps/web/components/Navigation.tsx`
- `apps/web/components/navigation-options.ts`

**Findings**

- Bottom nav and center plus are source-of-truth and should remain.
- Create sheet and mobile menu overlay are close to the target but should share `AppSheet` structure, footer spacing, close placement, and option-row primitive.
- `AppShell` title row should define canonical mobile page padding and safe-area behavior.

## P2 issues: minor inconsistencies

- `apps/web/components/ui.tsx`: existing `Card`, `Button`, `Badge`, `SectionHeader`, and `PageContainer` are useful but too shallow; naming also overlaps future primitives. Consider aliasing rather than replacing immediately.
- `apps/web/features/husk/components/shared/SectionHeader.tsx`: duplicate section-header concept should merge with a shared `AppSectionHeader`.
- `apps/web/components/PageHeader.tsx` and app-shell title rows: ensure one page-header primitive owns title/subtitle/action layout.
- `apps/web/components/PlaceholderCard.tsx`, `PlaceholderPage.tsx`, `components/settings/SettingsPlaceholderPage.tsx`: unify placeholder/empty-state cards.
- `apps/web/components/PendingAccess.tsx` and `ProtectedFamilyRoute.tsx`: loading/error/no-access states should use shared state cards.
- Menu/action buttons in shopping, meals, calendar, wishlist, and settings should share hit area, icon size, popover radius, and destructive styling.
- Form helper/error text should use one semantic color/spacing token set everywhere.
- Selected states across calendar dates, shopping list rows, tabs, icon choices, filters, and toggles need one selected-state recipe.

## Proposed shared design primitives

Build these as thin, tokenized primitives that preserve the current Ny oppgave/Handleliste look:

1. **`AppSheet`**
   - Backdrop, panel, handle, header slot, close button slot, scroll body, optional sticky footer, safe-area padding.
   - Replaces `HuskMobileSheet`, calendar filter sheet shell, create sheet, mobile menu overlay where appropriate, family modals, cropper sheets, shopping sheets.

2. **`AppCard`**
   - Standard radius, border, background, shadow, density variants (`default`, `compact`, `interactive`, `selected`, `danger`).
   - Replaces local cards in settings, meals, wishlist, calendar detail, placeholders, and family flows.

3. **`AppField`**
   - Label, input slot, helper text, error text, required marker, disabled/loading states.
   - Owns consistent typography, spacing, min height, radius, focus ring.

4. **`AppSelect`**
   - Native select wrapper or custom trigger with the same field grammar.

5. **`AppTextarea`**
   - Shares label/helper/error and input treatment with `AppField`.

6. **`AppActionFooter`**
   - Sticky mobile footer with primary/secondary/destructive slots, safe-area padding, disabled/loading states.
   - Used by all sheets and long focus forms.

7. **`AppListRow`**
   - Leading avatar/icon/check slot, title, metadata, trailing action/chevron/menu, selected/done/destructive variants.
   - Used by Handleliste items, settings rows, menu options, wishlist rows, family member rows, meal suggestions.

8. **`AppSectionHeader`**
   - Eyebrow/title/subtitle/action composition with app-wide typography.

9. **`AppAvatarPicker`**
   - Avatar/image/icon selection card, crop/edit/remove states, error handling.

10. **`AppMenuButton`**
    - Icon trigger, accessible popover, menu item typography, destructive states, outside-click/escape handling.

11. **`AppTabs` / `AppSegmentedControl`**
    - Used by Husk tabs, calendar view switcher, wishlist tabs, settings filters.

12. **`AppEmptyState` / `AppStateCard`**
    - Empty/loading/error/pending states with common title/body/action hierarchy.

13. **`AppFocusShell`**
    - For flows that must remain full-screen: canonical topbar, back/cancel behavior, content padding, bottom action footer, and safe-area rules.

## Recommended implementation order

1. **Freeze and document source tokens** from Ny oppgave sheet and Handleliste in CSS variables: radii, spacing scale, page padding, sheet padding, field height, border/shadow, text sizes/weights, footer safe-area.
2. **Create foundational primitives**: `AppSheet`, `AppCard`, `AppField`, `AppTextarea`, `AppSelect`, `AppActionFooter`, `AppListRow`, `AppSectionHeader`, `AppMenuButton`, `AppEmptyState`.
3. **Refactor without visual change in source areas first**: migrate Husk/Oppgaver sheets and Handleliste sheets/cards/rows to primitives to prove parity.
4. **Fix P0 routed forms**: wishlist create/edit, calendar event create/edit/detail/icon picker, settings detail/profile/family sheets, family member/avatar sheets.
5. **Normalize auth/onboarding forms** while preserving immersive page composition and illustrations.
6. **Refine P1 app areas**: calendar overview, meals, wishlist overview/shared pages, create sheet/menu overlay.
7. **Sweep P2 inconsistencies**: placeholders, route guards, action menus, selected states, helper/error text, duplicate headers.
8. **Add a visual QA checklist** for each route: mobile viewport, long content, keyboard open, bottom nav visible, sheet scroll, sticky footer, empty/loading/error, selected/destructive states.

## Route-by-route audit checklist

| Area | Priority | Main mismatch | Files/components |
| --- | --- | --- | --- |
| Home/dashboard | P2 | Ensure page title/card rhythm matches app shell and Handleliste density. | `apps/web/app/dashboard/page.tsx`, `apps/web/app/page.tsx` |
| Calendar overview | P1 | Filter sheet and event/month/list cards need primitive alignment. | `apps/web/app/calendar/page.tsx`, `apps/web/features/calendar/components/*` |
| Event create/edit | P0 | Full-screen focus form diverges from sheet/footer/form grammar. | `apps/web/app/calendar/events/EventFormClient.tsx`, `apps/web/app/calendar/events/CalendarEventEditClient.tsx` |
| Event detail | P0 | Detail surface should use shared cards/rows/header actions. | `apps/web/app/calendar/events/[id]/EventDetailClient.tsx` |
| Icon picker | P0 | Selection cards/states should use shared picker/list primitives. | `apps/web/app/calendar/events/icon-picker/IconPickerClient.tsx` |
| ICS/calendar settings | P0 | Settings-specific form/card system. | `apps/web/app/settings/calendar/CalendarSettingsClient.tsx` |
| Husk | P1 | Good baseline; extract duplicated sheet/card/list patterns. | `apps/web/app/husk/page.tsx`, `apps/web/features/husk/components/*` |
| Oppgaver | P1 | Keep as source-of-truth; standardize related edit/detail sheets. | `apps/web/app/tasks/page.tsx`, `apps/web/features/husk/components/OppgaverSection.tsx` |
| Skoleuka | P1 | Create/detail/recurring sheets need common footer/header fields. | `apps/web/features/husk/components/SchoolWeek*` |
| Handleliste | P1 | Source-of-truth but too local; extract reusable cards/lists/sheets. | `apps/web/app/shopping/page.tsx` |
| Meals | P1 | Timeline/editor/menu are local; align cards, fields, menus. | `apps/web/app/meals/page.tsx`, `apps/web/features/meals/components/*` |
| Wishlist forms | P0 | Separate visual system for form/media/actions. | `apps/web/features/wishlist/WishlistFormClient.tsx` |
| Wishlist lists/shared | P1 | Local cards/rows/empty states. | `apps/web/app/wishlist/*`, `apps/web/app/wishlists/page.tsx` |
| Family screens | P0 | Modals/forms/rows not sharing app primitives. | `apps/web/components/FamilyMembersOnboarding.tsx`, `apps/web/app/settings/family/*` |
| Settings | P0 | Separate settings cards/rows/heroes/detail shell. | `apps/web/app/settings/*`, `apps/web/components/settings/*` |
| Feedback/bug reports | P2 | No dedicated surface found; future forms should use shared primitives. | Not found in current route tree |
| Login/register/reset | P0 | Auth form system should share fields/buttons/errors. | `apps/web/app/login/page.tsx`, `apps/web/app/register/*`, `apps/web/components/AuthForm.tsx` |
| Onboarding | P0 | Immersive shell is OK; forms/modals/progress need primitive alignment. | `apps/web/app/onboarding/*`, `apps/web/components/*Onboarding*` |
| Navigation | P1 | Bottom nav is source-of-truth; create/menu sheets should share `AppSheet`. | `apps/web/components/AppShell.tsx`, `apps/web/components/Navigation.tsx` |
