import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ADMIN_ROLES_KEY } from "../decorators/admin-roles.decorator";
import { AdminRoleDto } from "../dto/admin-auth.dto";

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AdminRoleDto[]>(ADMIN_ROLES_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (roles.length === 0) return true;
    const request = context.switchToHttp().getRequest<{ admin?: { role?: AdminRoleDto } }>();
    const role = request.admin?.role;
    if (role === "SUPER_ADMIN" || (role && roles.includes(role))) return true;
    throw new ForbiddenException("Admin role is not allowed to perform this action");
  }
}
