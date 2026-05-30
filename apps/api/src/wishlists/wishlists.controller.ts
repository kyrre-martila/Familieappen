import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import {
  AddWishlistItemRequestDto,
  CreateWishlistRequestDto,
  PublicWishlistDto,
  PublicWishlistItemDto,
  ReserveWishlistItemRequestDto,
  UpdateWishlistItemRequestDto,
  WishlistDto,
  WishlistItemDto,
  WishlistShareDto,
  WishlistSummaryDto
} from "./dto/wishlist.dto";
import { WishlistsService } from "./wishlists.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("wishlists")
@UseGuards(AuthGuard)
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  async listWishlists(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<WishlistSummaryDto[]>> {
    return createApiResponse(await this.wishlistsService.listWishlists(request.user.id, requireFamilyId(familyId)));
  }

  @Post()
  async createWishlist(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: CreateWishlistRequestDto
  ): Promise<ApiResponse<WishlistDto>> {
    return createApiResponse(await this.wishlistsService.createWishlist(request.user.id, requireFamilyId(familyId), body));
  }

  @Get(":wishlistId")
  async getWishlist(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("wishlistId") wishlistId: string
  ): Promise<ApiResponse<WishlistDto>> {
    return createApiResponse(await this.wishlistsService.getWishlist(request.user.id, requireFamilyId(familyId), wishlistId));
  }

  @Post(":wishlistId/items")
  async addItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("wishlistId") wishlistId: string,
    @Body() body: AddWishlistItemRequestDto
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.addItem(request.user.id, requireFamilyId(familyId), wishlistId, body));
  }

  @Patch("items/:itemId")
  async updateItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateWishlistItemRequestDto
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.updateItem(request.user.id, requireFamilyId(familyId), itemId, body));
  }

  @Delete("items/:itemId")
  async deleteItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.deleteItem(request.user.id, requireFamilyId(familyId), itemId));
  }

  @Post("items/:itemId/reserve")
  async reserveItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string,
    @Body() body: ReserveWishlistItemRequestDto
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.reserveItem(request.user.id, requireFamilyId(familyId), itemId, body));
  }

  @Post("items/:itemId/mark-purchased")
  async markPurchased(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string,
    @Body() body: ReserveWishlistItemRequestDto
  ): Promise<ApiResponse<WishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.markPurchased(request.user.id, requireFamilyId(familyId), itemId, body));
  }

  @Post(":wishlistId/share")
  async createShare(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("wishlistId") wishlistId: string
  ): Promise<ApiResponse<WishlistShareDto>> {
    return createApiResponse(await this.wishlistsService.createShare(request.user.id, requireFamilyId(familyId), wishlistId));
  }
}

@Controller("public/wishlists")
export class PublicWishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get(":token")
  async getPublicWishlist(@Param("token") token: string): Promise<ApiResponse<PublicWishlistDto>> {
    return createApiResponse(await this.wishlistsService.getPublicWishlist(token));
  }

  @Post(":token/items/:itemId/reserve")
  async reservePublicItem(
    @Param("token") token: string,
    @Param("itemId") itemId: string,
    @Body() body: ReserveWishlistItemRequestDto
  ): Promise<ApiResponse<PublicWishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.reservePublicItem(token, itemId, body));
  }

  @Post(":token/items/:itemId/mark-purchased")
  async markPublicItemPurchased(
    @Param("token") token: string,
    @Param("itemId") itemId: string,
    @Body() body: ReserveWishlistItemRequestDto
  ): Promise<ApiResponse<PublicWishlistItemDto>> {
    return createApiResponse(await this.wishlistsService.markPublicItemPurchased(token, itemId, body));
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
