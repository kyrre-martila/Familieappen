import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { createApiResponse } from "./common";
import { AuthGuard } from "./auth/guards/auth.guard";
import { AdvertisementsService } from "./advertisements.service";
import { PublicAdvertisementEventDto, PublicAdvertisementQueryDto } from "./advertisements.dto";

type AuthReq = { user: { id: string } };

@Controller("advertisements")
@UseGuards(AuthGuard)
export class AdvertisementsController {
  constructor(private readonly service: AdvertisementsService) {}
  @Get() async list(@Query() q: PublicAdvertisementQueryDto) { return createApiResponse(await this.service.list(q)); }
  @Post(":id/impression") async impression(@Param("id") id: string, @Body() b: PublicAdvertisementEventDto, @Req() r: AuthReq) { return createApiResponse(await this.service.recordEvent(id, "IMPRESSION", r.user.id, b.placement)); }
  @Post(":id/click") async click(@Param("id") id: string, @Body() b: PublicAdvertisementEventDto, @Req() r: AuthReq) { return createApiResponse(await this.service.recordEvent(id, "CLICK", r.user.id, b.placement)); }
}
