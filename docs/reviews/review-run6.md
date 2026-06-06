# Run 6 Review

## Score

**Overall Run 6 readiness: 6.5/10 for founder/self-testing, 5.5/10 for close-family testing, 7/10 for mobile app planning, 3/10 for wider beta.**

Settings MVP is directionally correct and mostly matches the product philosophy: four understandable sections, simple notification toggles, family members/invitations grouped in Familie, and legal links kept subtle. The main risk is not that settings are too advanced; it is that several settings actions look real while some account/profile/security pieces are local-only or placeholder-only. That creates trust risk during testing.

The recommendation is **conditional go for deploy/self-testing** after documenting known limitations and preferably fixing the profile/account false-save problem. It is **not ready for wider beta** until account/security actions are backed by real API behavior, destructive actions are safer, and settings trust paths have explicit tests.

## Strengths

- **The information architecture is good for MVP.** Profil, Familie, Varsler, and App-info are understandable without feeling like an admin panel. Members and invitations under Familie make sense because they are family-level concerns, not personal account settings.
- **Profil is the right home for account/security actions.** Logout, password/security, and delete-account placement under Profil is conceptually correct. The issue is execution, not structure.
- **Varsler stays appropriately simple.** The app avoids push/email/in-app channel splits and presents feature-level toggles only. This fits low-friction MVP settings.
- **App-info is calm and useful.** Feedback, bug report, contact, version, licenses, and subtle legal links are enough. It does not overgrow into a support portal.
- **Family admin backend guardrails exist.** Family updates, member edits, invite creation/resend/revoke, and member deletion require manager roles on the API. The backend also blocks self-invites, existing-member invites, non-pending resends, and last-admin removal.
- **Notification preferences are persisted server-side per user.** The preference API upserts by authenticated user and validates boolean-only updates, which is good enough for MVP.
- **Shared settings components are moving in the right direction.** SettingsCard, SettingsSection, and SettingsRow reduce duplication and give web screens a consistent shell that mobile planning can learn from.

## P0 Issues

P0 means must fix before asking testers to rely on the setting, or must explicitly mark as known limitation during founder-only self-testing.

1. **Profile edits are local-only and start from fake default identity.** Profil shows a hard-coded default name/email/phone and persists edits in `localStorage`, not through the authenticated user API. A tester can “save” a new email or name, but the account, auth session, backend user record, family membership display name, and invitation identity do not change. This is the highest trust issue in Run 6 because it creates false saved states.
   - **Fix:** Load authenticated user data from the session/API, remove fake defaults, and either persist name/email/phone through a real profile endpoint or make the rows read-only/disabled with honest copy until backend support exists.

2. **Delete account and password/security actions are placeholders.** Konto/sikkerhet actions are correctly placed in Profil, but “Endre passord” and “Slett konto” only show “Dette kobles til kontoen din senere.” Delete account is especially risky because users expect destructive account actions to be real, safe, and irreversible only after strong confirmation.
   - **Fix:** Before any non-founder testing, either remove/hide delete account or implement a safe flow with re-authentication/typed confirmation, backend deletion semantics, family ownership transfer/last-admin checks, and clear recovery copy.

3. **Feedback endpoint has no authentication, rate limiting, spam control, or abuse metadata.** The Next.js feedback route accepts anonymous POSTs and appends to `var/feedback.jsonl`. It validates message length but does not require login, rate-limit, capture user/family context, or protect against spam bursts. This is acceptable for a local prototype but risky once deployed publicly.
   - **Fix:** Require auth or add rate limiting at minimum. Store user id/family id when available. Add basic abuse protection and operational handling for serverless/deploy environments where local file writes may be ephemeral or unsafe.

4. **Terms link must be verified before deploy.** Settings and App-info both link to `/terms`. The route exists in this repo, but this should be part of the deploy checklist because broken legal links create unnecessary trust loss.
   - **Fix:** Smoke-test `/privacy` and `/terms` in production-like routing and confirm content is acceptable for the MVP.

## P1 Issues

P1 means should fix soon, preferably before close-family testing.

1. **Family invite send result can look successful even if email delivery failed.** The family invite API returns an invitation plus `email.ok/mode`; the web Family screen closes the sheet and adds the invitation without checking whether email sending succeeded. If provider delivery fails, the user may believe the invite was sent.
   - **Fix:** Surface email failure clearly after invite/resend. For provider mode failures, consider keeping the sheet open or showing “Invitasjonen ble opprettet, men e-posten ble ikke sendt.”

2. **Invitation resend/revoke lacks in-flight states and revoke confirmation.** Menu actions fire immediately. Resend can be tapped repeatedly, and revoke is destructive without a confirmation step. Failed actions show a generic message but the user gets little progress feedback.
   - **Fix:** Add per-invitation loading states, disable repeated taps, and add a small confirmation for revoke.

3. **Member removal confirmation is too thin.** Removing a member only says the member will be removed. It does not explain that the person loses access to the family data. Self-removal copy is also too easy to confirm accidentally.
   - **Fix:** Add clearer consequence copy and stronger confirmation for self-removal. Consider typed confirmation only for self-removal or admin removal.

