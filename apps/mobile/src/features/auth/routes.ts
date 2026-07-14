import type { AuthUser, CurrentUserPendingFamilyAccess, FamilyWithMembership } from "./types";

export type FamilyBootstrapStatus =
  | "unknown"
  | "no-family"
  | "pending"
  | "profile-incomplete"
  | "ready";
export type AuthDestination =
  | "/(auth)/login"
  | "/(onboarding)/profile"
  | "/(onboarding)/family-start"
  | "/(onboarding)/pending-approval"
  | "/(app)/(tabs)";
export type AuthRoutingState =
  | { auth: "unauthenticated" }
  | { auth: "authenticated"; familyStatus: FamilyBootstrapStatus };

export const FAMILY_STATUS_DESTINATIONS: Record<
  FamilyBootstrapStatus,
  Exclude<AuthDestination, "/(auth)/login">
> = {
  unknown: "/(onboarding)/family-start",
  "profile-incomplete": "/(onboarding)/profile",
  "no-family": "/(onboarding)/family-start",
  pending: "/(onboarding)/pending-approval",
  ready: "/(app)/(tabs)",
};

export function getPostAuthDestination(
  state: AuthRoutingState,
): AuthDestination {
  if (state.auth === "unauthenticated") return "/(auth)/login";
  return FAMILY_STATUS_DESTINATIONS[state.familyStatus];
}

export function isProfileComplete(user: AuthUser): boolean {
  return Boolean(user.firstName?.trim() && user.lastName?.trim() && user.phone?.trim());
}

export function resolveFamilyStatus(
  families: FamilyWithMembership[],
  pendingAccess?: CurrentUserPendingFamilyAccess | null,
  user?: AuthUser | null,
): FamilyBootstrapStatus {
  if (user && !isProfileComplete(user)) return "profile-incomplete";
  if (families.length > 0) return "ready";
  return pendingAccess?.hasPendingAccess && pendingAccess.status === "pending" ? "pending" : "no-family";
}

export function getOnboardingRedirect(
  currentPath: string,
  authDestination: AuthDestination,
): AuthDestination | null {
  if (pathsMatchDestination(currentPath, authDestination)) return null;
  return authDestination;
}

function pathsMatchDestination(
  currentPath: string,
  authDestination: AuthDestination,
): boolean {
  if (currentPath === authDestination) return true;
  if (authDestination === "/(onboarding)/family-start")
    return [
      "/family-start",
      "/onboarding/family-start",
      "/profile",
      "/onboarding/profile",
      "/create-family",
      "/onboarding/create-family",
      "/join-family",
      "/onboarding/join-family",
      "/invite-members",
      "/onboarding/invite-members",
      "/terms",
      "/onboarding/terms",
      "/privacy",
      "/onboarding/privacy",
      "/pending-approval",
      "/onboarding/pending-approval",
    ].includes(currentPath);
  if (authDestination === "/(onboarding)/pending-approval")
    return (
      currentPath === "/pending-approval" ||
      currentPath === "/onboarding/pending-approval"
    );
  return false;
}

export function getResetTokenFromParam(
  token: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(token)) return token[0];
  return token;
}
