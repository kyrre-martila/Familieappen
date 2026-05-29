FamilieAppen

The operating system for modern family logistics.

FamilieAppen helps families coordinate everyday life in one place — saving time, reducing friction and making family planning easier.

Built for real families with real logistics.

No complicated setup.
No unnecessary complexity.
Just tools that help everyday life work better.

⸻

Why FamilieAppen?

Modern family life is logistics.

Who is driving to football practice?
What is for dinner?
Did someone buy milk?
Who is picking up the kids?
What happens next week?

Most families coordinate everyday life across too many places:

* Calendar in one app
* Spond in another
* Shopping lists somewhere else
* Messages everywhere
* Dinner planning on paper
* Wishlists in separate services

For many families, even creating and sharing a family calendar feels unnecessarily complicated.

FamilieAppen brings family coordination together in one place.

The goal is simple:

Save time. Create overview. Make family logistics easier.

Not another social platform.

Not unnecessary complexity.

Just practical tools families actually use.

⸻

Core Philosophy

FamilieAppen is built around three ideas:

1. Overview

Know what matters today.

* Who is doing what
* Where children need to be
* What is for dinner
* What needs to be bought
* What happens next

2. Coordination

Family logistics should feel easier.

* Shared planning
* Shared responsibility
* Better communication
* Fewer misunderstandings
* Less “who is driving?” chaos

3. Simplicity

Complicated things should feel simple.

Families should not need technical knowledge to coordinate everyday life.

Example:

Instead of manually creating and sharing calendars between family members, FamilieAppen helps set things up automatically.

⸻

Product Principles

Simple by Default

FamilieAppen is designed for normal families — not power users.

The app should work out of the box.

* Minimal setup
* Sensible defaults
* Clear choices
* No technical configuration

We prioritize usability over flexibility.

⸻

Three Sharing Levels

Sharing should be powerful — but never confusing.

Everything in FamilieAppen follows the same sharing model.

1. Private

Visible only to you.

Examples:

* Personal reminders
* Private tasks
* Personal notes

2. Family

Shared with your household.

Examples:

* Family calendar
* Shopping list
* Dinner planning
* Shared reminders

3. Shared with Selected People

Shared with specific people outside the household.

Examples:

* Grandparents
* Co-parents
* Aunts and uncles
* Babysitters

Example use cases:

* Share a wishlist with grandparents
* Share football schedules with a co-parent
* Share plans with a babysitter
* Share practical information with extended family

No complicated permission systems.

Just three consistent sharing levels across the entire app.

⸻

MVP Scope (v1)

Version 1 focuses only on the things families use every day.

1. Family Dashboard

A practical home screen for daily overview.

Features:

* Today’s events
* Upcoming activities
* Dinner today
* Shopping status
* Tasks & reminders
* Family overview

⸻

2. Family Calendar

A shared family calendar that just works.

Features:

* Day / week / month view
* Color per family member
* Repeating events
* Shared events
* All-day events
* Family overview

Future:

* Spond calendar sync (via device calendar)
* Apple Calendar
* Google Calendar

⸻

3. Dinner Planning

Simple monthly meal planning.

Features:

* Plan meals
* Save favorites
* Repeat previous weeks
* Quick editing

Future:

* Recipes
* Ingredient automation
* Smart suggestions

⸻

4. Shared Shopping List

One shopping list for the whole family.

Features:

* Live syncing
* Shared edits
* Check off items
* Quick add
* Offline support

Future:

* Auto-generated from dinner planning
* Smart categories

⸻

5. Tasks & Reminders

Simple family coordination.

Features:

* Shared reminders
* Household todos
* Assign tasks
* Daily overview

⸻

6. Wishlists 🎁

Private and shared family wishlists.

Features:

* Product links
* Gift reservation
* Mark as purchased
* Hidden buyers
* Sharing outside the app

Wishlists are also part of the app’s organic growth model:

People invited to see a wishlist can easily create their own family.

⸻

Planned Features

Phase 2 — Family Coordination

* Multi-family support
* Shared custody planning
* Pickup & driving coordination
* Smart reminders
* Sharing with grandparents / co-parents

⸻

Phase 3 — Family Value

* Memory bank / family scrapbook (optional premium storage)
* Yearbook export
* Chores & allowance
* Family polls

⸻

Phase 4 — Utility & Trust

* Password vault
* Budget & savings

⸻

Phase 5 — Bonus Utility

* Lending registry

Example:

“Who borrowed the tent?”

⸻

Monetization Philosophy

FamilieAppen should remain genuinely useful for free.

Core family logistics should never be locked behind a subscription.

Free Includes

* Family calendar
* Dinner planning
* Shopping lists
* Tasks & reminders
* Wishlists
* Family coordination

Premium Should Feel Fair

Paid features should mainly cover real infrastructure costs or premium utility.

Examples:

* Extra storage for family memories
* Advanced exports (yearbooks, PDFs)
* Ad-free experience
* Premium memory features

Advertising Principles

Advertising, if used, should be:

* Non-intrusive
* Contextual
* Useful
* Never disruptive to core flows

Examples:

* Relevant offers connected to shopping lists
* Useful recommendations around wishlists
* Context-aware placements instead of intrusive banners

The experience should always prioritize usefulness over advertising.

⸻

Design Principles

FamilieAppen should feel:

* Modern
* Scandinavian
* Practical
* Warm
* Trustworthy

We avoid:

* Unnecessary complexity
* Feature bloat
* Complicated setup
* Intrusive advertising
* Wasted time

The app should help families save time — not waste it.

⸻

Technology

Mobile & Frontend

* React Native with Expo
* TypeScript
* Expo Router (file-based navigation)

Backend

* Supabase
* PostgreSQL with Row Level Security
* Supabase Realtime for live sync

Authentication

* Magic Link
* Sign in with Apple
* SMS login (later)

Distribution

* iOS (App Store)
* Android (Google Play)
* Web (optional)

Infrastructure

* Expo EAS Build & Submit
* OTA updates via Expo

⸻

Architecture Notes

Data Model Priorities

These must be designed carefully before implementation:

* Family membership and roles
* Cross-family sharing
* Sharing permissions
* RLS policies (avoid data leaks between families)
* Push notification triggers

⸻

Offline-first

Shopping lists and tasks should work without network.

Use optimistic UI + sync on reconnect.

⸻

Development Philosophy

Build small.

Ship useful features early.

Avoid complexity until needed.

A feature should solve a real family problem before it gets built.

Daily usefulness beats feature quantity.

⸻

Status

Currently in early development.

The first focus is establishing:

* Product direction
* Data model
* Family sharing architecture
* Design system
* Core user flows

before implementation begins.