4. **Non-admin family view may feel too empty.** Non-admins can view family details and members, but invitations are hidden entirely and there is no explanation that only administrators can invite or edit members.
   - **Fix:** Add gentle copy such as “Administratorer kan invitere og endre medlemmer.” This reduces confusion without adding admin-panel weight.

5. **Notification load failure still shows default toggles.** If preferences fail to load, the screen shows all default-on values with an error. This can look like the real state unless the user notices the error.
   - **Fix:** On load failure, either disable toggles and show retry, or show a skeleton/empty error state until actual values are loaded.

6. **Notification toggle race conditions are possible.** The UI stores a snapshot of `preferences` before an optimistic update. Rapid toggles across multiple keys or repeated toggles after slow responses can produce confusing rollback behavior.
   - **Fix:** Add per-key request sequencing or disable the whole row until the previous mutation completes for that key, then re-fetch after mutation.

7. **Family details do not refresh after invite/member mutations.** The UI updates local arrays after mutations, but it does not re-fetch the family context after actions. If another admin changes roles, revokes invites, or removes members concurrently, stale data can remain.
   - **Fix:** Re-fetch family details/invitations after high-trust mutations or when returning to the screen.

8. **Profile phone validation is missing.** Phone accepts any string, including invalid or extremely odd values. If phone is not a real MVP field, it should be removed or marked optional and not security-relevant.
   - **Fix:** Add pragmatic phone validation or defer the field.

9. **Bottom-sheet accessibility is incomplete.** Sheets use `role="dialog"` and autofocus, but there is no visible focus trap, Escape handling, scroll locking, or focus return. This is common in prototypes but important for mobile and accessibility readiness.
   - **Fix:** Centralize a reusable bottom-sheet/dialog component with focus management.

## P2 Improvements

P2 means polish later or include in mobile design planning.

1. **Settings main copy is slightly generic.** “Administrer din profil, familie og innstillinger” is understandable but a little admin-like. More FamilieAppen language could be “Små justeringer for familien din.”
2. **App-info could show a short privacy reassurance.** A one-line note near feedback/report bug saying “Ikke del sensitive opplysninger” would reduce support/privacy risk.
3. **Family code is unclear as a product concept.** The screen exposes a derived `FA-xxxxxx` family code, but it is not connected to an invite flow. If it is not usable yet, it may confuse testers.
4. **Role naming could be warmer.** “Administrator” is clear but a little admin-panel-like. Consider “Voksen med tilgang til å invitere” or similar for mobile copy, while keeping backend roles unchanged.
5. **Accepted/declined/revoked invites may clutter over time.** For MVP it is okay, but mobile should consider grouping or hiding old non-pending invites.
6. **Legal footer links are duplicated.** Main settings and App-info both expose Personvern/Vilkår. This is acceptable but could be consolidated if it feels repetitive in mobile.
7. **No visible save confirmation for profile edits.** Local profile edit closes the sheet silently. Once backed by API, a calm toast/status line would help.
8. **Long version/support text should be visually tested.** Version and support email rows need wrapping tests for production strings.

## Product Concerns

- **Structure is understandable and appropriately light.** The four-section model is the right amount for MVP. It does not feel too heavy, and it avoids advanced notification/account settings.
- **Familie is the correct place for members and invitations.** This grouping reduces mental load because all “who is in our family?” questions live together.
- **Profil is the correct place for account/security, but must not fake account changes.** The placement is right; local-only profile data is the main violation of user trust.
- **Varsler are simple enough.** The feature categories are comprehensible. Keep channel splits postponed.
- **App-info is calm, but feedback/report forms need production constraints.** The screen itself is good; backend handling is the weak point.
- **Family code should be intentional or hidden.** A copied code that cannot be used by another user yet creates product ambiguity.

## Security/Trust Notes

- **Profile update permissions:** No real profile update endpoint appears to be used by Run 6 web Profil. This means profile permissions are currently a product gap rather than a security feature.
- **Family admin permissions:** Backend manager-role checks are present for family updates, member edits, invites, resends, revokes, and removals. That is a strong baseline.
- **Member removal:** Backend prevents removing/demoting the last admin, but UI copy should better explain loss of access. Self-removal is especially sensitive.
- **Invitation resend/revoke:** Backend restricts these to managers and blocks resend for non-pending invites. UI should show delivery failure and prevent repeated taps.
- **Notification preference persistence:** Server-side per-user persistence exists. Load failure/default display is the trust issue.
- **Feedback endpoint:** Biggest security-readiness gap after profile false-saves. It is anonymous, not rate-limited, and writes to local app storage.
- **Logout:** Logout clears the local auth session and routes to login. This is enough for MVP, assuming token invalidation is intentionally postponed.
- **Delete account safety:** Not implemented. Hide it or label it as unavailable before close-family testing; do not let a destructive label resolve to a placeholder in front of testers.
- **False saved states:** Profile is the main false saved state. Notification toggles at least roll back on failure, but default-on load failure can mislead.
- **Stale family data:** Local updates work for simple success paths, but concurrent admin changes and open-screen stale data need testing.

