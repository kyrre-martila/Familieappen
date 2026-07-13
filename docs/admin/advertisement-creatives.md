# Advertisement creatives

FamilieAppen advertisements are image-led creative assets. The admin title is internal-only and is never intended for end-user rendering. Advertiser copy, branding and calls to action belong inside the uploaded creative image.

## Admin create-draft-first flow

Admins create a `DRAFT` advertisement first with an internal title, placement, optional alt text, optional HTTPS target URL and optional schedule. Upload controls are shown only after the draft has an advertisement ID because the protected upload endpoints are advertisement-scoped.

After draft creation, the admin detail page manages metadata independently from image upload. Metadata saves do not reset image state, and image uploads update only the changed viewport variant.

## Metadata guidance

- **Internal title:** used only in admin and never shown to app users.
- **Alt text:** describes the advertisement image for users who cannot see it. It applies to the creative as a whole.
- **Target URL:** must be HTTPS before an advertisement can be scheduled or activated.
- **Placement:** uses the backend placement enum.
- **Schedule:** start and end are optional where backend lifecycle rules allow them; end cannot be before start.

Legacy `body` and `imageUrl` values are preserved by the backend but are deprecated in the primary admin UI. Legacy-only rows show a non-destructive warning and must be updated with a mobile creative and alt text before scheduling or activation.

## Creative upload UI

The detail page has three viewport panels:

- **Mobile:** required before scheduling or activation. Recommended 1080 × 1080 or 1080 × 1350.
- **Tablet:** optional. Recommended 1200 × 675. Falls back to mobile when missing.
- **Desktop:** optional. Recommended 1600 × 600 or 1600 × 900. Falls back to tablet, then mobile.

Accepted file types are JPEG, PNG and WebP. The admin UI shows the 5 MB limit before selection and performs a fast client-side size check, while the backend remains authoritative for file type, signature, dimensions and storage validation.

Selected files can show a temporary local preview and selected filename before upload. Saved previews use the backend-provided preview URL and backend metadata for dimensions and MIME type; the UI does not display original filenames as permanent identifiers.

## Replacement and removal

Uploading to a panel with an existing image replaces that saved variant after a lightweight confirmation. Tablet and desktop variants can be removed with confirmation and then fall back to lower-priority variants. Mobile removal is attempted only through the protected backend endpoint and backend lifecycle restrictions remain authoritative; replace mobile instead when removal is blocked.

## Readiness requirements

The readiness panel explains whether these items are ready:

- Mobile image
- Alt text
- HTTPS target URL
- Schedule

`DRAFT` saves remain available when incomplete. `SCHEDULED` and `ACTIVE` submissions are client-side blocked when readiness is incomplete, and the backend still performs authoritative lifecycle validation.

## Known limitations

This admin work does not add user-facing advertisement rendering, public advertisement delivery APIs, responsive picture rendering in the normal app, impression tracking, click tracking, advertiser accounts, billing, targeting, video, SVG, animated GIF, crop editing or image editing.
