# Run 1 Review and Stabilisation

Date: 2026-05-30

## 1. Executive summary

### What Run 1 achieved

Run 1 moved FamilieAppen from a shell-only monorepo into a working full-stack prototype for the core family logistics loop:

- A Next.js web app with an app shell, navigation, authentication screens, onboarding, dashboard, and connected feature pages.
- A NestJS API with a global `/api` prefix, health endpoint, response envelope, error filter, CORS setup, and feature modules.
- A Prisma/PostgreSQL data model covering users, families, memberships, shopping lists, meal plans, tasks, calendar events, and wishlists.
- Custom email/password auth with signed bearer tokens and a Nest guard.
- Family creation, family membership, active-family selection, and role-gated manual member management.
- API-backed dashboard data for family summary, today tasks/events, dinner, shopping summary, and wishlist summary.
- API-backed shopping list, dinner planning, calendar, task, and wishlist flows.
- Public wishlist sharing via random share tokens.
- Shared TypeScript types in `@familieappen/shared` and shared design tokens in `@familieappen/ui`.

This is a meaningful Run 1 foundation. The broad product surface is represented, the web app compiles, and the TypeScript workspace is currently coherent.

### Readiness for Run 2

The project is **not ready to continue directly into Run 2 feature expansion**. It is ready for a Run 1.5 stabilisation pass.

The reasons are practical rather than conceptual:

- The Prisma schema exists, but there are no committed migrations in `apps/api/prisma/migrations`, so database state is not reproducible.
- Prisma Client generation currently depends on environment setup and external engine download availability. It fails without `DATABASE_URL`, and in this environment it also fails on Prisma engine download with `403 Forbidden`.
- There are no automated tests for auth, API route authorization, family isolation, public wishlist access, or frontend data flows.
- Auth/session handling is prototype-grade: bearer tokens are stored in `localStorage`, there is no refresh/revocation story, and environment validation is weak.
- Many feature APIs depend on an `X-Family-Id` header. That is workable for Run 1, but should be standardised before adding more modules.
- Documentation is stale in places; `README.md` still describes a minimal foundation without database/auth/real feature logic.

### Main risks before adding more features

1. **Database reproducibility risk:** without migrations, a new developer or CI environment cannot reliably recreate Run 1's schema.
2. **Security and tenant-isolation risk:** family isolation is implemented in service code, but it is not covered by tests and has several conventions that can drift.
3. **Auth hardening risk:** custom token handling needs stronger configuration validation, secret requirements, expiry handling, logout semantics, and an explicit client storage strategy.
4. **API contract drift risk:** DTOs, shared package types, and frontend `lib/api.ts` are manually duplicated rather than generated or contract-tested.
5. **CI readiness risk:** the repo has no test scripts or CI workflow, and Prisma generation currently needs environment workarounds.

## 2. Feature inventory

### Web app shell/dashboard

Implemented:

- Next.js App Router web app in `apps/web`.
- `AppShell` with sidebar and bottom navigation for non-immersive app routes.
- Immersive unauthenticated/onboarding routes for `/`, `/login`, `/register`, `/forgot-password`, and `/onboarding/*`.
- Dashboard page connected to `GET /families/:familyId/dashboard`.
- Shared page/card/form styling through local web components plus design tokens.

Gaps:

- Route protection is implemented inside individual client pages, not centrally via middleware or a reusable guard.
- Navigation is visible for protected pages before client-side auth checks complete.
- Settings remains a placeholder page.
- Dashboard is connected to backend data, but still includes some placeholder product messaging, especially around wishlist dates.

### API foundation

Implemented:

- NestJS application with modules for health, auth, families, shopping, tasks, meals, calendar, and wishlists.
- Global prefix from config, defaulting to `/api`.
- Global HTTP exception filter with safe response shape.
- Success envelope shape `{ data: ... }` for most feature endpoints.
- CORS enabled for fixed localhost web origins.

Gaps:

- No OpenAPI/Swagger or generated client.
- No validation pipe/class-validator setup; validation is hand-written in services.
- Error shapes are not enveloped the same way as success responses.
- Health response is not wrapped in `{ data }`, unlike the feature endpoints.
- No API tests.

### Prisma/PostgreSQL setup

Implemented:

- Prisma 7 schema in `apps/api/prisma/schema.prisma`.
- `prisma.config.ts` with schema path, migrations path, and `DATABASE_URL` datasource config.
- Runtime Prisma service using `@prisma/adapter-pg` and lazy client creation.
- `.env.example` with `DATABASE_URL` and `AUTH_JWT_SECRET` examples.

Gaps:

- No migration files are committed.
- No seed script or test fixtures exist.
- Prisma generation is not stable out-of-the-box in this environment.
- Runtime code uses hand-written delegate types and `require("@prisma/client")`, which avoids compile-time dependency on generated model types but also loses strong Prisma typing.

### Auth/session handling

Implemented:

- Registration and login endpoints.
- Password hashing with `scrypt` and per-password salt.
- Custom signed token format with HMAC-SHA256-like JWT structure.
- `AuthGuard` parses `Authorization: Bearer <token>` and attaches `request.user`.
- Web client stores access token and active family id.

Gaps:

- No refresh token, revocation, device/session tracking, or server-side logout.
- Access token is stored in `localStorage`, exposing it to XSS theft.
- Secret validation is weak: `AUTH_JWT_SECRET` is optional in config and must be audited for runtime fallback behaviour.
- No rate limiting, login throttling, account lockout, CSRF strategy, or password reset implementation.
- No automated tests for token expiry, invalid signatures, malformed tokens, or missing secrets.

### Family creation and membership

Implemented:

- Authenticated family creation.
- Creator becomes `OWNER` member.
- Default shopping list is created with new family.
- Authenticated family listing and details retrieval.
- Manual member add/remove with `OWNER`/`PARENT` management roles.
- Protection against removing the last owner.

Gaps:

