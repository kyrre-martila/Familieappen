import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiResponse, createApiResponse } from "../common";
import { AuthGuard } from "./guards/auth.guard";
import { UpdateUserProfileRequestDto, UserProfileDto } from "./dto/profile.dto";
import { ProfileService } from "./profile.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("me")
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getCurrentUserProfile(@Req() request: AuthenticatedRequest): Promise<ApiResponse<UserProfileDto>> {
    return createApiResponse(await this.profileService.getCurrentUserProfile(request.user.id));
  }

  @Patch()
  async updateCurrentUserProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateUserProfileRequestDto
  ): Promise<ApiResponse<UserProfileDto>> {
    return createApiResponse(await this.profileService.updateCurrentUserProfile(request.user.id, body));
  }
}
