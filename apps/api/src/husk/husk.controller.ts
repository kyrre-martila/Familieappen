import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { CreateReminderRequestDto, ReminderDto, UpdateReminderRequestDto } from "./dto/reminder.dto";
import { HuskService } from "./husk.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("husk/reminders")
@UseGuards(AuthGuard)
export class HuskController {
  constructor(private readonly huskService: HuskService) {}

  @Get()
  async listReminders(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<ReminderDto[]>> {
    return createApiResponse(await this.huskService.listReminders(request.user.id, requireFamilyId(familyId)));
  }

  @Post()
  async createReminder(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: CreateReminderRequestDto
  ): Promise<ApiResponse<ReminderDto>> {
    return createApiResponse(await this.huskService.createReminder(request.user.id, requireFamilyId(familyId), body));
  }

  @Patch(":reminderId")
  async updateReminder(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("reminderId") reminderId: string,
    @Body() body: UpdateReminderRequestDto
  ): Promise<ApiResponse<ReminderDto>> {
    return createApiResponse(await this.huskService.updateReminder(request.user.id, requireFamilyId(familyId), reminderId, body));
  }

  @Delete(":reminderId")
  async deleteReminder(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("reminderId") reminderId: string
  ): Promise<ApiResponse<ReminderDto>> {
    return createApiResponse(await this.huskService.deleteReminder(request.user.id, requireFamilyId(familyId), reminderId));
  }
}

function requireFamilyId(familyId: string | undefined): string {
  if (!familyId) {
    throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.FAMILY_MISSING_CONTEXT, "X-Family-Id header is required");
  }

  return familyId;
}
