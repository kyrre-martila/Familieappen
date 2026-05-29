DEVELOPMENT_PLAN.md

FamilieAppen Development Plan

FamilieAppen is a practical productivity app for modern family logistics.

The goal is to help families save time, reduce coordination friction and keep everyday life organized in one place.

This development plan defines the technical direction, MVP scope and build order.

⸻

1. Product Direction

FamilieAppen is not a social network.

It is not a generic productivity app.

It is a family logistics tool.

The app should help families answer questions like:

* What is happening today?
* Who is doing what?
* What is for dinner?
* What needs to be bought?
* Who is driving?
* What do the kids wish for?
* What needs to be remembered?

The app should be useful every day.

⸻

2. Core MVP Scope

Version 1 focuses on core family logistics.

MVP Features

1. Family Dashboard
2. Family Calendar
3. Dinner Planning
4. Shared Shopping List
5. Tasks & Reminders
6. Wishlists

These are the only core feature areas for the first product version.

Everything else is future scope.

⸻

3. Technical Direction

Architecture

FamilieAppen will use a lean fullstack monorepo.

The project should be structured enough to scale, but not over-engineered.

Recommended structure:

familieappen/
  apps/
    mobile/
    api/
    web/
  packages/
    shared/
    ui/
  infra/
  docs/
  .github/
    workflows/

Apps

apps/mobile

Expo React Native app.

Primary user-facing application.

This is the main product.

apps/api

Custom backend API.

Responsible for:

* Authentication
* Family data
* Sharing rules
* Permissions
* Calendar data
* Tasks
* Shopping lists
* Dinner planning
* Wishlists

apps/web

Optional web app / landing page / admin surface.

This should not be prioritized before the mobile MVP works.

⸻

Packages

packages/shared

Shared TypeScript types, constants and validation schemas.

Examples:

* User role constants
* Family role constants
* Sharing level constants
* API DTO types
* Validation schemas

packages/ui

Shared design tokens and reusable UI primitives.

Should start small.

Do not build a large design system before the app needs it.

⸻

4. Technology Stack

Mobile

* Expo
* React Native
* TypeScript
* Expo Router
* React Query or equivalent data-fetching layer
* SecureStore for token storage
* AsyncStorage/MMKV for lightweight local state if needed

API

Preferred backend:

* NestJS
* TypeScript
* Prisma
* PostgreSQL
* JWT/session-based authentication

Alternative backend:

* Fastify
* TypeScript
* Prisma
* PostgreSQL

NestJS is preferred because it provides clear structure for modules, guards, services and controllers.

⸻

Database

* PostgreSQL
* Prisma ORM
* Explicit schema design
* Migrations committed to repo

⸻

Auth

Version 1 should use custom authentication.

Initial auth scope:

* Register with email and password
* Login with email and password
* Logout
* Refresh token flow
* Protected API routes
* Basic session/device handling

Not in initial auth scope:

* Magic link
* Sign in with Apple
* Google login
* SMS login
* Supabase Auth

These can be added later if needed.

⸻

Hosting

Initial hosting target:

* Own VM / self-hosted environment

Expected services:

* API server
* PostgreSQL
* Optional Redis later
* Reverse proxy
* App distribution through Expo/EAS

⸻

5. Data Model Priorities

The data model must be designed carefully before feature work becomes too large.

The most important concept is family-based access control.

Core Entities

Initial entities:

* User
* Family
* FamilyMember
* Invitation
* CalendarEvent
* Task
* ShoppingList
* ShoppingListItem
* MealPlan
* MealPlanDay
* Wishlist
* WishlistItem
* SharedAccess

Family Membership

A user can belong to one or more families.

A family has members.

Members have roles.

Initial roles:

* Owner
* Parent
* Child
* Guest

Role behavior should stay simple in MVP.

⸻

Sharing Levels

All major content should eventually use the same sharing model.

The app has three sharing levels:

1. Private
2. Family
3. Shared with selected people

This must be consistent across the product.

Sharing Level 1 — Private

Only visible to the owner.

Examples:

* Personal reminders
* Private tasks
* Personal notes

Sharing Level 2 — Family

Visible to members of the family.

Examples:

* Family calendar
* Dinner plan
* Shopping list
* Family tasks

Sharing Level 3 — Selected People

Visible to selected external people.

Examples:

* Wishlist shared with grandparents
* Football schedule shared with co-parent
* Plans shared with babysitter

The system should avoid complicated permission models in v1.

⸻

6. MVP User Flows

6.1 First-time User Flow

1. User opens app
2. User creates account
3. User creates family
4. User adds family members
5. User reaches dashboard

Initial member setup can be simple.

Invitations can be added after the first core flow works.

