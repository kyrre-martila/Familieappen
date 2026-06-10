import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ApiResponse, createApiResponse } from "../common";
import { FamilyDashboardDto } from "./dto/dashboard.dto";
import {
  AddFamilyMemberRequestDto,
  CreateFamilyRequestDto,
  FamilyDetailsDto,
  FamilyDto,
  FamilyInvitationDto,
  FamilyInviteRequestDto,
  FamilyInviteResponseDto,
  FamilyMemberDto,
  JoinFamilyByCodeRequestDto,
  FamilyWithMembershipDto,
  UpdateFamilyMemberRequestDto,
  UpdateFamilyRequestDto
} from "./dto/family.dto";
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


  @Post("join-by-code")
  async joinFamilyByCode(
    @Req() request: AuthenticatedRequest,
    @Body() body: JoinFamilyByCodeRequestDto
  ): Promise<ApiResponse<FamilyInvitationDto>> {
    return createApiResponse(await this.familiesService.joinFamilyByCode(request.user.id, body));
  }

  @Get()
  async listFamilies(@Req() request: AuthenticatedRequest): Promise<ApiResponse<FamilyWithMembershipDto[]>> {
    return createApiResponse(await this.familiesService.listUserFamilies(request.user.id));
  }

  @Patch(":familyId")
  async updateFamily(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string,
    @Body() body: UpdateFamilyRequestDto
  ): Promise<ApiResponse<FamilyDto>> {
    return createApiResponse(await this.familiesService.updateFamily(request.user.id, familyId, body));
  }

  @Get(":familyId/dashboard")
  async getFamilyDashboard(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string
  ): Promise<ApiResponse<FamilyDashboardDto>> {
    return createApiResponse(await this.familiesService.getFamilyDashboard(request.user.id, familyId));
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

  @Patch(":familyId/members/:memberId")
  async updateMember(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string,
    @Param("memberId") memberId: string,
    @Body() body: UpdateFamilyMemberRequestDto
  ): Promise<ApiResponse<FamilyMemberDto>> {
    return createApiResponse(await this.familiesService.updateFamilyMember(request.user.id, familyId, memberId, body));
  }

  @Get(":familyId/invitations")
  async listInvitations(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string
  ): Promise<ApiResponse<FamilyInvitationDto[]>> {
    return createApiResponse(await this.familiesService.listFamilyInvitations(request.user.id, familyId));
  }

  @Post(":familyId/invitations")
  async inviteFamilyMember(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string,
    @Body() body: FamilyInviteRequestDto
  ): Promise<ApiResponse<FamilyInviteResponseDto>> {
    return createApiResponse(await this.familiesService.inviteFamilyMember(request.user.id, familyId, body));
  }

  @Post(":familyId/invitations/:inviteId/resend")
  async resendInvitation(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string,
    @Param("inviteId") inviteId: string
  ): Promise<ApiResponse<FamilyInviteResponseDto>> {
    return createApiResponse(await this.familiesService.resendFamilyInvitation(request.user.id, familyId, inviteId));
  }

  @Post(":familyId/invitations/:inviteId/revoke")
  async revokeInvitation(
    @Req() request: AuthenticatedRequest,
    @Param("familyId") familyId: string,
    @Param("inviteId") inviteId: string
  ): Promise<ApiResponse<FamilyInvitationDto>> {
    return createApiResponse(await this.familiesService.revokeFamilyInvitation(request.user.id, familyId, inviteId));
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
