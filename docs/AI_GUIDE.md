AI_GUIDE.md

FamilieAppen AI Guide

This document defines how AI assistants (Codex, ChatGPT, Copilot and similar tools) should work when contributing to FamilieAppen.

Follow this guide together with:

* README.md
* DEVELOPMENT_PLAN.md

DEVELOPMENT_PLAN.md is the source of truth for implementation order and scope.

Do not introduce features, architecture or complexity outside the agreed plan without explicit approval.

⸻

1. Product Understanding

FamilieAppen is a practical productivity app for family logistics.

It helps families coordinate everyday life.

The goal is:

* Save time
* Reduce coordination friction
* Improve overview
* Make everyday logistics easier

FamilieAppen is not:

* A social network
* A chat-first platform
* A generic productivity app
* A “smart family AI assistant”
* A feature-heavy life-management system

The product focuses on solving real everyday family problems.

Examples:

* Who is driving?
* What is for dinner?
* What needs to be bought?
* What happens today?
* What should the kids wish for?

Every implementation decision should support practical family usefulness.

⸻

2. Product Principles

All implementation should follow these principles.

Useful Every Day

Prioritize features families realistically use often.

Prefer:

* Daily usefulness
* Friction reduction
* Practical coordination

Avoid:

* Rare edge-case features
* Feature bloat
* Complexity without value

⸻

Simplicity Wins

Complicated things should feel simple.

Example:

Creating a family calendar should feel effortless.

Users should not need technical knowledge.

Prefer:

* Sensible defaults
* Clear choices
* Minimal setup
* Predictable UX

Avoid:

* Over-configurable systems
* Complex permission trees
* Confusing settings

⸻

Three Sharing Levels Only

Sharing must remain simple and consistent.

Everything in FamilieAppen follows the same model:

1. Private

Only visible to the owner.

Examples:

* Personal reminders
* Personal notes
* Private tasks

2. Family

Visible to the family.

Examples:

* Shared calendar
* Shopping list
* Dinner planning
* Family reminders

3. Shared with Selected People

Visible to selected external people.

Examples:

* Grandparents
* Co-parents
* Babysitters
* Extended family

Do not introduce advanced permission systems.

Do not introduce ACL complexity.

Keep sharing understandable.

⸻

Mobile-first Always

FamilieAppen is primarily a mobile product.

Desktop and web are secondary.

Design and implementation decisions must prioritize:

* Small screens
* Thumb-friendly interactions
* Fast actions
* Minimal taps
* Clear visual hierarchy

Always design:

mobile → tablet → desktop

Never:

desktop → mobile

Avoid desktop-inspired layouts.

Avoid hover-dependent interactions.

Prefer stacked layouts.

⸻

3. Architecture Rules

FamilieAppen uses a lean fullstack monorepo.

The architecture should remain simple, maintainable and scalable.

Avoid over-engineering.

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

⸻

apps/mobile

Primary Expo React Native application.

This is the main product.

Prioritize:

* Mobile UX
* Speed
* Reliability
* Simple navigation

⸻

apps/api

Custom backend API.

Responsibilities:

* Authentication
* Family membership
* Sharing rules
* Calendar
* Tasks
* Shopping
* Meals
* Wishlists
* Permissions

Never place business logic in frontend.

Authorization belongs in backend.

⸻

apps/web

Optional future surface.

Can be used for:

* Landing page
* Shared external views
* Light admin

Do not prioritize web before mobile MVP works.

⸻

packages/shared

Shared reusable logic only.

Examples:

* Types
* Validation schemas
* Constants
* Shared DTOs

Only move code here when reused.

Do not prematurely abstract.

⸻

packages/ui

Shared UI primitives.

Should remain intentionally small.

Good candidates:

* Button
* Card
* Badge
* Input
* Text
* Screen container

Do not build a large design system early.

⸻

4. Monorepo Rules

Keep the monorepo clean.

Responsibilities should remain clear.

