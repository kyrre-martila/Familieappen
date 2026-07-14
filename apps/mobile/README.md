# FamilieAppen mobile

Expo SDK 54 client using Expo Router, React Native 0.81 and React 19.1.

## Run from monorepo root

```bash
pnpm install
pnpm --filter @familieappen/mobile start
pnpm --filter @familieappen/mobile ios
pnpm --filter @familieappen/mobile android
pnpm --filter @familieappen/mobile web
```

The default API base is `https://api-familieappen.martila.no/api`. `EXPO_PUBLIC_API_URL` is the full API base and must include the backend API prefix (`/api` in the default backend configuration). Override it in `apps/mobile/.env`. Endpoint paths such as `/auth/login`, `/auth/logout`, and `/me` are joined with this central base; do not add `/api` to each endpoint.

For a physical iPhone against a local API, do not use `localhost`; use your computer's LAN IP, for example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000/api pnpm --filter @familieappen/mobile start
```

## Expo Go and development builds

The current dependencies are Expo SDK-compatible and should run in Expo Go for Run 1A. A development build becomes necessary when adding custom native modules, native configuration not supported by Expo Go, or push notification behavior that must be tested end-to-end on-device.

## Run 1A auth/session boundaries

The mobile Run 1A auth model intentionally separates session state from operation state:

- `status` is only `unknown`, `authenticated`, or `unauthenticated`; `unknown` is used before the first SecureStore restore attempt finishes.
- `isRestoring`, `isLoggingIn`, and `isLoggingOut` track in-flight operations and must not be treated as proof of authentication.
- Route guards wait only for `isRestoring`. A user-initiated login request keeps the login screen mounted so backend errors can be shown and fields can be re-enabled.

Run 1A stores only the bearer access token and metadata (`expiresAt`, `storedAt`, token type) in SecureStore. During restore, an obviously expired token is cleared without calling `/me`; otherwise `/me` validates the token before app content is shown. A `401` from `/me` clears the local session. If restore cannot reach the network, Run 1A does not enter an offline authenticated mode: the access token remains in SecureStore for a later launch retry, but the current app session stays unauthenticated until `/me` can validate it.

The backend may set a refresh token as an HttpOnly cookie, but automatic refresh is not implemented in Run 1A and the mobile client does not persist or use refresh tokens directly. Cookie behavior for the later refresh design must be verified in a development build on physical iOS and Android devices; Expo Go alone must not be treated as proof of full cookie/refresh support.

## Run 1A limitations

No onboarding, push-token registration, offline queue, persisted query cache, automatic token refresh, calendar, tasks, shopping, meals or wishlist domain logic is implemented yet.