- Manual members are not invite-linked users; `FamilyMember.userId` can be null.
- There is no invitation flow, accept flow, member role update flow, or user-to-member claiming flow.
- Family manager role checks are service-level only and not tested.
- No uniqueness constraint prevents duplicate user membership in a family.

### Dashboard data flow

Implemented:

- Dashboard API aggregates family details, shopping summary, tasks, dinner today, today events, and wishlist summary.
- Web dashboard loads families, chooses/stores active family, and renders backend data.

Gaps:

- Dashboard aggregation duplicates some logic that also exists in feature services.
- Today calculations are UTC-based, with no family timezone model.
- The task summary returns the first five tasks ordered by completion/due/creation rather than strictly “today”.
- Wishlist summary contains an explicit placeholder for future birthday/holiday integration.

### Shared shopping list

Implemented:

- One shopping list per family.
- Get/list, add item, toggle checked state, and delete item.
- Tracks creator, checker, checked state, and checked timestamp.

Gaps:

- No item editing endpoint.
- Quantity is plain text.
- No categories, ordering, or optimistic concurrency handling.
- Only membership is required; role semantics for child/guest editing are not defined.

### Dinner planning

Implemented:

- One meal plan per family.
- List/get meal plan.
- Add/upsert day by date.
- Update and delete meal plan days.
- Recent meals computed from meal plan days.

Gaps:

- Date and “today” handling use UTC, not family-local timezone.
- No recipe, shopping-list integration, recurring meal, or meal category model.
- `MealPlanDay.date` is `DateTime`; depending on Prisma/PostgreSQL mapping, a date-only model may be safer.

### Family calendar

Implemented:

- List events in a date range.
- Create, update, and delete events.
- Optional end time, all-day flag, location, description, and family-member participants.
- Participant IDs are validated against the family before create/update.

Gaps:

- No recurrence, reminders, external calendar sync, timezone model, or conflict handling.
- All-day semantics are not fully specified.
- Date range validation should be contract-tested.

### Wishlists

Implemented:

- Family wishlists owned by a family member.
- Wishlist items with product URL, image URL, estimated price, purchased status, reservations, and unavailable/reserved computed state.
- Authenticated family wishlist management.
- Public share creation with random token.
- Public shared wishlist view and public reserve/mark-purchased endpoints.

Gaps:

- Share tokens do not expire by default.
- There is no share revocation endpoint.
- Public response shapes expose product URLs/images/prices; this may be intended, but it needs product confirmation.
- Reservation model has no unique constraint preventing multiple reservations under race conditions.
- Public write actions are unauthenticated and not rate limited.

### Shared package/contracts/types added during Run 1

Implemented:

- `@familieappen/shared` exports core DTO-like frontend types for families, members, tasks, meals, calendar, shopping, and wishlists.
- `@familieappen/ui` exports design tokens and CSS variables.

Gaps:

- Shared types are not the source of truth for backend DTOs; API DTO interfaces and shared package interfaces are manually duplicated.
- No runtime validation schemas are shared.
- No contract tests ensure backend responses match the shared types.

## 3. Architecture review

### Current app/package structure

Current structure:

- `apps/web`: Next.js web application and web-only components.
- `apps/mobile`: Expo shell retained from foundation work.
- `apps/api`: NestJS API with Prisma schema/config.
- `packages/shared`: shared TypeScript types/constants.
- `packages/ui`: design tokens and token CSS.
- `docs`: planning and AI documentation.

This structure is appropriate for the product direction. The monorepo can support web-first validation while keeping mobile available for later.

### API route structure

