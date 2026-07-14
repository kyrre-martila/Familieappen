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
  if (status === 404) return "The requested admin resource could not be found.";
  if (code === "validation.invalid_input") return "Please check the form and try again.";
  if (code === "admin.family_owner_delete_blocked") return "This user is the sole owner of a family and cannot be deleted until that family ownership is resolved or the family is deleted.";
  if (code === "admin.user_delete_conflict" || code === "admin.family_delete_conflict") return "The deletion could not be completed because the data changed. Refresh and try again.";
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

export interface AdvertisementStatsSummary { impressions:number; clicks:number; ctr:number; last7Days:{impressions:number; clicks:number}; last30Days:{impressions:number; clicks:number}; perPlacement:Array<{placement:AdvertisementPlacement; impressions:number; clicks:number}>; }
export interface AdvertisementStats extends AdvertisementStatsSummary { activeAdvertisementCount:number; advertisements:Array<{id:string; title:string; status:AdvertisementStatus; placements:AdvertisementPlacement[]; impressions:number; clicks:number; ctr:number}>; }
export interface AdminStatistics {
  totalUsers: number;
  totalFamilies: number;
  registrationsPerDay: Array<{ date: string; count: number }>;
  calendarEventsCreatedLast30Days: number;
  tasksCreatedLast30Days: number;
  remindersCreatedLast30Days: number;
  activeCalendarImports: number;
  advertisementsByStatus: Array<{ status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | string; count: number }>;
  advertisementStats: AdvertisementStats;
}


export type AdvertisementStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED";
export type AdvertisementPlacement = "HOME" | "CALENDAR" | "MENU" | "WISHLIST" | "SHOPPING";
export type AdvertisementImageVariant = "MOBILE" | "TABLET" | "DESKTOP";
export interface AdvertisementImage { url:string; width:number; height:number; mimeType:string; }
export interface Advertisement { id:string; title:string; body:string|null; imageUrl:string|null; altText:string|null; targetUrl:string|null; placements:AdvertisementPlacement[]; status:AdvertisementStatus; startsAt:string|null; endsAt:string|null; images:{mobile:AdvertisementImage|null; tablet:AdvertisementImage|null; desktop:AdvertisementImage|null}; createdBy?: Pick<AdminUser,"id"|"name"|"email"> | null; createdAt:string; updatedAt:string; statistics?:AdvertisementStatsSummary; }
export interface PageResponse<T> { page:number; pageSize:number; total:number; items:T[]; }
export type AdvertisementListResponse = PageResponse<Advertisement>;
export interface AdvertisementMutation { title:string; altText:string|null; targetUrl:string|null; placements:AdvertisementPlacement[]; status:AdvertisementStatus; startsAt:string|null; endsAt:string|null; }
export interface AuditLogEntry { id:string; adminUser: Pick<AdminUser,"id"|"name"|"email"|"role"> | null; action:string; targetType:string|null; targetId:string|null; metadata: unknown; ipAddress:string|null; createdAt:string; }
export type AuditLogResponse = PageResponse<AuditLogEntry>;
export function advertisementStatusLabel(status: string): string { return ({DRAFT:"Draft",SCHEDULED:"Scheduled",ACTIVE:"Active",PAUSED:"Paused",ENDED:"Ended"} as Record<string,string>)[status] ?? status.toLowerCase().replace(/_/g," ").replace(/^./, c=>c.toUpperCase()); }
export function advertisementPlacementLabel(placement: string): string { return ({HOME:"Home",CALENDAR:"Calendar",MENU:"Menu",WISHLIST:"Wishlist",SHOPPING:"Shopping list"} as Record<string,string>)[placement] ?? placement; }
export function auditActionLabel(action: string): string { return ({ADMIN_LOGIN:"Administrator signed in",ADMIN_LOGOUT:"Administrator signed out",USER_VIEWED:"User viewed",USER_DISABLED:"User deactivated",USER_ENABLED:"User activated",ADVERTISEMENT_CREATED:"Advertisement created",ADVERTISEMENT_UPDATED:"Advertisement updated",ADVERTISEMENT_PUBLISHED:"Advertisement published",ADVERTISEMENT_PAUSED:"Advertisement paused",ADMIN_CREATED:"Administrator created",ADMIN_UPDATED:"Administrator updated",ADMIN_DISABLED:"Administrator disabled",USER_DELETED_BY_ADMIN:"User permanently deleted",FAMILY_DELETED_BY_ADMIN:"Family permanently deleted"} as Record<string,string>)[action] ?? action.toLowerCase().replace(/_/g," ").replace(/^./, c=>c.toUpperCase()); }

