# Run 5 Review

## Score

**Overall Run 5 readiness: 7/10 for founder/self-testing, 6/10 for close family testing, 7/10 for mobile planning, 3/10 for broader beta.**

Run 5 is directionally strong: it preserves a calm family-first wishlist, avoids shopping-feed behavior, and implements the core privacy decisions. The biggest risks are not product direction; they are trust and edge-case risks around invitations, stale shared-list state, reservation concurrency, mobile reorder accessibility, and email-delivery semantics.

## Strengths

- **The wishlist concept stays small.** One personal wishlist, implicit priority by order, simple create/edit, and a read-only shared view are enough for MVP and avoid the feeling of a catalog, store, or admin module.
- **Family access is low-friction.** Family members automatically appear in “Delt med meg,” which fits daily family use better than making every family member manually accept an invite.
- **External sharing is appropriately constrained.** Email-only invitations are good enough for MVP and avoid SMS gateway complexity, public links, anonymous access, and guest-mode support burden.
- **Reservation privacy is mostly aligned with the product promise.** Shared viewers see “reserved,” the reserver sees their own undo action, and the owner should not see reservation state in their own list.
- **“Legg i Husk” is useful because it appears after a reservation.** This placement makes it a low-pressure follow-up rather than a shopping CTA. It supports mental-load reduction: “I reserved this; remind me to buy it.”
- **Backend has several important guardrails.** Membership is checked before family-list access, invite tokens are hashed, duplicate active owner/email invites are blocked, family members cannot be invited externally, and soft-deleting a wish releases active reservations.
- **The visual direction is mostly calm.** Cards, bottom sheets, simple tabs, and restrained copy feel closer to a family utility than a shopping experience.

## P0 Issues

P0 means must fix before founder/self-testing or before asking close family to rely on the flow.

1. **Email send failure can still create or rotate an invitation token.** The invite service persists a new invite or rotates a pending token before returning the email result. The central email service returns `{ ok: false }` instead of throwing, so the API can report an invitation object with `email.ok=false`. If the web UI only distinguishes `dev-log` vs provider, a failed provider send can look sent enough to confuse a tester. Fix by making failed provider sends a visible error state in the UI and consider not rotating/creating tokens when provider send fails outside development.
2. **Reservation collision handling needs explicit two-device manual testing.** There is a partial unique index in the migration and 409 handling in service/UI, which is good, but this is a core trust moment. Before close family testing, verify two users pressing “Reserver” at the same time produces exactly one reservation, a clear 409 message for the loser, and no stale “available” state after retry.
3. **Share/invite flow does not clearly explain the required invited email at the moment of login/register.** The invite page says the invitation was sent to the email, but the failure mode where a user registers or logs in with another email will feel confusing. Add pre-login copy: “Bruk denne e-postadressen: x@y.no.” On accept failure, say exactly that they must use the invited email.
4. **Revoked or removed external lists can remain locally cached in the shared wishlist hook.** `useSharedWishlists` caches detail responses by member/share id and returns cached data without revalidation. If access is revoked elsewhere while the view is open or after returning to it, the UI can still show stale wishlist details until a hard refresh or cache miss. Fix by invalidating detail cache on shared-list refresh, remove/revoke actions, and 403/404 responses.
5. **Shared detail route requires a current family even for external invites.** The API endpoint for `/wishlist/shared/:memberId` still requires `x-family-id` and `requireCurrentMember` before checking whether `memberId` is an accepted external share. This means a user who accepted an external wishlist but has no approved family context may be unable to view it. If product requires every account to have a family first, make that explicit; otherwise decouple external shared-list reads from active family membership.

## P1 Issues

P1 means should fix before serious close-family testing or before mobile implementation.

