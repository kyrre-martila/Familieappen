import { Body, Controller, Get, Headers, HttpStatus, Put, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { ConfigureWasteCollectionDto, WasteEventDto, WasteSubscriptionDto } from "./dto/waste-collection.dto";
import { WasteCollectionService } from "./waste-collection.service";

type Request = { user: { id: string } };
@Controller("waste-collection")
@UseGuards(AuthGuard)
export class WasteCollectionController {
  constructor(private readonly service: WasteCollectionService) {}
  @Put("subscription") configure(@Req() req: Request, @Headers("x-family-id") familyId: string, @Body() body: ConfigureWasteCollectionDto): Promise<ApiResponse<WasteSubscriptionDto>> {
    return this.wrap(this.service.configure(req.user.id, requireFamilyId(familyId), body));
  }
  @Get("subscription") get(@Req() req: Request, @Headers("x-family-id") familyId: string): Promise<ApiResponse<WasteSubscriptionDto>> {
    return this.wrap(this.service.getSubscription(req.user.id, requireFamilyId(familyId)));
  }
  @Get("events") events(@Req() req: Request, @Headers("x-family-id") familyId: string, @Query("from") from?: string, @Query("to") to?: string): Promise<ApiResponse<WasteEventDto[]>> {
    return this.wrap(this.service.listEvents(req.user.id, requireFamilyId(familyId), from, to));
  }
  private async wrap<T>(promise: Promise<T>): Promise<ApiResponse<T>> { return createApiResponse(await promise); }
}
function requireFamilyId(value?: string): string { if (!value) throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.FAMILY_MISSING_CONTEXT, "X-Family-Id header is required"); return value; }
