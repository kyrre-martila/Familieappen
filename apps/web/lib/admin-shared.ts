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


export type UserStatusFilter = "active" | "inactive";
export type UserSortOrder = "asc" | "desc";

export interface AdminManagedUserListItem {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  active: boolean;
  familyName: string | null;
  familyMemberCount: number;
  lastRelevantActivity: string | null;
}

export interface AdminUserListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: AdminManagedUserListItem[];
}

export interface AdminManagedUserDetail {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  memberships: Array<{
    familyId: string;
    familyName: string | null;
    role: string;
    displayName: string | null;
    familyMemberCount: number;
  }>;
}

export interface AdminUserStatusUpdate {
  id: string;
  name: string | null;
  email: string | null;
  active: boolean;
  updatedAt: string;
}

export interface AdminStatistics {
  totalUsers: number;
  totalFamilies: number;
  registrationsPerDay: Array<{ date: string; count: number }>;
  calendarEventsCreatedLast30Days: number;
  tasksCreatedLast30Days: number;
  remindersCreatedLast30Days: number;
  activeCalendarImports: number;
  advertisementsByStatus: Array<{ status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | string; count: number }>;
}


export type AdvertisementStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED";
export type AdvertisementPlacement = "HOME" | "CALENDAR" | "MENU";
export interface Advertisement { id:string; title:string; body:string; imageUrl:string|null; targetUrl:string|null; placement:AdvertisementPlacement; status:AdvertisementStatus; startsAt:string|null; endsAt:string|null; createdBy?: Pick<AdminUser,"id"|"name"|"email"> | null; createdAt:string; updatedAt:string; }
export interface PageResponse<T> { page:number; pageSize:number; total:number; items:T[]; }
export type AdvertisementListResponse = PageResponse<Advertisement>;
export interface AdvertisementMutation { title:string; body:string; imageUrl:string|null; targetUrl:string|null; placement:AdvertisementPlacement; status:AdvertisementStatus; startsAt:string|null; endsAt:string|null; }
export interface AuditLogEntry { id:string; adminUser: Pick<AdminUser,"id"|"name"|"email"|"role"> | null; action:string; targetType:string|null; targetId:string|null; metadata: unknown; ipAddress:string|null; createdAt:string; }
export type AuditLogResponse = PageResponse<AuditLogEntry>;
export function advertisementStatusLabel(status: string): string { return ({DRAFT:"Draft",SCHEDULED:"Scheduled",ACTIVE:"Active",PAUSED:"Paused",ENDED:"Ended"} as Record<string,string>)[status] ?? status.toLowerCase().replace(/_/g," ").replace(/^./, c=>c.toUpperCase()); }
export function advertisementPlacementLabel(placement: string): string { return ({HOME:"Home",CALENDAR:"Calendar",MENU:"Menu"} as Record<string,string>)[placement] ?? placement; }
export function auditActionLabel(action: string): string { return ({ADMIN_LOGIN:"Administrator signed in",ADMIN_LOGOUT:"Administrator signed out",USER_VIEWED:"User viewed",USER_DISABLED:"User deactivated",USER_ENABLED:"User activated",ADVERTISEMENT_CREATED:"Advertisement created",ADVERTISEMENT_UPDATED:"Advertisement updated",ADVERTISEMENT_PUBLISHED:"Advertisement published",ADVERTISEMENT_PAUSED:"Advertisement paused",ADMIN_CREATED:"Administrator created",ADMIN_UPDATED:"Administrator updated",ADMIN_DISABLED:"Administrator disabled"} as Record<string,string>)[action] ?? action.toLowerCase().replace(/_/g," ").replace(/^./, c=>c.toUpperCase()); }


export type AdminFamilyRole = "PARENT" | "CHILD" | "GUEST";
export interface AdminFamilySearchItem { id:string; name:string; memberCount:number; createdAt:string; ownerSummary:string|null; }
export type AdminFamilySearchResponse = PageResponse<AdminFamilySearchItem>;
export interface AdminFamilyInviteCode { familyId:string; familyName:string; inviteCode:string; }
export function familyRoleLabel(role: string): string { return ({OWNER:"Owner",PARENT:"Parent",CHILD:"Child",GUEST:"Guest"} as Record<string,string>)[role] ?? role; }
export function safeAdminDomainMessage(error: unknown): string { if (!(error instanceof AdminApiError)) return "The request could not be completed. Please try again."; if (error.status===403) return "You do not have permission to perform this support action."; if (error.status===404) return "The requested user or family could not be found. Refresh the page and try again."; return error.message || "The request could not be completed. Please try again."; }