1. **Reorder mode is pointer-only and not accessible enough.** Dragging via pointer can work on touch, but there are no up/down buttons, no keyboard reorder path, and no “save/cancel” distinction. On mobile, accidental drags and page scroll conflicts are likely. Add explicit move-up/move-down controls or a native-friendly reorder pattern.
2. **Bottom sheets need production mobile behavior.** Share and reserve sheets lack visible focus trapping, Escape handling, scroll locking, and robust keyboard avoidance. This is acceptable for founder testing but not a good mobile app blueprint yet.
3. **Deleting a reserved wish is technically handled, but the owner receives no warning.** Owner privacy means the owner must not see reservation status. Still, deleting a wish someone reserved can create silent disappointment. Consider neutral copy on delete: “Sletter ønsket for alle som kan se listen” without revealing reservation state.
4. **The share dashboard feels a little admin-like.** Status rows, resend, revoke, and raw email addresses are useful, but the sheet can feel like account management. For mobile, make it more conversational: “Personer utenfor familien,” “Venter på svar,” and a gentle explanation of automatic family access.
5. **“Delt med meg” hides people with zero wishes.** Family summaries are built from active items, so a family member with an empty wishlist does not appear. This is efficient but can confuse families (“Why can’t I find Dad?”). For MVP, consider showing family members with an empty-state detail.
6. **Invite statuses need clearer lifecycle language.** “Fjernet,” “Tilgang fjernet,” and “Ikke lagt til” are accurate but could be ambiguous. Add date/context in the sheet for accepted/declined/revoked/removed states.
7. **No invite expiry is actually set.** The DTO supports `expiresAt`, but new invites appear to be created without expiry. Either intentionally make MVP invites non-expiring and remove expiry messaging, or set a practical expiration and expose resend clearly.
8. **External accepted access is keyed through an invitation row, not a stable share/access model.** This works for MVP but status transitions are doing double duty as invite state and access state. Mobile and future audit needs may benefit from separating invitation events from accepted share access.
9. **No optimistic update for reserve.** Reservation waits for the server, while unreserve is optimistic. This asymmetry is safer, but a slow network can feel dead unless the button visibly enters a pending state and prevents duplicate taps.
10. **Form validation copy is backend-oriented.** Backend validation uses labels like “Title,” “Description,” and “Store or link.” User-facing errors should be Norwegian and product-specific.

## P2 Improvements

- Add a tiny privacy explainer in shared detail: “Eieren ser ikke reservasjoner.” Current copy says others do not see who reserved; it does not explicitly reassure about the owner.
- Add a gentle “what is this?” empty state for “Delt med meg” that explains family access and email invites in one sentence.
- Add optional examples in the wish form placeholders: “Lego-sett,” “Bokhandel / lenke,” “ca. 300 kr.”
- Add truncation or wrapping tests for long titles, long store/link text, and long email addresses.
- Add a copied-link/dev-log affordance in development only. The current dev-log mode is useful but invisible unless the tester has server log access.
- Add skeletons/empty states to shared detail for zero wishes and revoked/removed access that guide the user back to the list.
- Consider showing “Sist oppdatert” only if stale-data concerns persist; avoid adding metadata unless it improves trust.
- Add telemetry/logging around invite send failures, accept failures, reserve conflicts, and revoke/remove actions before broader testing.

## Wishlist Product Concerns

- **Simple enough?** Yes. The current shape is MVP-simple: list, add/edit, reorder, share, reserve. The risk is not conceptual overload; it is small interaction complexity around sharing and moving.
- **Avoids shopping/reklame feeling?** Mostly yes. There is no scraping, affiliate behavior, recommendations, categories, shopping feed, purchase status for the owner, or product cards with external commerce emphasis. The “Reserver” and “Legg i Husk” actions support coordination, not shopping.
- **One wishlist per person enough?** Yes for MVP. Multiple lists would add naming, sharing, and mental overhead. Use order and simple titles first.
- **Reservation privacy understandable?** Partly. The reserve sheet says others see reserved but not who. The shared detail note says reservations are private and only you see what you reserve. Add explicit owner wording to avoid the common question: “Can the birthday person see this?”
- **“Legg i Husk” useful without being pushy?** Yes because it appears only after `reservedByMe`. Keep it secondary. Avoid making it a default next step or notification funnel.
- **Email-only sharing good enough?** Yes for founder and close-family MVP. It is slower than SMS, but safer and cheaper. The main requirement is clear delivery/failure handling and clear invited-email matching.

## Mobile App Readiness

**Ready to start mobile planning, not ready to copy directly into native UI.**

