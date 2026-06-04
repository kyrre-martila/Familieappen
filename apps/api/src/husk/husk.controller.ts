import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { API_ERROR_CODES, ApiException, ApiResponse, createApiResponse } from "../common";
import { CreateListItemRequestDto, CreateListRequestDto, ListDto, ListItemDto, UpdateListItemRequestDto, UpdateListRequestDto } from "./dto/list.dto";
import { CreateReminderRequestDto, ReminderDto, UpdateReminderRequestDto } from "./dto/reminder.dto";
import { HuskService } from "./husk.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("husk")
@UseGuards(AuthGuard)
export class HuskController {
  constructor(private readonly huskService: HuskService) {}

  @Get("reminders")
  async listReminders(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string): Promise<ApiResponse<ReminderDto[]>> {
    return createApiResponse(await this.huskService.listReminders(request.user.id, requireFamilyId(familyId)));
  }

  @Post("reminders")
  async createReminder(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Body() body: CreateReminderRequestDto): Promise<ApiResponse<ReminderDto>> {
    return createApiResponse(await this.huskService.createReminder(request.user.id, requireFamilyId(familyId), body));
  }

  @Patch("reminders/:reminderId")
  async updateReminder(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("reminderId") reminderId: string, @Body() body: UpdateReminderRequestDto): Promise<ApiResponse<ReminderDto>> {
    return createApiResponse(await this.huskService.updateReminder(request.user.id, requireFamilyId(familyId), reminderId, body));
  }

  @Delete("reminders/:reminderId")
  async deleteReminder(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("reminderId") reminderId: string): Promise<ApiResponse<ReminderDto>> {
    return createApiResponse(await this.huskService.deleteReminder(request.user.id, requireFamilyId(familyId), reminderId));
  }

  @Get("lists")
  async listLists(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string): Promise<ApiResponse<ListDto[]>> {
    return createApiResponse(await this.huskService.listLists(request.user.id, requireFamilyId(familyId)));
  }

  @Post("lists")
  async createList(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Body() body: CreateListRequestDto): Promise<ApiResponse<ListDto>> {
    return createApiResponse(await this.huskService.createList(request.user.id, requireFamilyId(familyId), body));
  }

  @Patch("lists/:listId")
  async updateList(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("listId") listId: string, @Body() body: UpdateListRequestDto): Promise<ApiResponse<ListDto>> {
    return createApiResponse(await this.huskService.updateList(request.user.id, requireFamilyId(familyId), listId, body));
  }

  @Delete("lists/:listId")
  async deleteList(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("listId") listId: string): Promise<ApiResponse<ListDto>> {
    return createApiResponse(await this.huskService.deleteList(request.user.id, requireFamilyId(familyId), listId));
  }

  @Post("lists/:listId/items")
  async createListItem(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("listId") listId: string, @Body() body: CreateListItemRequestDto): Promise<ApiResponse<ListItemDto>> {
    return createApiResponse(await this.huskService.createListItem(request.user.id, requireFamilyId(familyId), listId, body));
  }

  @Patch("lists/:listId/items/:itemId")
  async updateListItem(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("listId") listId: string, @Param("itemId") itemId: string, @Body() body: UpdateListItemRequestDto): Promise<ApiResponse<ListItemDto>> {
    return createApiResponse(await this.huskService.updateListItem(request.user.id, requireFamilyId(familyId), listId, itemId, body));
  }

  @Delete("lists/:listId/items/:itemId")
  async deleteListItem(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("listId") listId: string, @Param("itemId") itemId: string): Promise<ApiResponse<ListItemDto>> {
    return createApiResponse(await this.huskService.deleteListItem(request.user.id, requireFamilyId(familyId), listId, itemId));
  }

  @Patch("lists/:listId/items/:itemId/complete")
  async completeListItem(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("listId") listId: string, @Param("itemId") itemId: string): Promise<ApiResponse<ListItemDto>> {
    return createApiResponse(await this.huskService.completeListItem(request.user.id, requireFamilyId(familyId), listId, itemId));
  }

  @Patch("lists/:listId/items/:itemId/uncomplete")
  async uncompleteListItem(@Req() request: AuthenticatedRequest, @Headers("x-family-id") familyId: string, @Param("listId") listId: string, @Param("itemId") itemId: string): Promise<ApiResponse<ListItemDto>> {
    return createApiResponse(await this.huskService.uncompleteListItem(request.user.id, requireFamilyId(familyId), listId, itemId));
  }
}

function requireFamilyId(familyId: string | undefined): string {
  if (!familyId) {
    throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.FAMILY_MISSING_CONTEXT, "X-Family-Id header is required");
  }

  return familyId;
}