Avoid cross-dependencies that create confusion.

Good

mobile
→ shared
api
→ shared

Avoid

mobile
→ api internals
shared
→ mobile

Packages should remain independent.

⸻

5. Development Philosophy

Build small.

Ship useful features early.

Avoid complexity until needed.

Every feature should solve a real family problem.

Before implementing a feature, ask:

* Does this save time?
* Does this reduce friction?
* Will families actually use this?
* Does this improve coordination?

If not:

reconsider priority.

⸻

6. Implementation Strategy

Build one feature area at a time.

Keep PRs small.

Do not combine unrelated features.

Good:

Run 8
→ Shopping List only

Avoid:

Run 8
→ Shopping
→ Tasks
→ Calendar
→ Notifications

Small scope improves:

* quality
* testing
* review
* maintainability

⸻

7. Definition of Good Output

Good implementation is:

* Small
* Readable
* Predictable
* Maintainable
* Well structured
* Mobile-first
* Consistent

Prefer boring, reliable code over clever abstractions.

Readable code beats smart code.

8. Design System Rules

FamilieAppen must use a token-based design system.

Do not hardcode arbitrary spacing, typography or sizing.

Consistency is more important than visual experimentation.

The UI should feel:

* Modern
* Scandinavian
* Practical
* Warm
* Trustworthy

Avoid visual noise.

Avoid inconsistent spacing.

Avoid random visual decisions.

⸻

Design Principles

The UI should feel:

* Fast
* Calm
* Useful
* Clear
* Familiar

Prioritize:

* Readability
* Touch usability
* Hierarchy
* Speed of use

Avoid:

* Over-designed UI
* Too many visual accents
* Complex layouts
* Tiny touch targets
* Heavy shadows
* Decorative complexity

Less friction is better.

⸻

9. Mobile-first Rules

FamilieAppen is mobile-first.

All UI and UX decisions must prioritize mobile devices.

Always design:

mobile
→ tablet
→ desktop

Never:

desktop
→ mobile

Prioritize:

* One-handed use
* Thumb-friendly interactions
* Fast actions
* Clear navigation
* Minimal taps

Avoid:

* Tiny buttons
* Deep navigation trees
* Hover states
* Desktop patterns

Prefer:

bottom navigation
→ screen
→ detail

Avoid:

menu
→ submenu
→ submenu
→ detail

⸻

10. Design Tokens

Everything visual should use tokens.

Avoid magic numbers.

Avoid arbitrary pixel values.

Never hardcode values unless there is a very specific reason.

⸻

Spacing Tokens

Spacing must use responsive clamp() tokens.

Example:

:root {
  --space-2xs: clamp(0.125rem, 0.1rem + 0.1vw, 0.25rem);
  --space-xs: clamp(0.25rem, 0.2rem + 0.15vw, 0.375rem);
  --space-s: clamp(0.5rem, 0.45rem + 0.2vw, 0.625rem);
  --space-m: clamp(1rem, 0.9rem + 0.4vw, 1.25rem);
  --space-l: clamp(1.5rem, 1.3rem + 0.7vw, 2rem);
  --space-xl: clamp(2rem, 1.7rem + 1vw, 3rem);
  --space-2xl: clamp(3rem, 2.5rem + 1.5vw, 4rem);
}

Use:

padding: var(--space-m);
gap: var(--space-s);
margin-bottom: var(--space-l);

Never:

padding: 17px;
margin-bottom: 23px;
gap: 11px;

If a value is needed “between” tokens:

gap: calc(var(--space-m) * 1.1);

Prefer token math over arbitrary values.

⸻

Typography Tokens

All typography must use tokens.

Typography should scale responsively using clamp().

Example:

--text-xs
--text-s
--text-m
--text-l
--text-xl
--text-2xl
--text-3xl

Never hardcode typography inside components.

Avoid:

font-size: 31px;

Prefer:

font-size: var(--text-l);

⸻

Heading Hierarchy

Headings should follow clear semantic structure.

