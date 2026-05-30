import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { AddShoppingItemRequestDto, ShoppingListDto, ShoppingListItemDto } from "./dto/shopping.dto";
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
  async toggleItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string
  ): Promise<ApiResponse<ShoppingListItemDto>> {
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
