import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiResponse, createApiResponse } from "../common";
import { ConfigService } from "../config";
import { AdminAuthService, AdminRequestUser } from "./admin-auth.service";
import { ADMIN_SESSION_COOKIE_NAME, appendSetCookieHeader, CookieRequest, CookieResponse, firstHeaderValue, getCookieValue } from "./admin-cookie";
import { AdminAuthResponseDto, AdminLoginRequestDto, AdminLogoutResponseDto, SafeAdminUserDto } from "./dto/admin-auth.dto";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService, private readonly config: ConfigService) {}

  @Post("login")
  async login(@Body() body: AdminLoginRequestDto, @Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse): Promise<ApiResponse<AdminAuthResponseDto>> {
    const auth = await this.adminAuthService.login(body, this.getSessionMetadata(request));
    this.setAdminSessionCookie(response, auth.sessionToken, auth.sessionTokenExpiresAt);
    return createApiResponse({ admin: auth.admin, session: auth.session });
  }

  @Post("logout")
  async logout(@Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse): Promise<ApiResponse<AdminLogoutResponseDto>> {
    try {
      return createApiResponse(await this.adminAuthService.logout(getCookieValue(request, ADMIN_SESSION_COOKIE_NAME), this.getSessionMetadata(request)));
    } finally {
      this.clearAdminSessionCookie(response);
    }
  }

  @Get("me")
  @UseGuards(AdminAuthGuard)
  me(@Req() request: { admin: AdminRequestUser }): ApiResponse<SafeAdminUserDto> {
    const { sessionId: _sessionId, ...admin } = request.admin;
    return createApiResponse(admin);
  }

  private getSessionMetadata(request: CookieRequest) {
    const forwardedFor = firstHeaderValue(request.headers?.["x-forwarded-for"]);
    return { userAgent: firstHeaderValue(request.headers?.["user-agent"]) ?? null, ipAddress: forwardedFor?.split(",")[0]?.trim() || request.ip || request.socket?.remoteAddress || null };
  }

  private setAdminSessionCookie(response: CookieResponse, sessionToken: string, expiresAt: Date): void {
    appendSetCookieHeader(response, this.serializeAdminSessionCookie(sessionToken, expiresAt));
  }

  private clearAdminSessionCookie(response: CookieResponse): void {
    appendSetCookieHeader(response, this.serializeAdminSessionCookie("", new Date(0), 0));
  }

  private serializeAdminSessionCookie(value: string, expiresAt: Date, maxAge = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))): string {
    const attributes = [`${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`, "Path=/"];
    if (this.config.adminCookieDomain) attributes.push(`Domain=${this.config.adminCookieDomain}`);
    attributes.push("HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`, `Expires=${expiresAt.toUTCString()}`);
    if (this.config.nodeEnv === "production") attributes.push("Secure");
    return attributes.join("; ");
  }
}