Define:

--h1
--h2
--h3
--h4
--h5
--h6

Suggested usage:

h1

Page title only.

h2

Major section title.

h3

Card or grouped content title.

h4–h6

Only when necessary.

Avoid multiple competing h1s.

Maintain strong hierarchy.

⸻

Page Width

Use page width tokens.

Page width defines maximum content width.

Example:

:root {
  --page-width-s: 480px;
  --page-width-m: 720px;
  --page-width-l: 960px;
  --page-width-xl: 1200px;
  --page-width: var(--page-width-l);
}

Use:

.screen {
  width: 100%;
  max-width: var(--page-width);
  margin-inline: auto;
}

Never hardcode random widths.

⸻

Gutters

Use consistent gutters.

Example:

:root {
  --gutter-mobile: var(--space-m);
  --gutter-tablet: var(--space-l);
  --gutter-desktop: var(--space-xl);
}

Use:

padding-inline: var(--gutter-mobile);

⸻

Content Gap

Content gap = spacing between closely related elements.

Use for:

* Card content
* Stacked text
* Forms
* Lists
* Small groups

Example:

:root {
  --content-gap-s: var(--space-xs);
  --content-gap-m: var(--space-s);
  --content-gap-l: var(--space-m);
}

Example usage:

.dashboard-card {
  display: flex;
  flex-direction: column;
  gap: var(--content-gap-m);
}

⸻

Section Gap

Section gap = spacing between larger layout sections.

Use for:

* Dashboard sections
* Major blocks
* Screen sections

Example:

:root {
  --section-gap-s: var(--space-m);
  --section-gap-m: var(--space-l);
  --section-gap-l: var(--space-xl);
}

Example usage:

.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap-m);
}

Do not mix content gap and section gap.

⸻

Border Radius

Use radius tokens.

Example:

--radius-s
--radius-m
--radius-l
--radius-xl

Avoid:

border-radius: 13px;

Prefer:

border-radius: var(--radius-l);

⸻

Colors

Use semantic color tokens.

Never hardcode colors inside components.

Prefer:

--color-background
--color-surface
--color-card
--color-primary
--color-text
--color-text-muted
--color-border

Avoid:

background: #f4f5f7;
color: #4d4d4d;

inside components.

⸻

11. CSS Standards

Use BEM naming.

Example:

.dashboard-card {}
.dashboard-card__title {}
.dashboard-card__content {}
.dashboard-card--highlighted {}

Avoid generic class names:

.box
.wrapper
.item
.left
.right

Prefer explicit names.

Avoid deep nesting.

Keep CSS predictable.

⸻

12. Component Rules

Components should be:

* Reusable
* Small
* Predictable
* Token-based
* Mobile-friendly

Components must:

* Use tokens
* Be responsive
* Avoid magic numbers

Good:

padding: var(--space-m);
font-size: var(--text-m);
gap: var(--content-gap-s);

Avoid:

padding: 19px;
font-size: 18px;
gap: 11px;

Only extract reusable components when repetition appears.

Do not prematurely abstract.

⸻

13. Asset Work Orders

When implementation depends on assets that do not yet exist, create a clear work order at the end of the response.

Never silently assume assets exist.

Never invent production assets without approval.

⸻

Logo Example

If logo is needed:

WORK ORDER
Please upload production logo:
Path:
assets/logo/
Filename:
logo.svg

⸻

Typography Example

If custom fonts are needed:

WORK ORDER
Please upload production font files:
Path:
assets/fonts/
Example:
brand-regular.woff2
brand-medium.woff2
brand-semibold.woff2

⸻

Icon Example

If icon assets are required:

WORK ORDER
Please upload icon assets:
Path:
assets/icons/
Example:
calendar.svg
shopping.svg
tasks.svg
wishlist.svg

⸻

Asset Rules

* Use SVG whenever possible
* Prefer vector assets
* Optimize for mobile performance
* Never invent missing brand assets
* Always specify exact path and filename
* Use work orders instead of assumptions

  14. API Rules