⸻

6.2 Dashboard Flow

The dashboard should answer:

* What happens today?
* What is for dinner?
* What needs to be done?
* What needs to be bought?

Dashboard widgets:

* Today’s calendar events
* Today’s tasks
* Dinner today
* Shopping list summary
* Wishlist reminders if relevant

⸻

6.3 Calendar Flow

User can:

* Create event
* Edit event
* Delete event
* Assign event to family members
* Set date/time
* Set all-day event
* View day/week/month

Recurring events can be added after basic calendar works.

⸻

6.4 Dinner Planning Flow

User can:

* View month
* Add meal to day
* Edit meal
* Repeat/copy meal
* Save favorite meal

Recipes are not required for first implementation.

⸻

6.5 Shopping List Flow

User can:

* Add item
* Check item
* Uncheck item
* Delete item
* See shared list

Offline support is important, but should be implemented after the basic online flow works.

⸻

6.6 Task Flow

User can:

* Create task
* Assign task
* Mark complete
* See today’s tasks
* See family tasks

Keep tasks simple.

Do not build a full project management system.

⸻

6.7 Wishlist Flow

User can:

* Create wishlist
* Add wishlist item
* Add product link
* Share wishlist
* Reserve item
* Mark as purchased

Wishlist owner should not see who bought what.

External sharing should be simple and safe.

⸻

7. Build Order

The project should be built in controlled runs.

Each run should be small enough to review.

Do not combine too many feature areas in one run.

⸻

Run 1 — Repository Foundation

Goal:

Create the clean monorepo foundation.

Tasks:

* Initialize monorepo
* Add apps/mobile
* Add apps/api
* Add packages/shared
* Add packages/ui
* Add docs folder
* Add README.md
* Add DEVELOPMENT_PLAN.md
* Add AI_GUIDE.md
* Add basic TypeScript config
* Add package manager setup
* Add minimal lint/format setup

Do not add:

* Docker
* Heavy CI
* Database schema
* Auth implementation
* Feature code

Acceptance:

* Repo installs cleanly
* Mobile app starts
* API app starts with health route
* Shared package can be imported
* No automatic GitHub workflows

⸻

Run 2 — Mobile App Shell

Goal:

Create the first mobile UI shell.

Tasks:

* Set up Expo Router
* Add app navigation
* Add base layout
* Add placeholder screens:
    * Home
    * Calendar
    * Meals
    * Shopping
    * Tasks
    * Wishlists
    * Settings
* Add bottom navigation
* Add basic theme tokens

Acceptance:

* App opens
* Navigation works
* All placeholder screens are reachable
* No backend dependency yet

Run 3 — Brand & Design System Foundation

Goal:

Create a small design foundation.

Tasks:

* Add color tokens
* Add spacing tokens
* Add radius tokens
* Add typography tokens
* Create basic UI primitives:
    * Button
    * Card
    * Text
    * Screen
    * Badge
    * Input

Acceptance:

* Dashboard placeholder uses shared UI primitives
* Design system remains small
* No large component library

⸻

Run 4 — API Foundation

Goal:

Create the backend foundation.

Tasks:

* Set up NestJS API
* Add health endpoint
* Add config handling
* Add structured module layout
* Add Prisma
* Add PostgreSQL connection
* Add initial migration setup

Acceptance:

* API starts locally
* Health endpoint works
* Prisma connects to database
* Migrations run

⸻

Run 5 — Custom Auth

Goal:

Implement own basic authentication.

Tasks:

* User model
* Password hashing
* Register endpoint
* Login endpoint
* Refresh token endpoint
* Logout endpoint
* Auth guard
* Current user endpoint
* Mobile login screen
* Mobile register screen
* Token storage on mobile

Acceptance:

* User can register
* User can login
* User can stay logged in
* User can logout
* Protected routes reject unauthenticated requests

Out of scope:

* Magic link
* Apple login
* SMS login

⸻

Run 6 — Family Model

Goal:

Implement family creation and membership.

Tasks:

* Family model
* FamilyMember model
* Create family endpoint
* List user families
* Get active family
* Add member manually
* Basic roles:
    * Owner
    * Parent
    * Child
    * Guest
* Mobile family setup screen

Acceptance:

* User can create family
* User becomes owner
* User can add members
* Dashboard can load active family

⸻

Run 7 — Dashboard MVP

Goal:

Build the first real dashboard.

Tasks:

* Dashboard screen
* Today overview
* Placeholder data from API or seeded data
* Cards:
    * Today’s events
    * Dinner today
    * Shopping summary
    * Tasks today
    * Wishlist summary

Acceptance:

* Dashboard loads for logged-in user
* Dashboard is useful even before all feature modules are complete

