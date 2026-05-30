# Local database and Prisma bootstrap

FamilieAppen uses PostgreSQL through Prisma. The committed migration history is the source of truth for creating a reproducible local database.

## Environment variable

The API and Prisma CLI read `DATABASE_URL` from the environment. For local development, copy the example file and adjust credentials if your PostgreSQL user, password, host, port, or database name differs:

```sh
cp apps/api/.env.example apps/api/.env
```

Default local value:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/familieappen?schema=public"
```

`apps/api/prisma.config.ts` also contains this same local-only fallback so `prisma generate` can run without production secrets. Real deployed environments must still provide their own `DATABASE_URL`.

## Start or connect to PostgreSQL

Use any local PostgreSQL 16+ installation. Two common options are below.

### Docker

If Docker is available, start a disposable development database:

```sh
docker run --name familieappen-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=familieappen \
  -p 5432:5432 \
  -d postgres:16
```

Stop and remove it when you no longer need the data:

```sh
docker rm -f familieappen-postgres
```

### Existing PostgreSQL server

If PostgreSQL is already running locally, create the development database if it does not exist:

```sh
createdb familieappen
```

Then set `DATABASE_URL` in `apps/api/.env` to match your local server.

## Generate Prisma Client

From the repository root:

```sh
pnpm prisma:generate
```

Equivalent API-workspace command:

```sh
pnpm --filter @familieappen/api prisma:generate
```

Generation should not need a live database connection, but the Prisma CLI may need access to its downloaded engines or cached engine binaries.

## Apply migrations

For local development, apply the committed migrations and create a new migration when the schema changes:

```sh
pnpm prisma:migrate:dev
```

For CI or deployed databases, apply committed migrations only:

```sh
pnpm prisma:migrate:deploy
```

The first committed migration, `20260530000000_run1_baseline`, represents the Run 1 schema baseline.

## Open Prisma Studio

```sh
pnpm prisma:studio
```

## Safely reset a local development database

Only run this against a disposable local database. It drops local data, reapplies migrations, and regenerates Prisma Client:

```sh
pnpm --filter @familieappen/api exec prisma migrate reset
```

If you use Docker and want a fully fresh database instead, remove and recreate the container, then run `pnpm prisma:migrate:dev`.

## Prisma engine download/cache notes

Prisma CLI commands use platform-specific engine binaries. In restricted or offline environments, commands such as `prisma migrate diff`, `prisma migrate dev`, or `prisma generate` can fail while downloading from `https://binaries.prisma.sh` or while fetching checksum files.

Known mitigations:

- Run `pnpm install` in an environment with access to Prisma's binary host before running Prisma commands offline.
- Cache pnpm and Prisma engine downloads in CI.
- If only the checksum request is blocked but the engine binary is already trusted and available, Prisma documents `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` as an escape hatch. Do not use it to hide missing engine binaries.
- Keep `DATABASE_URL` pointed at a local or test database for migration checks; never run `migrate reset` against shared or production data.