The backend API is the source of truth.

Never trust frontend state.

Never trust frontend permissions.

Business logic belongs in the backend.

The frontend should remain thin.

⸻

API Design Principles

API endpoints should be:

* Predictable
* Explicit
* Secure
* Versionable
* Easy to understand

Prefer:

POST /auth/login
POST /families
GET /families/:id
POST /shopping-lists/:id/items

Avoid unclear endpoints:

POST /doStuff
POST /data
GET /misc

Naming should be obvious.

⸻

API Structure

Feature areas should own their API logic.

Example:

auth/
families/
calendar/
shopping/
tasks/
meals/
wishlists/
sharing/

Each module should own:

* controller
* service
* validation
* database access

Avoid giant shared service files.

Avoid “utils everywhere”.

⸻

Validation Rules

Validate everything.

Never trust client input.

Always validate:

* request body
* params
* query
* ids

Preferred approach:

Shared schema validation.

Examples:

* Zod
* class-validator
* DTO validation

Invalid requests should fail safely.

⸻

Error Handling

Errors should be:

* Consistent
* Predictable
* Helpful
* Non-sensitive

Good:

{
  "status": "error",
  "message": "Unauthorized"
}

Avoid leaking:

* stack traces
* database internals
* secret information

Never expose sensitive backend implementation details.

⸻

API Responses

Keep responses clean.

Return only required data.

Avoid overfetching.

Bad:

{
  "user": {
    "passwordHash": "...",
    "secretField": "...",
    "internalFlags": []
  }
}

Good:

{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "Kyrre"
  }
}

⸻

15. Database Rules

Database quality matters.

Poor schema decisions become expensive later.

Prefer clarity over premature optimization.

⸻

Prisma Rules

Use Prisma as ORM.

Requirements:

* Explicit schema
* Clear naming
* Migrations committed
* No hidden magic

Always create migrations.

Avoid manual production schema drift.

⸻

Naming Conventions

Prefer clear naming.

Good:

family_member
wishlist_item
calendar_event
meal_plan_day

Avoid vague naming:

data
entry
helper
mapping2

Database names should explain themselves.

⸻

Relationships

Prefer explicit relationships.

Avoid unclear indirect linking.

Example:

User
→ FamilyMember
→ Family

instead of hidden magic ownership.

⸻

Family-first Data Model

Authorization should be family-based.

Most resources should belong to:

family_id

Every request should verify:

user
→ membership
→ permission
→ family resource

Never assume access.

Always verify.

⸻

Soft Delete vs Hard Delete

Prefer soft delete only when needed.

Default:

hard delete.

Use soft delete for:

* important user content
* recoverable history

Avoid unnecessary complexity.

⸻

Auditing

Only add auditing where valuable.

Good candidates:

* invitations
* sharing changes
* wishlist reservations

Avoid full enterprise audit systems.

⸻

16. Security Standards

FamilieAppen stores sensitive family information.

Examples:

* Children’s schedules
* Shared family plans
* Wishlists
* Family relationships
* Shared logistics

Security must be practical and strong.

Use recognized standards as guidance.

Not certification.

⸻

OWASP Guidance

Follow practical parts of:

* OWASP ASVS
* OWASP API Security Top 10
* OWASP MASVS (mobile)

Minimum expectations:

* Validate all input
* Secure authentication
* Backend authorization
* Prevent object-level authorization bugs
* Protect sensitive data
* Avoid insecure defaults

⸻

Authentication Rules

Version 1 authentication:

* Email + password
* Secure password hashing
* Refresh tokens
* Logout support
* Session expiration

Preferred hashing:

bcrypt
or
argon2

Never store plain passwords.

Never expose auth internals.

⸻

Authorization Rules

Never trust frontend permissions.

All authorization must happen in backend.

Every request should validate:

user
→ family membership
→ permission
→ resource ownership

A user should never access:

