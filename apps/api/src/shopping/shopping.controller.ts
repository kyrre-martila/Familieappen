import { Body, Controller, Delete, Get, Headers, HttpStatus, Logger, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { AddShoppingItemRequestDto, CreateShoppingListRequestDto, ShoppingCatalogCategoryDto, ShoppingCatalogItemDto, ShoppingListDto, ShoppingListInvitationDto, ShoppingListInvitePreviewDto, ShoppingListInviteRequestDto, ShoppingListInviteResponseDto, ShoppingListItemDto, ShoppingListSummaryDto, UpdateShoppingItemRequestDto } from "./dto/shopping.dto";
import { ShoppingService } from "./shopping.service";

type AuthenticatedRequest = { user: { id: string; email: string } };

@Controller("shopping")
export class ShoppingController {
  private readonly logger = new Logger(ShoppingController.name);

  constructor(private readonly shoppingService: ShoppingService) {}
  @Get("catalog/categories") @UseGuards(AuthGuard) async getCatalogCategories(): Promise<ApiResponse<ShoppingCatalogCategoryDto[]>> { return createApiResponse(await this.shoppingService.getCatalogCategories()); }
  @Get("catalog/items") @UseGuards(AuthGuard) async getCatalogItems(): Promise<ApiResponse<ShoppingCatalogItemDto[]>> { return createApiResponse(await this.shoppingService.getCatalogItems()); }
  @Get("catalog/search") @UseGuards(AuthGuard) async searchCatalog(@Query("q") query = ""): Promise<ApiResponse<ShoppingCatalogItemDto[]>> { return createApiResponse(await this.shoppingService.searchCatalog(query)); }
  @Get("lists") @UseGuards(AuthGuard) async listShoppingLists(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string): Promise<ApiResponse<ShoppingListSummaryDto[]>> { return createApiResponse(await this.shoppingService.listShoppingLists(request.user.id, requireFamilyId(familyId))); }
  @Post("lists") @UseGuards(AuthGuard) async createShoppingList(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Body() body: CreateShoppingListRequestDto): Promise<ApiResponse<ShoppingListDto>> {
    try {
      return createApiResponse(await this.shoppingService.createShoppingList(request.user.id, requireFamilyId(familyId), body));
    } catch (error) {
      this.logger.error(
        `Failed to create shopping list for user ${request.user.id} in family ${familyId ?? "<missing>"}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }
  @Get() @UseGuards(AuthGuard) async getShoppingList(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Query("listId") listId?: string): Promise<ApiResponse<ShoppingListDto>> { return createApiResponse(await this.shoppingService.getShoppingList(request.user.id, requireFamilyId(familyId), listId)); }
  @Post("lists/:listId/invite") @UseGuards(AuthGuard) async inviteByEmail(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("listId") listId: string, @Body() body: ShoppingListInviteRequestDto): Promise<ApiResponse<ShoppingListInviteResponseDto>> { return createApiResponse(await this.shoppingService.inviteByEmail(request.user.id, requireFamilyId(familyId), listId, body)); }
  @Get("invites/:token") async getInvitePreview(@Param("token") token: string): Promise<ApiResponse<ShoppingListInvitePreviewDto>> { return createApiResponse(await this.shoppingService.getInvitePreview(token)); }
  @Post("invites/:token/accept") @UseGuards(AuthGuard) async acceptInvite(@Req() request: AuthenticatedRequest, @Param("token") token: string): Promise<ApiResponse<ShoppingListInvitationDto>> { return createApiResponse(await this.shoppingService.acceptInvite(request.user.id, token)); }
  @Post("items") @UseGuards(AuthGuard) async addItem(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Query("listId") listId: string | undefined, @Body() body: AddShoppingItemRequestDto): Promise<ApiResponse<ShoppingListItemDto>> { return createApiResponse(await this.shoppingService.addItem(request.user.id, requireFamilyId(familyId), body, listId)); }
  @Patch("items/:itemId") @UseGuards(AuthGuard) async updateOrToggleItem(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Query("listId") listId: string | undefined, @Param("itemId") itemId: string, @Body() body?: UpdateShoppingItemRequestDto): Promise<ApiResponse<ShoppingListItemDto>> { return createApiResponse(body && Object.keys(body).length > 0 ? await this.shoppingService.updateItem(request.user.id, requireFamilyId(familyId), itemId, body, listId) : await this.shoppingService.toggleItem(request.user.id, requireFamilyId(familyId), itemId, listId)); }
  @Delete("items/:itemId") @UseGuards(AuthGuard) async deleteItem(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Query("listId") listId: string | undefined, @Param("itemId") itemId: string): Promise<ApiResponse<ShoppingListItemDto>> { return createApiResponse(await this.shoppingService.deleteItem(request.user.id, requireFamilyId(familyId), itemId, listId)); }
}
function requireFamilyId(familyId: string | undefined): string { if (!familyId) throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.FAMILY_MISSING_CONTEXT, "X-Family-Id header is required"); return familyId; }
