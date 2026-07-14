# FamilieAppen

FamilieAppen is a practical productivity app for modern family logistics. It helps families coordinate everyday life in one place: calendar, dinner planning, shopping lists, tasks, reminders and wishlists.

The product goal is simple: save time, create overview and make family logistics easier without unnecessary complexity.

## Monorepo structure

```text
familieappen/
  apps/
    web/         Next.js web app with App Router
    mobile/      Expo React Native app with Expo Router
    api/         NestJS API app
  packages/
    shared/      Shared TypeScript constants and types
    ui/          Shared design tokens
  docs/          Product and development documentation
  infra/         Reserved for future infrastructure notes/configuration
```

## Current foundation

This repository is intentionally minimal. It includes:

- A pnpm workspace monorepo.
- A Next.js web shell with placeholder routes for Home, Calendar, Meals, Shopping, Tasks, Wishlists and Settings.
- An Expo React Native mobile shell from the initial foundation, left untouched while the web product is validated.
- A NestJS API foundation with config, CORS, safe error responses and `GET /api/health`.
- A small shared TypeScript package for family roles and sharing levels.
- A small UI package containing design tokens.

It does not include database implementation, authentication, Docker, GitHub Actions, Prisma, Redis, Supabase, generated SDKs or real feature logic yet.

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer

## Install

```bash
pnpm install
```

## Run the web app

```bash
pnpm dev:web
```

Equivalent package-level command:

```bash
pnpm --filter @familieappen/web dev
```

Next.js starts the responsive web shell locally.

## Run the mobile app

```bash
pnpm dev:mobile
```

Equivalent package-level command:

```bash
pnpm --filter @familieappen/mobile start
```

The mobile app currently contains the Expo Run 0 shell. It can be attempted in Expo Go for basic route and placeholder validation, but native configuration and full notification/push behavior must be tested later with a development build. `expo-notifications` is installed as foundation only; push-token registration and end-to-end push delivery are not implemented or verified. No physical-device validation is claimed unless it is explicitly documented in a later run.

## Run the API

The API defaults to `PORT=4000` and `API_PREFIX=api`, so local routes are served under `/api`.

```bash
pnpm dev:api
```

Equivalent package-level command:

```bash
pnpm --filter @familieappen/api start:dev
```

Health check:

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{"status":"ok","service":"familieappen-api"}
```

## Shared packages

- `@familieappen/shared` exports family role constants, sharing level constants and small shared types.
- `@familieappen/ui` exports initial design tokens and `tokens.css` for future web/native alignment.

## Documentation

- [Development Plan](docs/DEVELOPMENT_PLAN.md)
- [Onboarding Flow](docs/onboarding-flow.md) — source of truth for approved pre-dashboard onboarding UX and states.
- [AI Guide](docs/AI_GUIDE.md)

## Admin area

FamilieAppen includes a separate cookie-based admin area under `/admin`. Admin sessions use the backend admin authentication endpoints and HttpOnly cookies; normal user sessions do not grant admin access. The current routes are `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/statistics`, `/admin/advertisements`, `/admin/advertisements/new`, `/admin/advertisements/[id]`, `/admin/admin-users`, and `/admin/audit-log`.

### Roles and permissions

- `SUPER_ADMIN`: dashboard, support user pages, statistics, advertisement management, administrator management, and full audit log.
- `AD_MANAGER`: dashboard and advertisement management only.
- `SUPPORT`: dashboard and support user pages only; no private family-content access, advertisement management, administrator management, or full audit log.
- `ANALYST`: dashboard and statistics only; no private family-content access, advertisement management, administrator management, or full audit log.

The API role guards remain the source of truth; hidden navigation is not authorization.

### First SUPER_ADMIN

Create the first administrator with the repository script, without committing real credentials:

```bash
pnpm admin:create -- --email admin@example.com --name "Admin Name" --password "replace-with-strong-password" --role SUPER_ADMIN
```

Admin passwords are never stored in the frontend. Admin password reset and MFA are not implemented yet; MFA is recommended future work.

### Advertisements

Advertisement management uses `/api/admin/advertisements` and supports `DRAFT`, `SCHEDULED`, `ACTIVE`, `PAUSED`, and `ENDED` statuses with `HOME`, `CALENDAR`, `MENU`, `WISHLIST`, and `SHOPPING` placements. Advertisements can be assigned to several placements at the same time through a normalized join table. The admin UI supports title, target URL, multiple placements, status, optional start/end dates, and uploaded creatives. Image upload, billing, purchasing, advanced targeting, behavioral profiling, rich text, and impression/click tracking from admin previews are intentionally out of scope.

### Audit log

`SUPER_ADMIN` can view `/admin/audit-log`, backed by `/api/admin/audit-log`. The page supports administrator, action, date range, and page filters where supported by the API. The frontend summarizes metadata and redacts secret-like keys such as passwords, tokens, sessions, secrets, private URLs, and invitation tokens instead of dumping raw JSON.

### Environment and migrations

See `apps/api/.env.example`, `apps/web/.env.example`, and the root `.env.example` for local and production variables. Run local Prisma checks and migrations from the monorepo root with the actual package scripts:

```bash
pnpm --filter @familieappen/api prisma:generate
pnpm --filter @familieappen/api exec prisma validate
pnpm --filter @familieappen/api prisma:migrate:dev
```

Before production migrations, take a database backup and follow the production runbook in `docs/production-deployment.md`. Rollback is not automatic; restoring application images does not automatically roll back database migrations.

Future deployment work may move admin traffic to `admin.familieappen.martila.no`, but the current implementation remains within the existing web application and protected by backend admin guards.

## Production deployment

Use the checked-in production Compose file and the runbook in [docs/production-deployment.md](docs/production-deployment.md) before deploying admin migrations. The production API service requires `POSTGRES_PASSWORD`, `AUTH_JWT_SECRET`, `ADMIN_SESSION_SECRET`, and optionally `ADMIN_SESSION_TTL` (defaults to `604800` seconds in Compose). Do not commit generated secrets.

The first production administrator is created inside the running API container with the actual package script:

```bash
docker compose -f docker-compose.prod.yml exec api \
  pnpm --filter @familieappen/api admin:create -- \
  --email admin@example.com \
  --name "Admin Name" \
  --password "replace-with-strong-password" \
  --role SUPER_ADMIN
```
