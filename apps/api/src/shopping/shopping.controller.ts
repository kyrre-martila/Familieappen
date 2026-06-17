import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { AddShoppingItemRequestDto, ShoppingCatalogCategoryDto, ShoppingCatalogItemDto, ShoppingListDto, ShoppingListItemDto, UpdateShoppingItemRequestDto } from "./dto/shopping.dto";
import { ShoppingService } from "./shopping.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("shopping")
@UseGuards(AuthGuard)
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}


  @Get("catalog/categories")
  async getCatalogCategories(): Promise<ApiResponse<ShoppingCatalogCategoryDto[]>> {
    return createApiResponse(await this.shoppingService.getCatalogCategories());
  }

  @Get("catalog/items")
  async getCatalogItems(): Promise<ApiResponse<ShoppingCatalogItemDto[]>> {
    return createApiResponse(await this.shoppingService.getCatalogItems());
  }

  @Get("catalog/search")
  async searchCatalog(@Query("q") query = ""): Promise<ApiResponse<ShoppingCatalogItemDto[]>> {
    return createApiResponse(await this.shoppingService.searchCatalog(query));
  }

  @Get()
  async getShoppingList(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<ShoppingListDto>> {
    return createApiResponse(await this.shoppingService.getShoppingList(request.user.id, requireFamilyId(familyId)));
  }

  @Post("items")
  async addItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: AddShoppingItemRequestDto
  ): Promise<ApiResponse<ShoppingListItemDto>> {
    return createApiResponse(await this.shoppingService.addItem(request.user.id, requireFamilyId(familyId), body));
  }

  @Patch("items/:itemId")
  async updateOrToggleItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string,
    @Body() body?: UpdateShoppingItemRequestDto
  ): Promise<ApiResponse<ShoppingListItemDto>> {
    if (body && Object.keys(body).length > 0) {
      return createApiResponse(await this.shoppingService.updateItem(request.user.id, requireFamilyId(familyId), itemId, body));
    }

    return createApiResponse(await this.shoppingService.toggleItem(request.user.id, requireFamilyId(familyId), itemId));
  }

  @Delete("items/:itemId")
  async deleteItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string
  ): Promise<ApiResponse<ShoppingListItemDto>> {
    return createApiResponse(await this.shoppingService.deleteItem(request.user.id, requireFamilyId(familyId), itemId));
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
