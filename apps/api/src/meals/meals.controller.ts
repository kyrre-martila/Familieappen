import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ApiResponse, createApiResponse } from "../common";
import { MealPlanDayDto, MealPlanDto, UpsertMealPlanDayRequestDto } from "./dto/meal.dto";
import { MealsService } from "./meals.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("meals")
@UseGuards(AuthGuard)
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Get()
  async getMealPlan(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string
  ): Promise<ApiResponse<MealPlanDto>> {
    return createApiResponse(await this.mealsService.getMealPlan(request.user.id, familyId));
  }

  @Post("day")
  async upsertDay(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Body() body: UpsertMealPlanDayRequestDto
  ): Promise<ApiResponse<MealPlanDayDto>> {
    return createApiResponse(await this.mealsService.upsertDay(request.user.id, familyId, body));
  }

  @Patch("day/:dayId")
  async updateDay(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("dayId") dayId: string,
    @Body() body: UpsertMealPlanDayRequestDto
  ): Promise<ApiResponse<MealPlanDayDto>> {
    return createApiResponse(await this.mealsService.updateDay(request.user.id, familyId, dayId, body));
  }

  @Delete("day/:dayId")
  async deleteDay(
    @Req() request: AuthenticatedRequest,
    @Headers("x-family-id") familyId: string,
    @Param("dayId") dayId: string
  ): Promise<ApiResponse<MealPlanDayDto>> {
    return createApiResponse(await this.mealsService.deleteDay(request.user.id, familyId, dayId));
  }
}
