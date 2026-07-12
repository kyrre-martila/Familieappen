# Admin family support API

Backend-only support endpoints are available under the existing `/api/admin` prefix. They require an authenticated admin session and API role authorization; frontend visibility is not considered authorization.

## Permissions

`SUPER_ADMIN` and `SUPPORT` may:

- Search families with `GET /api/admin/families`.
- View a specific membership's invite code with `GET /api/admin/users/:userId/families/:familyId/invite-code`.
- Move an active user to another family with `POST /api/admin/users/:userId/move-family`.
- Create a new family for an existing user with `POST /api/admin/users/:userId/create-family`.

`ANALYST`, `AD_MANAGER`, and normal user sessions are denied by the admin guards.

## Family search

`GET /api/admin/families` supports name search, exact invite-code search, `page`, `pageSize`, and optional `userId`. Page size is capped at 50. Results include only support-safe fields: family id, family name, creation time, member count, minimal owner summaries, and `isSelectedUserMember` when `userId` is supplied.

Search results never include invite codes, private family content, calendar data, reminder data, shopping lists, meal plans, private URLs, invitation tokens, or secrets.

## Invite-code viewing

`GET /api/admin/users/:userId/families/:familyId/invite-code` verifies that the user-family membership exists and returns only `familyId`, `familyName`, and `inviteCode`. It does not generate, rotate, or modify invite codes. The invite code is intentionally not included in normal user-detail responses or family-search responses.

The API writes `FAMILY_INVITE_CODE_VIEWED` without placing the invite code in audit metadata.

## Move semantics

`POST /api/admin/users/:userId/move-family` accepts `targetFamilyId`, optional target `role` using the repository's `FamilyMemberRole` enum (`OWNER`, `PARENT`, `CHILD`, `GUEST`), and a required support reason. The reason is trimmed and length-limited; audit metadata stores only a short summary.

The repository supports multiple family memberships at the database and user-family-list level, but this support action is intentionally modeled as a support move to a single target family. The transaction creates the target membership first, revokes pending invitations for conflicting old/target family state, then removes the user's old memberships. This preserves the invariant that an active user is not left without a family outside the transaction and avoids moving family-owned content.

The API rejects moving to the same family, nonexistent target families, invalid roles, inactive or nonexistent users, and users without a current family.

## Owner restrictions

If any current membership being removed is the sole `OWNER` of its family, the move is rejected with `admin.owner_move_blocked`. The API does not silently promote another member, delete the old family, or leave an ownerless family. Permanent deletion and ownership-transfer UI are intentionally out of scope for this prompt.

## Create family for user

`POST /api/admin/users/:userId/create-family` accepts `name` and a required support reason. It uses the existing family-code format (`FA-` plus six safe characters), creates the user as `OWNER`, creates the default shopping list, revokes conflicting pending invitations for the user, and audits `FAMILY_CREATED_BY_ADMIN` without logging the invite code.

To avoid ambiguous multi-family behavior, the endpoint rejects users who already have a family membership and instructs support to use the move endpoint when a user needs to leave an existing family.

## Active family and sessions

Normal access tokens contain user/session identity but no family id. Family context is resolved per request through the `X-Family-Id`-scoped family authorization checks. After a move, requests using the old family id fail membership lookup, while requests using the target family id resolve to the new membership. Admin sessions are not invalidated.

## Audit actions

- `FAMILY_INVITE_CODE_VIEWED`
- `USER_MOVED_TO_FAMILY`
- `FAMILY_CREATED_BY_ADMIN`

Audit metadata uses safe identifiers and summaries only. It must not include invite codes, passwords, tokens, private URLs, secrets, or full private family content.

## Known limitations

- No frontend support UI is included.
- Permanent user/family deletion is not implemented and is reserved for a later prompt.
- Family content migration, automatic owner promotion, impersonation, invite-code regeneration, and GDPR workflows are out of scope.
