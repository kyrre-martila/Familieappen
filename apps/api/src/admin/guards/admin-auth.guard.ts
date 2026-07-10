import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AdminAuthService, AdminRequestUser } from "../admin-auth.service";
import { ADMIN_SESSION_COOKIE_NAME, getCookieValue } from "../admin-cookie";

type RequestWithAdmin = { headers?: Record<string, string | string[] | undefined>; admin?: AdminRequestUser };

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    request.admin = await this.adminAuthService.getCurrentAdmin(getCookieValue(request, ADMIN_SESSION_COOKIE_NAME));
    return true;
  }
}
