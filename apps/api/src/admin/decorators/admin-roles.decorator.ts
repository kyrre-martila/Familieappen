import { SetMetadata } from "@nestjs/common";
import { AdminRoleDto } from "../dto/admin-auth.dto";

export const ADMIN_ROLES_KEY = "admin:roles";
export const AdminRoles = (...roles: AdminRoleDto[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
