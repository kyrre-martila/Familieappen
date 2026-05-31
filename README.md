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

The mobile app is not the current validation focus and remains untouched by the web shell work.

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
