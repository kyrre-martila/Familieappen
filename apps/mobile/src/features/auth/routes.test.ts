import {
  getOnboardingRedirect,
  getPostAuthDestination,
  getResetTokenFromParam,
  isProfileComplete,
  pathsMatchDestination,
  resolveFamilyStatus,
} from "./routes";
import {
  createInviteMembersTransition,
  getValidInviteMembersTransition,
  parseInviteMembersTransition,
} from "./inviteTransition";
import type {
  AuthUser,
  CurrentUserPendingFamilyAccess,
  FamilyWithMembership,
} from "./types";
function equal(actual: unknown, expected: unknown) {
  if (actual !== expected)
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
}

const completeUser: AuthUser = {
  id: "user-1",
  name: "Test Bruker",
  firstName: "Test",
  middleName: null,
  lastName: "Bruker",
  displayName: "Test Bruker",
  avatarUrl: null,
  email: "test@example.com",
  phone: "+47 12345678",
  birthDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const completeUserWithoutPhone: AuthUser = { ...completeUser, phone: null };
const incompleteUser: AuthUser = { ...completeUser, firstName: "", phone: null };
const newlyRegisteredUser: AuthUser = { ...completeUser, name: "", firstName: "", middleName: null, lastName: "", displayName: "", phone: null };
const pendingAccess: CurrentUserPendingFamilyAccess = {
  hasPendingAccess: true,
  status: "pending",
  family: { id: "family-1", name: "Test" },
  createdAt: "2026-01-01T00:00:00.000Z",
};

const family: FamilyWithMembership = {
  family: {
    id: "family-1",
    name: "Test",
    code: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  membership: {
    id: "member-1",
    userId: "user-1",
    familyId: "family-1",
    displayName: "Test",
    avatarUrl: null,
    role: "PARENT",
    includeInSchoolWeek: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

const profileDestination = getPostAuthDestination({
  auth: "authenticated",
  familyStatus: "profile-incomplete",
});
equal(profileDestination, "/(onboarding)/profile");
equal(getPostAuthDestination({ auth: "unauthenticated" }), "/(auth)/login");
equal(
  getPostAuthDestination({ auth: "authenticated", familyStatus: "no-family" }),
  "/(onboarding)/family-start",
);
equal(
  getPostAuthDestination({ auth: "authenticated", familyStatus: "pending" }),
  "/(onboarding)/pending-approval",
);
equal(
  getPostAuthDestination({ auth: "authenticated", familyStatus: "ready" }),
  "/(app)/(tabs)",
);
equal(
  getPostAuthDestination(
    { auth: "authenticated", familyStatus: "ready" },
    { activeInviteTransition: true },
  ),
  "/(onboarding)/invite-members",
);
equal(
  getPostAuthDestination(
    { auth: "authenticated", familyStatus: "no-family" },
    { activeInviteTransition: true },
  ),
  "/(onboarding)/family-start",
);
equal(isProfileComplete(completeUserWithoutPhone), true);
equal(isProfileComplete(incompleteUser), false);
equal(isProfileComplete(newlyRegisteredUser), false);
equal(resolveFamilyStatus([], null, completeUser), "no-family");
equal(resolveFamilyStatus([], pendingAccess, completeUser), "pending");
equal(resolveFamilyStatus([family], pendingAccess, completeUser), "ready");
equal(resolveFamilyStatus([], pendingAccess, incompleteUser), "profile-incomplete");

// Completing profile must move the central destination to the next route implied by families/pending-access.
equal(
  getPostAuthDestination({
    auth: "authenticated",
    familyStatus: resolveFamilyStatus([], null, completeUser),
  }),
  "/(onboarding)/family-start",
);
equal(
  getPostAuthDestination({
    auth: "authenticated",
    familyStatus: resolveFamilyStatus([], pendingAccess, completeUser),
  }),
  "/(onboarding)/pending-approval",
);
equal(
  getPostAuthDestination({
    auth: "authenticated",
    familyStatus: resolveFamilyStatus([family], null, completeUser),
  }),
  "/(app)/(tabs)",
);
equal(
  getOnboardingRedirect(
    "/(onboarding)/profile",
    getPostAuthDestination({
      auth: "authenticated",
      familyStatus: resolveFamilyStatus([], null, completeUser),
    }),
  ),
  "/(onboarding)/family-start",
);


// Onboarding routes are allowed by phase, not only by exact canonical destination.
for (const path of [
  "/family-start",
  "/onboarding/family-start",
  "/(onboarding)/family-start",
]) {
  equal(getOnboardingRedirect(path, "/(onboarding)/family-start"), null);
}
for (const path of [
  "/create-family",
  "/onboarding/create-family",
  "/(onboarding)/create-family",
]) {
  equal(getOnboardingRedirect(path, "/(onboarding)/family-start"), null);
  equal(getOnboardingRedirect(path, "/(onboarding)/profile"), "/(onboarding)/profile");
  equal(getOnboardingRedirect(path, "/(app)/(tabs)"), "/(app)/(tabs)");
}
for (const path of [
  "/join-family",
  "/onboarding/join-family",
  "/(onboarding)/join-family",
]) {
  equal(getOnboardingRedirect(path, "/(onboarding)/family-start"), null);
  equal(getOnboardingRedirect(path, "/(onboarding)/pending-approval"), "/(onboarding)/pending-approval");
}
equal(getOnboardingRedirect("/(onboarding)/profile", "/(onboarding)/family-start"), "/(onboarding)/family-start");
equal(getOnboardingRedirect("/(onboarding)/invite-members", "/(onboarding)/invite-members"), null);

// Profile route aliases must not redirect to themselves when Expo Router hides route groups.
equal(getOnboardingRedirect("/profile", "/(onboarding)/profile"), null);
equal(getOnboardingRedirect("/onboarding/profile", "/(onboarding)/profile"), null);
equal(getOnboardingRedirect("/(onboarding)/profile", "/(onboarding)/profile"), null);
equal(
  getOnboardingRedirect("/(onboarding)/family-start", "/(onboarding)/profile"),
  "/(onboarding)/profile",
);

for (const path of [
  "/family-start",
  "/onboarding/family-start",
  "/(onboarding)/family-start",
]) {
  equal(getOnboardingRedirect(path, "/(onboarding)/family-start"), null);
}
for (const path of [
  "/pending-approval",
  "/onboarding/pending-approval",
  "/(onboarding)/pending-approval",
]) {
  equal(getOnboardingRedirect(path, "/(onboarding)/pending-approval"), null);
}
for (const path of [
  "/invite-members",
  "/onboarding/invite-members",
  "/(onboarding)/invite-members",
]) {
  equal(getOnboardingRedirect(path, "/(onboarding)/invite-members"), null);
}
for (const path of ["/login", "/auth/login", "/(auth)/login"]) {
  equal(pathsMatchDestination(path, "/(auth)/login"), true);
}
for (const path of ["/tabs", "/app/tabs", "/(app)/(tabs)"]) {
  equal(pathsMatchDestination(path, "/(app)/(tabs)"), true);
}

// No redirect-to-self for central destinations, including unauthenticated users.
for (const [path, destination] of [
  ["/profile", "/(onboarding)/profile"],
  ["/family-start", "/(onboarding)/family-start"],
  ["/pending-approval", "/(onboarding)/pending-approval"],
  ["/invite-members", "/(onboarding)/invite-members"],
  ["/tabs", "/(app)/(tabs)"],
  ["/login", "/(auth)/login"],
] as const) {
  equal(getOnboardingRedirect(path, destination), null);
}

equal(
  getOnboardingRedirect("/(onboarding)/family-start", "/(onboarding)/pending-approval"),
  "/(onboarding)/pending-approval",
);
equal(
  getOnboardingRedirect("/(onboarding)/family-start", "/(onboarding)/invite-members"),
  "/(onboarding)/invite-members",
);
equal(
  getOnboardingRedirect("/(onboarding)/family-start", "/(app)/(tabs)"),
  "/(app)/(tabs)",
);
equal(
  getOnboardingRedirect("/(onboarding)/family-start", "/(auth)/login"),
  "/(auth)/login",
);
equal(getResetTokenFromParam("query-token"), "query-token");
equal(getResetTokenFromParam(["path-token"]), "path-token");
const transition = createInviteMembersTransition("user-1", "family-1");
equal(parseInviteMembersTransition(JSON.stringify(transition))?.familyId, "family-1");
equal(parseInviteMembersTransition(JSON.stringify({ ...transition, version: 0 })), null);
equal(getValidInviteMembersTransition(transition, completeUser, [family])?.familyId, "family-1");
equal(
  getValidInviteMembersTransition(transition, { ...completeUser, id: "other-user" }, [family]),
  null,
);
equal(getValidInviteMembersTransition({ ...transition, familyId: "missing" }, completeUser, [family]), null);
console.log("auth routes tests passed");
