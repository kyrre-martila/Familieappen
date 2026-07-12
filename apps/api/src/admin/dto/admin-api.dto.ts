import { AdminRoleDto } from "./admin-auth.dto";

export type AdvertisementStatusDto = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED";
export type AdvertisementPlacementDto = "HOME" | "CALENDAR" | "MENU";
export type UserStatusDto = "active" | "inactive";

export interface PageQueryDto { page?: unknown; pageSize?: unknown; search?: unknown; status?: unknown; sort?: unknown; inviteCode?: unknown; }
export interface AuditLogQueryDto extends PageQueryDto { adminId?: unknown; action?: unknown; from?: unknown; to?: unknown; }
export interface AdvertisementQueryDto extends PageQueryDto { status?: unknown; }

export interface UpdateUserStatusDto { active?: unknown; }
export interface AdvertisementMutationDto { title?: unknown; body?: unknown; imageUrl?: unknown; targetUrl?: unknown; placement?: unknown; status?: unknown; startsAt?: unknown; endsAt?: unknown; }
export interface CreateAdminUserDto { email?: unknown; password?: unknown; name?: unknown; role?: unknown; active?: unknown; }
export interface UpdateAdminUserDto { name?: unknown; role?: unknown; active?: unknown; }

export interface AdminListItemDto { id: string; email: string; name: string; role: AdminRoleDto; active: boolean; lastLoginAt: string | null; createdAt: string; updatedAt: string; }

export interface MoveUserFamilyDto { fromFamilyId?: unknown; targetFamilyId?: unknown; role?: unknown; reason?: unknown; }
export interface CreateUserFamilyDto { name?: unknown; reason?: unknown; }
