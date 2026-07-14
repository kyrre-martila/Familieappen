import { getOnboardingRedirect, getPostAuthDestination, getResetTokenFromParam, isProfileComplete, resolveFamilyStatus } from "./routes";
import { createInviteMembersTransition, getValidInviteMembersTransition, parseInviteMembersTransition } from "./inviteTransition";
import type { AuthUser, CurrentUserPendingFamilyAccess, FamilyWithMembership } from "./types";
function equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`); }


const completeUser: AuthUser = { id: "user-1", name: "Test Bruker", firstName: "Test", middleName: null, lastName: "Bruker", displayName: "Test Bruker", avatarUrl: null, email: "test@example.com", phone: "+47 12345678", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const completeUserWithoutPhone: AuthUser = { ...completeUser, phone: null };
const incompleteUser: AuthUser = { ...completeUser, firstName: "", phone: null };
const pendingAccess: CurrentUserPendingFamilyAccess = { hasPendingAccess: true, status: "pending", family: { id: "family-1", name: "Test" }, createdAt: "2026-01-01T00:00:00.000Z" };

const family: FamilyWithMembership = {
  family: { id: "family-1", name: "Test", code: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  membership: { id: "member-1", userId: "user-1", familyId: "family-1", displayName: "Test", avatarUrl: null, role: "PARENT", includeInSchoolWeek: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
};

equal(getPostAuthDestination({ auth: "unauthenticated" }), "/(auth)/login");
equal(getPostAuthDestination({ auth: "authenticated", familyStatus: "no-family" }), "/(onboarding)/family-start");
equal(getPostAuthDestination({ auth: "authenticated", familyStatus: "pending" }), "/(onboarding)/pending-approval");
equal(getPostAuthDestination({ auth: "authenticated", familyStatus: "ready" }), "/(app)/(tabs)");
equal(getPostAuthDestination({ auth: "authenticated", familyStatus: "ready" }, { activeInviteTransition: true }), "/(onboarding)/invite-members");
equal(getPostAuthDestination({ auth: "authenticated", familyStatus: "no-family" }, { activeInviteTransition: true }), "/(onboarding)/family-start");
equal(isProfileComplete(completeUserWithoutPhone), true);
equal(isProfileComplete(incompleteUser), false);
equal(resolveFamilyStatus([], null, completeUser), "no-family");
equal(resolveFamilyStatus([], pendingAccess, completeUser), "pending");
equal(resolveFamilyStatus([family], pendingAccess, completeUser), "ready");
equal(resolveFamilyStatus([], pendingAccess, incompleteUser), "profile-incomplete");
equal(getOnboardingRedirect("/(onboarding)/family-start", "/(onboarding)/family-start"), null);
equal(getOnboardingRedirect("/family-start", "/(onboarding)/family-start"), null);
equal(getOnboardingRedirect("/(onboarding)/pending-approval", "/(onboarding)/family-start"), "/(onboarding)/family-start");
equal(getOnboardingRedirect("/(onboarding)/pending-approval", "/(onboarding)/pending-approval"), null);
equal(getOnboardingRedirect("/pending-approval", "/(onboarding)/pending-approval"), null);
equal(getOnboardingRedirect("/(onboarding)/family-start", "/(onboarding)/pending-approval"), "/(onboarding)/pending-approval");
equal(getOnboardingRedirect("/(onboarding)/invite-members", "/(onboarding)/invite-members"), null);
equal(getOnboardingRedirect("/(onboarding)/family-start", "/(onboarding)/invite-members"), "/(onboarding)/invite-members");
equal(getOnboardingRedirect("/(onboarding)/family-start", "/(app)/(tabs)"), "/(app)/(tabs)");
equal(getOnboardingRedirect("/(onboarding)/family-start", "/(auth)/login"), "/(auth)/login");
equal(getResetTokenFromParam("query-token"), "query-token");
equal(getResetTokenFromParam(["path-token"]), "path-token");
const transition = createInviteMembersTransition("user-1", "family-1");
equal(parseInviteMembersTransition(JSON.stringify(transition))?.familyId, "family-1");
equal(parseInviteMembersTransition(JSON.stringify({ ...transition, version: 0 })), null);
equal(getValidInviteMembersTransition(transition, completeUser, [family])?.familyId, "family-1");
equal(getValidInviteMembersTransition(transition, { ...completeUser, id: "other-user" }, [family]), null);
equal(getValidInviteMembersTransition({ ...transition, familyId: "missing" }, completeUser, [family]), null);
console.log("auth routes tests passed");
