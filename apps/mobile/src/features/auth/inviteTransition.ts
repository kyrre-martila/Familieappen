import type { AuthUser, FamilyWithMembership } from "./types";

export type InviteMembersTransition = {
  version: 1;
  userId: string;
  familyId: string;
  createdAt: string;
};

export function createInviteMembersTransition(userId: string, familyId: string): InviteMembersTransition {
  return { version: 1, userId, familyId, createdAt: new Date().toISOString() };
}

export function parseInviteMembersTransition(raw: string | null): InviteMembersTransition | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<InviteMembersTransition>;
    if (value.version !== 1) return null;
    if (typeof value.userId !== "string" || !value.userId.trim()) return null;
    if (typeof value.familyId !== "string" || !value.familyId.trim()) return null;
    if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) return null;
    return { version: 1, userId: value.userId, familyId: value.familyId, createdAt: value.createdAt };
  } catch {
    return null;
  }
}

export function getValidInviteMembersTransition(
  transition: InviteMembersTransition | null,
  user: AuthUser | null,
  families: FamilyWithMembership[],
): InviteMembersTransition | null {
  if (!transition || !user || transition.userId !== user.id) return null;
  return families.some((item) => item.family.id === transition.familyId) ? transition : null;
}

export function resolveInviteMembersFamilyId(input: {
  routeFamilyId?: string | null;
  transition: InviteMembersTransition | null;
  user: AuthUser | null;
  families: FamilyWithMembership[];
}): string | null {
  if (input.routeFamilyId) {
    return input.families.some((item) => item.family.id === input.routeFamilyId)
      ? input.routeFamilyId
      : null;
  }
  return getValidInviteMembersTransition(input.transition, input.user, input.families)?.familyId ?? null;
}
