export type FamilyMemberRoleDto = "OWNER" | "PARENT" | "CHILD" | "GUEST";
export type AddFamilyMemberRoleDto = Exclude<FamilyMemberRoleDto, "OWNER">;

export interface CreateFamilyRequestDto {
  name?: unknown;
}

export interface AddFamilyMemberRequestDto {
  displayName?: unknown;
  role?: unknown;
}

export interface FamilyMemberDto {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
  role: FamilyMemberRoleDto;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyWithMembershipDto {
  family: FamilyDto;
  membership: FamilyMemberDto;
}

export interface FamilyDetailsDto {
  family: FamilyDto;
  members: FamilyMemberDto[];
}
