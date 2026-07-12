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

export type AdminFamilyRole = "OWNER" | "PARENT" | "CHILD" | "GUEST";
export const ADMIN_MOVE_FAMILY_ROLES: AdminFamilyRole[] = ["PARENT", "CHILD", "GUEST"];
export function adminFamilyRoleLabel(role: string): string { return ({OWNER:"Owner",PARENT:"Parent",CHILD:"Child",GUEST:"Guest"} as Record<string,string>)[role] ?? role; }
export interface AdminFamilySearchItem { familyId:string; familyName:string|null; createdAt:string; memberCount:number; owners:Array<{userId:string|null; name:string|null; email:string|null}>; isSelectedUserMember?:boolean; }
export type AdminFamilySearchResponse = PageResponse<AdminFamilySearchItem>;
export interface AdminFamilyInviteCodeResponse { familyId:string; familyName:string; inviteCode:string; }
export interface AdminMoveUserFamilyResponse { userId:string; targetFamilyId:string; targetFamilyName:string; role:AdminFamilyRole; }
export interface AdminCreateFamilyForUserResponse { familyId:string; familyName:string; userId:string; role:"OWNER"; }
export function adminSupportDomainMessage(code?: string, fallback = "The support action could not be completed. Please try again."): string {
  switch (code) {
    case "admin.owner_move_blocked": return "This user is the only owner of the current family and cannot be moved until ownership is resolved.";
    case "admin.same_family": return "The user already belongs to the selected family. Choose a different target family.";
    case "admin.family_not_found": return "The selected family no longer exists. Search again and choose another family.";
    case "admin.family_membership_conflict": return "The membership changed while this dialog was open, or the user already has a conflicting membership. Refresh and try again.";
    case "admin.user_not_found": return "This user account could not be found. Refresh the user list and try again.";
    case "admin.user_requires_family": return "The backend rejected this request for the user's current account or family state.";
    case "admin.user_already_in_family": return "This user already belongs to a family. Move the user to another family instead.";
    case "validation.invalid_input": return "Please check the form fields and try again.";
    default: return fallback;
  }
}
