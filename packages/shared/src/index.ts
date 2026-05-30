export type FamilyMemberRole = "OWNER" | "PARENT" | "CHILD" | "GUEST";

export type ManualFamilyMemberRole = Exclude<FamilyMemberRole, "OWNER">;

export interface Family {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
  role: FamilyMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyDashboardResponse {
  family: Family;
  members: FamilyMember[];
  todayEvents: [];
  todayTasks: [];
  dinnerToday: null;
  shoppingSummary: {
    uncheckedCount: number;
  };
  wishlistSummary: {
    upcomingBirthdays: [];
  };
}

export const sharingLevels = ["private", "family", "selected"] as const;

export type SharingLevel = (typeof sharingLevels)[number];

export interface FamilyMemberSummary {
  id: string;
  displayName: string;
  role: FamilyMemberRole;
}
