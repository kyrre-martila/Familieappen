import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ApiResponse, createApiResponse } from "../common";
import { AddFamilyMemberRequestDto, CreateFamilyRequestDto, FamilyDetailsDto, FamilyMemberDto, FamilyWithMembershipDto } from "./dto/family.dto";
import { FamiliesService } from "./families.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("families")
@UseGuards(AuthGuard)
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Post()
  async createFamily(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateFamilyRequestDto
  ): Promise<ApiResponse<FamilyDetailsDto>> {
    return createApiResponse(await this.familiesService.createFamily(request.user.id, body));
  }

  @Get()
  async listFamilies(@Req() request: AuthenticatedRequest): Promise<ApiResponse<FamilyWithMembershipDto[]>> {
    return createApiResponse(await this.familiesService.listUserFamilies(request.user.id));
  }

  @Get(":familyId")
  async getFamily(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string
  ): Promise<ApiResponse<FamilyDetailsDto>> {
    return createApiResponse(await this.familiesService.getFamilyDetails(request.user.id, familyId));
  }

  @Post(":familyId/members")
  async addMember(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string,
    @Body() body: AddFamilyMemberRequestDto
  ): Promise<ApiResponse<FamilyMemberDto>> {
    return createApiResponse(await this.familiesService.addFamilyMember(request.user.id, familyId, body));
  }

  @Delete(":familyId/members/:memberId")
  async removeMember(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string,
    @Param("memberId") memberId: string
  ): Promise<ApiResponse<FamilyMemberDto>> {
    return createApiResponse(await this.familiesService.removeFamilyMember(request.user.id, familyId, memberId));
  }
}
