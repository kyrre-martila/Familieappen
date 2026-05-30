import { Body, Controller, Post } from "@nestjs/common";
import { createApiResponse, ApiResponse } from "../common";
import { AuthService } from "./auth.service";
import { AuthResponseDto, LoginRequestDto, RegisterRequestDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: RegisterRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    return createApiResponse(await this.authService.register(body));
  }

  @Post("login")
  async login(@Body() body: LoginRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    return createApiResponse(await this.authService.login(body));
  }
}
