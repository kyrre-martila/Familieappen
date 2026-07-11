# API environment configuration

The NestJS API validates its environment at startup and fails fast when required runtime settings are missing or malformed. Local development and test runs keep safe defaults so contributors can start the API without production secrets.

## Local defaults

When `NODE_ENV` is unset, the API treats the process as `development` and applies these defaults:

| Variable | Local default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | Must be an integer from `1` through `65535` when set. |
| `API_PREFIX` | `api` | Routes are served under `/api` by default. Leading and trailing slashes are trimmed. |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated bare `http`/`https` origins only. |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/familieappen?schema=public` | Required outside `development` and `test`. |
| `AUTH_JWT_SECRET` | `familieappen-development-auth-secret-change-me` | Local/test fallback only. Do not use in shared, staging, or production deployments. |
| `ADMIN_COOKIE_DOMAIN` | unset | Optional. Leave unset locally so admin auth uses a host-only localhost cookie. |

Copy `apps/api/.env.example` to `apps/api/.env` for local overrides:

```sh
cp apps/api/.env.example apps/api/.env
```

## Required deployment variables

Any environment where `NODE_ENV` is not `development` or `test` must provide:

- `DATABASE_URL`: a valid `postgresql://` or `postgres://` connection URL.
- `AUTH_JWT_SECRET`: at least 32 characters and not a documented placeholder or local default.
- `ADMIN_SESSION_SECRET`: at least 32 characters and not a documented placeholder or local default.
- `ADMIN_COOKIE_DOMAIN=.familieappen.martila.no` for the current production sibling web/API domains.

Generate a strong auth secret with a command such as:

```sh
openssl rand -base64 48
```

## CORS and API prefix rules

`API_PREFIX` is normalized before it is passed to NestJS. For example, `API_PREFIX="/v1/api/"` exposes routes under `/v1/api`.

`CORS_ORIGINS` is intentionally explicit. Use a comma-separated list of exact browser origins, for example:

```env
CORS_ORIGINS="https://app.example.com,https://admin.example.com"
```

Do not include URL paths, query strings, hashes, or trailing slashes in `CORS_ORIGINS` entries.


## Admin cookie domain

`ADMIN_COOKIE_DOMAIN` is optional. When omitted, the API emits the admin session cookie without a `Domain` attribute, which preserves host-only behavior for localhost development. In production, set `ADMIN_COOKIE_DOMAIN=.familieappen.martila.no` so the HttpOnly `familieappen_admin_session` cookie set by `api-familieappen.martila.no` is also sent to `familieappen.martila.no`, allowing the protected Next.js admin layout to forward it to `/api/admin/auth/me`. Values must be bare domains only: no protocol, port, path, query, fragment, whitespace, or cookie separators.
