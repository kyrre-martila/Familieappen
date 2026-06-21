import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ApiResponse, createApiResponse } from "../common";
import { NotificationDto, PushDeviceDto, RegisterPushDeviceRequestDto } from "./dto/notifications.dto";
import { NotificationsService } from "./notifications.service";

type AuthenticatedRequest = { user: { id: string; email: string } };

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listNotifications(
    @Req() request: AuthenticatedRequest,
    @Query("unreadOnly") unreadOnly?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Query("before") before?: string
  ): Promise<ApiResponse<NotificationDto[]>> {
    return createApiResponse(await this.notificationsService.listNotifications(request.user.id, { unreadOnly, limit, cursor, before }));
  }

  @Get("unread-count")
  async getUnreadCount(@Req() request: AuthenticatedRequest): Promise<ApiResponse<{ count: number }>> {
    return createApiResponse({ count: await this.notificationsService.getUnreadCount(request.user.id) });
  }

  @Patch("read-all")
  async markAllRead(@Req() request: AuthenticatedRequest): Promise<ApiResponse<{ count: number }>> {
    return createApiResponse(await this.notificationsService.markAllRead(request.user.id));
  }

  @Patch(":id/read")
  async markRead(@Req() request: AuthenticatedRequest, @Param("id") id: string): Promise<ApiResponse<NotificationDto>> {
    return createApiResponse(await this.notificationsService.markRead(request.user.id, id));
  }

  @Post("devices")
  async registerDevice(@Req() request: AuthenticatedRequest, @Body() body: RegisterPushDeviceRequestDto): Promise<ApiResponse<PushDeviceDto>> {
    return createApiResponse(await this.notificationsService.registerDevice(request.user.id, body));
  }

  @Delete("devices/:id")
  async disableDevice(@Req() request: AuthenticatedRequest, @Param("id") id: string): Promise<ApiResponse<PushDeviceDto>> {
    return createApiResponse(await this.notificationsService.disableDevice(request.user.id, id));
  }
}
