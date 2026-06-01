# Invitation deep-link architecture

Canonical invitation URLs use `/invite/[token]` across web and native clients, for example `https://<web-origin>/invite/abc123`.

## Current implementation

- Web fallback route: `apps/web/app/invite/[token]/page.tsx` renders the invitation landing screen and stores the pending invitation context in browser storage.
- Web continuation routes live below `apps/web/app/invite/[token]/` for acceptance, decline confirmation, declined state, pending approval, and existing-family handling.
- Native route placeholder: `apps/mobile/app/invite/[token].tsx` reserves the same route shape for Expo Router so the installed app can later open the exact token.

## Future production setup TODOs

- Add iOS Universal Links by hosting a valid `apple-app-site-association` file for `/invite/*` once production domains, app identifiers, and team IDs are finalized.
- Add Android App Links by hosting `assetlinks.json` for `/invite/*` once package names and signing certificate fingerprints are finalized.
- Keep `/invite/[token]` as the canonical fallback URL. Do not introduce platform-specific invitation URLs that drop or rewrite the token.
- Backend invitation endpoints should return the invitation metadata and acceptance result (`auto-approved` or `approval-required`) so the web and native clients can share the same state machine.