## Architecture Notes

- **Route organization is clear.** `/settings`, `/settings/profile`, `/settings/family`, `/settings/notifications`, and `/settings/about` are easy to navigate and match the product structure.
- **Settings components are useful but shallow.** SettingsCard/Section/Row are a good start. Dialogs, action rows, destructive rows, empty states, and status banners are still duplicated or improvised.
- **Backend integration is mixed.** Familie and Varsler use the API. Profil uses browser storage. App-info feedback uses a local Next.js route rather than the main API service. This inconsistency is the main maintainability risk.
- **Mobile reuse is partially ready.** The API contracts for family and notification preferences can be reused by mobile. The web bottom sheets and local state patterns should not be copied directly into native mobile.
- **Notification preferences are well-scoped.** A small user-level table and boolean DTOs are maintainable for MVP.
- **Feedback should be centralized.** Long-term, feedback/report bug should probably live in the API with auth, rate limiting, and storage strategy rather than a web-only file append route.
- **Account/profile needs a domain contract.** Before mobile planning goes too far, define `GET /me`, `PATCH /me`, password change, logout/token invalidation expectations, and delete-account semantics.

## Testing Readiness

**Founder/self-testing can start, but only with a known-limitations checklist.** Close-family testing should wait until P0/P1 trust issues are handled or explicitly hidden.

Minimum manual test script before deploy/self-testing:

1. Open Settings main on mobile viewport and verify four sections plus legal footer.
2. Visit Profil; verify real authenticated user identity is shown or clearly mark profile editing as not connected.
3. Edit name/email/phone; refresh, log out/in, and verify whether saved state is truthful.
4. Tap change password and delete account; ensure placeholders are not exposed to close-family testers.
5. Visit Familie as admin; rename family, edit member, remove member, invite member, resend invite, revoke invite.
6. Visit Familie as non-admin; confirm actions are hidden and explanatory copy is clear.
7. Try last-admin demotion/removal; verify UI and backend both prevent it with understandable copy.
8. Try inviting invalid email, self email, existing member email, existing pending invite, and provider-email failure.
9. Visit Varsler; toggle each preference, refresh, log out/in, and verify persisted values.
10. Simulate notification preference load/save failure; verify no false saved/default state.
11. Submit feedback and bug report; verify successful storage and failed submission copy.
12. Verify `/privacy` and `/terms` from Settings and App-info.
13. Test small mobile viewport with keyboard open in profile, family name, invite, and feedback sheets.
14. Test long names, long emails, many members, and many invitations.

Recommended automated tests before wider beta:

- API tests for family manager/non-manager permissions on update, invite, resend, revoke, remove, and member role changes.
- API tests for last-admin removal/demotion.
- API tests for notification preference defaults, partial updates, invalid values, and per-user isolation.
- Web/component tests for notification rollback and load failure.
- Web tests for feedback validation and failed POST behavior.
- Security/abuse test or middleware test for feedback rate limiting once implemented.
- Profile API contract tests once real profile update/delete flows exist.

## Recommended Next Steps

1. Replace local-only Profil data with real authenticated user data, or hide/disable profile edit fields until a backend profile API exists.
2. Hide or implement delete account and change password before close-family testing.
3. Add auth/rate limiting/storage strategy for feedback/report bug.
4. Show email delivery failure for family invite/resend and add in-flight states.
5. Add revoke confirmation and stronger member/self-removal consequence copy.
6. Change notification load failure from “default toggles with error” to a retry/disabled state.
7. Re-fetch family details/invitations after sensitive mutations and when returning to the screen.
8. Add non-admin explanatory copy in Familie.
9. Centralize bottom-sheet/dialog behavior for focus, keyboard, scroll lock, and future mobile consistency.
10. Define account/profile backend contract before mobile implementation.
11. Run the manual test script above on iPhone-sized and Android-sized viewports.
12. Add targeted API tests for Run 6 trust paths before wider beta.

## Go / No-Go Recommendation

- **Ready for deploy/self-testing?** **Conditional go.** Deploy/self-test is reasonable if profile/account placeholders and feedback limitations are treated as known Run 6 limitations. Better: fix the profile false-save issue first because it is highly visible.
- **Ready for close family testing?** **Not yet.** Close-family testers should not see fake profile persistence, placeholder delete-account/security actions, or invites that appear sent when email failed.
- **Ready to start mobile app planning?** **Yes.** The settings structure and API direction are clear enough for mobile planning. Do not copy the current web profile implementation or bottom-sheet behavior directly into mobile.
- **What should be fixed before wider beta?** Real profile/account APIs, safe delete-account/password flows, feedback abuse protection, invite delivery failure UX, destructive-action confirmations, notification load/save trust states, family stale-data refresh, and automated backend permission tests.
