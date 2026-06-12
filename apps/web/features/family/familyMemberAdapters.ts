import type { FamilyMember as BackendFamilyMember } from "../../lib/api";
import { getInitials } from "../../lib/identity";
import type { FamilyMember as FeatureFamilyMember } from "../types";

const memberTones = ["green", "blue", "orange", "purple", "pink"] as const;
const calendarAvatarColors = ["green", "blue", "orange", "purple"] as const;

export type FeatureFamilyMemberWithTone = FeatureFamilyMember & {
  tone: NonNullable<FeatureFamilyMember["tone"]>;
  avatarColor: NonNullable<FeatureFamilyMember["avatarColor"]>;
};

export function toFeatureFamilyMember(member: BackendFamilyMember, index: number): FeatureFamilyMemberWithTone {
  const tone = memberTones[index % memberTones.length];
  const avatarColor = calendarAvatarColors[index % calendarAvatarColors.length];

  return {
    id: member.id,
    familyId: member.familyId,
    userId: member.userId,
    name: member.displayName,
    displayName: member.displayName,
    initials: getInitials({ displayName: member.displayName }),
    avatarUrl: member.avatarUrl,
    avatarColor,
    tone,
    role: member.role.toLocaleLowerCase("en-US") as FeatureFamilyMember["role"],
    isChild: member.role === "CHILD",
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

export function toFeatureFamilyMembers(members: BackendFamilyMember[]): FeatureFamilyMemberWithTone[] {
  return members.map((member, index) => toFeatureFamilyMember(member, index));
}

export function remapLegacyMemberIds(memberIds: string[], familyMembers: FeatureFamilyMember[]): string[] {
  return memberIds
    .map((memberId) => getRealMemberId(memberId, familyMembers))
    .filter((memberId): memberId is string => Boolean(memberId));
}

function getRealMemberId(memberId: string, familyMembers: FeatureFamilyMember[]): string | null {
  if (familyMembers.some((member) => member.id === memberId)) {
    return memberId;
  }

  const normalizedMemberId = normalizeMemberKey(memberId);
  const memberByName = familyMembers.find((member) => normalizeMemberKey(member.name) === normalizedMemberId);

  return memberByName?.id ?? null;
}

function normalizeMemberKey(value: string): string {
  return value.trim().toLocaleLowerCase("nb-NO").replace(/\s+/g, "-");
}
