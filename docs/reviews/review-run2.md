# Run 2 Review: FamilieAppen Onboarding

Date: 2026-06-01

## 1. Executive summary

Run 2 is **mostly ready for Run 3 feature screens**, but it should not be treated as production-ready onboarding yet. The core web onboarding surface now exists across splash, login, registration, personal information, family start, create-family, join-by-code, pending approval, app recommendation, invitation landing, invitation accept/decline, invitation resume, and protected app-shell states.

The main Run 3 decision is whether feature-screen work can begin while onboarding remains prototype-backed. My recommendation is: **yes, Run 3 can start after fixing the P0 route/access-control issues below**. The UI paths are broad enough to support founder/developer review, but several flows still rely on localStorage, mock invitation identity, placeholder app-store URLs, and client-side redirects.

Highest-risk findings:

- **P0:** app shell routes have duplicated client-side guards, and `/settings` currently remains a placeholder behind the app shell rather than following the same pending-user lock treatment as other feature routes.
- **P0:** onboarding and dashboard redirects are not fully centralized; `/dashboard` has its own bootstrap/redirect code in addition to `OnboardingRouteGuard`.
- **P1:** invitation identity is hardcoded to `Elisabeth` and `Martila-familien`; backend invite lookup is not connected.
- **P1:** app recommendation links point to `example.com` placeholders.
- **P1:** profile completion, family-code generation, pending join requests, and invitation context persistence are client localStorage state, not backend state.

## 2. Flow coverage checklist

| Flow | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Normal registration | ✅ Covered | `/register` submits to `register`, saves auth session, then routes to `/onboarding/profile`. | Registration still uses a temporary display name derived from email until profile persistence exists. |
| Personal information | ✅ Covered with prototype persistence | `/onboarding/profile` collects name, phone, birth date, optional avatar preview, stores profile in `familieappen:onboarding-profile`, then resumes invitation or routes to family start. | Backend profile persistence is not implemented. |
| Create family | ✅ Covered | `/onboarding/create-family` calls `createFamily`, sets active family id, saves local onboarding family state, then routes to `/onboarding/family-members`. | Local family-code state remains temporary. |
| Join by family code | ✅ Covered as prototype | `/onboarding/join-family` accepts generated/syntactically valid codes and shows the “family found” state before storing a pending request. | It recognizes any code matching the regex, so this is not backend-verified. |
| Valid family code state | ✅ Covered | `JoinFamilyCodeForm` switches from `entry` to `found` and shows `family-found.png`. | The found family name is generic; no backend family details are shown. |
| Pending approval | ✅ Covered | `loadAvailableFamilies` returns `pending` for saved pending requests or non-approved memberships; `/dashboard` renders `PendingDashboard`; protected features render `LockedFeatureState`. | `/settings` is not locked. |
| Invitation link | ✅ Covered as web fallback | `/invite/[token]` renders the landing screen and persists context with token, family name, inviter name, and source path. | Context identity is mocked. |
| Existing user already in family | ✅ Covered | Authenticated invite users with any family are routed to `/invite/[token]/already-in-family`. | Logic checks `families.length > 0`, not backend invitation eligibility or whether the invite belongs to the same family. |
| App recommendation | ✅ Covered | `getOnboardingCompletionRoute` sends approved users to `/onboarding/app-recommendation` until local completion flag is set. | Links are placeholders. |
| Logout/login persistence | ⚠️ Partly covered | Auth/session and onboarding/invitation state are persisted in localStorage; `routeAfterAuthentication` resolves next route after login. | There is no full logout screen/action in the reviewed onboarding flow, and localStorage persistence is not test-covered. |
| Dashboard access protection | ⚠️ Partly covered | `OnboardingRouteGuard`, `resolveOnboardingRoute`, `requireAuth`, and dashboard bootstrap block unauth/no-family/pending access. | Protection is duplicated and client-side only; app shell may render briefly before redirect. |

## 3. Mock-data audit

