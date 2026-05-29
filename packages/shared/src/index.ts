export const familyRoles = ["guardian", "adult", "child", "guest"] as const;

export type FamilyRole = (typeof familyRoles)[number];

export const sharingLevels = ["private", "family", "selected"] as const;

export type SharingLevel = (typeof sharingLevels)[number];

export interface FamilyMemberSummary {
  id: string;
  displayName: string;
  role: FamilyRole;
}