Current route shape, assuming default prefix `/api`:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/families`
- `GET /api/families`
- `GET /api/families/:familyId`
- `GET /api/families/:familyId/dashboard`
- `POST /api/families/:familyId/members`
- `DELETE /api/families/:familyId/members/:memberId`
- `GET /api/shopping`
- `POST /api/shopping/items`
- `PATCH /api/shopping/items/:itemId`
- `DELETE /api/shopping/items/:itemId`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `GET /api/meals`
- `POST /api/meals/day`
- `PATCH /api/meals/day/:dayId`
- `DELETE /api/meals/day/:dayId`
- `GET /api/calendar/events`
- `POST /api/calendar/events`
- `PATCH /api/calendar/events/:eventId`
- `DELETE /api/calendar/events/:eventId`
- `GET /api/wishlists`
- `POST /api/wishlists`
- `GET /api/wishlists/:wishlistId`
- `POST /api/wishlists/:wishlistId/items`
- `PATCH /api/wishlists/items/:itemId`
- `DELETE /api/wishlists/items/:itemId`
- `POST /api/wishlists/items/:itemId/reserve`
- `POST /api/wishlists/items/:itemId/mark-purchased`
- `POST /api/wishlists/:wishlistId/share`
- `GET /api/public/wishlists/:token`
- `POST /api/public/wishlists/:token/items/:itemId/reserve`
- `POST /api/public/wishlists/:token/items/:itemId/mark-purchased`

The route set is broad and mostly consistent. The biggest architectural decision to revisit is whether feature routes should continue using `X-Family-Id` or move toward nested family routes like `/families/:familyId/shopping`, `/families/:familyId/tasks`, etc. Nested routes are more explicit, easier to test from logs, and reduce hidden header coupling.

### Shared contracts/types

The shared package is useful but currently acts as a manually maintained frontend type library, not as an enforceable contract. Backend DTO interfaces live separately inside API modules. This creates drift risk when adding fields, renaming fields, or changing nullability.

Recommended stabilisation approach:

1. Keep the current types for now.
2. Add contract tests or e2e tests that assert representative response shapes.
3. Decide later whether to introduce generated OpenAPI clients, Zod schemas, or a shared DTO package as source of truth.

### Database model boundaries

The model boundaries are logical:

- `User` represents login identity.
- `Family` is the tenant boundary.
- `FamilyMember` maps users and manual household members to a family.
- Feature models are family-owned directly or indirectly.
- Public wishlist sharing is modelled via `WishlistShare` token rows.

Areas to revisit:

- `FamilyMember.userId` is nullable, which supports child/manual members but complicates authorization and ownership semantics.
- Feature ownership/permissions are mostly “any family member can mutate” today.
- Shopping and meal plans are constrained one-per-family, which is probably correct for Run 1 but should be a deliberate product decision.
- Wishlist item availability is inferred from `purchased` or reservations, but there are multiple fields that can represent related states.

### Frontend/backend separation

Current separation is acceptable for Run 1:

- Web calls API through `apps/web/lib/api.ts`.
- Backend owns persistence and authorization.
- Shared package provides frontend-facing types.

Weak spots:

- Client auth/active-family state is stored in browser storage and repeated across pages.
- Frontend route protection is not centralised.
- API error handling is generic and does not expose stable machine-readable codes.
- Frontend forms and backend validation are not shared.

### Places where responsibilities are unclear or duplicated

- Dashboard aggregation duplicates feature summary logic instead of composing exported service methods consistently.
- DTO shape conversions are repeated per service and in shared package types.
- Family context lives partly in URL path (`/families/:familyId`) and partly in `X-Family-Id` headers.
- Auth configuration is split between config service, auth service expectations, and `.env.example`, but there is no fail-fast validation layer.
- Public wishlist item mutation reuses authenticated wishlist item methods with nullable `userId`/`familyId`, which is clever but blurs authorization boundaries.

## 4. Database and Prisma review

### Current Prisma schema status

The schema covers Run 1 entities comprehensively:

- `User`
- `Family`
- `FamilyMember`
- `ShoppingList`
- `ShoppingListItem`
- `MealPlan`
- `MealPlanDay`
- `Task`
- `CalendarEvent`
- `CalendarEventParticipant`
- `Wishlist`
- `WishlistItem`
- `WishlistReservation`
- `WishlistShare`

It uses `cuid()` string IDs, timestamp fields, cascading deletes for family-owned records, and `SetNull` where user attribution should survive user/member deletion.

### Existing migrations and whether they match the schema

No migration files were found under `apps/api/prisma/migrations`. This is the largest Run 1 database issue.

Impact:

- There is no authoritative database history.
- CI cannot apply migrations.
- New contributors cannot reproduce the database without relying on `prisma db push` or ad-hoc local state.
- Schema changes in Run 2 would be hard to review because there is no baseline migration.

### Whether Prisma Client generation is stable

Current status from checks:

- `pnpm prisma:generate` fails without `DATABASE_URL` because `prisma.config.ts` requires it while loading config.
- With `DATABASE_URL` set, Prisma loads config but fails in this environment while fetching Prisma engine checksum/file from `binaries.prisma.sh` with `403 Forbidden`.
- `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` bypasses the checksum error but not the engine download error.

The generated client appears to be present enough for TypeScript/build in the current workspace, but generation is not stable in a clean or restricted environment.

### Whether seed/test data exists or is missing

Missing:

- No seed script.
- No deterministic demo family/user data.
- No test fixture setup.
- No documented local database bootstrap beyond `.env.example`.

### Migration debt, naming drift, missing indexes, constraints, nullable fields

Potential debt to revisit:

- Add baseline migration for the entire current schema.
- Add `@@unique([familyId, userId])` or equivalent for linked memberships, while considering nullable `userId` behaviour in PostgreSQL.
- Consider composite indexes for frequent filtered sorts, such as tasks by family/completed/due date, events by family/start/end, meal days by meal plan/date, wishlist shares by token/expiry, and wishlist summaries by family/update time.
- Remove redundant indexes where a unique constraint already creates an index, such as `ShoppingList.familyId` and `MealPlan.familyId` if Prisma/PostgreSQL already indexes the unique fields.
- Add constraints or service tests for reservation uniqueness/race conditions.
- Decide whether `MealPlanDay.date` should be date-only rather than `DateTime`.
- Decide whether `CalendarEvent.endsAt` should be required for non-all-day events or whether null is a valid open-ended event.
- Audit nullable attribution fields (`createdByUserId`, `checkedByUserId`, `completedByUserId`) for desired deletion semantics.

## 5. Auth and security review

### Session/token flow

Flow:

1. User registers or logs in.
2. API returns a safe user object and bearer access token.
3. Web stores token in `localStorage`.
4. API guard validates bearer token on protected controllers.
5. Web sends `Authorization: Bearer <token>` on authenticated API calls.

This is adequate for a prototype but should not be treated as production-ready.

### Missing or weak environment validation

Concerns:

- `DATABASE_URL` and `AUTH_JWT_SECRET` are optional in the typed config object.
- Invalid `PORT` silently falls back to default rather than failing.
- CORS origins are hardcoded to localhost rather than environment-driven.
- There is no production fail-fast check for missing/weak `AUTH_JWT_SECRET`.
- Prisma CLI cannot run without `DATABASE_URL`, but this is not clearly documented in root README.

### Route protection

API:

- Auth, health, and public wishlist routes are public.
- Families and feature controllers are guarded with `AuthGuard`.

Frontend:

- Protected pages check `localStorage` token client-side and redirect as needed.
- There is no Next middleware or server-side route protection.
- Initial render can briefly show protected shell/navigation before redirects.

### Family isolation

Strong points:

- Service methods generally call `requireFamilyMember(userId, familyId)` before reading or mutating family data.
- Item-level lookups usually join back to the family (`wishlist: { familyId }`, `mealPlan: { familyId }`, etc.) before mutation.
- Public wishlist item mutation verifies the item belongs to the shared wishlist token before mutating.

Risks:

- Isolation depends on every service method remembering the correct checks.
- No tests prove cross-family reads/writes return 404/403.
- `X-Family-Id` is a hidden context header and easy to omit or misuse.
- Public wishlist methods intentionally bypass auth and need explicit tests around token/item mismatch.

### Cross-family access risks

Most direct cross-family access paths appear protected in service code. The primary risk is not an obvious current bypass; it is lack of regression protection. Before Run 2, add tests for:

- A user cannot list another family’s shopping/tasks/meals/calendar/wishlists by changing `X-Family-Id`.
- A user cannot mutate another family’s item by combining their own `X-Family-Id` with another family’s item id.
- A public wishlist token cannot mutate an item from a different wishlist.
- Manual member ids from another family cannot be assigned to calendar events, tasks, or wishlists.

### Public/private wishlist exposure risks

Risks:

- Public shares currently expose item title, description, product URL, image URL, estimated price, purchased state, reserved state, and unavailable state.
- Share tokens do not expire by default.
- There is no revoke endpoint.
- Public reserve/purchase endpoints are unauthenticated and not rate-limited.
- Public response shape intentionally hides family/user/member ids, which is good, but product needs to confirm whether prices and product/image URLs are acceptable for public recipients.

### Unsafe response shapes

Good:

- Auth responses omit `passwordHash`.
- Public wishlist DTOs omit family/member/user ids.
- Global exception filter hides internal errors for non-HTTP exceptions.

Concerns:

- Internal DTOs expose user ids and family ids widely to authenticated clients.
- Error responses include path and raw validation text; acceptable for now, but should be standardised.
- Health response differs from feature response envelopes.
- No machine-readable error code exists for frontend-specific flows.

## 6. API review

### Main endpoints currently implemented

See the route inventory in [API route structure](#api-route-structure). In short, Run 1 covers:

- Health
- Auth register/login
- Family create/list/detail/dashboard/member add/remove
- Shopping list get/add/toggle/delete
- Task list/add/toggle/delete
- Meal plan get/add day/update day/delete day
- Calendar event list/add/update/delete
- Wishlist list/create/detail/item add/update/delete/reserve/mark purchased/share
- Public shared wishlist get/reserve/mark purchased

### Missing tests

Missing across the board:

- Unit tests for validation helpers and service behaviour.
- Integration/e2e tests for every controller.
- Auth tests for registration, duplicate email, login failures, invalid tokens, expired tokens, and missing auth header.
- Family isolation tests for each feature module.
- Public wishlist token tests.
- Dashboard aggregation tests.
- Prisma migration tests.
- Frontend component or route tests.

### Inconsistent error shapes or status codes

Observed/likely inconsistencies:

- Success responses usually use `{ data }`; health does not.
- Errors use `{ statusCode, message, error, path, timestamp }`; successes do not include status/meta.
- Missing/invalid family context may surface as “Family was not found” instead of “X-Family-Id is required”. This is safer from an enumeration perspective but less clear for frontend debugging.
- Several `PATCH` endpoints are action-style toggles rather than partial updates (`PATCH /shopping/items/:itemId`, `PATCH /tasks/:taskId`). This should be documented or changed before client usage expands.
- Public wishlist reserve and mark-purchased use POST action endpoints, which is acceptable but should be stabilised.

### API contracts to stabilise before Run 2

- Family context convention: keep `X-Family-Id` or move to nested URLs.
- Error envelope and machine-readable codes.
- Date/time conventions: UTC vs family timezone vs date-only.
- Auth token lifetime and refresh/re-auth behaviour.
- Wishlist share lifecycle and public DTO exposure.
- Permission matrix by family role.
- Generated or contract-tested frontend client strategy.

## 7. Frontend review

### Dashboard flow

Current flow:

1. Client checks for access token in `localStorage`.
2. Client loads family list.
3. Client chooses active family from stored id if valid, else first family.
4. Client stores active family id.
5. Client loads dashboard summary.

This works for the prototype. It should be extracted into a shared active-family/auth hook or provider before Run 2 to avoid copy-paste drift across pages.

### Route protection

Route protection is currently page-local and client-side. It should be centralised for Run 1.5. Options:

- Minimal: create reusable hooks/components for requiring auth and active family.
- Stronger: add Next middleware once auth storage moves away from `localStorage` to cookies.

Because the current token is in `localStorage`, middleware cannot read it. A bigger auth storage decision is needed before server-side protection.

### Empty/loading/error states

Implemented:

- Feature pages generally have loading and error messages.
- Empty states exist for shopping, meals, tasks, calendar, wishlists, and dashboard sections.

Gaps:

- Error messages are mostly generic strings.
- 401/404 handling is repeated per page.
- No offline/network-specific UX.
- No global toast/notification pattern.
- No form-level field error mapping from API validation responses.

### Mobile/responsive behavior

Strengths:

- App shell has sidebar and bottom navigation concepts.
- Design tokens use responsive CSS clamps.
- Pages are built with card/list layouts that should adapt reasonably.

Gaps:

- No screenshot/regression test coverage.
- No explicit responsive QA matrix.
- Rich forms/tables/lists should be manually checked on narrow widths before Run 2.

### Visual consistency with FamilieAppen design direction

The web UI is consistent with the warm, practical FamilieAppen direction:

- Warm background and surfaces.
- Family/productivity-oriented copy.
- Soft cards, badges, and simple form controls.
- Clear navigation icons/labels.

Needs improvement:

- Some feature pages are denser than the landing/auth pages.
- Settings is placeholder-only.
- Error/loading/empty state presentation should be standardised.

### Mock-data-driven or backend-disconnected UI

Connected:

- Dashboard
- Shopping
- Tasks
- Meals
- Calendar
- Wishlists
- Public wishlist share page
- Login/register/onboarding create family/add members

Still placeholder or incomplete:

- Settings page.
- Forgot password page has no implemented backend flow.
- Wishlist date/occasion connection is placeholder text.
- Mobile app remains shell/placeholder and is not part of current backend-connected flow.

## 8. Test and build review

### Commands that currently pass

- `pnpm -r typecheck`
- `pnpm -r build`

### Commands that currently fail or need environment workarounds

- `pnpm prisma:generate` fails without `DATABASE_URL` because Prisma config requires it.
- `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/familieappen?schema=public' pnpm prisma:generate` fails in this environment because Prisma engine checksum download returns `403 Forbidden`.
- `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/familieappen?schema=public' PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 pnpm prisma:generate` still fails because the engine file download itself returns `403 Forbidden`.