- **Screens translate reasonably:** Min ønskeliste, Delt med meg, shared detail, invite accept, and reserve confirmation map cleanly to native screens/sheets.
- **Most web-like screen:** share dashboard. It currently behaves like a management panel in a sheet. Native should make this a full-screen or half-sheet flow with one primary task: invite by email, then a compact access list.
- **Reorder needs a native decision:** do not blindly port pointer drag logic. Native should use a battle-tested draggable list or explicit up/down actions, with haptics and scroll-safe behavior.
- **Keyboard concerns:** email input in share sheet and wish form fields need keyboard avoidance, safe-area handling, and submit button visibility. Test on small iPhones and Android with large text.
- **Touch targets:** card menus, drag handles, “Angre,” and “Legg i Husk” need minimum 44px target equivalents. Dense two-button rows after reservation may be cramped.
- **Bottom sheets:** reserve confirmation fits a bottom sheet. Share may need full-screen on small phones. Invite accept could be a normal route screen.
- **Navigation:** `/wishlist?tab=shared` should become a native segmented tab or top tabs under one Wishlist stack. Shared detail needs a stable back behavior after accept/remove/revoke.
- **Offline/poor network:** mobile will expose trust gaps faster. Reservation and invite actions need clear pending/failed states and retry behavior.

## Backend/Security Notes

- **Family access:** Current family-shared lists are gated by membership and exclude the current member’s own wishlist. This is the right default.
- **External share access:** Accepted invitations provide read access to the owner’s wishlist. However, the API still requires an active family header and current membership before checking accepted external invitation access. This may block valid external recipients without an approved/current family.
- **Invite tokens:** Raw tokens are generated with `randomBytes` and stored as SHA-256 hashes. This is good for MVP. Keep raw tokens out of DTOs and logs except dev mode.
- **Token hashing:** Hashing is implemented; token lookup hashes the provided token. Good.
- **Invite statuses:** Pending, accepted, declined, removed, revoked are enough for MVP. The main risk is that invitation rows are also acting as access rows.
- **Revoke/remove behavior:** Owner revoke changes status to revoked. Recipient remove changes status to removed. Accepted share queries filter by `status: accepted`, which should stop future access. The cache issue is frontend trust, not backend authorization.
- **Reservation privacy:** DTOs expose only `isReserved` and `reservedByMe`, not reserver identity. Owner DTO for own wishlist does not expose reservation state. Good.
- **Cross-family prevention:** Item fetch prevents reserving own wishes and requires either same-family membership or accepted external access to the item owner. Good direction, but add integration tests for cross-family item IDs.
- **Self-invite prevention:** Email self-invite is blocked; family-member email invite is blocked. Good.
- **Duplicate invites:** Active owner/email duplicates are blocked in service and migration. Pending invite resend rotates token. Accepted duplicate conflicts. Good.
- **Deleted items with reservations:** Delete releases active reservations in the same transaction and soft-deletes the wish. Good.
- **Email dev/provider behavior:** Dev-log mode is useful locally, but provider failures need first-class UI treatment. Do not let “Invitasjonen er sendt” appear after provider failure.
- **Concurrency:** Reservation has a partial unique index in migration. Ensure the Prisma schema and generated client expectations do not hide this because partial unique indexes are not represented as `@@unique` in the schema.

## Trust Risks

- **False sent state:** Highest trust risk. If provider email fails but UI says “sent,” families will waste time waiting for an invitation.
- **Stale shared list after revoke/remove:** Cached details can make revoked access look available until refresh.
- **Reservation stale state:** After another user reserves, a viewer may see an available button until action or refresh. Conflict messaging helps, but a post-conflict refresh would increase trust.
- **Optimistic rollback:** Create/update/delete/reorder mostly roll back. Unreserve rolls back locally. Reserve is non-optimistic. This is safe, but loading states need to be obvious.
- **Owner deletes reserved item:** Technically safe, emotionally risky. Add neutral delete warning.
- **Invite accepted with wrong email:** Backend blocks it. UI copy must make it feel understandable, not broken.
- **Development email mode:** “Written to server log” is fine for developers, confusing for non-technical family testers. Hide or translate this in a founder-only test plan.

## Architecture Notes

