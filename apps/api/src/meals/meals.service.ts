import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { FamilyAuthorizationService } from "../families";
import { MealPlanDayDto, MealPlanDto, MoveMealRequestDto, MoveMealResultDto, UpsertMealPlanDayRequestDto } from "./dto/meal.dto";

const DEFAULT_RECENT_MEAL_LIMIT = 8;

type MealPlanRecord = {
  id: string;
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MealPlanDayRecord = {
  id: string;
  mealPlanId: string;
  familyId: string;
  date: Date;
  mealName: string;
  notes: string | null;
  createdByFamilyMemberId: string | null;
  sortOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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
    const membership = await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const mealPlan = await this.getOrCreateFamilyMealPlan(familyId);
    const date = this.validateDate(input.date);
    const mealName = this.validateMealName(input.mealName ?? input.title);
    const notes = this.validateNotes(input.notes ?? input.note);
    const createdByFamilyMemberId = await this.validateCreatedByFamilyMemberId(familyId, input.createdByFamilyMemberId, membership.id);
    const sortOrder = this.validateSortOrder(input.sortOrder);

    const day = await this.prisma.client.mealPlanDay.upsert({
      where: {
        familyId_date: {
          familyId,
          date
        }
      },
      create: {
        mealPlanId: mealPlan.id,
        familyId,
        date,
        mealName,
        notes,
        createdByFamilyMemberId,
        sortOrder
      },
      update: {
        mealName,
        notes,
        createdByFamilyMemberId,
        sortOrder,
        deletedAt: null
      }
    });

    return this.toMealPlanDayDto(day);
  }

  async updateDay(userId: string, familyId: string, dayId: string, input: UpsertMealPlanDayRequestDto = {}): Promise<MealPlanDayDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const day = await this.getFamilyMealPlanDayOrThrow(familyId, dayId);
    const updateData: { date?: Date; mealName?: string; notes?: string | null; sortOrder?: number | null } = {};

    if (input.date !== undefined) {
      updateData.date = this.validateDate(input.date);
    }

    const titleInput = input.mealName ?? input.title;
    if (titleInput !== undefined) {
      updateData.mealName = this.validateMealName(titleInput);
    }

    const noteInput = input.notes ?? input.note;
    if (noteInput !== undefined) {
      updateData.notes = this.validateNotes(noteInput);
    }

    if (input.sortOrder !== undefined) {
      updateData.sortOrder = this.validateSortOrder(input.sortOrder);
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException("At least one meal field is required");
    }

    if (updateData.date) {
      const existingDayForDate = await this.prisma.client.mealPlanDay.findFirst({
        where: {
          familyId,
          date: updateData.date
        }
      });

      if (existingDayForDate && existingDayForDate.id !== day.id && !existingDayForDate.deletedAt) {
        throw new BadRequestException("A dinner is already planned for that date");
      }

      if (existingDayForDate?.deletedAt) {
        await this.prisma.client.mealPlanDay.delete({ where: { id: existingDayForDate.id } });
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

    const deletedDay = await this.prisma.client.mealPlanDay.update({
      where: { id: day.id },
      data: { deletedAt: new Date() }
    });

    return this.toMealPlanDayDto(deletedDay);
  }

  async moveDay(userId: string, familyId: string, input: MoveMealRequestDto = {}): Promise<MoveMealResultDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const targetDate = this.validateDate(input.targetDate);
    const sourceDay = await this.getMoveSourceDay(familyId, input);

    if (sourceDay.date.getTime() === targetDate.getTime()) {
      return { meals: [this.toMealPlanDayDto(sourceDay)], swapped: false };
    }

    const targetDay = await this.prisma.client.mealPlanDay.findFirst({
      where: { familyId, date: targetDate }
    });

    if (!targetDay || targetDay.deletedAt) {
      const movedDay = await this.prisma.client.$transaction(async (transaction) => {
        if (targetDay?.deletedAt) {
          await transaction.mealPlanDay.delete({ where: { id: targetDay.id } });
        }

        return transaction.mealPlanDay.update({
          where: { id: sourceDay.id },
          data: { date: targetDate }
        });
      });

      return { meals: [this.toMealPlanDayDto(movedDay)], swapped: false };
    }

    const tempDate = await this.findTemporarySwapDate(familyId);
    const [movedSourceDay, movedTargetDay] = await this.prisma.client.$transaction(async (transaction) => {
      await transaction.mealPlanDay.update({ where: { id: sourceDay.id }, data: { date: tempDate } });
      const updatedTargetDay = await transaction.mealPlanDay.update({ where: { id: targetDay.id }, data: { date: sourceDay.date } });
      const updatedSourceDay = await transaction.mealPlanDay.update({ where: { id: sourceDay.id }, data: { date: targetDate } });
      return [updatedSourceDay, updatedTargetDay];
    });

    return { meals: [this.toMealPlanDayDto(movedSourceDay), this.toMealPlanDayDto(movedTargetDay)], swapped: true };
  }

  async getDinnerToday(userId: string, familyId: string): Promise<MealPlanDayDto | null> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    return this.getDinnerTodayForFamily(familyId);
  }

  async getDinnerTodayForFamily(familyId: string): Promise<MealPlanDayDto | null> {
    const day = await this.prisma.client.mealPlanDay.findFirst({
      where: {
        familyId,
        date: this.startOfUtcDay(new Date()),
        deletedAt: null
      }
    });

    return day ? this.toMealPlanDayDto(day) : null;
  }

  private async getOrCreateFamilyMealPlan(familyId: string): Promise<MealPlanRecord & { days: MealPlanDayRecord[] }> {
    const existingPlan = await this.prisma.client.mealPlan.findUnique({
      where: { familyId },
      include: {
        days: {
          where: { deletedAt: null },
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
          where: { deletedAt: null },
          orderBy: { date: "asc" }
        }
      }
    });
  }

  private async getFamilyMealPlanDayOrThrow(familyId: string, dayId: string): Promise<MealPlanDayRecord> {
    const day = await this.prisma.client.mealPlanDay.findFirst({
      where: {
        id: dayId,
        familyId,
        deletedAt: null
      }
    });

    if (!day) {
      throw new NotFoundException("Meal was not found");
    }

    return day;
  }

  private async getMoveSourceDay(familyId: string, input: MoveMealRequestDto): Promise<MealPlanDayRecord> {
    if (typeof input.mealId === "string" && input.mealId.trim()) {
      return this.getFamilyMealPlanDayOrThrow(familyId, input.mealId.trim());
    }

    const sourceDate = this.validateDate(input.sourceDate);
    const day = await this.prisma.client.mealPlanDay.findFirst({ where: { familyId, date: sourceDate, deletedAt: null } });

    if (!day) {
      throw new NotFoundException("Meal was not found");
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

  private validateSortOrder(value: unknown): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new BadRequestException("Meal sort order must be an integer");
    }

    return value;
  }

  private async validateCreatedByFamilyMemberId(familyId: string, value: unknown, fallbackFamilyMemberId: string): Promise<string> {
    if (value === undefined || value === null || value === "") {
      return fallbackFamilyMemberId;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Meal creator must be a family member id");
    }

    const member = await this.prisma.client.familyMember.findFirst({
      where: {
        id: value,
        familyId
      },
      select: { id: true }
    });

    if (!member) {
      throw new BadRequestException("Meal creator must belong to this family");
    }

    return member.id;
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
      familyId: day.familyId,
      date: day.date.toISOString().slice(0, 10),
      mealName: day.mealName,
      title: day.mealName,
      note: day.notes,
      notes: day.notes,
      createdByFamilyMemberId: day.createdByFamilyMemberId,
      sortOrder: day.sortOrder,
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
      deletedAt: day.deletedAt ? day.deletedAt.toISOString() : null
    };
  }

  private getRecentMeals(days: MealPlanDayRecord[]): string[] {
    const recentMeals: string[] = [];
    const normalizedTitles = new Set<string>();

    for (const day of [...days].sort((first, second) => second.date.getTime() - first.date.getTime())) {
      const normalizedTitle = day.mealName.trim().toLocaleLowerCase("nb-NO");

      if (!normalizedTitles.has(normalizedTitle)) {
        normalizedTitles.add(normalizedTitle);
        recentMeals.push(day.mealName);
      }

      if (recentMeals.length >= DEFAULT_RECENT_MEAL_LIMIT) {
        break;
      }
    }

    return recentMeals;
  }

  private async findTemporarySwapDate(familyId: string): Promise<Date> {
    for (let year = 1900; year >= 1800; year -= 1) {
      const date = new Date(Date.UTC(year, 0, 1));
      const existing = await this.prisma.client.mealPlanDay.findFirst({ where: { familyId, date } });

      if (!existing) {
        return date;
      }
    }

    throw new BadRequestException("Could not move meal right now");
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}