### Known Prisma engine / DATABASE_URL issues

- Prisma CLI config loading requires `DATABASE_URL`; this is expected with the current `prisma.config.ts`, but inconvenient for generation and CI unless documented and provisioned.
- The engine download failure is environmental or upstream-access related. CI should cache Prisma engines or use a network path known to work.
- Because migrations are missing, even successful generation would not prove the database can be migrated.

### CI readiness

Not ready yet.

Minimum CI before Run 2:

1. Install dependencies with pnpm.
2. Run `pnpm -r typecheck`.
3. Run `pnpm -r build`.
4. Run Prisma generate with explicit `DATABASE_URL` and stable engine access/cache.
5. Apply migrations to an ephemeral PostgreSQL service.
6. Run API integration/e2e tests.
7. Run frontend tests once added.

## 9. Priority findings

### P0: must fix before Run 2 feature work

1. **Create and commit a baseline Prisma migration.** Without this, Run 1's database foundation is not reproducible.
2. **Stabilise Prisma generation and local database bootstrap.** Document required env vars and solve/circumvent engine download issues for CI/developers.
3. **Add auth and family isolation tests for all feature modules.** This is the main safety net before adding more tenant-scoped features.
4. **Define the family-context API convention.** Decide between `X-Family-Id` and nested family routes before expanding the API surface.
5. **Harden auth configuration.** Fail fast when production secrets are missing/weak and document token lifetime/session behaviour.