| File path | Value found | Risk | Suggested fix |
| --- | --- | --- | --- |
| `apps/web/lib/invitation-context.ts` | `MOCK_INVITATION_CONTEXT.inviterName = "Elisabeth"` | All invitation links show the same inviter, which can mislead demos and makes invite token semantics look real when they are not. | Replace with backend `GET /invitations/:token` response; keep a clearly labeled local fixture only for Storybook/test modes. |
| `apps/web/lib/invitation-context.ts` | `MOCK_INVITATION_CONTEXT.familyName = "Martila-familien"` | Same as above; every invitation appears to target the same family. | Resolve family name from backend invitation lookup. |
| `apps/web/app/invite/[token]/page.tsx` | `const invitation = { token, ...MOCK_INVITATION_CONTEXT }` | Landing page ignores token-specific data. | Fetch invitation summary by token server-side or through an API route. |
| `apps/web/app/invite/[token]/already-in-family/page.tsx` | `const invitation = { token, ...MOCK_INVITATION_CONTEXT }` | Existing-family switch page can show the wrong target family. | Use the same invitation data source as landing. |
| `apps/web/app/invite/[token]/decline/page.tsx` | `const invitation = { token, ...MOCK_INVITATION_CONTEXT }` | Decline confirmation can describe the wrong invite. | Use backend invitation data and handle invalid/expired tokens. |
| `apps/web/app/onboarding/app-recommendation/AppRecommendationActions.tsx` | `https://example.com/familieappen-app-store` | Users can click a dead/non-production store link. | Replace with production App Store URL or disable external CTA until available. |
| `apps/web/app/onboarding/app-recommendation/AppRecommendationActions.tsx` | `https://example.com/familieappen-google-play` | Same risk for Google Play. | Replace with production Play Store URL or “coming soon” state. |
| `apps/web/app/onboarding/join-family/JoinFamilyCodeForm.tsx` | Placeholder `FAMILIE-1234` | Fine as input example, but it reinforces a fake code format. | Keep if product wants examples; otherwise add helper text that codes come from an administrator. |
| `apps/web/lib/onboarding-state.ts` | `ensureOnboardingFamilyState(fallbackFamilyName = "Familien")` | Silent fallback can create generic local family state not matching backend. | Require explicit backend family data or show a recoverable missing-state error. |
| `apps/web/components/CreateFamilyForm.tsx` | Placeholder `F.eks. Familien Hansen` | Low risk; normal localized example copy. | Keep unless demo data should avoid specific surnames. |
| `apps/web/components/AddMembersForm.tsx` | Placeholder `Name` | English placeholder inconsistent with Norwegian onboarding. | Localize to `Navn`. |
| `apps/web/app/calendar/page.tsx` | Placeholders `Football practice`, `Sports hall`, `Bring water bottle and shin guards` | Feature examples are English and activity-specific; acceptable for feature forms but inconsistent with Norwegian onboarding. | Localize or replace with neutral Norwegian examples before founder demo. |
| `apps/web/app/shopping/page.tsx` | Placeholders `Milk`, `2 liters` | English examples in a Norwegian UI. | Localize to `Melk`, `2 liter`. |
| `apps/web/app/meals/page.tsx` | Placeholder `Taco`, `Optional note` | Mixed language; low product risk. | Localize optional note copy. |
| `apps/web/app/wishlists/page.tsx` | Placeholders `Birthday wishes`, `LEGO set, book, bike helmet…`, `https://example.com/gift` | English examples and placeholder URL can leak into screenshots/demos. | Localize examples and replace URL placeholder with `https://butikk.no/...` or helper text. |
| `apps/web/app/shared/wishlist/[token]/page.tsx` | Placeholder `Grandma, Uncle Alex…` | English external-user example. | Localize to Norwegian gift-helper examples. |
| `apps/mobile/app/(tabs)/*.tsx` | Mobile tab pages describe placeholders for future features. | Mobile app can look more feature-complete than it is. | Keep only if mobile is intentionally a shell; otherwise add a visible “coming later” label. |
| `apps/mobile/app/invite/[token].tsx` | `Invitasjon: {token ?? "mangler token"}` | Deep-link route exposes raw token without backend validation. | Keep for native deep-link smoke testing, but gate real invite acceptance through backend later. |

