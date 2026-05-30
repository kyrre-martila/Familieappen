import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
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
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const token = this.getBearerToken(request.headers?.authorization);
    const payload = this.authService.verifyAccessToken(token);

    request.user = {
      id: payload.sub,
      email: payload.email
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
