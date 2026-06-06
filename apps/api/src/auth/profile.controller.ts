import { Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiResponse, createApiResponse } from "../common";
import { AuthGuard } from "./guards/auth.guard";
import { ChangePasswordRequestDto, ChangePasswordResponseDto, DeleteAccountRequestDto, DeleteAccountResponseDto, UpdateUserProfileRequestDto, UserProfileDto } from "./dto/profile.dto";
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

  @Post("change-password")
  async changeCurrentUserPassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordRequestDto
  ): Promise<ApiResponse<ChangePasswordResponseDto>> {
    return createApiResponse(await this.profileService.changeCurrentUserPassword(request.user.id, body));
  }

  @Delete()
  async deleteCurrentUserAccount(
    @Req() request: AuthenticatedRequest,
    @Body() body: DeleteAccountRequestDto
  ): Promise<ApiResponse<DeleteAccountResponseDto>> {
    return createApiResponse(await this.profileService.deleteCurrentUserAccount(request.user.id, body));
  }

  @Patch()
  async updateCurrentUserProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateUserProfileRequestDto
  ): Promise<ApiResponse<UserProfileDto>> {
    return createApiResponse(await this.profileService.updateCurrentUserProfile(request.user.id, body));
  }
}
