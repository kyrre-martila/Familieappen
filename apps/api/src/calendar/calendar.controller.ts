import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { CalendarService } from "./calendar.service";
import {
  CalendarEventDto,
  CreateCalendarEventRequestDto,
  ListCalendarEventsQueryDto,
  UpdateCalendarEventRequestDto
} from "./dto/calendar.dto";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("calendar/events")
@UseGuards(AuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async listEvents(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Query() query: ListCalendarEventsQueryDto
  ): Promise<ApiResponse<CalendarEventDto[]>> {
    return createApiResponse(await this.calendarService.listEvents(request.user.id, requireFamilyId(familyId), query));
  }

  @Post()
  async createEvent(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: CreateCalendarEventRequestDto
  ): Promise<ApiResponse<CalendarEventDto>> {
    return createApiResponse(await this.calendarService.createEvent(request.user.id, requireFamilyId(familyId), body));
  }

  @Patch(":eventId")
  async updateEvent(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("eventId") eventId: string,
    @Body() body: UpdateCalendarEventRequestDto
  ): Promise<ApiResponse<CalendarEventDto>> {
    return createApiResponse(await this.calendarService.updateEvent(request.user.id, requireFamilyId(familyId), eventId, body));
  }

  @Delete(":eventId")
  async deleteEvent(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("eventId") eventId: string
  ): Promise<ApiResponse<CalendarEventDto>> {
    return createApiResponse(await this.calendarService.deleteEvent(request.user.id, requireFamilyId(familyId), eventId));
  }
}

function requireFamilyId(familyId: string | undefined): string {
  if (!familyId) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      API_ERROR_CODES.FAMILY_MISSING_CONTEXT,
      "X-Family-Id header is required"
    );
  }

  return familyId;
}
