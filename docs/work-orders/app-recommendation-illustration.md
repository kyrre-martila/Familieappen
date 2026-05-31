# Work order: upload final app recommendation illustration

## Context

The `/onboarding/app-recommendation` screen currently uses a CSS placeholder illustration because the final phone-and-coffee-cup artwork is not available in the repository yet.

## Missing asset

Upload the final warm, family-friendly illustration matching the approved mockup:

- Tilted phone preview with FamilieAppen cards for calendar, shopping list and tasks.
- Small notification badge.
- Coffee cup and soft botanical background elements.
- Transparent or warm off-white background suitable for the onboarding screen.

## Suggested destination

- `apps/web/public/assets/onboarding/app-recommendation-illustration.webp`
- Optional high-resolution/source file in design storage outside the app repository.

## Integration notes

After the asset exists, replace the CSS placeholder component in `apps/web/app/onboarding/app-recommendation/page.tsx` with a reusable `next/image` implementation while preserving:

- Alt text for the meaningful phone preview.
- Mobile-first sizing.
- Safe-area aware spacing.
- Existing App Store, Google Play and browser continuation actions.