## 4. Route/state-machine review

### Current source-of-truth map

Primary route/state helpers:

- `apps/web/lib/onboarding-access.ts`
  - `resolveOnboardingRoute`
  - `resolveAppRecommendationRoute`
  - `resolveProtectedFamilyRoute`
  - `routeAfterAuthentication`
  - `redirectIfNeeded`
- `apps/web/lib/auth-family.ts`
  - `requireAuth`
  - `loadAvailableFamilies`
  - `getFamilyMembershipStatus`
- `apps/web/lib/onboarding-completion.ts`
  - local app recommendation completion flag
- `apps/web/lib/invitation-context.ts`
  - local invitation token/context persistence and resume routes
- `apps/web/lib/invitation-flow.ts`
  - personal-info completion and invitation completion routing

### Findings

| Area | Status | Finding | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| One source of truth | ⚠️ Mixed | `resolveOnboardingRoute` is the intended state machine, but dashboard and feature pages still run their own `requireAuth` + `loadAvailableFamilies` branches. | Redirect behavior can drift route-by-route. | Make `resolveOnboardingRoute`/one route-state module the only redirect decision layer. Feature pages should request a verified family context through one shared hook/helper. |
| Duplicated route guards | ⚠️ Present | `AppShell` renders `OnboardingRouteGuard mode="approved-family"`, while `/dashboard`, calendar, shopping, tasks, meals, and wishlists also bootstrap auth/family status. | Double redirects and flash-of-protected-shell are possible. | Move guard to server middleware or a single top-level client gate; remove per-page redirect copies after shared family context is returned. |
| Scattered redirects | ⚠️ Present | Redirects appear in `AuthForm`, `RegisterForm`, `CreateFamilyForm`, `JoinFamilyCodeForm`, `AddMembersForm`, `FamilyMembersOnboarding`, invite action components, dashboard, and feature pages. | Hard to reason about onboarding loops and next-route handling. | Keep form-success redirects local, but centralize auth/family/invitation access redirects. |
| Onboarding loops | ⚠️ Possible | `resolveInvitationRedirect` sends any authenticated user with `families.length > 0` to `already-in-family` while accepted/switch-requested invites resume through `/accepted`. | A switch-requested invite can bounce through family checks until backend switch behavior exists. | Order invitation status handling before generic `families.length > 0`, or add explicit transition rules for `switch-requested`. |
| Invitation context loss | ✅ Mostly protected | Landing persists context; profile submit resumes `getInvitationResumeRoute`; accepted route validates token against stored context. | Context can still be cleared by localStorage clearing, declined/pending actions, or cross-device login. | Backend should own invitation state; localStorage should be a convenience resume cache only. |
| Pending users redirected incorrectly | ⚠️ Partial risk | Pending users are redirected to `/dashboard` pending shell by `resolveOnboardingRoute`. Feature pages also render locked state if they detect pending. | Good protection, but duplicated page logic may drift. | Return a shared pending shell/locked state from one route access helper. |
| Dashboard access leaks | ⚠️ Client-side only | Protected pages are client components and app shell can render before client guard completes. | Brief content/shell flash and no server-side enforcement. | Add Next middleware or server-side route gating once auth storage moves to cookies. For current localStorage auth, at least render a guard-loading state before app shell content. |
| App recommendation timing | ⚠️ Mostly correct | Approved users are redirected to `/onboarding/app-recommendation` until completion flag is set; pending and no-family users bypass it. | Completion is localStorage-only, so new browser/device sees recommendation again. | Accept for prototype; backend user preference should replace local flag. |

## 5. Access-control review

