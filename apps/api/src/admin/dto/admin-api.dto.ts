import { AdminRoleDto } from "./admin-auth.dto";

export type AdvertisementStatusDto = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED";
export type AdvertisementPlacementDto = "HOME" | "CALENDAR" | "MENU" | "WISHLIST" | "SHOPPING";
export type UserStatusDto = "active" | "inactive";

export interface PageQueryDto { page?: unknown; pageSize?: unknown; search?: unknown; status?: unknown; sort?: unknown; }
export interface AuditLogQueryDto extends PageQueryDto { adminId?: unknown; action?: unknown; from?: unknown; to?: unknown; }
export interface AdvertisementQueryDto extends PageQueryDto { status?: unknown; }
export interface FamilySearchQueryDto extends PageQueryDto { userId?: unknown; inviteCode?: unknown; }

export interface UpdateUserStatusDto { active?: unknown; }
export interface AdminDeletionDto { reason?: unknown; }
export interface MoveUserFamilyDto { targetFamilyId?: unknown; role?: unknown; reason?: unknown; sourceFamilyAction?: unknown; }
export interface MoveUserFamilyImpactQueryDto { targetFamilyId?: unknown; }
export interface CreateFamilyForUserDto { name?: unknown; reason?: unknown; }
export interface AdminFamilyInviteCodeResponseDto { familyId: string; familyName: string; inviteCode: string; }
export interface AdvertisementMutationDto { title?: unknown; body?: unknown; imageUrl?: unknown; altText?: unknown; targetUrl?: unknown; placements?: unknown; placement?: unknown; status?: unknown; startsAt?: unknown; endsAt?: unknown; }
export type AdvertisementImageVariantDto = "MOBILE" | "TABLET" | "DESKTOP";
export interface CreateAdminUserDto { email?: unknown; password?: unknown; name?: unknown; role?: unknown; active?: unknown; }
export interface UpdateAdminUserDto { name?: unknown; role?: unknown; active?: unknown; }

export interface AdminListItemDto { id: string; email: string; name: string; role: AdminRoleDto; active: boolean; lastLoginAt: string | null; createdAt: string; updatedAt: string; }
