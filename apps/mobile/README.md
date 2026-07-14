# FamilieAppen mobile (Run 0)

Expo SDK 54 client using Expo Router, React Native 0.81 and React 19.1.

## Run from monorepo root

```bash
pnpm install
pnpm --filter @familieappen/mobile start
pnpm --filter @familieappen/mobile ios
pnpm --filter @familieappen/mobile android
pnpm --filter @familieappen/mobile web
```

The default API base is `https://api-familieappen.martila.no`. Override with `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`.

For a physical iPhone against a local API, do not use `localhost`; use your computer's LAN IP, for example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000 pnpm --filter @familieappen/mobile start
```

## Expo Go and development builds

The current dependencies are Expo SDK-compatible and should run in Expo Go for Run 0. A development build becomes necessary when adding custom native modules, native configuration not supported by Expo Go, or push notification behavior that must be tested end-to-end on-device.

## Run 0 limitations

No functional authentication, SecureStore session, onboarding, push-token registration, offline queue, persisted query cache, calendar, tasks, shopping, meals or wishlist domain logic is implemented yet.