* another family’s calendar
* another family’s shopping list
* another family’s reminders
* another family’s wishlists

Authorization bugs are critical severity.

⸻

Principle of Least Access

Default to minimal access.

Follow only:

1. Private
2. Family
3. Selected People

Never broaden access silently.

Sharing must always be intentional.

⸻

Sensitive Data Rules

Never expose:

* password hashes
* tokens
* internal secrets
* hidden wishlist buyer identity
* private family data

Return only necessary fields.

⸻

Input Validation

Validate all incoming input.

Never trust client data.

Validate:

* body
* params
* query
* ids
* ownership

Fail safely.

⸻

Secrets Management

Never commit secrets.

Use environment variables for:

* database URL
* JWT secrets
* API credentials
* push keys
* external providers

Never hardcode secrets.

⸻

Logging Rules

Logs should help debugging.

Never log:

* passwords
* tokens
* personal family information
* sensitive child data

Avoid sensitive production logs.

⸻

Infrastructure Security

Use CIS Controls principles for self-hosted infrastructure.

Minimum expectations:

* Keep systems updated
* Secure SSH
* Use firewall rules
* Protect database access
* Backup database
* Test restores
* Store secrets outside git

Security should remain practical.

Avoid enterprise overengineering.

⸻

17. Coding Standards

Prefer readable code.

Avoid clever code.

Readable beats smart.

⸻

TypeScript Rules

Use strict TypeScript.

Avoid:

any

Prefer:

* explicit typing
* shared contracts
* predictable interfaces

⸻

Function Rules

Prefer small functions.

Good:

createFamily()
getFamilyMembers()
reserveWishlistItem()

Avoid:

handleEverything()
manageData()
doStuff()

Functions should have clear responsibility.

⸻

Abstraction Rules

Avoid premature abstraction.

Only abstract when repetition exists.

Bad:

genericAbstractFeatureManager.ts

Good:

clear feature-specific implementation.

⸻

Dependency Rules

Keep dependencies minimal.

Before adding a dependency ask:

* Is it maintained?
* Does it solve meaningful work?
* Is it worth long-term cost?
* Can we reasonably build this ourselves?

Avoid dependency bloat.

⸻

18. Git & PR Rules

Keep pull requests small.

One feature area per PR.

Good:

Run 8
→ Shopping list only

Avoid:

shopping
tasks
calendar
notifications
auth changes

PRs should be easy to review.

Avoid giant refactors.

⸻

Workflow Rules

Do not add GitHub workflows unless explicitly requested.

Avoid automation bloat.

Prefer manual workflows initially.

⸻

Commit Rules

Commits should be clear.

Good:

feat(auth): add register endpoint
fix(tasks): complete task state
refactor(calendar): simplify event mapping

Avoid:

stuff
fixes
changes
misc

⸻

19. Documentation Rules

Documentation matters.

Update docs when architecture changes.

Important updates should update:

* README.md
* DEVELOPMENT_PLAN.md
* AI_GUIDE.md

Docs are source of truth.

Do not allow docs to drift from implementation.

⸻

20. Anti-patterns

Avoid these:

* Overengineering
* Enterprise architecture too early
* Premature abstraction
* Giant PRs
* Random dependencies
* Hardcoded spacing
* Hardcoded colors
* Magic numbers
* Inconsistent tokens
* Desktop-first layouts
* Deep navigation
* Complicated sharing systems
* Feature bloat
* Heavy automation too early

Prefer:

* Small improvements
* Simplicity
* Consistency
* Practical usefulness

⸻

21. Definition of Good Output

Good output should be:

* Small in scope
* Easy to review
* Well structured
* Mobile-first
* Secure
* Readable
* Maintainable
* Token-based
* Consistent with existing architecture

Before finishing work, ask:

* Is this simple?
* Is this useful?
* Is this mobile-first?
* Does this follow the development plan?
* Does this introduce unnecessary complexity?

If yes:

simplify before shipping.
