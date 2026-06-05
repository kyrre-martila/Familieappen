import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { SharedWishlistItemDto, SharedWishlistItemsResponseDto, SharedWishlistSummaryDto, WishlistInvitePreviewDto, WishlistItemCreateInput, WishlistItemDto, WishlistItemListResponseDto, WishlistItemUpdateInput, WishlistReorderInput, WishlistShareInvitationDto, WishlistShareInviteInput, WishlistShareInviteResponseDto } from "./dto/wishlist.dto";
import { WishlistsService } from "./wishlists.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("wishlist")
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getMyWishlist(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<WishlistItemListResponseDto>> {
    return createApiResponse(await this.wishlistsService.listMyItems(request.user.id, requireFamilyId(familyId)));
  }

  @Get("share")
  @UseGuards(AuthGuard)
  async getShareInvitations(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<WishlistShareInvitationDto[]>> {
    return createApiResponse(await this.wishlistsService.listShareInvitations(request.user.id, requireFamilyId(familyId)));
  }

  @Post("share/invite")
  @UseGuards(AuthGuard)
  async inviteByEmail(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: WishlistShareInviteInput
  ): Promise<ApiResponse<WishlistShareInviteResponseDto>> {
    return createApiResponse(await this.wishlistsService.inviteByEmail(request.user.id, requireFamilyId(familyId), body));
  }

  @Post("share/:inviteId/resend")
  @UseGuards(AuthGuard)
  async resendInvitation(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("inviteId") inviteId: string
  ): Promise<ApiResponse<WishlistShareInviteResponseDto>> {
    return createApiResponse(await this.wishlistsService.resendInvitation(request.user.id, requireFamilyId(familyId), inviteId));
  }

  @Post("share/:inviteId/revoke")
  @UseGuards(AuthGuard)
  async revokeInvitation(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("inviteId") inviteId: string
  ): Promise<ApiResponse<WishlistShareInvitationDto>> {
    return createApiResponse(await this.wishlistsService.revokeInvitation(request.user.id, requireFamilyId(familyId), inviteId));
  }

  @Get("invites/:token")
  async getInvitePreview(@Param("token") token: string): Promise<ApiResponse<WishlistInvitePreviewDto>> {
    return createApiResponse(await this.wishlistsService.getInvitePreview(token));
  }

  @Post("invites/:token/accept")
  @UseGuards(AuthGuard)
  async acceptInvite(
    @Req() request: AuthenticatedRequest,
    @Param("token") token: string
  ): Promise<ApiResponse<WishlistShareInvitationDto>> {
    return createApiResponse(await this.wishlistsService.acceptInvite(request.user.id, token));
  }

  @Post("invites/:token/decline")
  @UseGuards(AuthGuard)
  async declineInvite(
    @Req() request: AuthenticatedRequest,
    @Param("token") token: string
  ): Promise<ApiResponse<WishlistShareInvitationDto>> {
    return createApiResponse(await this.wishlistsService.declineInvite(request.user.id, token));
  }

  @Get("shared")
  @UseGuards(AuthGuard)
  async getSharedWishlists(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<SharedWishlistSummaryDto[]>> {
    return createApiResponse(await this.wishlistsService.listSharedWishlists(request.user.id, requireFamilyId(familyId)));
  }

  @Post("shared/:shareId/remove")
  @UseGuards(AuthGuard)
  async removeSharedWishlist(
    @Req() request: AuthenticatedRequest,
    @Param("shareId") shareId: string
  ): Promise<ApiResponse<WishlistShareInvitationDto>> {
    return createApiResponse(await this.wishlistsService.removeSharedWishlist(request.user.id, shareId));
  }

  @Get("shared/:memberId")
  @UseGuards(AuthGuard)
  async getSharedWishlistItems(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("memberId") memberId: string
  ): Promise<ApiResponse<SharedWishlistItemsResponseDto>> {
    return createApiResponse(await this.wishlistsService.listSharedWishlistItems(request.user.id, requireFamilyId(familyId), memberId));
  }

  @Post()
  @UseGuards(AuthGuard)
  async createItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: WishlistItemCreateInput
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.createItem(request.user.id, requireFamilyId(familyId), body));
  }

  @Post("items/:itemId/reserve")
  @UseGuards(AuthGuard)
  async reserveItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string
  ): Promise<ApiResponse<SharedWishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.reserveItem(request.user.id, requireFamilyId(familyId), itemId));
  }

  @Post("items/:itemId/unreserve")
  @UseGuards(AuthGuard)
  async unreserveItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string
  ): Promise<ApiResponse<SharedWishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.unreserveItem(request.user.id, requireFamilyId(familyId), itemId));
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  async updateItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("id") id: string,
    @Body() body: WishlistItemUpdateInput
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.updateItem(request.user.id, requireFamilyId(familyId), id, body));
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async deleteItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("id") id: string
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.deleteItem(request.user.id, requireFamilyId(familyId), id));
  }

  @Post("reorder")
  @UseGuards(AuthGuard)
  async reorderItems(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: WishlistReorderInput
  ): Promise<ApiResponse<WishlistItemListResponseDto>> {
    return createApiResponse(await this.wishlistsService.reorderItems(request.user.id, requireFamilyId(familyId), body));
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