| Rule | Verification | Result | Notes |
| --- | --- | --- | --- |
| Unauthenticated users cannot access app content | `resolveOnboardingRoute` checks `getAccessToken`, clears session, and redirects to `/login?next=...`; feature pages call `requireAuth`. | ⚠️ Mostly true client-side | Because tokens are in localStorage, this is not server/middleware enforced. Protected UI may briefly render. |
| Users without family membership go to family start | `loadAvailableFamilies` returns `no-family`; `resolveOnboardingRoute` redirects to `/onboarding/family-start`; dashboard also redirects there. | ✅ Covered | `AddMembersForm` currently routes no-family users to `/onboarding/create-family`, which is not identical to family start. |
| Pending users enter app shell with limited access | `ONBOARDING_ROUTES.pendingShell` is `/dashboard`; dashboard renders `PendingDashboard`. | ✅ Covered | This matches the Run 2 app-shell pending state goal. |
| Pending users cannot access calendar, shopping lists, tasks, meal planner, or wishlist | Calendar/shopping/tasks/meals/wishlists render `LockedFeatureState` when page bootstrap sees `pending`; guard also redirects protected family routes to `/dashboard`. | ✅ Covered for listed feature pages | The double behavior should be consolidated. |
| Approved users can access dashboard | `loadAvailableFamilies` returns `ready`; dashboard loads `getFamilyDashboard`. | ✅ Covered | App recommendation can intentionally intercept first approved access until completed. |
| Invitation context survives auth/profile completion | Landing stores context; login `next` returns to invite continuation; profile submit resumes invite; accepted route completes or pending-routes invitation. | ✅ Covered in same browser | Cross-browser/device persistence requires backend invitation state. |
| Settings route for pending users | App shell guard treats `/settings` as protected, but `settings/page.tsx` itself is only a placeholder and does not render `LockedFeatureState`. | ⚠️ Gap | If guard fails or is delayed, pending users can see settings placeholder. Add same locked treatment or remove settings from accessible pending shell. |

## 6. Component reuse review

| Duplicate/near duplicate | Files | Problem | Suggested consolidation |
| --- | --- | --- | --- |
| Auth/onboarding screen chrome | `login/page.tsx`, `register/page.tsx`, `onboarding/profile/page.tsx`, `onboarding/family-start/page.tsx`, `onboarding/create-family/page.tsx`, `onboarding/join-family/page.tsx`, `onboarding/app-recommendation/page.tsx` | Repeated `login-screen`, logo, `light-shadow.png`, `plants.png`, and centered content structure. | Create `OnboardingScreenChrome` with optional back link, logo sizing, background assets, and content class slots. |
| Back buttons | `profile/page.tsx`, `family-start/page.tsx`, `create-family/page.tsx`, `join-family/page.tsx` | Several hand-authored SVG back buttons with different classes. | Create `OnboardingBackLink` component with `href`, `label`, and variant. |
| Invitation status chrome | `accepted/page.tsx`, `decline/page.tsx`, `declined/page.tsx`, `pending-approval/page.tsx` | Repeated light/plants/logo + status card pattern. | Extract `InvitationStatusLayout` with icon/spinner/title/description/actions slots. |
| Invitation action buttons | `InvitationLandingActions`, `InvitationDeclineActions`, `InvitationDeclinedActions`, `PendingApprovalActions`, `InvitationFamilySwitchActions` | Button class naming differs by screen despite same action semantics. | Consolidate into a small invitation button component or reuse global `Button` variants. |
| Route/loading/locked states | `PendingDashboard`, `LockedFeatureState`, per-page loading/error cards, `PlaceholderPage` | Similar empty/locked/error patterns appear route-by-route. | Create one `AccessStateCard` or extend existing `EmptyState`/`Card` combination with pending/locked/loading variants. |
| Feature page family bootstrap | Dashboard, calendar, shopping, tasks, meals, wishlists | Each page manages status/message/family id with similar branches. | Add `useFamilyAccess({ requireApproved: true })` or a server/client wrapper returning `ready`, `pending`, `no-family`, `unauthorized`. |
| Inline SVG icons | Forms, family start choices, invite switch, modal, mobile tabs | Many icons are embedded locally and cannot be themed/reused consistently. | Add an `Icon` module for common icons or use a chosen icon library consistently. |
| Modals | `FamilyMembersOnboarding` member modal | Modal focus-trap logic is local and will be duplicated for future feature modals. | Create reusable `ModalSheet`/`Dialog` with focus trap, close button, and backdrop. |

