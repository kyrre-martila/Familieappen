import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { CreateSchoolWeekReminderRequestDto, SchoolWeekReminderDto, UpdateSchoolWeekReminderRequestDto } from "./dto/school-week.dto";
import { SchoolWeekService } from "./school-week.service";

type AuthenticatedRequest = { user: { id: string; email: string } };

@Controller("school-week")
@UseGuards(AuthGuard)
export class SchoolWeekController {
  constructor(private readonly schoolWeekService: SchoolWeekService) {}

  @Get()
  async listWeek(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Query("weekStart") weekStart: string): Promise<ApiResponse<SchoolWeekReminderDto[]>> {
    return createApiResponse(await this.schoolWeekService.listWeek(request.user.id, requireFamilyId(familyId), weekStart));
  }

  @Post()
  async createReminder(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Body() body: CreateSchoolWeekReminderRequestDto): Promise<ApiResponse<SchoolWeekReminderDto>> {
    return createApiResponse(await this.schoolWeekService.createReminder(request.user.id, requireFamilyId(familyId), body));
  }

  @Patch(":reminderId")
  async updateReminder(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("reminderId") reminderId: string, @Body() body: UpdateSchoolWeekReminderRequestDto): Promise<ApiResponse<SchoolWeekReminderDto>> {
    return createApiResponse(await this.schoolWeekService.updateReminder(request.user.id, requireFamilyId(familyId), reminderId, body));
  }

  @Delete(":reminderId")
  async deleteReminder(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("reminderId") reminderId: string, @Query("scope") scope: string, @Query("occurrenceDate") occurrenceDate: string): Promise<ApiResponse<SchoolWeekReminderDto>> {
    return createApiResponse(await this.schoolWeekService.deleteReminder(request.user.id, requireFamilyId(familyId), reminderId, scope, occurrenceDate));
  }
}

function requireFamilyId(familyId: string | undefined): string {
  if (!familyId) {
    throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.FAMILY_MISSING_CONTEXT, "X-Family-Id header is required");
  }

  return familyId;
}
