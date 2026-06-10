import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { EmailService } from "../email";
import { PrismaService } from "../prisma";
import { FamilyDashboardDto } from "./dto/dashboard.dto";
import {
  AddFamilyMemberRequestDto,
  AddFamilyMemberRoleDto,
  CreateFamilyRequestDto,
  FamilyDetailsDto,
  FamilyDto,
  FamilyInvitationDto,
  FamilyInviteRequestDto,
  FamilyInviteResponseDto,
  FamilyMemberDto,
  JoinFamilyByCodeRequestDto,
  FamilyMemberRoleDto,
  FamilyWithMembershipDto,
  UpdateFamilyMemberRequestDto,
  UpdateFamilyRequestDto
} from "./dto/family.dto";
import { FamilyAuthorizationService } from "./family-authorization.service";

const FAMILY_MANAGER_ROLES: FamilyMemberRoleDto[] = ["OWNER", "PARENT"];
const MANUAL_MEMBER_ROLES: AddFamilyMemberRoleDto[] = ["PARENT", "CHILD", "GUEST"];
const FAMILY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FAMILY_CODE_LENGTH = 6;
const FAMILY_CODE_MAX_ATTEMPTS = 10;

type UserRecord = {
  id: string;
  name: string;
  email?: string;
};

type FamilyRecord = {
  id: string;
  name: string;
  code: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FamilyWithMembersRecord = FamilyRecord & {
  members: FamilyMemberRecord[];
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

type WishlistItemRecord = {
  id: string;
  ownerUserId: string;
  ownerFamilyMemberId: string | null;
  title: string;
  description: string | null;
  updatedAt: Date;
  deletedAt: Date | null;
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

type FamilyInvitationRecord = {
  id: string;
  familyId: string;
  invitedEmail: string;
  role: AddFamilyMemberRoleDto;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdByUserId: string;
  invitedUserId: string | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaClientWithFamilyInvitations = typeof PrismaService.prototype.client & {
  familyInvitation: {
    findMany(args: unknown): Promise<FamilyInvitationRecord[]>;
    findFirst(args: unknown): Promise<FamilyInvitationRecord | null>;
    create(args: unknown): Promise<FamilyInvitationRecord>;
    update(args: unknown): Promise<FamilyInvitationRecord>;
  };
};

@Injectable()
export class FamiliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService,
    private readonly emailService: EmailService
  ) {}

  async createFamily(userId: string, input: CreateFamilyRequestDto = {}): Promise<FamilyDetailsDto> {
    this.rejectUnknownCreateFamilyFields(input);
    const name = this.validateFamilyName(input.name);
    const user = await this.getUserOrThrow(userId);

    const runIdempotentCreate = async (tx: typeof this.prisma.client): Promise<FamilyWithMembersRecord> => {
      const existingOwnedFamily = await this.findExistingOwnedFamily(tx, user.id);

      if (existingOwnedFamily) {
        return this.ensureOwnerDisplayName(tx, existingOwnedFamily, user.id, user.name);
      }

      return this.createFamilyWithUniqueCode(tx, {
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
      }, {
        members: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }]
        }
      });
    };

    const family = await (this.prisma.client as any).$transaction(runIdempotentCreate, {
      isolationLevel: "Serializable"
    }) as FamilyWithMembersRecord;

    return this.toFamilyDetailsDto(family);
  }

  async listUserFamilies(userId: string): Promise<FamilyWithMembershipDto[]> {
    const memberships = await this.prisma.client.familyMember.findMany({
      where: { userId },
      include: { family: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });

    return memberships
      .sort((left: FamilyMemberRecord & { family: FamilyRecord }, right: FamilyMemberRecord & { family: FamilyRecord }) => this.compareFamilies(left.family, right.family))
      .map((membership: FamilyMemberRecord & { family: FamilyRecord }) => ({
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

    return this.toFamilyDetailsDto(family as FamilyWithMembersRecord);
  }

  async updateFamily(userId: string, familyId: string, input: UpdateFamilyRequestDto = {}): Promise<FamilyDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, FAMILY_MANAGER_ROLES);
    const name = this.validateFamilyName(input.name);
    const family = await this.prisma.client.family.update({
      where: { id: familyId },
      data: { name }
    });

    return this.toFamilyDto(family);
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

  async updateFamilyMember(userId: string, familyId: string, memberId: string, input: UpdateFamilyMemberRequestDto = {}): Promise<FamilyMemberDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, FAMILY_MANAGER_ROLES);
    const member = await this.getFamilyMemberOrThrow(familyId, memberId);
    const displayName = input.displayName === undefined ? member.displayName : this.validateDisplayName(input.displayName);
    const role = input.role === undefined ? member.role : this.validateManualMemberRole(input.role);

    if (this.isAdminRole(member.role) && !this.isAdminRole(role)) {
      await this.assertAnotherAdministratorExists(familyId, member.id);
    }

    const updated = await this.prisma.client.familyMember.update({
      where: { id: member.id },
      data: { displayName, role }
    });

    return this.toFamilyMemberDto(updated);
  }

  async joinFamilyByCode(userId: string, input: JoinFamilyByCodeRequestDto = {}): Promise<FamilyInvitationDto> {
    const user = await this.getUserOrThrow(userId);
    const code = this.normalizeFamilyCode(input.code);

    const family = await this.prisma.client.family.findUnique({
      where: { code } as any,
      include: {
        members: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }]
        }
      }
    }) as FamilyWithMembersRecord | null;

    if (!family) {
      throw new NotFoundException("Family code was not found");
    }

    if (family.members.some((member) => member.userId === userId)) {
      throw new ConflictException("User is already a member of this family");
    }

    const requesterEmail = this.requireUserEmail(user);
    const existingPending = await (this.prisma.client as PrismaClientWithFamilyInvitations).familyInvitation.findFirst({
      where: {
        familyId: family.id,
        status: "pending",
        OR: [
          { invitedUserId: user.id },
          { invitedEmail: { equals: requesterEmail, mode: "insensitive" } }
        ]
      }
    });

    if (existingPending) {
      return this.toFamilyInvitationDto(existingPending);
    }
    const familyAdministrator = family.members.find((member) => this.isAdminRole(member.role) && member.userId);

    if (!familyAdministrator?.userId) {
      throw new NotFoundException("Family administrator was not found");
    }

    const token = this.generateRawToken();
    const invitation = await (this.prisma.client as PrismaClientWithFamilyInvitations).familyInvitation.create({
      data: {
        familyId: family.id,
        invitedEmail: requesterEmail,
        invitedUserId: user.id,
        role: "GUEST",
        tokenHash: this.hashToken(token),
        createdByUserId: familyAdministrator.userId
      }
    });

    return this.toFamilyInvitationDto(invitation);
  }

  async listFamilyInvitations(userId: string, familyId: string): Promise<FamilyInvitationDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const invitations = await (this.prisma.client as PrismaClientWithFamilyInvitations).familyInvitation.findMany({
      where: { familyId },
      orderBy: [{ createdAt: "desc" }]
    });

    return invitations.map((invitation) => this.toFamilyInvitationDto(invitation));
  }

  async inviteFamilyMember(userId: string, familyId: string, input: FamilyInviteRequestDto = {}): Promise<FamilyInviteResponseDto> {
    const membership = await this.familyAuthorization.requireFamilyRole(userId, familyId, FAMILY_MANAGER_ROLES);
    const family = await this.prisma.client.family.findUnique({ where: { id: familyId } }) as FamilyRecord | null;
    const inviter = await this.prisma.client.user.findUnique({ where: { id: userId } }) as (UserRecord & { email?: string }) | null;
    const invitedEmail = this.validateEmail(input.email ?? input.invitedEmail);
    const role = this.validateManualMemberRole(input.role);

    if (!family || !inviter) {
      throw new NotFoundException("Family or user was not found");
    }

    const invitedUser = await this.prisma.client.user.findUnique({ where: { email: invitedEmail } }) as (UserRecord & { email?: string }) | null;
    if (inviter.email?.trim().toLowerCase() === invitedEmail) {
      throw new BadRequestException("Du kan ikke invitere deg selv");
    }

    const existingMember = await this.prisma.client.familyMember.findFirst({
      where: { familyId, user: { email: { equals: invitedEmail, mode: "insensitive" } } }
    });

    if (existingMember) {
      throw new ConflictException("Denne personen er allerede familiemedlem");
    }

    const token = this.generateRawToken();
    const existingPending = await (this.prisma.client as PrismaClientWithFamilyInvitations).familyInvitation.findFirst({
      where: { familyId, invitedEmail: { equals: invitedEmail, mode: "insensitive" }, status: "pending" }
    });

    const invitation = existingPending
      ? await (this.prisma.client as PrismaClientWithFamilyInvitations).familyInvitation.update({
        where: { id: existingPending.id },
        data: { role, tokenHash: this.hashToken(token), invitedUserId: invitedUser?.id ?? existingPending.invitedUserId }
      })
      : await (this.prisma.client as PrismaClientWithFamilyInvitations).familyInvitation.create({
        data: { familyId, invitedEmail, invitedUserId: invitedUser?.id ?? null, role, tokenHash: this.hashToken(token), createdByUserId: userId }
      });
    const email = await this.sendFamilyInviteEmail(invitedEmail, token, inviter.name, family.name);

    void membership;
    return { invitation: this.toFamilyInvitationDto(invitation), email: { ok: email.ok, mode: email.mode } };
  }

  async resendFamilyInvitation(userId: string, familyId: string, inviteId: string): Promise<FamilyInviteResponseDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, FAMILY_MANAGER_ROLES);
    const invitation = await this.getFamilyInvitationOrThrow(familyId, inviteId);

    if (invitation.status !== "pending") {
      throw new BadRequestException("Bare ventende invitasjoner kan sendes på nytt");
    }

    const family = await this.prisma.client.family.findUnique({ where: { id: familyId } }) as FamilyRecord | null;
    const inviter = await this.prisma.client.user.findUnique({ where: { id: userId } }) as UserRecord | null;
    const token = this.generateRawToken();
    const updated = await (this.prisma.client as PrismaClientWithFamilyInvitations).familyInvitation.update({
      where: { id: invitation.id },
      data: { tokenHash: this.hashToken(token) }
    });
    const email = await this.sendFamilyInviteEmail(invitation.invitedEmail, token, inviter?.name ?? "FamilieAppen", family?.name ?? "familien");

    return { invitation: this.toFamilyInvitationDto(updated), email: { ok: email.ok, mode: email.mode } };
  }

  async revokeFamilyInvitation(userId: string, familyId: string, inviteId: string): Promise<FamilyInvitationDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, FAMILY_MANAGER_ROLES);
    const invitation = await this.getFamilyInvitationOrThrow(familyId, inviteId);

    if (invitation.status === "revoked") {
      return this.toFamilyInvitationDto(invitation);
    }

    const updated = await (this.prisma.client as PrismaClientWithFamilyInvitations).familyInvitation.update({
      where: { id: invitation.id },
      data: { status: "revoked", revokedAt: new Date() }
    });

    return this.toFamilyInvitationDto(updated);
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

    if (this.isAdminRole(member.role)) {
      await this.assertAnotherAdministratorExists(familyId, member.id);
    }

    const deletedMember = await this.prisma.client.familyMember.delete({
      where: { id: member.id }
    });

    return this.toFamilyMemberDto(deletedMember);
  }

  private async getWishlistSummary(familyId: string): Promise<FamilyDashboardDto["wishlistSummary"]> {
    const activeItems = await this.prisma.client.wishlistItem.findMany({
      where: { familyId, deletedAt: null },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    }) as WishlistItemRecord[];
    const summariesByOwner = new Map<string, {
      id: string;
      ownerFamilyMemberId: string;
      title: string;
      description: string | null;
      itemCount: number;
      unavailableCount: number;
      updatedAt: string;
    }>();

    for (const item of activeItems) {
      const ownerKey = item.ownerFamilyMemberId ?? item.ownerUserId;
      const existing = summariesByOwner.get(ownerKey);

      if (existing) {
        existing.itemCount += 1;
        continue;
      }

      summariesByOwner.set(ownerKey, {
        id: ownerKey,
        ownerFamilyMemberId: item.ownerFamilyMemberId ?? "",
        title: "Wishlist",
        description: null,
        itemCount: 1,
        unavailableCount: 0,
        updatedAt: item.updatedAt.toISOString()
      });
    }

    return {
      wishlistCount: summariesByOwner.size,
      upcomingPlaceholder: "Add birthdays or holidays later to connect wishlists to dates.",
      recentlyUpdated: Array.from(summariesByOwner.values()).slice(0, 3)
    };
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

  private async createFamilyWithUniqueCode(tx: typeof this.prisma.client, data: Record<string, unknown>, include: Record<string, unknown>): Promise<FamilyWithMembersRecord> {
    for (let attempt = 0; attempt < FAMILY_CODE_MAX_ATTEMPTS; attempt += 1) {
      const code = this.generateFamilyCode();
      const existing = await (tx.family as any).findUnique({ where: { code } });

      if (existing) {
        continue;
      }

      try {
        return await (tx.family as any).create({
          data: { ...data, code },
          include
        }) as FamilyWithMembersRecord;
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException("Could not generate a unique family code");
  }

  private generateFamilyCode(): string {
    const bytes = randomBytes(FAMILY_CODE_LENGTH);
    const suffix = Array.from(bytes, (byte) => FAMILY_CODE_ALPHABET[byte % FAMILY_CODE_ALPHABET.length]).join("");

    return `FA-${suffix}`;
  }

  private normalizeFamilyCode(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Family code is required");
    }

    const compactCode = value.trim().toUpperCase().replace(/[\s-]+/g, "");
    const normalizedCode = compactCode.startsWith("FA") ? compactCode : `FA${compactCode}`;

    if (!/^FA[A-Z0-9]{6}$/.test(normalizedCode)) {
      throw new NotFoundException("Family code was not found");
    }

    return `FA-${normalizedCode.slice(2)}`;
  }

  private requireUserEmail(user: UserRecord): string {
    if (!user.email) {
      throw new NotFoundException("User was not found");
    }

    return user.email;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
  }

  private async findExistingOwnedFamily(tx: typeof this.prisma.client, userId: string): Promise<FamilyWithMembersRecord | null> {
    const existingOwnerMembership = await tx.familyMember.findFirst({
      where: {
        userId,
        role: "OWNER"
      },
      include: {
        family: {
          include: {
            members: {
              orderBy: [{ createdAt: "asc" }, { id: "asc" }]
            }
          }
        }
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    }) as (FamilyMemberRecord & { family: FamilyWithMembersRecord }) | null;

    return existingOwnerMembership?.family ?? null;
  }

  private async ensureOwnerDisplayName(tx: typeof this.prisma.client, family: FamilyWithMembersRecord, userId: string, userName: string): Promise<FamilyWithMembersRecord> {
    const ownerMember = family.members.find((member) => member.role === "OWNER" && member.userId === userId);

    if (!ownerMember || ownerMember.displayName === userName) {
      return family;
    }

    const updatedOwner = await tx.familyMember.update({
      where: { id: ownerMember.id },
      data: { displayName: userName }
    }) as FamilyMemberRecord;

    return {
      ...family,
      members: family.members.map((member) => member.id === updatedOwner.id ? updatedOwner : member)
    };
  }

  private toFamilyDetailsDto(family: FamilyWithMembersRecord): FamilyDetailsDto {
    return {
      family: this.toFamilyDto(family),
      members: family.members.map((member: FamilyMemberRecord) => this.toFamilyMemberDto(member))
    };
  }

  private compareFamilies(left: FamilyRecord, right: FamilyRecord): number {
    const createdAtComparison = left.createdAt.getTime() - right.createdAt.getTime();

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.id.localeCompare(right.id);
  }

  private rejectUnknownCreateFamilyFields(input: CreateFamilyRequestDto): void {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new BadRequestException("Family creation must be an object");
    }

    const unknownField = Object.keys(input).find((field) => field !== "name");

    if (unknownField) {
      throw new BadRequestException(`Unknown family field: ${unknownField}`);
    }
  }

  private async getFamilyMemberOrThrow(familyId: string, memberId: string): Promise<FamilyMemberRecord> {
    const member = await this.prisma.client.familyMember.findFirst({ where: { id: memberId, familyId } });

    if (!member) {
      throw new NotFoundException("Family member was not found");
    }

    return member;
  }

  private async assertAnotherAdministratorExists(familyId: string, excludedMemberId: string): Promise<void> {
    const adminCount = await this.prisma.client.familyMember.count({
      where: {
        familyId,
        id: { not: excludedMemberId },
        role: { in: FAMILY_MANAGER_ROLES }
      }
    });

    if (adminCount < 1) {
      throw new BadRequestException("Det siste administratormedlemmet kan ikke fjernes");
    }
  }

  private async getFamilyInvitationOrThrow(familyId: string, inviteId: string): Promise<FamilyInvitationRecord> {
    const invitation = await (this.prisma.client as PrismaClientWithFamilyInvitations).familyInvitation.findFirst({
      where: { id: inviteId, familyId }
    });

    if (!invitation) {
      throw new NotFoundException("Family invitation was not found");
    }

    return invitation;
  }

  private async sendFamilyInviteEmail(invitedEmail: string, token: string, inviterName: string, familyName: string) {
    const appUrl = process.env.APP_PUBLIC_URL?.replace(/\/$/, "") || "http://localhost:3000";

    return this.emailService.sendEmail({
      to: invitedEmail,
      template: "family-invite",
      data: {
        inviterName,
        familyName,
        inviteUrl: `${appUrl}/invite/${encodeURIComponent(token)}`
      }
    });
  }

  private async getUserOrThrow(userId: string): Promise<UserRecord> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true
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

  private validateEmail(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("E-post må fylles ut");
    }

    const email = value.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException("Skriv inn en gyldig e-postadresse");
    }

    return email;
  }

  private isAdminRole(role: FamilyMemberRoleDto): boolean {
    return FAMILY_MANAGER_ROLES.includes(role);
  }

  private generateRawToken(): string {
    return randomBytes(24).toString("base64url");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private toFamilyDto(family: FamilyRecord): FamilyDto {
    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt.toISOString(),
      code: family.code,
      updatedAt: family.updatedAt.toISOString()
    };
  }

  private toFamilyInvitationDto(invitation: FamilyInvitationRecord): FamilyInvitationDto {
    return {
      id: invitation.id,
      familyId: invitation.familyId,
      invitedEmail: invitation.invitedEmail,
      role: invitation.role,
      status: invitation.status,
      createdByUserId: invitation.createdByUserId,
      invitedUserId: invitation.invitedUserId,
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      declinedAt: invitation.declinedAt?.toISOString() ?? null,
      revokedAt: invitation.revokedAt?.toISOString() ?? null,
      createdAt: invitation.createdAt.toISOString(),
      updatedAt: invitation.updatedAt.toISOString()
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
