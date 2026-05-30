import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
import { MealPlanDayDto, MealPlanDto, UpsertMealPlanDayRequestDto } from "./dto/meal.dto";

const DEFAULT_RECENT_MEAL_LIMIT = 5;

type MealPlanRecord = {
  id: string;
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MealPlanDayRecord = {
  id: string;
  mealPlanId: string;
  date: Date;
  mealName: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async getMealPlan(userId: string, familyId: string): Promise<MealPlanDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const mealPlan = await this.getOrCreateFamilyMealPlan(familyId);

    return this.toMealPlanDto(mealPlan);
  }

  async upsertDay(userId: string, familyId: string, input: UpsertMealPlanDayRequestDto = {}): Promise<MealPlanDayDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const mealPlan = await this.getOrCreateFamilyMealPlan(familyId);
    const date = this.validateDate(input.date);
    const mealName = this.validateMealName(input.mealName);
    const notes = this.validateNotes(input.notes);

    const day = await this.prisma.client.mealPlanDay.upsert({
      where: {
        mealPlanId_date: {
          mealPlanId: mealPlan.id,
          date
        }
      },
      create: {
        mealPlanId: mealPlan.id,
        date,
        mealName,
        notes
      },
      update: {
        mealName,
        notes
      }
    });

    return this.toMealPlanDayDto(day);
  }

  async updateDay(userId: string, familyId: string, dayId: string, input: UpsertMealPlanDayRequestDto = {}): Promise<MealPlanDayDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const day = await this.getFamilyMealPlanDayOrThrow(familyId, dayId);
    const updateData: { date?: Date; mealName?: string; notes?: string | null } = {};

    if (input.date !== undefined) {
      updateData.date = this.validateDate(input.date);
    }

    if (input.mealName !== undefined) {
      updateData.mealName = this.validateMealName(input.mealName);
    }

    if (input.notes !== undefined) {
      updateData.notes = this.validateNotes(input.notes);
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException("At least one meal field is required");
    }

    if (updateData.date) {
      const existingDayForDate = await this.prisma.client.mealPlanDay.findFirst({
        where: {
          mealPlanId: day.mealPlanId,
          date: updateData.date
        }
      });

      if (existingDayForDate && existingDayForDate.id !== day.id) {
        throw new BadRequestException("A dinner is already planned for that date");
      }
    }

    const updatedDay = await this.prisma.client.mealPlanDay.update({
      where: { id: day.id },
      data: updateData
    });

    return this.toMealPlanDayDto(updatedDay);
  }

  async deleteDay(userId: string, familyId: string, dayId: string): Promise<MealPlanDayDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const day = await this.getFamilyMealPlanDayOrThrow(familyId, dayId);

    const deletedDay = await this.prisma.client.mealPlanDay.delete({
      where: { id: day.id }
    });

    return this.toMealPlanDayDto(deletedDay);
  }

  async getDinnerToday(userId: string, familyId: string): Promise<MealPlanDayDto | null> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    return this.getDinnerTodayForFamily(familyId);
  }

  async getDinnerTodayForFamily(familyId: string): Promise<MealPlanDayDto | null> {
    const mealPlan = await this.prisma.client.mealPlan.findUnique({ where: { familyId }, select: { id: true } });

    if (!mealPlan) {
      return null;
    }

    const day = await this.prisma.client.mealPlanDay.findFirst({
      where: {
        mealPlanId: mealPlan.id,
        date: this.startOfUtcDay(new Date())
      }
    });

    return day ? this.toMealPlanDayDto(day) : null;
  }

  private async getOrCreateFamilyMealPlan(familyId: string): Promise<MealPlanRecord & { days: MealPlanDayRecord[] }> {
    const existingPlan = await this.prisma.client.mealPlan.findUnique({
      where: { familyId },
      include: {
        days: {
          orderBy: { date: "asc" }
        }
      }
    });

    if (existingPlan) {
      return existingPlan;
    }

    return this.prisma.client.mealPlan.create({
      data: { familyId },
      include: {
        days: {
          orderBy: { date: "asc" }
        }
      }
    });
  }

  private async getFamilyMealPlanDayOrThrow(familyId: string, dayId: string): Promise<MealPlanDayRecord> {
    const day = await this.prisma.client.mealPlanDay.findFirst({
      where: {
        id: dayId,
        mealPlan: { familyId }
      }
    });

    if (!day) {
      throw new NotFoundException("Meal plan day was not found");
    }

    return day;
  }

  private validateDate(value: unknown): Date {
    if (typeof value !== "string") {
      throw new BadRequestException("Meal date is required");
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(value)) {
      throw new BadRequestException("Meal date must use YYYY-MM-DD format");
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException("Meal date must be a valid date");
    }

    return date;
  }

  private validateMealName(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Meal name is required");
    }

    const mealName = value.trim();

    if (mealName.length < 1 || mealName.length > 120) {
      throw new BadRequestException("Meal name must be between 1 and 120 characters");
    }

    return mealName;
  }

  private validateNotes(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Meal notes must be text");
    }

    const notes = value.trim();

    if (notes.length > 500) {
      throw new BadRequestException("Meal notes must be 500 characters or fewer");
    }

    return notes.length === 0 ? null : notes;
  }

  private toMealPlanDto(mealPlan: MealPlanRecord & { days: MealPlanDayRecord[] }): MealPlanDto {
    return {
      id: mealPlan.id,
      familyId: mealPlan.familyId,
      createdAt: mealPlan.createdAt.toISOString(),
      updatedAt: mealPlan.updatedAt.toISOString(),
      days: mealPlan.days.map((day) => this.toMealPlanDayDto(day)),
      recentMeals: this.getRecentMeals(mealPlan.days)
    };
  }

  private toMealPlanDayDto(day: MealPlanDayRecord): MealPlanDayDto {
    return {
      id: day.id,
      mealPlanId: day.mealPlanId,
      date: day.date.toISOString().slice(0, 10),
      mealName: day.mealName,
      notes: day.notes,
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString()
    };
  }

  private getRecentMeals(days: MealPlanDayRecord[]): string[] {
    const recentMeals: string[] = [];

    for (const day of [...days].sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime())) {
      if (!recentMeals.includes(day.mealName)) {
        recentMeals.push(day.mealName);
      }

      if (recentMeals.length >= DEFAULT_RECENT_MEAL_LIMIT) {
        break;
      }
    }

    return recentMeals;
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}
