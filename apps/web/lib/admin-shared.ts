export type AdminRole = "SUPER_ADMIN" | "SUPPORT" | "ANALYST" | "AD_MANAGER";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDashboard {
  totalUsers: number;
  totalFamilies: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  activeCalendarImports: number;
  activeAdvertisements: number;
  recentAuditActions?: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
    adminUser?: Pick<AdminUser, "id" | "name" | "email" | "role"> | null;
  }>;
}

export class AdminApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
  }
}

export function adminRoleLabel(role: AdminRole): string {
  switch (role) {
    case "SUPER_ADMIN": return "Super administrator";
    case "SUPPORT": return "Support";
    case "ANALYST": return "Analyst";
    case "AD_MANAGER": return "Advertisement manager";
  }
}

export function safeAdminErrorMessage(status: number, code?: string): string {
  if (status === 401) return "Your admin session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to view this admin page.";
  if (code === "validation.invalid_input") return "Please check the form and try again.";
  return "Something went wrong. Please try again.";
}
