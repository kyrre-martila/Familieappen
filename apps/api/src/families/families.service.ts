import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { FamilyDashboardDto } from "./dto/dashboard.dto";
import {
  AddFamilyMemberRequestDto,
  AddFamilyMemberRoleDto,
  CreateFamilyRequestDto,
  FamilyDetailsDto,
  FamilyDto,
  FamilyMemberDto,
  FamilyMemberRoleDto,
  FamilyWithMembershipDto
} from "./dto/family.dto";
import { FamilyAuthorizationService } from "./family-authorization.service";

const FAMILY_MANAGER_ROLES: FamilyMemberRoleDto[] = ["OWNER", "PARENT"];
const MANUAL_MEMBER_ROLES: AddFamilyMemberRoleDto[] = ["PARENT", "CHILD", "GUEST"];

type UserRecord = {
  id: string;
  name: string;
};

type FamilyRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type TaskRecord = {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  assignedFamilyMemberId: string | null;
  createdByUserId: string | null;
  completed: boolean;
  completedAt: Date | null;
  completedByUserId: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MealPlanDayRecord = {
  id: string;
  mealPlanId: string;
  familyId?: string;
  date: Date;
  mealName: string;
  notes: string | null;
  createdByFamilyMemberId?: string | null;
  sortOrder?: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};


type CalendarEventParticipantRecord = {
  id: string;
  eventId: string;
  familyMemberId: string;
  createdAt: Date;
  familyMember: FamilyMemberRecord;
};

type CalendarEventRecord = {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  location: string | null;
  icon: string;
  reminderMinutesBefore: number | null;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: CalendarEventParticipantRecord[];
};

type WishlistReservationRecord = {
  purchased: boolean;
};

type WishlistItemRecord = {
  purchased: boolean;
  reservations: WishlistReservationRecord[];
};

type WishlistRecord = {
  id: string;
  ownerFamilyMemberId: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  items: WishlistItemRecord[];
};

type FamilyMemberRecord = {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
  role: FamilyMemberRoleDto;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class FamiliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async createFamily(userId: string, input: CreateFamilyRequestDto = {}): Promise<FamilyDetailsDto> {
    const name = this.validateFamilyName(input.name);
    const user = await this.getUserOrThrow(userId);

    const family = await this.prisma.client.family.create({
      data: {
        name,
        members: {
          create: {
            userId: user.id,
            displayName: user.name,
            role: "OWNER"
          }
        },
        shoppingLists: {
          create: {
            name: "Family Shopping"
          }
        }
      },
      include: {
        members: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return {
      family: this.toFamilyDto(family),
      members: family.members.map((member: FamilyMemberRecord) => this.toFamilyMemberDto(member))
    };
  }

  async listUserFamilies(userId: string): Promise<FamilyWithMembershipDto[]> {
    const memberships = await this.prisma.client.familyMember.findMany({
      where: { userId },
      include: { family: true },
      orderBy: { createdAt: "asc" }
    });

    return memberships.map((membership: FamilyMemberRecord & { family: FamilyRecord }) => ({
      family: this.toFamilyDto(membership.family),
      membership: this.toFamilyMemberDto(membership)
    }));
  }

  async getFamilyDetails(userId: string, familyId: string): Promise<FamilyDetailsDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);

    const family = await this.prisma.client.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!family) {
      throw new NotFoundException("Family was not found");
    }

    return {
      family: this.toFamilyDto(family),
      members: family.members.map((member: FamilyMemberRecord) => this.toFamilyMemberDto(member))
    };
  }

  async getFamilyDashboard(userId: string, familyId: string): Promise<FamilyDashboardDto> {
    const details = await this.getFamilyDetails(userId, familyId);

    const [shoppingSummary, todayTasks, dinnerToday, todayEvents, wishlistSummary] = await Promise.all([
      this.getOrCreateShoppingSummary(familyId),
      this.getDashboardTasks(familyId),
      this.getDinnerToday(familyId),
      this.getTodayEvents(familyId),
      this.getWishlistSummary(familyId)
    ]);

    return {
      family: details.family,
      members: details.members,
      todayEvents,
      todayTasks,
      dinnerToday,
      shoppingSummary,
      wishlistSummary
    };
  }

  async addFamilyMember(
    userId: string,
    familyId: string,
    input: AddFamilyMemberRequestDto = {}
  ): Promise<FamilyMemberDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, FAMILY_MANAGER_ROLES);

    const displayName = this.validateDisplayName(input.displayName);
    const role = this.validateManualMemberRole(input.role);

    const member = await this.prisma.client.familyMember.create({
      data: {
        familyId,
        displayName,
        role
      }
    });

    return this.toFamilyMemberDto(member);
  }

  async removeFamilyMember(userId: string, familyId: string, memberId: string): Promise<FamilyMemberDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, FAMILY_MANAGER_ROLES);

    const member = await this.prisma.client.familyMember.findFirst({
      where: {
        id: memberId,
        familyId
      }
    });

    if (!member) {
      throw new NotFoundException("Family member was not found");
    }

    if (member.role === "OWNER") {
      const ownerCount = await this.prisma.client.familyMember.count({
        where: {
          familyId,
          role: "OWNER"
        }
      });

      if (ownerCount <= 1) {
        throw new BadRequestException("The last owner cannot be removed");
      }
    }

    const deletedMember = await this.prisma.client.familyMember.delete({
      where: { id: member.id }
    });

    return this.toFamilyMemberDto(deletedMember);
  }


  private async getWishlistSummary(familyId: string): Promise<FamilyDashboardDto["wishlistSummary"]> {
    const recentlyUpdated = await this.prisma.client.wishlist.findMany({
      where: { familyId },
      include: { items: { include: { reservations: true } } },
      orderBy: { updatedAt: "desc" },
      take: 3
    });
    const wishlistCount = await this.prisma.client.wishlist.count({ where: { familyId } });

    return {
      wishlistCount,
      upcomingPlaceholder: "Add birthdays or holidays later to connect wishlists to dates.",
      recentlyUpdated: recentlyUpdated.map((wishlist: WishlistRecord) => {
        const unavailableCount = wishlist.items.filter((item) => this.isWishlistItemUnavailable(item)).length;

        return {
          id: wishlist.id,
          ownerFamilyMemberId: wishlist.ownerFamilyMemberId,
          title: wishlist.title,
          description: wishlist.description,
          itemCount: wishlist.items.length,
          unavailableCount,
          updatedAt: wishlist.updatedAt.toISOString()
        };
      })
    };
  }

  private isWishlistItemUnavailable(item: WishlistItemRecord): boolean {
    return item.purchased || item.reservations.length > 0;
  }

  private async getTodayEvents(familyId: string): Promise<FamilyDashboardDto["todayEvents"]> {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    const events = await this.prisma.client.calendarEvent.findMany({
      where: {
        familyId,
        startsAt: { lt: tomorrowStart },
        OR: [{ endsAt: { gte: todayStart } }, { endsAt: null, startsAt: { gte: todayStart } }]
      },
      include: {
        participants: {
          include: { familyMember: true },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
      take: 6
    });

    return events.map((event: CalendarEventRecord) => this.toCalendarEventDto(event));
  }

  private toCalendarEventDto(event: CalendarEventRecord): FamilyDashboardDto["todayEvents"][number] {
    return {
      id: event.id,
      familyId: event.familyId,
      title: event.title,
      description: event.description,
      location: event.location,
      icon: event.icon,
      reminderMinutesBefore: event.reminderMinutesBefore,
      date: formatDate(event.startsAt),
      startTime: event.allDay ? null : formatTime(event.startsAt),
      endTime: event.allDay || !event.endsAt ? null : formatTime(event.endsAt),
      reminder: event.reminderMinutesBefore === null ? null : {
        minutesBefore: event.reminderMinutesBefore,
        label: formatReminderLabel(event.reminderMinutesBefore)
      },
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      allDay: event.allDay,
      createdByUserId: event.createdByUserId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      participants: event.participants.map((participant) => ({
        id: participant.id,
        eventId: participant.eventId,
        familyMemberId: participant.familyMemberId,
        createdAt: participant.createdAt.toISOString(),
        familyMember: this.toFamilyMemberDto(participant.familyMember)
      }))
    };
  }

  private async getDinnerToday(familyId: string): Promise<FamilyDashboardDto["dinnerToday"]> {
    const mealPlan = await this.prisma.client.mealPlan.findUnique({
      where: { familyId },
      select: { id: true }
    });

    if (!mealPlan) {
      return null;
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = await this.prisma.client.mealPlanDay.findFirst({
      where: {
        mealPlanId: mealPlan.id,
        familyId,
        date: today,
        deletedAt: null
      }
    });

    return day ? this.toMealPlanDayDto(day) : null;
  }

  private async getDashboardTasks(familyId: string): Promise<FamilyDashboardDto["todayTasks"]> {
    const tasks = await this.prisma.client.task.findMany({
      where: { familyId },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
      take: 5
    });

    return tasks.map((task: TaskRecord) => ({
      id: task.id,
      familyId: task.familyId,
      title: task.title,
      description: task.description,
      assignedFamilyMemberId: task.assignedFamilyMemberId,
      createdByUserId: task.createdByUserId,
      completed: task.completed,
      completedAt: task.completedAt?.toISOString() ?? null,
      completedByUserId: task.completedByUserId,
      dueDate: task.dueDate?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    }));
  }

  private toMealPlanDayDto(day: MealPlanDayRecord): NonNullable<FamilyDashboardDto["dinnerToday"]> {
    return {
      id: day.id,
      mealPlanId: day.mealPlanId,
      date: day.date.toISOString().slice(0, 10),
      familyId: day.familyId ?? "",
      mealName: day.mealName,
      title: day.mealName,
      note: day.notes,
      notes: day.notes,
      createdByFamilyMemberId: day.createdByFamilyMemberId ?? null,
      sortOrder: day.sortOrder ?? null,
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
      deletedAt: day.deletedAt ? day.deletedAt.toISOString() : null
    };
  }

  private async getOrCreateShoppingSummary(familyId: string): Promise<{ uncheckedCount: number; totalItems: number }> {
    let shoppingList = await this.prisma.client.shoppingList.findUnique({
      where: { familyId },
      select: { id: true }
    });

    if (!shoppingList) {
      shoppingList = await this.prisma.client.shoppingList.create({
        data: {
          familyId,
          name: "Family Shopping"
        },
        select: { id: true }
      });
    }

    const [uncheckedCount, totalItems] = await Promise.all([
      this.prisma.client.shoppingListItem.count({
        where: {
          shoppingListId: shoppingList.id,
          checked: false
        }
      }),
      this.prisma.client.shoppingListItem.count({
        where: {
          shoppingListId: shoppingList.id
        }
      })
    ]);

    return { uncheckedCount, totalItems };
  }

  private async getUserOrThrow(userId: string): Promise<UserRecord> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true
      }
    });

    if (!user) {
      throw new NotFoundException("User was not found");
    }

    return user;
  }

  private validateFamilyName(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Family name is required");
    }

    const name = value.trim();

    if (name.length < 1 || name.length > 100) {
      throw new BadRequestException("Family name must be between 1 and 100 characters");
    }

    return name;
  }

  private validateDisplayName(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Display name is required");
    }

    const displayName = value.trim();

    if (displayName.length < 1 || displayName.length > 100) {
      throw new BadRequestException("Display name must be between 1 and 100 characters");
    }

    return displayName;
  }

  private validateManualMemberRole(value: unknown): AddFamilyMemberRoleDto {
    if (typeof value !== "string" || !MANUAL_MEMBER_ROLES.includes(value as AddFamilyMemberRoleDto)) {
      throw new BadRequestException("Role must be PARENT, CHILD, or GUEST");
    }

    return value as AddFamilyMemberRoleDto;
  }

  private toFamilyDto(family: FamilyRecord): FamilyDto {
    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt.toISOString(),
      updatedAt: family.updatedAt.toISOString()
    };
  }

  private toFamilyMemberDto(member: FamilyMemberRecord): FamilyMemberDto {
    return {
      id: member.id,
      userId: member.userId,
      familyId: member.familyId,
      displayName: member.displayName,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString()
    };
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

function formatReminderLabel(minutes: number): string {
  if (minutes === 0) {
    return "Ved start";
  }

  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? "1 dag før" : `${days} dager før`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 time før" : `${hours} timer før`;
  }

  return `${minutes} min før`;
}
