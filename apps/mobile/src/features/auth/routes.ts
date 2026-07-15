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
  | "/(onboarding)/invite-members"
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
  options: { activeInviteTransition?: boolean } = {},
): AuthDestination {
  if (state.auth === "unauthenticated") return "/(auth)/login";
  if (options.activeInviteTransition && state.familyStatus === "ready") return "/(onboarding)/invite-members";
  return FAMILY_STATUS_DESTINATIONS[state.familyStatus];
}

export function isProfileComplete(user: AuthUser): boolean {
  return Boolean(user.firstName?.trim() && user.lastName?.trim());
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
  if (isPathAllowedForDestination(currentPath, authDestination)) return null;
  return authDestination;
}

type RouteKey =
  | "login"
  | "profile"
  | "family-start"
  | "create-family"
  | "join-family"
  | "pending-approval"
  | "invite-members"
  | "app-tabs";

const DESTINATION_ROUTE_KEYS: Record<AuthDestination, RouteKey> = {
  "/(auth)/login": "login",
  "/(onboarding)/profile": "profile",
  "/(onboarding)/family-start": "family-start",
  "/(onboarding)/pending-approval": "pending-approval",
  "/(onboarding)/invite-members": "invite-members",
  "/(app)/(tabs)": "app-tabs",
};

const PATH_ROUTE_KEYS: Record<string, RouteKey> = {
  "/(auth)/login": "login",
  "/auth/login": "login",
  "/login": "login",
  "/(onboarding)/profile": "profile",
  "/onboarding/profile": "profile",
  "/profile": "profile",
  "/(onboarding)/family-start": "family-start",
  "/onboarding/family-start": "family-start",
  "/family-start": "family-start",
  "/(onboarding)/create-family": "create-family",
  "/onboarding/create-family": "create-family",
  "/create-family": "create-family",
  "/(onboarding)/join-family": "join-family",
  "/onboarding/join-family": "join-family",
  "/join-family": "join-family",
  "/(onboarding)/pending-approval": "pending-approval",
  "/onboarding/pending-approval": "pending-approval",
  "/pending-approval": "pending-approval",
  "/(onboarding)/invite-members": "invite-members",
  "/onboarding/invite-members": "invite-members",
  "/invite-members": "invite-members",
  "/(app)/(tabs)": "app-tabs",
  "/app/tabs": "app-tabs",
  "/tabs": "app-tabs",
  "/": "app-tabs",
};

const DESTINATION_ALLOWED_ROUTE_KEYS: Record<AuthDestination, readonly RouteKey[]> = {
  "/(auth)/login": ["login"],
  "/(onboarding)/profile": ["profile"],
  "/(onboarding)/family-start": ["family-start", "create-family", "join-family"],
  "/(onboarding)/pending-approval": ["pending-approval"],
  "/(onboarding)/invite-members": ["invite-members"],
  "/(app)/(tabs)": ["app-tabs"],
};

export function isPathAllowedForDestination(
  currentPath: string,
  authDestination: AuthDestination,
): boolean {
  const currentRoute = PATH_ROUTE_KEYS[normalizeRouterPath(currentPath)];
  return Boolean(
    currentRoute && DESTINATION_ALLOWED_ROUTE_KEYS[authDestination].includes(currentRoute),
  );
}

export function pathsMatchDestination(
  currentPath: string,
  authDestination: AuthDestination,
): boolean {
  const currentRoute = PATH_ROUTE_KEYS[normalizeRouterPath(currentPath)];
  return Boolean(currentRoute && currentRoute === DESTINATION_ROUTE_KEYS[authDestination]);
}

export function normalizeRouterPath(path: string): string {
  const [withoutQuery] = path.split(/[?#]/);
  const normalized = withoutQuery.replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized || "/";
}

export function getResetTokenFromParam(
  token: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(token)) return token[0];
  return token;
}