## 7. Design-system consistency review

| Finding | Examples | Risk | Suggested fix |
| --- | --- | --- | --- |
| Hardcoded colors remain in onboarding CSS | `globals.css` includes values such as `#ded8cf`, `#ffffff`, `#183f2a`, `#286239`, `#707070`, `#e15a3d`. | Design token drift and harder dark-mode/accessibility work. | Add missing tokens to `@familieappen/ui`/CSS variables and replace direct hex values. |
| Hardcoded radii and shadows | Examples include `border-radius: 1.35rem`, multiple `box-shadow: 0 1.1rem...`, `outline: 3px`. | Cards/buttons may feel inconsistent across auth, onboarding, dashboard, and app screens. | Map to `--radius-*`, `--shadow-*`, and focus-ring variables. |
| Mixed language in UI examples | Feature placeholders are English while onboarding is Norwegian. | Founder demos may feel unfinished. | Localize placeholders and empty states before Run 3 screens. |
| Inconsistent layout wrappers | `PageContainer/Card` are used for older onboarding pages, while Run 2 screens use `login-screen` custom classes directly. | Layout behavior and safe-area spacing will drift. | Either evolve `PageContainer` for auth/onboarding or add `OnboardingScreenChrome` that uses tokens internally. |
| Safe-area handling is uneven | Some screens use `env(safe-area-inset-*)`; bottom nav uses fixed bottom spacing without `env(safe-area-inset-bottom)` in the reviewed snippet. | Mobile web can collide with browser/system UI. | Apply safe-area variables to bottom nav and all immersive onboarding screens. |
| App recommendation page formatting | JSX indentation around nested `section` is inconsistent. | Low code-quality issue only. | Fix opportunistically when touching page; no standalone refactor required. |
| Mobile app tokens are used, but no safe-area wrapper | `apps/mobile/app/(tabs)/screenShell.tsx` uses a plain `View` with padding. | Native screens can overlap notches/status bars on some devices. | Use `SafeAreaView` or app-level safe-area provider for native shell. |

## 8. Asset usage review

| Asset | Where used | Assessment | Placeholder concerns |
| --- | --- | --- | --- |
| `/assets/illustrations/family-found.png` | `apps/web/app/onboarding/join-family/JoinFamilyCodeForm.tsx` in valid-code state. | Correctly used for “family found / valid family code” state. | Screen does not show real family metadata yet. |
| `/assets/illustrations/family-invite.png` | `apps/web/app/invite/[token]/page.tsx` invitation landing. | Correctly used as invitation illustration. | Invitation data is mocked. |
| `/assets/illustrations/family-hero.png` | `apps/web/app/invite/[token]/page.tsx` invitation landing family hero. | Correctly used and named consistently. | None beyond mock invitation context. |
| `/assets/illustrations/app-preview.png` | `apps/web/app/onboarding/app-recommendation/page.tsx`. | Correctly used for app recommendation hero. | Store links are placeholder URLs. |
| `/assets/illustrations/plants.png` | Login, register, profile, family start, create family, join family, app recommendation, invite status/switch screens. | Used consistently as decorative background. | Repetition should move into shared chrome component. |
| `/assets/illustrations/light-shadow.png` | Login, register, profile, family start, create family, join family, app recommendation, invite status/switch screens. | Used consistently as decorative background. | Repetition should move into shared chrome component. |

Screens still using placeholders:

- Mobile tab screens are placeholders for app content.
- Web `/settings` is a placeholder page.
- Feature pages contain placeholder form examples and empty-state copy, though most feature data flows are API-backed from Run 1/1.5.
- Invitation landing/status screens use real assets but mock invitation data.

