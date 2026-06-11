export type FamilyMemberRoleDto = "OWNER" | "PARENT" | "CHILD" | "GUEST";
export type AddFamilyMemberRoleDto = Exclude<FamilyMemberRoleDto, "OWNER">;

export interface CreateFamilyRequestDto {
  name?: unknown;
}

export interface UpdateFamilyRequestDto {
  name?: unknown;
}

export interface AddFamilyMemberRequestDto {
  displayName?: unknown;
  role?: unknown;
}

export interface UpdateFamilyMemberRequestDto {
  displayName?: unknown;
  role?: unknown;
}

export type FamilyInvitationStatusDto = "pending" | "accepted" | "declined" | "revoked";
export type FamilyInvitationSourceDto = "admin_invite" | "join_request";

export interface FamilyInviteRequestDto {
  email?: unknown;
  invitedEmail?: unknown;
  role?: unknown;
}

export interface JoinFamilyByCodeRequestDto {
  code?: unknown;
}

export interface FamilyInvitationDto {
  id: string;
  familyId: string;
  invitedEmail: string;
  role: AddFamilyMemberRoleDto;
  status: FamilyInvitationStatusDto;
  source: FamilyInvitationSourceDto;
  createdByUserId: string;
  invitedUserId: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyInviteResponseDto {
  invitation: FamilyInvitationDto;
  email: {
    ok: boolean;
    mode: "provider" | "dev-log";
  };
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
  code: string | null;
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