export type AdminFamilyRole = "OWNER" | "PARENT" | "CHILD" | "GUEST";
export const ADMIN_MOVE_FAMILY_ROLES: AdminFamilyRole[] = ["PARENT", "CHILD", "GUEST"];
export function adminFamilyRoleLabel(role: string): string { return ({OWNER:"Owner",PARENT:"Parent",CHILD:"Child",GUEST:"Guest"} as Record<string,string>)[role] ?? role; }
export interface AdminFamilySearchItem { familyId:string; familyName:string|null; createdAt:string; memberCount:number; owners:Array<{userId:string|null; name:string|null; email:string|null}>; isSelectedUserMember?:boolean; }
export type AdminFamilySearchResponse = PageResponse<AdminFamilySearchItem>;
export interface AdminFamilyInviteCodeResponse { familyId:string; familyName:string; inviteCode:string; }
export type AdminSourceFamilyAction = "PRESERVE" | "DELETE_IF_EMPTY";
export interface AdminMoveUserFamilyResponse { userId:string; targetFamilyId:string; targetFamilyName:string; role:AdminFamilyRole; sourceFamilyId?: string; sourceFamilyDeleted?: boolean; }
export interface AdminMoveFamilyImpact { sourceFamilyId:string; sourceFamilyName:string|null; sourceMemberCount:number; sourceOwnerCount:number; movingUserIsOwner:boolean; movingUserIsSoleOwner:boolean; sourceFamilyWillBecomeEmpty:boolean; sourceFamilyMustBeDeleted:boolean; targetFamilyId:string; targetFamilyName:string|null; userAlreadyInTargetFamily:boolean; deletionCounts?: AdminFamilyDeletionImpact; }
export interface AdminCreateFamilyForUserResponse { familyId:string; familyName:string; userId:string; role:"OWNER"; }

export type AdminFeedbackType = "bug" | "feedback" | string;
export interface AdminFeedbackSubmission { id:string; type:AdminFeedbackType; title:string; message:string; createdAt:string; userId:string; userName:string|null; email:string|null; familyId:string|null; familyName:string|null; appVersion:string|null; userAgent:string|null; status:string; }
export interface AdminFeedbackListResponse { bugReports: AdminFeedbackSubmission[]; generalFeedback: AdminFeedbackSubmission[]; }
export function adminFeedbackTypeLabel(type: string): string { return type === "bug" ? "Bug report" : type === "feedback" ? "General feedback" : type; }

export type AdminDeletionImpact = Record<string, string | number | boolean | null | undefined>;
export interface AdminUserDeletionImpact extends AdminDeletionImpact { userId: string; familyCount: number; membershipCount: number; soleOwnerFamilyCount: number; }
export interface AdminFamilyDeletionImpact extends AdminDeletionImpact { familyId: string; membershipCount: number; usersDeleted: number; usersDetached: number; }
export interface AdminDeleteUserResponse { userId: string; deleted: true; }
export interface AdminDeleteFamilyResponse { familyId: string; deleted: true; usersDeleted: number; usersDetached: number; }
export function adminSupportDomainMessage(code?: string, fallback = "The support action could not be completed. Please try again."): string {
  switch (code) {
    case "admin.move_source_family_required": return "This user does not have a current family membership that can be moved.";
    case "admin.move_source_family_not_found": return "The current family no longer exists. Refresh the user details and try again.";
    case "admin.move_source_family_action_invalid": return "Choose what should happen to the current family before moving the user.";
    case "admin.move_source_family_delete_required": return "This user is the last member of the current family. Confirm deletion of the old family before moving the user.";
    case "admin.move_source_family_not_empty": return "The current family still has other members and cannot be deleted by this move.";
    case "admin.move_conflict": return "The move could not be completed because the family data changed. Refresh and try again.";
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

export function adminAdvertisementErrorMessage(code?: string, status?: number, fallback = "Advertisement action could not be completed. Please try again."): string {
  if (status === 401) return "Your admin session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to manage advertisement creatives.";
  if (status === 404) return "This advertisement no longer exists. Refresh the list and try again.";
  switch (code) {
    case "validation.invalid_input": return "Please check the advertisement fields and try again.";
    case "advertisement.not_found": return "This advertisement no longer exists. Refresh the list and try again.";
    case "advertisement.upload_missing": return "Choose an image file before uploading.";
    case "advertisement.invalid_image_type": return "Advertisement images must be JPEG, PNG or WebP.";
    case "advertisement.invalid_image_content": return "The selected file could not be read as a valid image.";
    case "advertisement.mime_mismatch": return "The image file type does not match its contents.";
    case "advertisement.image_too_large": return "Advertisement images must be smaller than 5 MB.";
    case "advertisement.dimensions_too_large": return "Advertisement image dimensions are too large.";
    case "advertisement.unsupported_variant": return "That advertisement image variant is not supported.";
    case "advertisement.storage_failure": return "The image could not be stored. Please try again.";
    case "advertisement.image_required": return "A mobile image is required before scheduling or activation.";
    case "advertisement.alt_text_required": return "Alt text is required before scheduling or activation.";
    case "advertisement.target_url_invalid": return "A valid HTTPS target URL is required before scheduling or activation.";
    case "advertisement.mobile_removal_blocked": return "The mobile creative cannot be removed; replace it instead.";
    case "advertisement.replacement_conflict": return "The creative changed during replacement. Refresh and try again.";
    default: return fallback;
  }
}