### P1: should fix during Run 1.5 stabilisation

1. Update stale README/docs to reflect the implemented database/auth/features.
2. Add seed/demo data for local development.
3. Centralise frontend auth and active-family loading logic.
4. Standardise API error response conventions and frontend error handling.
5. Add wishlist share expiry/revocation decision and tests.
6. Add missing database constraints/indexes after reviewing expected queries.
7. Add a role/permission matrix for family members.
8. Add date/timezone decisions for dinner planning and calendar.
9. Add basic CI workflow.
10. Clarify which user roles can mutate shopping/tasks/meals/calendar/wishlists.

### P2: can wait until later

1. Generated API client/OpenAPI documentation.
2. Rich shopping categories/order/quantities.
3. Recurring calendar events and reminders.
4. Recipe and shopping-list integration for meals.
5. Mobile app backend connection.
6. Advanced wishlist occasions, budgets, and gift workflows.
7. Design-system extraction beyond tokens.
8. Observability/logging/metrics beyond basic health.

## 10. Recommended Run 1.5 stabilisation plan

### Concrete ordered steps

1. **Database baseline**
   - Create baseline Prisma migration from current schema.
   - Verify migration applies cleanly to a fresh local PostgreSQL database.
   - Add local database setup documentation.

2. **Prisma/CI bootstrap**
   - Make `prisma:generate` reliable in local and CI environments.
   - Document `DATABASE_URL` requirements.
   - Decide whether to cache Prisma engines in CI.

3. **Auth/environment hardening**
   - Add fail-fast config validation for production.
   - Require strong `AUTH_JWT_SECRET`.
   - Document token lifetime and storage tradeoffs.
   - Consider cookie-based auth if server-side route protection is desired soon.

4. **API safety tests**
   - Add API e2e test harness with test database.
   - Cover auth register/login/token failures.
   - Cover family isolation for shopping, tasks, meals, calendar, wishlists, dashboard, and public wishlist tokens.

5. **Contract and route convention stabilisation**
   - Decide family context convention.
   - Stabilise success/error response shapes.
   - Add contract fixtures for representative API responses.

6. **Frontend stabilisation**
   - Extract shared auth/active-family hooks or provider.
   - Standardise loading/empty/error components.
   - Remove repeated 401/404 handling where practical.

7. **Documentation refresh**
   - Update README to match current implemented functionality.
   - Add developer setup steps for API, database, Prisma, seed, and tests.
   - Add Run 1 architecture notes for future contributors.

8. **Security polish**
   - Add wishlist share expiry/revoke decision.
   - Add rate-limit plan for auth and public endpoints.
   - Add permission matrix for roles.

### Suggested prompt sequence for next Run 1.5 prompts

1. **Run 1.5 Prompt 2 — Prisma baseline and database bootstrap**
   - Create migration(s) for current schema.
   - Add local PostgreSQL setup docs.
   - Verify Prisma generate/migrate with explicit env.

2. **Run 1.5 Prompt 3 — API auth and family isolation test harness**
   - Add test framework/e2e setup.
   - Add coverage for auth and cross-family access.

3. **Run 1.5 Prompt 4 — Environment and auth hardening**
   - Add config validation.
   - Enforce production secret requirements.
   - Document token/session behaviour.

4. **Run 1.5 Prompt 5 — API contract/error/family-context stabilisation**
   - Decide and implement route/header convention if changing.
   - Standardise error codes/shapes.
   - Add response contract tests.

5. **Run 1.5 Prompt 6 — Frontend auth/active-family stabilisation**
   - Extract reusable auth/family loading flow.
   - Standardise loading/error/empty states.

6. **Run 1.5 Prompt 7 — Documentation and CI readiness**
   - Refresh README and developer docs.
   - Add CI workflow once tests and Prisma bootstrap are stable.

## Run 1.5 Prompt 2 result

Fixed in this pass:

- Added the first committed Prisma migration, `20260530000000_run1_baseline`, as the reproducible baseline for the current Run 1 schema.
- Added Prisma's migration lock file for PostgreSQL.
- Added monorepo-friendly scripts for Prisma generate, local migration development, migration deploy, and Studio.
- Updated `apps/api/prisma.config.ts` with a local development `DATABASE_URL` fallback so Prisma Client generation does not require production secrets.
- Added `docs/development/database.md` with local PostgreSQL setup, `DATABASE_URL`, Prisma generate, migration apply/deploy, local reset, Studio, and Prisma engine cache/download notes.

