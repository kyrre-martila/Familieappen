import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ApiResponse, createApiResponse } from "../common";
import { FamilyAddressResponseDto, SaveFamilyAddressDto } from "./dto/family-address.dto";
import { WasteCollectionService } from "./waste-collection.service";

type Request = { user: { id: string } };

/** Family-owned address operations live under the Families API, not the integration API. */
@Controller("families/:familyId/address")
@UseGuards(AuthGuard)
export class FamilyAddressController {
  constructor(private readonly service: WasteCollectionService) {}

  @Get()
  async get(@Req() request: Request, @Param("familyId") familyId: string): Promise<ApiResponse<FamilyAddressResponseDto>> {
    return createApiResponse(await this.service.getFamilyAddress(request.user.id, familyId));
  }

  @Put()
  async put(@Req() request: Request, @Param("familyId") familyId: string, @Body() body: SaveFamilyAddressDto): Promise<ApiResponse<FamilyAddressResponseDto>> {
    return createApiResponse(await this.service.saveFamilyAddress(request.user.id, familyId, body.address));
  }
}
