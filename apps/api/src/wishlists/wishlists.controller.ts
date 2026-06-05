import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { SharedWishlistItemsResponseDto, SharedWishlistSummaryDto, WishlistItemCreateInput, WishlistItemDto, WishlistItemListResponseDto, WishlistItemUpdateInput, WishlistReorderInput } from "./dto/wishlist.dto";
import { WishlistsService } from "./wishlists.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("wishlist")
@UseGuards(AuthGuard)
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  async getMyWishlist(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<WishlistItemListResponseDto>> {
    return createApiResponse(await this.wishlistsService.listMyItems(request.user.id, requireFamilyId(familyId)));
  }


  @Get("shared")
  async getSharedWishlists(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<SharedWishlistSummaryDto[]>> {
    return createApiResponse(await this.wishlistsService.listSharedWishlists(request.user.id, requireFamilyId(familyId)));
  }

  @Get("shared/:memberId")
  async getSharedWishlistItems(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("memberId") memberId: string
  ): Promise<ApiResponse<SharedWishlistItemsResponseDto>> {
    return createApiResponse(await this.wishlistsService.listSharedWishlistItems(request.user.id, requireFamilyId(familyId), memberId));
  }

  @Post()
  async createItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: WishlistItemCreateInput
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.createItem(request.user.id, requireFamilyId(familyId), body));
  }

  @Patch(":id")
  async updateItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("id") id: string,
    @Body() body: WishlistItemUpdateInput
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.updateItem(request.user.id, requireFamilyId(familyId), id, body));
  }

  @Delete(":id")
  async deleteItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("id") id: string
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.deleteItem(request.user.id, requireFamilyId(familyId), id));
  }

  @Post("reorder")
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