Verification notes:

- `pnpm --filter @familieappen/api exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` could not be used to generate the migration in this environment because Prisma engine downloads from `https://binaries.prisma.sh` returned `403 Forbidden`.
- Re-running that command with `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` still failed because the schema engine binary itself could not be downloaded.
- A fresh PostgreSQL migration apply was not verified in this container because neither Docker nor PostgreSQL client/server tooling is installed.

Remaining database/Prisma risks:

- The baseline migration should be verified against a fresh PostgreSQL database in a local or CI environment that can download or cache Prisma engines.
- CI should explicitly cache pnpm dependencies and Prisma engines before making Prisma migration checks required.
- API e2e tests still need a disposable test database and migration bootstrap before database-backed feature safety can be trusted.

## 11. Open questions

1. Should family-scoped feature APIs use `X-Family-Id` long term, or should they move to nested routes under `/families/:familyId/*`?
2. Should auth tokens remain in `localStorage`, or should the app move to httpOnly cookies to support stronger browser security and middleware route protection?
3. What is the intended permission matrix for `OWNER`, `PARENT`, `CHILD`, and `GUEST` across shopping, tasks, meals, calendar, and wishlists?
4. Should manual family members eventually become inviteable/claimable user accounts?
5. What timezone should dashboard “today”, meal dates, and calendar all-day events use: UTC, browser-local, or a family-level timezone?
6. Should public wishlist shares expire by default? If so, after how long?
7. Should public wishlist recipients be able to mark gifts purchased, or only reserve them?
8. Should public wishlist responses expose estimated prices, product URLs, and image URLs?
9. Should the dashboard remain a bespoke aggregator, or should it compose feature summary services with stricter module boundaries?
10. What minimum test coverage is required before Run 2 begins?
11. Is the mobile app expected to remain shell-only through Run 2, or should shared contracts begin accounting for native usage now?

## Run 1.5 Prompt 3 result

Date: 2026-05-30

### Baseline migration verification

A disposable local PostgreSQL 16.14 instance was installed and started in the review environment after confirming that Docker and `psql` were initially unavailable. A separate database, `familieappen_run15_prompt3`, was created and used only for the Run 1.5 Prompt 3 verification attempt with this explicit URL:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/familieappen_run15_prompt3?schema=public"
```

Prisma verification is still blocked in this environment. `pnpm prisma:generate` reached the Prisma CLI, loaded `apps/api/prisma.config.ts`, and then failed because the environment's proxy returned `403 Forbidden` for Prisma's schema-engine checksum URL at `https://binaries.prisma.sh/.../schema-engine.sha256`. Retrying with `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` bypassed the checksum lookup but failed on the actual schema-engine binary URL at `https://binaries.prisma.sh/.../schema-engine.gz`, also with `403 Forbidden`.

Because Prisma Client generation could not obtain the required schema engine, `prisma migrate deploy` / `prisma migrate reset` was not run. Per the prompt instruction, API test harness work was not added in this pass.

As a narrower SQL-only sanity check, the committed baseline SQL was applied directly to a second empty database, `familieappen_run15_prompt3_sqlcheck`, using:

```sh
psql "postgresql://postgres:postgres@localhost:5432/familieappen_run15_prompt3_sqlcheck" -v ON_ERROR_STOP=1 -f apps/api/prisma/migrations/20260530000000_run1_baseline/migration.sql
```

That direct SQL check completed successfully and created 14 public tables. This confirms the SQL file itself can apply to an empty PostgreSQL database, but it is not a substitute for Prisma migrate verification because it does not exercise Prisma's migration engine or `_prisma_migrations` state.

### Tests added

None. The requested auth and family-isolation API tests were intentionally deferred because the Prisma baseline could not be verified first in this environment.

### Bugs found and fixed

No application isolation bugs were investigated or fixed because test-harness work was stopped at the Prisma engine download blocker.

### Risks remaining

- Fresh-database verification through `prisma migrate deploy` or `prisma migrate reset` is still unverified until Prisma engine binaries are available through the network or a cache.
- There is still no automated API test harness for auth, protected-route token rejection, or family isolation.
- The SQL-only migration check does not prove that Prisma's migration metadata and deploy/reset workflow are healthy.

### Recommended next Run 1.5 prompt

Run 1.5 Prompt 4 should start in an environment with Prisma schema-engine binaries pre-cached or with access to `https://binaries.prisma.sh`, then rerun:

```sh
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/familieappen_run15_prompt4?schema=public" pnpm prisma:generate
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/familieappen_run15_prompt4?schema=public" pnpm prisma:migrate:deploy
```

After that succeeds, add the NestJS HTTP API test harness and the auth/family-isolation regression tests requested for Prompt 3.

## Run 1.5 Prompt 3 result — API config and auth hardening

Date: 2026-05-30

### Files changed

- `apps/api/src/config/app.config.ts`
- `apps/api/src/config/config.service.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/.env.example`
- `apps/api/package.json`
- `apps/api/test/app-config.test.ts`
- `docs/development/api-configuration.md`
- `docs/reviews/review-run1.md`

### Config rules added

- API configuration now validates eagerly through `getAppConfig()` instead of silently falling back for malformed values.
- `NODE_ENV` defaults to `development` when omitted.
- `PORT` defaults to `4000` locally and must be an integer from `1` through `65535` when set.
- `API_PREFIX` defaults to `api`, trims leading/trailing slashes, and only allows letters, numbers, slash separators, underscores, and hyphens.
- `CORS_ORIGINS` defaults to `http://localhost:3000,http://127.0.0.1:3000`; custom values must be comma-separated bare `http`/`https` origins without paths, queries, hashes, or trailing slashes.
- `DATABASE_URL` defaults to the documented local PostgreSQL URL in `development` and `test`, but is required outside those environments and must use `postgresql://` or `postgres://`.
- `AUTH_JWT_SECRET` defaults to the documented local/test secret only in `development` and `test`; outside those environments it is required, must be at least 32 characters, and cannot be a known placeholder or the local default.
- Auth token signing now reads the already-validated secret from `ConfigService`; auth no longer owns a production-only fallback branch.

