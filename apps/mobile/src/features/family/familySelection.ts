import type { FamilyWithMembership } from "../auth/types";

export type FamilyMembershipStatus = "approved" | "pending" | "rejected";

export function getFamilyMembershipStatus(family: FamilyWithMembership): FamilyMembershipStatus {
  const membership = family.membership as FamilyWithMembership["membership"] & { familyMembershipStatus?: unknown; membershipStatus?: unknown; status?: unknown };
  const status = membership.familyMembershipStatus ?? membership.membershipStatus ?? membership.status;
  return status === "pending" || status === "rejected" ? status : "approved";
}

function comparableCreatedAt(family: FamilyWithMembership): number {
  const time = Date.parse(family.family.createdAt);
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

export function sortFamilies(families: FamilyWithMembership[]): FamilyWithMembership[] {
  return [...families].sort((left, right) => comparableCreatedAt(left) - comparableCreatedAt(right) || left.family.id.localeCompare(right.family.id));
}

export function selectCanonicalActiveFamilyId(families: FamilyWithMembership[], preferredFamilyId?: string | null): string | null {
  const sortedFamilies = sortFamilies(families);
  const preferred = preferredFamilyId ? sortedFamilies.find((item) => item.family.id === preferredFamilyId) : null;
  const activeFamily = preferred ?? sortedFamilies.find((item) => getFamilyMembershipStatus(item) === "approved") ?? null;
  return activeFamily && getFamilyMembershipStatus(activeFamily) === "approved" ? activeFamily.family.id : null;
}
