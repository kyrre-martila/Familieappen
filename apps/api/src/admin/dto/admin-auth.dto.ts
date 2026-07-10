export type AdminRoleDto = "SUPER_ADMIN" | "SUPPORT" | "ANALYST" | "AD_MANAGER";

export interface AdminLoginRequestDto {
  email?: unknown;
  password?: unknown;
}

export interface SafeAdminUserDto {
  id: string;
  email: string;
  name: string;
  role: AdminRoleDto;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuthResponseDto {
  admin: SafeAdminUserDto;
  session: {
    expiresAt: string;
  };
}

export interface AdminLogoutResponseDto {
  message: string;
}
