import { Body, Controller, Delete, Get, Header, Headers, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { CalendarIcsFeedService } from "./calendar-ics-feed.service";
import { CalendarIcsSyncService } from "./calendar-ics-sync.service";
import {
  CalendarExportFeedDto,
  CalendarIcsSourceDto,
  CalendarIcsSyncResultDto,
  CreateCalendarIcsSourceRequestDto,
  CreateCalendarExportFeedRequestDto,
  UpdateCalendarExportFeedRequestDto,
  UpdateCalendarIcsSourceRequestDto
} from "./dto/calendar-ics.dto";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("calendar")
export class CalendarIcsFeedController {
  constructor(private readonly feedService: CalendarIcsFeedService) {}

  @Get("feed/:token")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Cache-Control", "private, max-age=300")
  async renderFeed(@Param("token") token: string): Promise<string> {
    return this.feedService.renderFeed(token);
  }
}

@Controller("calendar")
@UseGuards(AuthGuard)
export class CalendarIcsController {
  constructor(
    private readonly syncService: CalendarIcsSyncService,
    private readonly feedService: CalendarIcsFeedService
  ) {}

  @Get("ics-sources")
  async listSources(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<CalendarIcsSourceDto[]>> {
    return createApiResponse(await this.syncService.listSources(request.user.id, requireFamilyId(familyId)));
  }

  @Post("ics-sources")
  async createSource(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: CreateCalendarIcsSourceRequestDto
  ): Promise<ApiResponse<CalendarIcsSourceDto>> {
    return createApiResponse(await this.syncService.createSource(request.user.id, requireFamilyId(familyId), body));
  }

  @Patch("ics-sources/:sourceId")
  async updateSource(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("sourceId") sourceId: string,
    @Body() body: UpdateCalendarIcsSourceRequestDto
  ): Promise<ApiResponse<CalendarIcsSourceDto>> {
    return createApiResponse(await this.syncService.updateSource(request.user.id, requireFamilyId(familyId), sourceId, body));
  }

  @Delete("ics-sources/:sourceId")
  async deleteSource(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("sourceId") sourceId: string
  ): Promise<ApiResponse<CalendarIcsSourceDto>> {
    return createApiResponse(await this.syncService.deleteSource(request.user.id, requireFamilyId(familyId), sourceId));
  }

  @Post("ics-sources/:sourceId/sync")
  async syncSource(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("sourceId") sourceId: string
  ): Promise<ApiResponse<CalendarIcsSyncResultDto>> {
    return createApiResponse(await this.syncService.syncSourceForUser(request.user.id, requireFamilyId(familyId), sourceId));
  }

  @Get("feed-settings")
  async getFeedSettings(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<CalendarExportFeedDto>> {
    return createApiResponse(await this.feedService.getOrCreateFeed(request.user.id, requireFamilyId(familyId)));
  }

  @Get("feeds")
  async listFeeds(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string): Promise<ApiResponse<CalendarExportFeedDto[]>> {
    return createApiResponse(await this.feedService.listFeeds(request.user.id, requireFamilyId(familyId)));
  }

  @Post("feeds")
  async createFeed(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Body() body: CreateCalendarExportFeedRequestDto): Promise<ApiResponse<CalendarExportFeedDto>> {
    return createApiResponse(await this.feedService.createFeed(request.user.id, requireFamilyId(familyId), body));
  }

  @Get("feeds/:feedId")
  async getFeed(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("feedId") feedId: string): Promise<ApiResponse<CalendarExportFeedDto>> {
    return createApiResponse(await this.feedService.getFeed(request.user.id, requireFamilyId(familyId), feedId));
  }

  @Patch("feeds/:feedId")
  async updateFeed(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("feedId") feedId: string, @Body() body: UpdateCalendarExportFeedRequestDto): Promise<ApiResponse<CalendarExportFeedDto>> {
    return createApiResponse(await this.feedService.updateFeed(request.user.id, requireFamilyId(familyId), feedId, body));
  }

  @Delete("feeds/:feedId")
  async deleteFeed(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("feedId") feedId: string): Promise<ApiResponse<CalendarExportFeedDto>> {
    return createApiResponse(await this.feedService.deleteFeed(request.user.id, requireFamilyId(familyId), feedId));
  }

  @Post("feeds/:feedId/regenerate")
  async regenerateFeed(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("feedId") feedId: string): Promise<ApiResponse<CalendarExportFeedDto>> {
    return createApiResponse(await this.feedService.regenerateFeedToken(request.user.id, requireFamilyId(familyId), feedId));
  }

  @Patch("feed-settings")
  async updateFeedSettings(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: UpdateCalendarExportFeedRequestDto
  ): Promise<ApiResponse<CalendarExportFeedDto>> {
    return createApiResponse(await this.feedService.updateLegacyFeed(request.user.id, requireFamilyId(familyId), body));
  }

  @Post("feed-settings/regenerate")
  async regenerateFeedToken(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<CalendarExportFeedDto>> {
    return createApiResponse(await this.feedService.regenerateLegacyFeed(request.user.id, requireFamilyId(familyId)));
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
