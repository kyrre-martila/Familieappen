import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ApiResponse, createApiResponse } from "../common";
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
    return createApiResponse(await this.shoppingService.getShoppingList(request.user.id, familyId));
  }

  @Post("items")
  async addItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: AddShoppingItemRequestDto
  ): Promise<ApiResponse<ShoppingListItemDto>> {
    return createApiResponse(await this.shoppingService.addItem(request.user.id, familyId, body));
  }

  @Patch("items/:itemId")
  async toggleItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string
  ): Promise<ApiResponse<ShoppingListItemDto>> {
    return createApiResponse(await this.shoppingService.toggleItem(request.user.id, familyId, itemId));
  }

  @Delete("items/:itemId")
  async deleteItem(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("itemId") itemId: string
  ): Promise<ApiResponse<ShoppingListItemDto>> {
    return createApiResponse(await this.shoppingService.deleteItem(request.user.id, familyId, itemId));
  }
}