### Commands run and results

- `pnpm --filter @familieappen/api test:config` passed. This covers local defaults, production requirements, strong secret enforcement, database URL enforcement, port validation, API prefix normalization, and CORS origin validation without Prisma or a database.
- `pnpm -r typecheck` passed.
- `pnpm -r build` passed.

### Remaining auth/config risks

- Access tokens are still stored by the web client in `localStorage`, so XSS would expose bearer tokens.
- There are still no refresh tokens, token revocation, session/device records, or server-side logout semantics.
- Auth endpoints are still missing rate limiting, login throttling, account lockout, and password reset support.
- CORS remains static environment configuration; deployment automation must keep allowed origins in sync with real frontend hosts.
- Database-backed auth and protected-route tests remain deferred until Prisma engine availability and disposable database bootstrap are reliable.

### Recommended next Run 1.5 prompt

Run 1.5 Prompt 4 should add a database-backed API test harness in an environment where Prisma engines are available, then cover auth registration/login, protected-route token rejection, token expiry/malformed-signature cases, and cross-family isolation checks. Do not make these tests required in CI until the Prisma migration/bootstrap blocker is resolved.

## Run 1.5 Prompt 4 result — API auth and family-isolation fallback harness

Date: 2026-05-30

### Prisma / database bootstrap attempt

The run first attempted the real database-backed path requested for Prompt 4.

Commands/results:

- `pnpm --filter @familieappen/api prisma:generate` reached Prisma CLI and loaded `apps/api/prisma.config.ts`, but failed because `https://binaries.prisma.sh/.../schema-engine.gz.sha256` returned `403 Forbidden`.
- `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 pnpm --filter @familieappen/api prisma:generate` bypassed the checksum lookup but still failed because the schema-engine binary URL, `https://binaries.prisma.sh/.../schema-engine.gz`, returned `403 Forbidden`.
- `psql`, `createdb`, and `docker` are not available in this container, so a disposable PostgreSQL database could not be created here after Prisma engine download failed.

Because Prisma schema-engine download remains blocked, this prompt used the mandatory fallback path instead of stopping.

### Fallback harness added

Added a runnable NestJS HTTP security harness that does not require Prisma Client generation or a database. The harness uses:

- real NestJS controllers for auth, family dashboard, shopping, tasks, wishlists, public wishlists, and calendar;
- the real `AuthService` token issuance/verification logic;
- the real `AuthGuard` protected-route behavior;
- the global HTTP exception filter used by the API;
- an in-memory Prisma boundary for auth users;
- deterministic in-memory feature service doubles that model family membership, item ownership, wishlist sharing, and public-share token matching.

The working command is:

```sh
pnpm --filter @familieappen/api test:security
```

A separate `apps/api/tsconfig.test.json` keeps test compilation explicit and allows the API test files to import `src/**` while leaving the production `tsconfig.json` unchanged.

### What is tested now

Auth coverage now includes:

- register success;
- duplicate email rejection;
- login success;
- invalid password rejection;
- missing bearer token rejection;
- malformed token rejection;
- invalid signature rejection;
- expired token rejection;
- protected dashboard access denied without auth.

Family isolation coverage now includes representative high-risk endpoint behavior for:

- reading another family's dashboard;
- reading another family's shopping list with the wrong `X-Family-Id`;
- mutating another family's shopping item with a valid token and foreign item id;
- mixed user/family/item combinations for shopping mutations;
- missing family context;
- accessing another family's wishlist list;
- reading a foreign wishlist id with an owned family header;
- mutating another family's wishlist item;
- reading another family's tasks;
- mutating another family's calendar event.

Public wishlist coverage now includes:

- valid public share token returns the shared wishlist;
- invalid public share token is rejected;
- a valid public token cannot reserve an item from a different wishlist;
- public reserve succeeds only when token and item belong to the same shared wishlist;
- a valid public token cannot mark purchased an item from a different wishlist;
- public mark-purchased succeeds only when token and item belong to the same shared wishlist.

### Remaining test gaps

- These are fallback HTTP tests with mocked persistence boundaries; they do not prove the real Prisma-backed services are querying with the correct `familyId`, `userId`, wishlist token, or item-id constraints.
- `prisma migrate deploy`, Prisma Client generation, and end-to-end database bootstrap remain unverified in this container because Prisma schema-engine downloads are blocked and no local PostgreSQL/Docker tooling is available.
- The fallback harness intentionally does not redesign the auth architecture, does not replace `X-Family-Id`, and does not add refresh tokens or cookie sessions.
- Real DB-backed e2e tests should be added once Prisma engines are cached or available. They should reuse this harness structure but replace in-memory service doubles with migrated disposable PostgreSQL fixtures.

### Recommended next Run 1.5 prompt

Run 1.5 Prompt 5 should focus on converting the fallback harness into true Prisma-backed e2e tests in an environment where Prisma engines are pre-cached or reachable. Start by running:

```sh
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 pnpm --filter @familieappen/api prisma:generate
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/familieappen_run15_prompt5?schema=public" pnpm --filter @familieappen/api prisma:migrate:deploy
pnpm --filter @familieappen/api test:security
```

Then add DB fixture factories for users, families, memberships, shopping items, tasks, calendar events, wishlists, wishlist items, and wishlist shares, and assert that the real services reject cross-family database records rather than only the fallback doubles.

## Run 1.5 Prompt 5 result

### Contracts standardised

- API success responses now consistently use the `{ "data": ... }` envelope, including the health endpoint.
- API error responses now consistently use `{ "error": { "code": "...", "message": "..." } }`.
- The global HTTP exception filter now removes framework-specific error metadata from client responses and avoids exposing stack traces or internal implementation details.
- HTTP status codes remain the transport-level signal, while `error.code` is the stable machine-readable application signal.
- The frontend API client was kept compatible with existing `{ data }` success envelopes and minimally updated to read both the new `error.message` field and the previous top-level `message` fallback.

