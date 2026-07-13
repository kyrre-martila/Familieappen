# Advertisement creatives

FamilieAppen advertisements are image-led creative assets. The admin `title` is required for management, but it is internal only and must not be rendered to end users. Advertiser copy, branding and calls to action belong inside the uploaded creative image.

## Model and lifecycle

The Prisma `Advertisement` model now keeps legacy `body` and `imageUrl` columns nullable and deprecated while adding `altText` plus separate mobile, tablet and desktop image path/metadata fields. Existing rows are preserved; legacy-only rows may remain as drafts/paused/ended records, but they cannot be scheduled or activated until migrated to uploaded creative assets.

Draft advertisements may be incomplete. `SCHEDULED` and `ACTIVE` advertisements require:

- title
- non-empty `altText` (trimmed, max 180 characters)
- HTTPS `targetUrl`
- uploaded mobile image
- valid date ordering when both dates are present

Tablet and desktop images are optional. Planned app rendering fallback is: tablet falls back to mobile; desktop falls back to desktop, then tablet, then mobile.

## Upload API

Admin-only endpoints:

- `POST /api/admin/advertisements/:id/images/MOBILE`
- `POST /api/admin/advertisements/:id/images/TABLET`
- `POST /api/admin/advertisements/:id/images/DESKTOP`
- `DELETE /api/admin/advertisements/:id/images/TABLET`
- `DELETE /api/admin/advertisements/:id/images/DESKTOP`

Allowed roles are `SUPER_ADMIN` and `AD_MANAGER`. `SUPPORT`, `ANALYST`, and normal user sessions are denied by the existing admin guards. Upload form field name is `image`; max size is 5 MB.

## Validation and processing

Accepted formats are JPEG, PNG and WebP. SVG, GIF, PDF, HTML, executables, corrupt files, unknown formats, MIME/signature mismatches, files over 5 MB, and images over 8000 × 8000 pixels are rejected. Validation reads file signatures and image dimensions server-side and does not trust extensions, MIME headers or original filenames.

This first implementation validates and stores original bytes; it does not normalize to WebP or strip EXIF/metadata. Prompt 2 should introduce a maintained image-processing library if metadata stripping and WebP re-encoding are required in production.

Recommended creative dimensions (not hard validation):

- mobile: 1080 × 1080 or 1080 × 1350
- tablet: 1200 × 675
- desktop: 1600 × 600 or 1600 × 900

## Storage and serving

Production Docker mounts `familieappen_uploads` at `/app/uploads`. Advertisement images are stored under `/app/uploads/advertisements/<advertisement-id>/<variant>/<random-name>.<ext>` and saved in the database as normalized relative paths. The original filename is never used. Images are served by the existing static `/uploads/` route, producing stable URLs such as `/uploads/advertisements/<advertisement-id>/mobile/<random>.png` without exposing host paths.

Replacement stores the new file first, updates the database, then asynchronously removes the old file when no record references it. If the database update fails, the new file is removed. Optional tablet/desktop removal clears DB metadata first and then removes the unreferenced file. Mobile removal is blocked; replace it instead. Permanent advertisement deletion removes associated files after DB deletion; soft-ended advertisements keep files.

## Audit and limitations

Image upload, replacement and removal create advertisement audit entries containing advertisement ID, variant, admin ID and safe metadata (dimensions/MIME type). The audit log does not store file bytes, original filename, raw filesystem path or target URL query data.

Known limitations: validation does not fully decode every image pixel, files are not re-encoded, metadata is not stripped, static file serving uses the existing global `/uploads/` route and does not add advertisement-specific cache headers, and lifecycle file existence checks are limited to the mobile image at publish/update time.
