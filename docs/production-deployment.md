# Production deployment runbook

This runbook is for the current Docker Compose production setup. It does not deploy automatically and does not edit real server secrets.

## Required production environment

Create or update the uncommitted `.env` file next to `docker-compose.prod.yml` with these required values:

```dotenv
POSTGRES_PASSWORD=
AUTH_JWT_SECRET=
ADMIN_SESSION_SECRET=
ADMIN_SESSION_TTL=604800
ADMIN_COOKIE_DOMAIN=.familieappen.martila.no
```

`ADMIN_SESSION_SECRET` must be a long random value, must not be committed, and changing it invalidates existing admin sessions. `ADMIN_SESSION_TTL` is measured in seconds. `ADMIN_COOKIE_DOMAIN=.familieappen.martila.no` is required for production because the web app (`familieappen.martila.no`) and API (`api-familieappen.martila.no`) are sibling subdomains; it is passed only to the API container so the HttpOnly admin session cookie is scoped to the shared parent domain while remaining unavailable to the web JavaScript bundle.

## Backup before admin migrations

The Compose database container is `familieappen-db`, database user is `familieappen`, and database name is `familieappen`.

```bash
docker exec familieappen-db pg_dump \
  -U familieappen \
  -d familieappen \
  -Fc \
  -f /tmp/familieappen-before-admin.dump
docker cp \
  familieappen-db:/tmp/familieappen-before-admin.dump \
  ./familieappen-before-admin-$(date +%Y%m%d-%H%M).dump
ls -lh ./familieappen-before-admin-*.dump
```

The dump contains sensitive production data and must be stored securely. Restoring application containers alone does not undo database migrations; rollback may require restoring this database backup.

## Verified package commands

From the repository root:

```bash
pnpm --filter @familieappen/api prisma:generate
pnpm --filter @familieappen/api exec prisma validate
pnpm --filter @familieappen/api exec prisma migrate status
pnpm --filter @familieappen/api prisma:migrate:deploy
```

Inside the production API container, use the same pnpm filter commands because the API image includes the workspace manifests, required TypeScript configs, Prisma schema, migrations, Prisma CLI, and API package.

## Deployment sequence

1. Pull latest code:
   ```bash
   git pull
   ```
2. Inspect or set required environment variables in the server `.env` file; do not print secret values. Confirm `ADMIN_COOKIE_DOMAIN=.familieappen.martila.no` is present before updating the API container.
3. Validate Compose configuration:
   ```bash
   docker compose -f docker-compose.prod.yml config
   ```
4. Take and verify a PostgreSQL backup using the commands above.
5. Build new images:
   ```bash
   docker compose -f docker-compose.prod.yml build
   ```
6. Generate Prisma client if required:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @familieappen/api prisma:generate
   ```
7. Validate Prisma schema:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @familieappen/api exec prisma validate
   ```
8. Inspect migration status:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @familieappen/api exec prisma migrate status
   ```
9. Deploy migrations:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @familieappen/api prisma:migrate:deploy
   ```
10. Inspect migration status again:
    ```bash
    docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @familieappen/api exec prisma migrate status
    ```
11. Start or update services:
    ```bash
    docker compose -f docker-compose.prod.yml up -d
    ```
12. Inspect container status:
    ```bash
    docker compose -f docker-compose.prod.yml ps
    ```
13. Inspect API logs:
    ```bash
    docker compose -f docker-compose.prod.yml logs --tail=100 api
    ```
14. Check API health:
    ```bash
    curl -f http://localhost:4000/api/health
    curl -f https://api-familieappen.martila.no/api/health
    ```
15. Check web health:
    ```bash
    curl -f http://localhost:3000
    curl -f https://familieappen.martila.no
    ```
16. Create the first `SUPER_ADMIN` inside the production API container:
    ```bash
    docker compose -f docker-compose.prod.yml exec api \
      pnpm --filter @familieappen/api admin:create -- \
      --email admin@example.com \
      --name "Admin Name" \
      --password "replace-with-strong-password" \
      --role SUPER_ADMIN
    ```
    Safer option: avoid shell history by passing `ADMIN_PASSWORD` from a protected shell mechanism and omit `--password`; the CLI prompts only when stdin is interactive.
17. Verify admin login manually and confirm the API login response sets `familieappen_admin_session` with `Domain=.familieappen.martila.no`, `Path=/`, `HttpOnly`, `SameSite=Lax`, and `Secure`:
    ```bash
    curl -I https://familieappen.martila.no/admin/login
    ```
18. Verify normal user login manually.
19. Verify user deactivation/reactivation with a test account.
20. Verify advertisement draft creation.
21. Verify audit-log entries.

## Health-check commands

```bash
curl -f http://localhost:4000/api/health
curl -f http://localhost:3000
curl -f https://api-familieappen.martila.no/api/health
curl -f https://familieappen.martila.no
curl -I https://familieappen.martila.no/admin/login
```
