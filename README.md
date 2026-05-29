# FamilieAppen

FamilieAppen is a practical productivity app for modern family logistics. It helps families coordinate everyday life in one place: calendar, dinner planning, shopping lists, tasks, reminders and wishlists.

The product goal is simple: save time, create overview and make family logistics easier without unnecessary complexity.

## Monorepo structure

```text
familieappen/
  apps/
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
- An Expo React Native mobile shell with placeholder tabs for Home, Calendar, Meals, Shopping, Tasks, Wishlists and Settings.
- A NestJS API with `GET /health`.
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

## Run the mobile app

```bash
pnpm dev:mobile
```

Equivalent package-level command:

```bash
pnpm --filter @familieappen/mobile start
```

Expo will show options for opening the app in Expo Go, an emulator/simulator or a web preview where supported.

## Run the API

```bash
pnpm dev:api
```

Equivalent package-level command:

```bash
pnpm --filter @familieappen/api start:dev
```

Health check:

```bash
curl http://localhost:3000/health
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
- [AI Guide](docs/AI_GUIDE.md)
