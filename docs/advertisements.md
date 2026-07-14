# Public advertisements

FamilieAppen renders static, image-led advertisements in the normal authenticated app through `GET /api/advertisements` and `GET /api/advertisements?placement=HOME|MENU|CALENDAR|WISHLIST|SHOPPING`.

The public API only returns active, currently scheduled advertisements with mobile creative, alt text, and an HTTPS target URL. It excludes drafts, paused or ended ads, legacy image-only ads, invalid URLs, missing alt text, and internal admin metadata.

Returned fields are: `id`, `placement`, `targetUrl`, `altText`, and responsive `images` (`mobile`, optional `tablet`, optional `desktop`) with URL, width, height, and MIME type.

## Placement behavior

- `HOME`: one card after today's summary card.
- `MENU`: one card near the bottom before logout/about-style footer content.
- `CALENDAR`: one card below the calendar content/list.

Supported placements are `HOME`, `CALENDAR`, `MENU`, `WISHLIST`, and `SHOPPING`. An advertisement can be linked to multiple placements through the normalized `AdvertisementPlacementLink` table; each public response still contains the requested singular `placement` for rendering and tracking.

## Responsive selection and fallbacks

The backend exposes all available variants. The frontend selects desktop at `min-width: 72rem`, tablet at `min-width: 48rem`, otherwise mobile.

Fallbacks:

- desktop: desktop, then tablet, then mobile
- tablet: tablet, then mobile
- mobile: mobile

The required mobile image prevents broken images when optional variants are missing.

## Tracking and privacy

Impressions are recorded once per ad per page load with `IntersectionObserver` after 50% visibility. Clicks are recorded before the HTTPS target opens in a new tab. Events are stored as `AdvertisementEvent` rows with only event type, timestamp, advertisement, placement, and authenticated user ID in metadata.

No cookies, tracking pixels, fingerprinting, third-party analytics, behavioral targeting, location targeting, advertising IDs, frequency caps, or personalization are used. Statistics are simple impression/click counts and CTR can be derived later.

## Known limitations

Only one advertisement is rendered per supported placement. There is no campaign analytics UI, advertiser account model, A/B testing, carousel, video, popup, or personalized delivery.
