import type { FamilyWithMembership } from "./types";

export type FamilyBootstrapStatus = "unknown" | "no-family" | "pending" | "ready";
export type AuthDestination = "/(auth)/login" | "/(onboarding)/family-start" | "/(onboarding)/pending-approval" | "/(onboarding)/blocked" | "/(app)/(tabs)";

export type AuthRoutingState =
  | { auth: "unauthenticated" }
  | { auth: "authenticated"; familyStatus: FamilyBootstrapStatus; blocked?: boolean };

export function getPostAuthDestination(state: AuthRoutingState): AuthDestination {
  if (state.auth === "unauthenticated") return "/(auth)/login";
  if (state.blocked) return "/(onboarding)/blocked";
  switch (state.familyStatus) {
    case "ready": return "/(app)/(tabs)";
    case "pending": return "/(onboarding)/pending-approval";
    case "no-family":
    case "unknown":
      return "/(onboarding)/family-start";
  }
}

export function resolveFamilyStatus(families: FamilyWithMembership[]): FamilyBootstrapStatus {
  if (families.length === 0) return "no-family";
  return families.some((family) => getMembershipStatus(family) === "approved") ? "ready" : "pending";
}

function getMembershipStatus(family: FamilyWithMembership): "approved" | "pending" | "rejected" {
  const membership = family.membership as FamilyWithMembership["membership"] & { familyMembershipStatus?: unknown; membershipStatus?: unknown; status?: unknown };
  const status = membership.familyMembershipStatus ?? membership.membershipStatus ?? membership.status;
  return status === "pending" || status === "rejected" ? status : "approved";
}
