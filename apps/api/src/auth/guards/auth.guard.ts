import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma";
import { AuthService } from "../auth.service";

type RequestWithAuthUser = {
  headers?: {
    authorization?: string;
  };
  user?: {
    id: string;
    email: string;
  };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const token = this.getBearerToken(request.headers?.authorization);
    const payload = this.authService.verifyAccessToken(token);
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true }
    });

    if (!user) {
      throw new UnauthorizedException("Account is no longer active");
    }

    request.user = {
      id: user.id,
      email: user.email
    };

    return true;
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