Naming/path consistency:

- Web asset paths consistently use `/assets/...` from `apps/web/public`.
- Mobile currently does not use these web public assets; native asset strategy remains separate.
- The requested six assets exist under `apps/web/public/assets/illustrations/`, not repo-root `/assets/illustrations/`.

## 9. Deep-link readiness review

Current readiness:

- Web fallback route exists at `/invite/[token]` and all invitation sub-routes derive from `INVITATION_ROUTES`.
- Invitation token is preserved in URL paths and localStorage context.
- Native preparation route exists at `apps/mobile/app/invite/[token].tsx` and can display the token when opened by Expo Router.
- `INVITATION_DEEP_LINK_TODO` explicitly tracks iOS Universal Links, Android App Links, and preserving `/invite/[token]` as the canonical web fallback.

Gaps before production deep links:

| Area | Gap | Required future work |
| --- | --- | --- |
| iOS Universal Links | No `apple-app-site-association` file and no finalized bundle/team IDs documented in app config. | Add hosted AASA file for `/invite/*`, configure associated domains, test install-state behavior. |
| Android App Links | No `assetlinks.json` and no signing certificate fingerprint setup. | Add Digital Asset Links for `/invite/*`, configure Android intent filters, test verified links. |
| Web fallback | Web route exists, but token is not validated server-side. | Add backend invitation lookup and invalid/expired token states. |
| Token preservation | Same-browser context is preserved, but cross-device auth/profile completion depends on URL/localStorage. | Backend should store invite acceptance/session state keyed by token and user. |
| Native handoff | Mobile route is diagnostic only. | Implement native invitation landing/resume UI or route users through web fallback until native onboarding is ready. |
| Security | Any token-shaped URL displays a valid-looking mock invite. | Never show inviter/family details until backend validates token. |

## 10. Risks before Run 3

### Blockers

- **P0 — Consolidate route/access-control behavior before feature screens expand.** Run 3 will add more protected feature screens; duplicated per-page redirects will become expensive and error-prone.
- **P0 — Close pending-user route leaks consistently, including settings and any new Run 3 screens.** Pending users must only see pending shell/locked states until approved.

### Non-blockers but should fix soon

- **P1 — Replace mock invitation data with backend-backed invite summary or a clearly gated fixture mode.** This matters before any public demo of invite links.
- **P1 — Replace placeholder App Store / Google Play links.** External links should not point to `example.com` in a founder demo.
- **P1 — Replace localStorage-only profile/family/invitation completion with backend persistence plan.** LocalStorage is acceptable for prototype, but Run 3 feature work should not deepen reliance on it.
- **P1 — Normalize onboarding chrome and invitation status layouts.** This reduces duplicated CSS/JSX before more screens are added.
- **P1 — Localize hardcoded English examples.** Mixed-language UI weakens product polish.

### Can wait

- **P2 — Native mobile app remains a shell.** Acceptable if Run 3 remains web-first.
- **P2 — Add complete design-token coverage for all colors/shadows/radii.** Important, but can be done incrementally while implementing feature screens.
- **P2 — Move inline SVGs into a shared icon system.** Useful but not blocking.
- **P2 — Deep-link native infrastructure.** Do not implement until bundle IDs, domain, app-store plans, and backend invitation APIs are ready.

## 11. Recommended fixes