⸻

Run 8 — Shopping List MVP

Goal:

Build shared shopping list.

Tasks:

* ShoppingList model
* ShoppingListItem model
* API endpoints
* Mobile shopping list screen
* Add item
* Check item
* Delete item
* Basic optimistic UI

Acceptance:

* Family members can share one list
* Items can be checked off
* Dashboard shows shopping status

Realtime and offline sync can be improved later.

⸻

Run 9 — Tasks & Reminders MVP

Goal:

Build simple family tasks.

Tasks:

* Task model
* Create task
* Assign task
* Complete task
* View today’s tasks
* Mobile tasks screen
* Dashboard integration

Acceptance:

* User can create and complete tasks
* Tasks can be assigned to members
* Dashboard shows today’s tasks

⸻

Run 10 — Dinner Planning MVP

Goal:

Build monthly dinner planning.

Tasks:

* MealPlan model
* MealPlanDay model
* Add meal to day
* Edit meal
* Repeat/copy meal
* Favorite meals
* Mobile month view
* Dashboard dinner card

Acceptance:

* User can plan meals for a month
* Dinner today appears on dashboard
* User can reuse meals

Recipes are out of scope for this run.

⸻

Run 11 — Calendar MVP

Goal:

Build basic family calendar.

Tasks:

* CalendarEvent model
* Create event
* Edit event
* Delete event
* Assign participants
* Day view
* Week view
* Month view
* Dashboard integration

Acceptance:

* Events can be created and viewed
* Events can be assigned to family members
* Dashboard shows today’s events

Out of scope:

* External calendar sync
* Spond sync
* Complex recurrence engine

⸻

Run 12 — Wishlists MVP

Goal:

Build wishlist feature and sharing foundation.

Tasks:

* Wishlist model
* WishlistItem model
* Create wishlist
* Add item
* Add product link
* Reserve item
* Mark as purchased
* Hide buyer identity from wishlist owner
* Create share link
* External wishlist view

Acceptance:

* A family member can create wishlist
* Items can be reserved
* Buyer identity is hidden from list owner
* External person can view shared wishlist through link

⸻

Run 13 — Sharing Foundation

Goal:

Implement consistent sharing levels.

Tasks:

* Add sharingLevel field where needed
* Add selected sharing records
* Implement Private / Family / Selected People model
* Add sharing UI
* Add backend authorization checks
* Add tests for access rules

Acceptance:

* Private content is private
* Family content is visible to family
* Selected content is visible only to selected people
* Unauthorized access is rejected

This run is critical.

Do not rush it.

⸻

Run 14 — Invitations

Goal:

Support inviting family members and external viewers.

Tasks:

* Invitation model
* Invite by email
* Invite by phone placeholder
* Invitation acceptance flow
* Family member invite flow
* Wishlist external invite flow

Acceptance:

* User can invite family member
* User can invite external person to view wishlist
* Invite links work safely

⸻

Run 15 — Offline & Sync Improvements

Goal:

Make high-value flows work better offline.

Focus areas:

* Shopping list
* Tasks

Tasks:

* Local optimistic state
* Retry queue
* Sync on reconnect
* Conflict strategy
* Error states

Acceptance:

* User can add/check shopping items offline
* Changes sync when network returns
* User understands sync state

⸻

Run 16 — Realtime Updates

Goal:

Add live updates for shared family data.

Focus areas:

* Shopping list
* Tasks
* Calendar updates

Tasks:

* WebSocket or realtime transport
* Server event publishing
* Mobile subscription layer
* Query invalidation

Acceptance:

* Shopping list updates appear across devices
* Task updates appear across devices
* No excessive complexity

⸻

Run 17 — Notifications Foundation

Goal:

Add push notification foundation.

Tasks:

* Push token registration
* Notification preferences
* Basic notification service
* Event reminder notifications
* Task reminder notifications

Acceptance:

* Device can register push token
* API can send test notification
* User can receive basic reminders

⸻

Run 18 — Calendar Import Research / Prototype

Goal:

Investigate realistic calendar import options.

Tasks:

* Research iOS calendar access with Expo/native modules
* Research Android calendar access
* Research Spond-to-device-calendar flow
* Prototype read-only device calendar import
* Document limitations

Acceptance:

* Clear decision on calendar import path
* Prototype if technically feasible
* No full production integration unless confirmed

⸻

8. Future Roadmap

Phase 2 — Family Coordination

* Multi-family support
* Shared custody planning
* Pickup and driving coordination
* Smarter reminders
* External sharing with grandparents and co-parents

Phase 3 — Family Value

* Memory bank / family scrapbook
* Yearbook export
* Chores and allowance
* Family polls

