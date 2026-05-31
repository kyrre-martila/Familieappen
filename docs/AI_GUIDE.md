# FamilieAppen AI Guide

This guide defines how AI assistants should contribute to FamilieAppen.

Follow this guide together with:

- `README.md`
- `docs/DEVELOPMENT_PLAN.md`
- `docs/onboarding-flow.md` for the approved pre-dashboard onboarding source of truth

Do not introduce features, architecture or complexity outside the agreed plan without explicit approval. For onboarding work, do not invent, redesign or simplify flows beyond `docs/onboarding-flow.md`.

## Product understanding

FamilieAppen is a practical productivity app for family logistics. It helps families coordinate everyday life across calendar, dinner planning, shopping lists, tasks, reminders and wishlists.

FamilieAppen is not:

- A social network
- A chat-first platform
- A generic productivity app
- A feature-heavy life-management system

## Product principles

### Useful every day

Prioritize practical features families use often. Avoid rare edge cases and feature bloat.

### Simplicity wins

Prefer sensible defaults, clear choices, minimal setup and predictable UX.

### Three sharing levels only

Keep sharing understandable and consistent:

1. Private
2. Family
3. Shared with selected people

Do not introduce advanced permission systems before the product explicitly needs them.

### Mobile-first always

FamilieAppen is being validated as a regular web application first. Keep the web app mobile-friendly with small-screen layouts, thumb-friendly navigation, fast actions, minimal taps and clear hierarchy, but do not add PWA/offline/mobile-app functionality yet.

## Architecture rules

- Use the lean pnpm workspace monorepo structure.
- Keep `apps/web` as the primary user-facing application while the web product is validated.
- Keep `apps/api` as the backend boundary for future business logic.
- Leave `apps/mobile` untouched unless mobile work is explicitly requested later.
- Keep `packages/shared` small and focused on shared constants/types.
- Keep `packages/ui` small and focused on tokens before components are necessary.

## Current constraints

Do not add these without explicit approval:

- Database implementation
- Prisma
- PostgreSQL
- Redis
- Supabase
- Authentication
- Docker
- GitHub Actions
- Generated SDKs
- Heavy security scans
- Real feature logic
- PWA setup, service workers, push notifications or offline functionality
- Expo/mobile expansion
- Large component library

## Design/token rules

- Mobile-first.
- Use tokens, not arbitrary values.
- Use BEM naming if CSS is added.
- Prefer page-width, gutter, content-gap and section-gap tokens.
- If a value needs to be between tokens, use `calc(var(--space-m) * 1.1)` rather than random pixels.
