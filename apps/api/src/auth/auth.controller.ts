import { Body, Controller, Headers, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "../config";
import { createApiResponse, ApiResponse } from "../common";
import { AuthService, AuthSessionResponse, RefreshSessionResponse, SessionMetadata } from "./auth.service";
import { AuthResponseDto, ForgotPasswordRequestDto, LoginRequestDto, LogoutResponseDto, PasswordResetMessageDto, RefreshResponseDto, RegisterRequestDto, ResetPasswordRequestDto } from "./dto/auth.dto";

const REFRESH_TOKEN_COOKIE_NAME = "familieappen_refresh_token";

type AuthRequest = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

type CookieResponse = {
  getHeader?: (name: string) => number | string | string[] | undefined;
  setHeader?: (name: string, value: number | string | string[]) => void;
};

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  @Post("register")
  async register(@Body() body: RegisterRequestDto, @Req() request: AuthRequest, @Res({ passthrough: true }) response: CookieResponse): Promise<ApiResponse<AuthResponseDto>> {
    const auth = await this.authService.register(body, this.getSessionMetadata(request));
    this.setRefreshTokenCookie(response, auth.refreshToken, auth.refreshTokenExpiresAt);
    return createApiResponse(this.toAuthResponse(auth));
  }

  @Post("login")
  async login(@Body() body: LoginRequestDto, @Req() request: AuthRequest, @Res({ passthrough: true }) response: CookieResponse): Promise<ApiResponse<AuthResponseDto>> {
    const auth = await this.authService.login(body, this.getSessionMetadata(request));
    this.setRefreshTokenCookie(response, auth.refreshToken, auth.refreshTokenExpiresAt);
    return createApiResponse(this.toAuthResponse(auth));
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: ForgotPasswordRequestDto, @Req() request: AuthRequest): Promise<ApiResponse<PasswordResetMessageDto>> {
    return createApiResponse(await this.authService.forgotPassword(body, this.getSessionMetadata(request)));
  }

  @Post("reset-password")
  async resetPassword(@Body() body: ResetPasswordRequestDto): Promise<ApiResponse<PasswordResetMessageDto>> {
    return createApiResponse(await this.authService.resetPassword(body));
  }

  @Post("refresh")
  async refresh(@Req() request: AuthRequest, @Res({ passthrough: true }) response: CookieResponse): Promise<ApiResponse<RefreshResponseDto>> {
    const auth = await this.authService.refresh(this.getRefreshTokenCookie(request));
    this.setRefreshTokenCookie(response, auth.refreshToken, auth.refreshTokenExpiresAt);
    return createApiResponse(this.toRefreshResponse(auth));
  }

  @Post("logout")
  async logout(@Headers("authorization") authorizationHeader: string | undefined, @Res({ passthrough: true }) response: CookieResponse): Promise<ApiResponse<LogoutResponseDto>> {
    try {
      return createApiResponse(await this.authService.logout(this.getBearerToken(authorizationHeader)));
    } finally {
      this.clearRefreshTokenCookie(response);
    }
  }

  private getSessionMetadata(request: AuthRequest): SessionMetadata {
    const forwardedFor = this.firstHeaderValue(request.headers?.["x-forwarded-for"]);
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.ip || request.socket?.remoteAddress || null;

    return {
      userAgent: this.firstHeaderValue(request.headers?.["user-agent"]) ?? null,
      ipAddress
    };
  }

  private firstHeaderValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  private getBearerToken(authorizationHeader: string | undefined): string {
    if (!authorizationHeader) {
      throw new UnauthorizedException("Authorization header is required");
    }

    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Bearer access token is required");
    }

    return token;
  }

  private getRefreshTokenCookie(request: AuthRequest): string | undefined {
    const cookieHeader = this.firstHeaderValue(request.headers?.cookie);

    if (!cookieHeader) {
      return undefined;
    }

    return cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`))
      ?.slice(REFRESH_TOKEN_COOKIE_NAME.length + 1);
  }

  private setRefreshTokenCookie(response: CookieResponse, refreshToken: string, expiresAt: Date): void {
    this.appendSetCookieHeader(response, this.serializeRefreshTokenCookie(refreshToken, expiresAt));
  }

  private clearRefreshTokenCookie(response: CookieResponse): void {
    this.appendSetCookieHeader(response, this.serializeRefreshTokenCookie("", new Date(0), 0));
  }

  private serializeRefreshTokenCookie(value: string, expiresAt: Date, maxAge = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))): string {
    const encodedValue = encodeURIComponent(value);
    const attributes = [
      `${REFRESH_TOKEN_COOKIE_NAME}=${encodedValue}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAge}`,
      `Expires=${expiresAt.toUTCString()}`
    ];

    if (this.config.nodeEnv === "production") {
      attributes.push("Secure");
    }

    return attributes.join("; ");
  }

  private appendSetCookieHeader(response: CookieResponse, cookie: string): void {
    const existingHeader = response.getHeader?.("Set-Cookie");
    const cookies = Array.isArray(existingHeader)
      ? [...existingHeader, cookie]
      : typeof existingHeader === "string"
        ? [existingHeader, cookie]
        : [cookie];

    response.setHeader?.("Set-Cookie", cookies);
  }

  private toAuthResponse(auth: AuthSessionResponse): AuthResponseDto {
    return {
      user: auth.user,
      tokens: auth.tokens
    };
  }

  private toRefreshResponse(auth: RefreshSessionResponse): RefreshResponseDto {
    return {
      tokens: auth.tokens
    };
  }
}
