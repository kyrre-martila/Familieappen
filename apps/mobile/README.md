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

The default production API base is `https://api-familieappen.martila.no/api`. `EXPO_PUBLIC_API_URL` is the full API base and must include the backend API prefix (`/api` in the default backend configuration). Endpoint paths such as `/auth/login`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/me`, and `/families` are joined with this central base; do not add `/api` to each endpoint.

For physical iPhone testing with Expo Go and a local API, do not use `localhost`; use a LAN IP or a tunnel:

```bash
EXPO_PUBLIC_API_URL=https://<your-ngrok-host>/api pnpm --filter @familieappen/mobile start -- --tunnel
```

ngrok and Expo tunnel startup can fail temporarily. Retry the tunnel command and verify that the final API URL still includes `/api` before testing.

## Auth routing and onboarding gate

Run 1B validates a session by loading `/me` and then `/families`. The central routing function maps these backend-backed states:

- unauthenticated: `/(auth)/login`
- authenticated + no families from `GET /families`: `/(onboarding)/family-start`
- authenticated + family membership status `pending` or `rejected` and no approved family: `/(onboarding)/pending-approval`
- authenticated + at least one approved family membership: `/(app)/(tabs)`
- blocked/unsupported authenticated state: `/(onboarding)/blocked`

The temporary onboarding routes are placeholders only:

- `/(onboarding)/family-start`
- `/(onboarding)/pending-approval`
- `/(onboarding)/blocked`

They explain the backend status, include logout, and do not create families, join by code, collect personal information, or simulate onboarding locally. Run 2 should replace these placeholders with real onboarding screens.

## Forgot password and reset password

`/(auth)/forgot-password` calls `POST /auth/forgot-password` with the e-mail address. The UI always shows a generic success message so it does not reveal whether the e-mail exists.

The backend sends reset e-mail links to the web base URL today (`/reset-password?token=...`). Mobile implements `reset-password/[token]` against the existing `POST /auth/reset-password` API so a native deep link can complete a reset if a future e-mail link is built as, for example, `familieappen://reset-password/<token>`. Run 1B does not change backend e-mail generation and does not claim Universal Links/App Links are production verified.

Reset tokens are never stored in SecureStore. Password reset uses the backend's current password rule: 8 to 1024 characters.

## Session and logout boundaries

Only the bearer access token and metadata (`expiresAt`, `storedAt`, token type) are stored in SecureStore. During restore, an obviously expired token is cleared before `/me`; otherwise `/me` validates the token and `/families` selects the same post-auth destination as a fresh login. A `401` clears local session state. Network restore errors keep the stored token for a later launch retry but do not enter authenticated UI.

Automatic refresh-token use is still out of scope. The backend may set a refresh token as an HttpOnly cookie, but Run 1B does not persist or use refresh tokens directly. Cookie/refresh behavior must be verified later in a development build on physical iOS and Android; Expo Go is not enough proof.

Logout is available from app menu and all onboarding placeholders. It attempts server logout, always clears SecureStore and React Query cache locally, and replaces navigation with login.

## Deactivated or blocked users

The backend guard returns unauthorized when an account is no longer active. Mobile clears the local session on 401. A dedicated blocked placeholder exists for future stable blocked states, but Run 1B does not invent a new backend status or expose admin-only fields.

## Expo Go and development builds

The current dependencies are aligned with Expo SDK 54 metadata. A development build becomes necessary when testing native behavior that Expo Go cannot prove, including future cookie/refresh handling, production deep-link association, push notifications, and native Universal Links/App Links.

## Run 1B limitations / Run 2 handoff

Not implemented in this run: registration changes, personal-information forms, family creation, join-code flow, invitation acceptance changes, member administration, refresh tokens, push, offline auth, biometrics, Apple/Google login, or calendar/husk/shopping/meals/wishlist feature logic.