### Error codes added

The standard API error-code registry now includes:

- `auth.requires_auth`
- `auth.invalid_token`
- `auth.expired_token`
- `auth.invalid_credentials`
- `auth.email_already_exists`
- `family.missing_context`
- `family.access_denied`
- `family.not_found`
- `shopping.item_not_found`
- `task.not_found`
- `calendar.event_not_found`
- `wishlist.not_found`
- `wishlist.invalid_share_token`
- `wishlist.item_mismatch`
- `validation.invalid_input`
- `validation.missing_field`
- `server.internal_error`

### Family-context behaviour

- `X-Family-Id` remains the family-context mechanism.
- Missing `X-Family-Id` now has a deterministic `400` response with `family.missing_context` when family-scoped services require a family context.
- Family membership failures continue to hide unauthorized family existence with `404` and now include `family.not_found`.
- Foreign family-owned resources continue to be rejected through the relevant `404` not-found semantics and now include stable resource-specific codes where the message is specific enough to identify the domain.

### What stayed intentionally unchanged

- Bearer-token auth remains in place.
- No cookie migration was introduced.
- `X-Family-Id` was not replaced.
- No OpenAPI generation was added.
- DTO structure was not redesigned.
- Zod was not introduced across the API.
- No Run 2 feature expansion was started.
- The shared package remains useful for frontend typing but is not yet the source of truth for API DTOs.

### Contract and regression coverage added

- Added a dedicated API contract harness covering success envelope shape, error envelope shape, auth rejection shape, invalid token shape, expired token shape, missing family context shape, family access rejection shape, and public wishlist invalid-token shape.
- Strengthened the security harness to assert representative machine-readable error codes for auth rejection, invalid token, expired token, missing family context, and invalid public wishlist token.

### Remaining API risks

- Most production services still throw framework exceptions and rely on the global filter to map messages/statuses into stable codes. This keeps the patch small, but future work should gradually replace ambiguous exception messages with explicit `ApiException` throws for high-value branches.
- The fallback test harness still uses in-memory service doubles rather than Prisma-backed fixtures, so it verifies HTTP contract behavior and representative family-isolation semantics but not real database query predicates.
- Route-not-found responses are normalized by the same fallback mapping and are not yet assigned a dedicated route-level error code.
- The frontend stores only the error message today; callers do not yet receive the machine-readable code through `ApiError`.

### Recommended next Run 1.5 prompt

Run 1.5 Prompt 6 should focus on replacing message-based error-code inference in the most important API branches with explicit `ApiException` usage, starting with auth, family authorization, wishlist sharing, and cross-family resource lookups. If Prisma engines and PostgreSQL are available, it should also convert the contract/security harnesses into real Prisma-backed e2e tests while preserving the existing no-Prisma fallback tests.

## Run 1.5 Prompt 6 result

### Frontend auth/family cleanup completed

- Audited frontend token and active-family usage across login, register, onboarding, dashboard, tasks, shopping, meals, calendar, wishlists, and shared wishlist flows.
- Centralised browser storage access for the bearer access token and active family id in `apps/web/lib/session.ts` while intentionally keeping the existing localStorage-based architecture.
- Added `apps/web/lib/auth-family.ts` as a small shared helper layer for requiring auth, loading available families, choosing the active family, clearing invalid auth, and mapping common API error codes to simple user-facing messages.
- Updated dashboard, tasks, shopping, meals, calendar, wishlists, and add-members onboarding to use the shared family bootstrap path instead of each page independently listing families and picking the active family.
- Kept login, register, create-family onboarding, dashboard loading, feature-page active-family usage, and unauthenticated redirects on the same routes as before.

### Helpers, hooks, and components added

- Added session helpers for access-token read/write/remove, auth-session save/clear, and active-family read/write/remove.
- Added lightweight auth/family helpers: `requireAuth`, `loadAvailableFamilies`, `chooseActiveFamily`, `handleMissingOrInvalidAuth`, and `getUserFacingApiMessage`.
- Added shared `LoadingState` and `ErrorState` UI helpers that wrap the existing `EmptyState` styling so loading/error states can be standardised without redesigning the UI.
- Extended the frontend `ApiError` with the API `error.code` field so frontend callers can react to Run 1.5 Prompt 5's stable API error contract.

### Behaviour intentionally left unchanged

- Bearer-token auth and localStorage remain unchanged; no cookie or refresh-token migration was introduced.
- `X-Family-Id` remains the family context mechanism for feature API requests.
- Existing route conventions and redirect destinations were preserved.
- The UI was not redesigned; existing cards, forms, labels, and empty-state copy were preserved except for small loading/error helper reuse.
- Shared public wishlist pages were not moved behind auth/family helpers because they intentionally use unauthenticated public endpoints.

### Remaining frontend risks

- The frontend still depends on localStorage and therefore remains vulnerable to the same browser-storage/XSS considerations as before; cookie/session hardening should be handled as a later auth architecture change.
- Some page-level action handlers still maintain local status/message state because centralising all feature mutations would be a larger Run 2 refactor.
- Active-family state is still stored globally in localStorage, so multi-tab family switching can affect another tab's next feature load.
- The frontend now consumes API error codes, but coverage is still manual through typecheck/build rather than UI integration tests.

### Final Run 1.5 completion note

Run 1.5 is complete. The stabilisation pass now covers the database baseline, API configuration and auth validation, family-isolation/security harnesses, API response/error contracts, and the final frontend auth/family/loading/error cleanup needed before feature expansion.

### Recommended first Run 2 focus

Run 2 Prompt 1 should start with one narrow user-facing feature slice and add end-to-end coverage around it before expanding scope. The recommended first slice is a Prisma-backed, UI-visible family dashboard/tasks flow that verifies login, active-family selection, `X-Family-Id` propagation, empty/loading/error states, and cross-family rejection in one maintained test path.