- **`useWishlist` is a reasonable web hook** with optimistic create/update/delete/reorder and local rollback. It is web-friendly, but not directly reusable in native because it depends on React web assumptions and shared family hooks.
- **`useSharedWishlists` needs cache invalidation semantics.** Detail cache should be invalidated on list refresh, remove/revoke, access errors, and reservation changes from other users if polling/refresh is added.
- **Email service is well centralized.** It has template rendering, dev-log mode, provider dispatch, and normalized result shape. Next step is stronger caller semantics for failure.
- **API route organization is understandable.** `/wishlist`, `/wishlist/share`, `/wishlist/invites`, `/wishlist/shared`, and item reservation routes are clear enough for MVP. Long-term, external access might deserve a separate `/wishlist/shares/:shareId` concept.
- **Schema is pragmatic.** Wishlist items rather than wishlist entities fits “one list per person.” Reservations and invitations are separate tables. Partial unique indexes in migrations are important and should be covered by tests.
- **Mobile readiness of logic:** Backend logic is reusable by mobile. Web UI logic is not reusable as-is, but API DTOs are simple enough to become a mobile client contract.
- **Tests appear insufficient for Run 5 trust paths.** Add API tests for invite status transitions, wrong-email accept, revoke/remove access, reservation collision, owner visibility, and deleting reserved items.

## Missing Edge Cases

- **No wishes:** Covered for own and shared detail, but shared people with zero wishes may be hidden from the shared-person list.
- **Many wishes:** Basic list should work, but reorder performance and drag usability need testing with 30-50 items on mobile.
- **Long titles:** Needs visual testing; card title wrapping can make reservation actions cramped.
- **Missing image/icon:** Covered with fallback icon.
- **Invalid price:** Backend validates price, but error copy should be Norwegian and form-level.
- **Link vs physical store text:** One `storeOrLink` field is MVP-friendly. Later, auto-link only if it looks like a URL; do not create shopping behavior.
- **Invited email already has account:** Backend links `invitedUserId` and accept should work when that account logs in.
- **Invited email does not have account:** Invite page routes to registration with the email prefilled in the URL. Verify register actually respects that and returns to invite.
- **Invited user registers with another email:** Backend blocks accept; UI needs clearer copy.
- **Expired invite:** DTO supports expiry, but invites do not appear to expire. Decide intentionally.
- **Revoked invite:** Backend status prevents accepted access; frontend should clear cached data and show friendly revoked state.
- **Reservation collision:** Backend partial unique index should protect this; must test manually and with integration tests.
- **Two users reserve at same time:** Same as above; loser should see conflict and refreshed state.
- **Owner deletes reserved item:** Backend releases reservation and soft-deletes item; add neutral owner delete copy.
- **User removes shared list:** Backend status becomes removed; frontend navigates back. Also clear cached details.
- **Owner revokes access:** Backend status becomes revoked; frontend invited list refreshes. Recipient open detail should stop showing cached contents.

## Recommended Next Steps

1. Fix invite email failure UX and API semantics so provider failure never feels like a successful send.
2. Add Run 5 backend tests for owner visibility, external access, wrong-email accept, revoke/remove, duplicate invites, reservation collision, and delete-reserved behavior.
3. Invalidate shared wishlist detail cache on access changes and after 403/404.
4. Improve invite accept/register copy around the exact invited email.
5. Add a neutral delete confirmation for wishlist items.
6. Add a mobile-safe reorder alternative or document the native reorder design before app implementation.
7. Add explicit reservation privacy copy: owner cannot see reservations, and nobody sees who reserved.
8. Run a close-family script with 3 users: owner, same-family member, external email recipient.
9. Test on small mobile viewport with keyboard open for create/edit and share flows.
10. Decide whether MVP invites expire. If yes, set expiry and expose resend. If no, remove expiry wording.

## Go / No-Go Recommendation

- **Ready for founder/self-testing?** **Go, with caveats.** Founder testing should start now, but include a checklist specifically for invite email failure, wrong-email accept, reservation collision, revoke/remove, and mobile reorder.
- **Ready for close family testing?** **Conditional go after P0 fixes.** Do not ask close family to test email invitations until false-sent states and stale revoked-list behavior are fixed or clearly documented as known limitations.
- **Ready to start mobile app planning?** **Go.** The product model and API contract are clear enough to plan mobile screens, navigation, and native interactions. Do not reuse web reorder or sheet behavior without redesign.
- **Ready for broader beta?** **No-go.** Broader beta needs stronger tests, clearer invite failure handling, cache invalidation, mobile interaction hardening, and better trust copy.
