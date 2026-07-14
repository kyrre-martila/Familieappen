export interface AuthUser {
  id: string;
  name: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface LogoutResponse {
  message: string;
}

export interface PasswordResetMessage {
  message: string;
}
export interface FamilyWithMembership {
  family: import("@familieappen/shared").Family;
  membership: import("@familieappen/shared").FamilyMember;
}

export interface FamilyDetails {
  family: import("@familieappen/shared").Family;
  members: import("@familieappen/shared").FamilyMember[];
}
export type FamilyInvitation = import("@familieappen/shared").FamilyInvitation;
