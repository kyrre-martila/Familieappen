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