| Priority | Affected files | What to change | Why it matters |
| --- | --- | --- | --- |
| P0 | `apps/web/lib/onboarding-access.ts`, `apps/web/components/OnboardingRouteGuard.tsx`, `apps/web/components/AppShell.tsx`, dashboard/feature pages | Make one route-state helper the single authority for unauth/no-family/pending/approved/app-recommendation decisions. Avoid each page implementing its own redirect tree. | Prevent onboarding loops, dashboard leaks, and inconsistent Run 3 route behavior. |
| P0 | `apps/web/app/settings/page.tsx`, `apps/web/components/PendingAccess.tsx`, route guard files | Give `/settings` the same pending-user locked state or remove it from pending-accessible app shell navigation. | Pending users should not access app content/settings before approval. |
| P1 | `apps/web/lib/invitation-context.ts`, `apps/web/app/invite/[token]/*`, backend invitation API files when added | Replace `MOCK_INVITATION_CONTEXT` with backend invitation summary and explicit invalid/expired token UI. | Public invite links must not show fake family/inviter data. |
| P1 | `apps/web/app/onboarding/app-recommendation/AppRecommendationActions.tsx` | Replace `example.com` App Store / Google Play URLs or render disabled “coming soon” CTAs. | Avoid dead external links during demos and user testing. |
| P1 | `apps/web/lib/invitation-flow.ts`, `apps/web/lib/onboarding-state.ts`, `apps/web/lib/session.ts`, profile/create/join forms | Decide which onboarding states remain local prototype state and which need backend persistence before Run 3. Add TODOs or tickets with owner routes. | Prevent Run 3 features from depending on fragile localStorage state. |
| P1 | Login/register/profile/family-start/create/join/app recommendation pages | Extract shared `OnboardingScreenChrome` and `OnboardingBackLink`. | Cuts duplicate asset/layout code and improves safe-area consistency. |
| P1 | Invitation status pages/actions | Extract `InvitationStatusLayout` and shared invitation action/button styles. | Keeps accept/decline/pending/already-in-family states consistent. |
| P1 | Feature pages and placeholders | Localize English examples: `Milk`, `Birthday wishes`, `Football practice`, `Optional note`, `Grandma, Uncle Alex…`. | Better Norwegian product polish before founder review. |
| P2 | `apps/web/app/globals.css`, `packages/ui/src/tokens.css` | Replace remaining hardcoded hex colors/radii/shadows with variables/tokens. | Improves design-system consistency and future theming. |
| P2 | `apps/mobile/app/invite/[token].tsx`, mobile route config/docs | Document exact native deep-link contract and keep token-only diagnostic screen until native invite UI is scheduled. | Keeps native readiness clear without overbuilding infrastructure. |

## 12. Final recommendation

**Ready for Run 3 after P0 fixes**

## P0 follow-up: route/access-control fixes

Date: 2026-06-01

Status: **Ready for Run 3** after the P0 follow-up changes below.

What changed:

- Centralized app-shell and protected-family route decisions in `apps/web/lib/onboarding-access.ts` through a single route-access resolver and route mode selection. The resolver now owns unauthenticated, no-family, pending, approved, app-recommendation, invitation-continuation, dashboard pending-shell, and protected-family route decisions.
- Simplified `apps/web/components/OnboardingRouteGuard.tsx` so it delegates route decisions to the shared access resolver instead of rebuilding dashboard/protected/app-recommendation branches locally.
- Updated `apps/web/components/AppShell.tsx` to use the shared app-shell route mode, preventing app-shell route drift while preserving pending users inside the shell.
- Refactored `apps/web/app/dashboard/page.tsx` to bootstrap through the shared dashboard-entry resolver before loading dashboard data, removing the conflicting local unauthenticated/no-family redirect tree.
- Added `apps/web/components/ProtectedFamilyRoute.tsx` with `useFamilyAccess` and `ProtectedFamilyRoute` so Run 3 screens can declare approved family access without rebuilding auth/family/pending logic per page.
- Wrapped `apps/web/app/settings/page.tsx` in `ProtectedFamilyRoute`, so pending users now see the same locked treatment as protected feature routes instead of unrestricted settings placeholder content.

Files touched:

- `apps/web/lib/onboarding-access.ts`
- `apps/web/components/OnboardingRouteGuard.tsx`
- `apps/web/components/AppShell.tsx`
- `apps/web/components/ProtectedFamilyRoute.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/settings/page.tsx`
- `docs/reviews/review-run2.md`

Final recommendation: **Ready for Run 3**. The P0 route/access-control blockers are addressed, while P1/P2 prototype and cleanup items remain intentionally deferred.
