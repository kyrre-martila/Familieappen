import { Body, Controller, Headers, Post, Req, UnauthorizedException } from "@nestjs/common";
import { createApiResponse, ApiResponse } from "../common";
import { AuthService, SessionMetadata } from "./auth.service";
import { AuthResponseDto, LoginRequestDto, LogoutResponseDto, RefreshRequestDto, RefreshResponseDto, RegisterRequestDto } from "./dto/auth.dto";

type AuthRequest = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: RegisterRequestDto, @Req() request: AuthRequest): Promise<ApiResponse<AuthResponseDto>> {
    return createApiResponse(await this.authService.register(body, this.getSessionMetadata(request)));
  }

  @Post("login")
  async login(@Body() body: LoginRequestDto, @Req() request: AuthRequest): Promise<ApiResponse<AuthResponseDto>> {
    return createApiResponse(await this.authService.login(body, this.getSessionMetadata(request)));
  }

  @Post("refresh")
  async refresh(@Body() body: RefreshRequestDto): Promise<ApiResponse<RefreshResponseDto>> {
    return createApiResponse(await this.authService.refresh(body));
  }

  @Post("logout")
  async logout(@Headers("authorization") authorizationHeader?: string): Promise<ApiResponse<LogoutResponseDto>> {
    return createApiResponse(await this.authService.logout(this.getBearerToken(authorizationHeader)));
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
}