Phase 4 — Utility & Trust

* Password vault
* Budget and savings

Phase 5 — Bonus Utility

* Lending registry

⸻

9. Monetization Direction

Core family logistics should remain free.

Free Core

* Calendar
* Dinner planning
* Shopping list
* Tasks
* Wishlists
* Basic sharing

Potential Paid Features Later

* Extra storage for family memories
* Yearbook export
* Premium memory features
* Ad-free experience

Advertising may be used later, but must be:

* Non-intrusive
* Contextual
* Useful
* Never disruptive to core flows

⸻

10. Engineering Principles

FamilieAppen should prioritize reliability, maintainability and simplicity.

The goal is long-term quality — not fast feature accumulation.

Build Small

Features should be built in small, controlled steps.

Prefer:

* Small PRs
* Clear scope
* Easy review
* Incremental improvements

⸻

Simplicity Over Cleverness

Prefer readable code over smart abstractions.

Avoid premature optimization.

Simple code that works is better than clever code that becomes hard to maintain.

⸻

Practical First

Every feature should solve a real family problem.

Questions to ask:

* Does this save time?
* Does this reduce friction?
* Will families realistically use this often?
* Does this improve coordination?

⸻

Mobile-first Thinking

FamilieAppen is primarily a mobile product.

Prioritize:

* Fast interactions
* Simple navigation
* One-handed use
* Clear hierarchy
* Minimal friction

Desktop/web is secondary.

⸻

11. Code Quality Standards

Type Safety

Use strict TypeScript.

Avoid any.

Prefer explicit typing and shared contracts.

Shared types belong in:

packages/shared

when reused.

⸻

Clean Architecture

Keep responsibilities separated.

Example:

apps/api
├── auth
├── users
├── families
├── calendar
├── shopping
├── meals
├── tasks
├── wishlists

Avoid large “god modules”.

Each feature area should own:

* controller
* service
* validation
* database access

⸻

Reusable UI

Only extract reusable components when repetition appears.

Good candidates:

* Button
* Card
* Input
* Badge
* Avatar
* Screen container

Avoid building a massive design system too early.

⸻

Naming Conventions

Use clear naming.

Prefer:

createFamily
getFamilyMembers
createWishlistItem

Avoid unclear naming:

handleStuff
doThing
helper2

⸻

Keep Dependencies Small

Before adding a package ask:

* Is this actively maintained?
* Does it solve meaningful work?
* Is it worth the dependency?

Avoid dependency bloat.

⸻

Documentation

Update documentation when architecture changes.

Important updates should also update:

* README.md
* DEVELOPMENT_PLAN.md
* AI_GUIDE.md

Docs should remain source of truth.

⸻

12. Security Principles

FamilieAppen stores sensitive family information.

Examples:

* Children’s schedules
* Family coordination
* Shared plans
* Family relationships

Security should be practical and strong.

⸻

Authentication

Version 1:

* Email + password
* Secure password hashing
* Session/token expiration
* Logout support

⸻

Authorization

Never trust frontend permissions.

All authorization must be enforced in backend.

Validate:

user
→ family membership
→ permission
→ resource access

A user should never access another family’s data.

⸻

Principle of Least Access

Users should only access what they need.

Always follow:

1. Private
2. Family
3. Selected people

Never default to broad access.

⸻

Sensitive Data

Never expose:

* Password hashes
* Hidden wishlist buyer identity
* Private family information
* Internal secrets

⸻

Input Validation

Validate everything.

Never trust client input.

Validate:

* request body
* params
* query values

⸻

Secrets & Environment Variables

Never commit secrets.

Use environment variables for:

* database connection
* JWT secrets
* API keys
* push credentials

Never hardcode secrets.

⸻

Logging

Never log:

* passwords
* tokens
* sensitive family information

Logs should help debugging without exposing data.

⸻

13. Development Rules

1. Build one feature area at a time.
2. Keep PRs small.
3. Avoid premature abstraction.
4. Prefer readability over cleverness.
5. Every feature must solve a real family problem.
6. Shared logic belongs in packages/shared only when reused.
7. Shared UI belongs in packages/ui only when reused.
8. Backend authorization is mandatory.
9. Documentation must stay updated.
10. Daily usefulness beats feature quantity.

⸻

14. Definition of MVP Done

The MVP is considered done when:

* A user can create an account
* A user can create a family
* A user can add family members
* A family has a shared dashboard
* A family can use a shared shopping list
* A family can create tasks
* A family can plan dinners
* A family can create calendar events
* A family can create and share wishlists
* Sharing rules are safe and understandable
* The app is useful enough for real daily family use

MVP is not done when every planned feature exists.

MVP is done when the core daily family logistics loop works.
