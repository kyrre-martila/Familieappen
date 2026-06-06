import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ApiResponse, createApiResponse } from "../common";
import { NotificationPreferencesDto, UpdateNotificationPreferencesRequestDto } from "./dto/notification-preferences.dto";
import { NotificationPreferencesService } from "./notification-preferences.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("notification-preferences")
@UseGuards(AuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly notificationPreferencesService: NotificationPreferencesService) {}

  @Get()
  async getPreferences(@Req() request: AuthenticatedRequest): Promise<ApiResponse<NotificationPreferencesDto>> {
    return createApiResponse(await this.notificationPreferencesService.getPreferences(request.user.id));
  }

  @Patch()
  async updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateNotificationPreferencesRequestDto
  ): Promise<ApiResponse<NotificationPreferencesDto>> {
    return createApiResponse(await this.notificationPreferencesService.updatePreferences(request.user.id, body));
  }
}
