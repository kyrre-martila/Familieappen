# FamilieAppen Development Plan

FamilieAppen is a practical productivity app for modern family logistics.

The goal is to help families save time, reduce coordination friction and keep everyday life organized in one place.

## Product direction

FamilieAppen is not a social network and not a generic productivity app. It is a family logistics tool for everyday questions:

- What is happening today?
- Who is doing what?
- What is for dinner?
- What needs to be bought?
- Who is driving?
- What do the kids wish for?
- What needs to be remembered?

## MVP scope

Version 1 focuses on core family logistics only:

1. Family dashboard
2. Family calendar
3. Dinner planning
4. Shared shopping list
5. Tasks and reminders
6. Wishlists
7. Settings needed to support the above

## Current technical foundation

The repository starts as a lean fullstack monorepo:

```text
familieappen/
  apps/
    mobile/
    api/
  packages/
    shared/
    ui/
  docs/
  infra/
```

### apps/mobile

- Expo React Native
- TypeScript
- Expo Router
- Minimal app shell
- Placeholder screens only
- No backend connection yet
- No feature logic yet

### apps/api

- NestJS
- TypeScript
- `GET /health`
- No database yet
- No authentication yet
- No business modules yet

### packages/shared

Small shared TypeScript package for constants and shared types, starting with:

- Family roles
- Sharing levels

### packages/ui

Small shared UI foundation, starting with design tokens only:

- Spacing
- Text sizes
- Page width
- Gutters
- Content gap
- Section gap
- Radius
- Colors

## Explicitly out of scope for this foundation

Do not add these until the project intentionally reaches that phase:

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
- Large component library

## Build order

1. Keep the repository foundation clean and runnable.
2. Add navigation and app shell polish only when needed for product clarity.
3. Design the domain model before implementing persistent feature data.
4. Add API modules only when a feature is ready to be implemented.
5. Add database and authentication deliberately, not as part of the initial scaffold.
