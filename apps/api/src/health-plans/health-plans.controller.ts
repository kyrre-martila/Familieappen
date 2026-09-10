import { Body, Controller, Get, Headers, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { CreateHealthPlanDto, CreateHealthPlanNoteDto, ListHealthPlanOccurrencesQueryDto, UpdateHealthPlanDto, UpdateHealthPlanOccurrenceDto } from "./health-plans.dto";
import { HealthPlansService } from "./health-plans.service";

type Request = { user: { id: string; email: string } };

@Controller("health-plans")
@UseGuards(AuthGuard)
export class HealthPlansController {
  constructor(private readonly service: HealthPlansService) {}
  private context(request: Request, familyId?: string): [string, string] {
    if (!familyId) throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.FAMILY_MISSING_CONTEXT, "X-Family-Id header is required");
    return [request.user.id, familyId];
  }

  @Get() list(@Req() req: Request, @Headers("x-family-id") familyId?: string): Promise<ApiResponse<unknown>> {
    return this.service.list(...this.context(req, familyId)).then(createApiResponse);
  }
  @Post() create(@Req() req: Request, @Headers("x-family-id") familyId: string | undefined, @Body() body: CreateHealthPlanDto): Promise<ApiResponse<unknown>> {
    return this.service.create(...this.context(req, familyId), body).then(createApiResponse);
  }
  @Get(":id") get(@Req() req: Request, @Headers("x-family-id") familyId: string | undefined, @Param("id") id: string): Promise<ApiResponse<unknown>> {
    return this.service.get(...this.context(req, familyId), id).then(createApiResponse);
  }
  @Patch(":id") update(@Req() req: Request, @Headers("x-family-id") familyId: string | undefined, @Param("id") id: string, @Body() body: UpdateHealthPlanDto): Promise<ApiResponse<unknown>> {
    return this.service.update(...this.context(req, familyId), id, body).then(createApiResponse);
  }
  @Post(":id/start") start(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string) { return this.command(req, f, id, "start"); }
  @Post(":id/pause") pause(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string) { return this.command(req, f, id, "pause"); }
  @Post(":id/resume") resume(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string) { return this.command(req, f, id, "resume"); }
  @Post(":id/level-up") levelUp(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string) { return this.command(req, f, id, "levelUp"); }
  @Post(":id/level-down") levelDown(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string) { return this.command(req, f, id, "levelDown"); }
  @Post(":id/archive") archive(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string) { return this.command(req, f, id, "archive"); }
  private command(req: Request, familyId: string | undefined, id: string, command: "start" | "pause" | "resume" | "levelUp" | "levelDown" | "archive") {
    return this.service[command](...this.context(req, familyId), id).then(createApiResponse);
  }
  @Post(":id/notes") note(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string, @Body() body: CreateHealthPlanNoteDto) {
    return this.service.addNote(...this.context(req, f), id, body).then(createApiResponse);
  }
  @Get(":id/history") history(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string) {
    return this.service.history(...this.context(req, f), id).then(createApiResponse);
  }
  @Get(":id/occurrences") occurrences(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string, @Query() query: ListHealthPlanOccurrencesQueryDto) {
    return this.service.occurrences(...this.context(req, f), id, query).then(createApiResponse);
  }
  @Patch(":id/occurrences/:occurrenceId") occurrence(@Req() req: Request, @Headers("x-family-id") f: string | undefined, @Param("id") id: string, @Param("occurrenceId") occurrenceId: string, @Body() body: UpdateHealthPlanOccurrenceDto) {
    return this.service.updateOccurrence(...this.context(req, f), id, occurrenceId, body).then(createApiResponse);
  }
}
