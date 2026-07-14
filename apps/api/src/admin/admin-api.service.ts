import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join, normalize, resolve } from "node:path";
import { AuthService } from "../auth";
import { PrismaService } from "../prisma";
import { AdminAuditAction } from "./admin-audit-actions";
import { AdminRequestUser } from "./admin-auth.service";
import { AdminRoleDto } from "./dto/admin-auth.dto";
import {
  AdminDeletionDto,
  AdvertisementMutationDto,
  AdvertisementStatusDto,
  AuditLogQueryDto,
  CreateAdminUserDto,
  CreateFamilyForUserDto,
  FamilySearchQueryDto,
  MoveUserFamilyDto,
  MoveUserFamilyImpactQueryDto,
  PageQueryDto,
  UpdateAdminUserDto,
  UpdateUserStatusDto,
} from "./dto/admin-api.dto";

type Meta = { ipAddress?: string | null; userAgent?: string | null };
const AD_STATUSES = ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "ENDED"];
const AD_PLACEMENTS = ["HOME", "CALENDAR", "MENU", "WISHLIST", "SHOPPING"];
const ADMIN_ROLES = ["SUPER_ADMIN", "SUPPORT", "ANALYST", "AD_MANAGER"];
const FAMILY_ROLES = ["OWNER", "PARENT", "CHILD", "GUEST"];
const SOURCE_FAMILY_ACTIONS = ["PRESERVE", "DELETE_IF_EMPTY"];
const FAMILY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const AD_UPLOAD_ROOT =
  process.env.ADVERTISEMENT_UPLOAD_DIR || "/app/uploads/advertisements";
const AD_PUBLIC_PREFIX = "/uploads/advertisements";
const MAX_AD_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AD_IMAGE_DIMENSION = 8000;
type AdVariant = "MOBILE" | "TABLET" | "DESKTOP";

@Injectable()
export class AdminApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}
  private get db(): any {
    return this.prisma.client as any;
  }

  async dashboard() {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 864e5);
    const d30 = new Date(now.getTime() - 30 * 864e5);
    const [totalUsers, totalFamilies, new7, new30, activeImports, activeAds] =
      await Promise.all([
        this.db.user.count(),
        this.db.family.count(),
        this.db.user.count({ where: { createdAt: { gte: d7 } } }),
        this.db.user.count({ where: { createdAt: { gte: d30 } } }),
        this.db.calendarIcsSource.count({ where: { active: true } }),
        this.db.advertisement.count({ where: { status: "ACTIVE" } }),
      ]);
    return {
      totalUsers,
      totalFamilies,
      newUsersLast7Days: new7,
      newUsersLast30Days: new30,
      activeCalendarImports: activeImports,
      activeAdvertisements: activeAds,
    };
  }

  async users(q: PageQueryDto) {
    const { page, pageSize, skip, take } = this.page(q, 25, 100);
    const where: any = {};
    const s = this.str(q.search);
    if (s)
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
      ];
    if (q.status !== undefined) {
      const st = this.enumVal(q.status, ["active", "inactive"], "status");
      where.deactivatedAt = st === "active" ? null : { not: null };
    }
    const orderBy = {
      createdAt: this.enumVal(q.sort, ["asc", "desc"], "sort", true) ?? "desc",
    };
    const [total, items] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          deactivatedAt: true,
          memberships: {
            select: {
              family: {
                select: {
                  id: true,
                  name: true,
                  _count: { select: { members: true } },
                },
              },
              updatedAt: true,
            },
            take: 1,
            orderBy: { updatedAt: "desc" },
          },
        },
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: items.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt.toISOString(),
        active: !u.deactivatedAt,
        familyName: u.memberships[0]?.family?.name ?? null,
        familyMemberCount: u.memberships[0]?.family?._count?.members ?? 0,
        lastRelevantActivity: u.updatedAt?.toISOString?.() ?? null,
      })),
    };
  }

  async user(id: string) {
    const u = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        deactivatedAt: true,
        memberships: {
          select: {
            family: {
              select: {
                id: true,
                name: true,
                _count: { select: { members: true } },
              },
            },
            role: true,
            displayName: true,
          },
        },
      },
    });
    if (!u) throw new NotFoundException("User not found");
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      active: !u.deactivatedAt,
      memberships: u.memberships.map((m: any) => ({
        familyId: m.family.id,
        familyName: m.family.name,
        role: m.role,
        displayName: m.displayName,
        familyMemberCount: m.family._count.members,
      })),
    };
  }

  async userDeletionImpact(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        memberships: { select: { id: true, familyId: true, role: true } },
      },
    });
    if (!user) throw new NotFoundException("admin.user_not_found");
    const familyIds = (user.memberships ?? []).map((m: any) => m.familyId);
    const [
      sessions,
      passwordResetTokens,
      pushDevices,
      notifications,
      actedNotifications,
      familyInvitations,
      shoppingListInvitations,
      wishlistShareInvitations,
      wishlistItems,
      wishlistReservations,
      shoppingListAccesses,
      ownedShoppingLists,
      createdShoppingItems,
      checkedShoppingItems,
      calendarEvents,
      reminders,
      tasksCreated,
      tasksCompleted,
      feedbackSubmissions,
    ] = await Promise.all([
      this.db.userSession.count({ where: { userId } }),
      this.db.passwordResetToken.count({ where: { userId } }),
      this.db.pushDevice.count({ where: { userId } }),
      this.db.notification.count({ where: { recipientUserId: userId } }),
      this.db.notification.count({ where: { actorUserId: userId } }),
      this.db.familyInvitation.count({
        where: { OR: [{ createdByUserId: userId }, { invitedUserId: userId }] },
      }),
      this.db.shoppingListInvitation.count({
        where: { OR: [{ createdByUserId: userId }, { invitedUserId: userId }] },
      }),
      this.db.wishlistShareInvitation.count({
        where: {
          OR: [
            { wishlistOwnerUserId: userId },
            { createdByUserId: userId },
            { invitedUserId: userId },
          ],
        },
      }),
      this.db.wishlistItem.count({ where: { ownerUserId: userId } }),
      this.db.wishlistItemReservation.count({
        where: { reservedByUserId: userId },
      }),
      this.db.shoppingListAccess.count({ where: { userId } }),
      this.db.shoppingList.count({ where: { ownerUserId: userId } }),
      this.db.shoppingListItem.count({ where: { createdByUserId: userId } }),
      this.db.shoppingListItem.count({ where: { checkedByUserId: userId } }),
      this.db.calendarEvent.count({ where: { createdByUserId: userId } }),
      this.db.reminder.count({ where: { createdByUserId: userId } }),
      this.db.task.count({ where: { createdByUserId: userId } }),
      this.db.task.count({ where: { completedByUserId: userId } }),
      this.db.feedbackSubmission.count({ where: { userId } }),
    ]);
    return {
      userId,
      familyCount: familyIds.length,
      membershipCount: user.memberships?.length ?? 0,
      soleOwnerFamilyCount: await this.soleOwnerFamilyCount(
        this.db,
        userId,
        user.memberships ?? [],
      ),
      sessions,
      passwordResetTokens,
      pushDevices,
      notifications,
      actedNotifications,
      familyInvitations,
      shoppingListInvitations,
      wishlistShareInvitations,
      wishlistItems,
      wishlistReservations,
      shoppingListAccesses,
      ownedShoppingLists,
      createdShoppingItems,
      checkedShoppingItems,
      calendarEvents,
      reminders,
      tasksCreated,
      tasksCompleted,
      feedbackSubmissions,
    };
  }

  async familyDeletionImpact(familyId: string) {
    const family = await this.db.family.findUnique({
      where: { id: familyId },
      select: { id: true, members: { select: { userId: true } } },
    });
    if (!family) throw new NotFoundException("admin.family_not_found");
    const userIds = Array.from(
      new Set((family.members ?? []).map((m: any) => m.userId).filter(Boolean)),
    );
    const memberCounts = await Promise.all(
      userIds.map(async (id: any) => ({
        id,
        count: await this.db.familyMember.count({ where: { userId: id } }),
      })),
    );
    const exclusiveIds = memberCounts
      .filter((m) => m.count === 1)
      .map((m) => m.id);
    const detachedIds = memberCounts
      .filter((m) => m.count > 1)
      .map((m) => m.id);
    const [
      calendarEvents,
      calendarEventParticipants,
      calendarEventExceptions,
      calendarIcsSources,
      calendarExportFeeds,
      shoppingLists,
      shoppingItems,
      shoppingListInvitations,
      shoppingListAccesses,
      customShoppingItems,
      mealPlans,
      mealPlanDays,
      tasks,
      reminders,
      reminderAudienceMembers,
      lists,
      listItems,
      wishlistItems,
      wishlistReservations,
      wishlistShareInvitations,
      familyInvitations,
      notifications,
      schoolWeekReminders,
      feedbackSubmissions,
    ] = await Promise.all([
      this.db.calendarEvent.count({ where: { familyId } }),
      this.countCalendarParticipantsByFamily(familyId),
      this.countCalendarExceptionsByFamily(familyId),
      this.db.calendarIcsSource.count({ where: { familyId } }),
      this.db.calendarExportFeed.count({ where: { familyId } }),
      this.db.shoppingList.count({ where: { familyId } }),
      this.countShoppingItemsByFamily(familyId),
      this.db.shoppingListInvitation.count({ where: { familyId } }),
      this.countShoppingAccessesByFamily(familyId),
      this.db.familyCustomShoppingItem.count({ where: { familyId } }),
      this.db.mealPlan.count({ where: { familyId } }),
      this.db.mealPlanDay.count({ where: { familyId } }),
      this.db.task.count({ where: { familyId } }),
      this.db.reminder.count({ where: { familyId } }),
      this.countReminderAudienceByFamily(familyId),
      this.db.list.count({ where: { familyId } }),
      this.countListItemsByFamily(familyId),
      this.db.wishlistItem.count({ where: { familyId } }),
      this.countWishlistReservationsByFamily(familyId),
      this.db.wishlistShareInvitation.count({ where: { familyId } }),
      this.db.familyInvitation.count({ where: { familyId } }),
      this.db.notification.count({ where: { familyId } }),
      this.db.schoolWeekReminder.count({ where: { familyId } }),
      this.db.feedbackSubmission.count({ where: { familyId } }),
    ]);
    return {
      familyId,
      membershipCount: family.members?.length ?? 0,
      usersDeleted: exclusiveIds.length,
      usersDetached: detachedIds.length,
      calendarEvents,
      calendarEventParticipants,
      calendarEventExceptions,
      calendarIcsSources,
      calendarExportFeeds,
      shoppingLists,
      shoppingItems,
      shoppingListInvitations,
      shoppingListAccesses,
      customShoppingItems,
      mealPlans,
      mealPlanDays,
      tasks,
      reminders,
      reminderAudienceMembers,
      lists,
      listItems,
      wishlistItems,
      wishlistReservations,
      wishlistShareInvitations,
      familyInvitations,
      notifications,
      schoolWeekReminders,
      feedbackSubmissions,
    };
  }

  async deleteUser(
    userId: string,
    b: AdminDeletionDto,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const reason = this.reason(b.reason);
    return this.db.$transaction(
      async (tx: any) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            memberships: { select: { id: true, familyId: true, role: true } },
          },
        });
        if (!user) throw new NotFoundException("admin.user_not_found");
        const soleOwnerFamilyCount = await this.soleOwnerFamilyCount(
          tx,
          userId,
          user.memberships ?? [],
        );
        if (soleOwnerFamilyCount > 0)
          throw new ConflictException("admin.family_owner_delete_blocked");
        await tx.user.delete({ where: { id: userId } }).catch(() => {
          throw new ConflictException("admin.user_delete_conflict");
        });
        await tx.adminAuditLog.create({
          data: {
            adminUserId: admin.id,
            action: AdminAuditAction.USER_DELETED_BY_ADMIN,
            targetType: "User",
            targetId: userId,
            metadata: {
              userId,
              familyIds: (user.memberships ?? []).map((m: any) => m.familyId),
              membershipCount: user.memberships?.length ?? 0,
              reasonSummary: this.summarize(reason),
            },
            ipAddress: meta.ipAddress ?? null,
          },
        });
        return { userId, deleted: true };
      },
      { isolationLevel: "Serializable" },
    );
  }

  async deleteFamily(
    familyId: string,
    b: AdminDeletionDto,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const reason = this.reason(b.reason);
    return this.db.$transaction(
      async (tx: any) => {
        const family = await tx.family.findUnique({
          where: { id: familyId },
          select: { id: true, members: { select: { userId: true } } },
        });
        if (!family) throw new NotFoundException("admin.family_not_found");
        const userIds = Array.from(
          new Set(
            (family.members ?? []).map((m: any) => m.userId).filter(Boolean),
          ),
        );
        const counts = await Promise.all(
          userIds.map(async (id: any) => ({
            id,
            count: await tx.familyMember.count({ where: { userId: id } }),
          })),
        );
        const exclusiveIds = counts
          .filter((m) => m.count === 1)
          .map((m) => m.id);
        const detachedIds = counts.filter((m) => m.count > 1).map((m) => m.id);
        await tx.user.deleteMany({ where: { id: { in: exclusiveIds } } });
        await tx.family.delete({ where: { id: familyId } }).catch(() => {
          throw new ConflictException("admin.family_delete_conflict");
        });
        await tx.adminAuditLog.create({
          data: {
            adminUserId: admin.id,
            action: AdminAuditAction.FAMILY_DELETED_BY_ADMIN,
            targetType: "Family",
            targetId: familyId,
            metadata: {
              familyId,
              usersDeleted: exclusiveIds.length,
              usersDetached: detachedIds.length,
              reasonSummary: this.summarize(reason),
            },
            ipAddress: meta.ipAddress ?? null,
          },
        });
        return {
          familyId,
          deleted: true,
          usersDeleted: exclusiveIds.length,
          usersDetached: detachedIds.length,
        };
      },
      { isolationLevel: "Serializable" },
    );
  }

  async setUserStatus(
    id: string,
    body: UpdateUserStatusDto,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const active = this.bool(body.active, "active");
    return this.db.$transaction(async (tx: any) => {
      const before = await tx.user.findUnique({
        where: { id },
        select: { id: true, deactivatedAt: true },
      });
      if (!before) throw new NotFoundException("User not found");
      const user = await tx.user.update({
        where: { id },
        data: { deactivatedAt: active ? null : new Date() },
        select: {
          id: true,
          name: true,
          email: true,
          deactivatedAt: true,
          updatedAt: true,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: active
            ? AdminAuditAction.USER_ENABLED
            : AdminAuditAction.USER_DISABLED,
          targetType: "User",
          targetId: id,
          metadata: {
            previousActive: !before.deactivatedAt,
            newActive: active,
          },
          ipAddress: meta.ipAddress ?? null,
        },
      });
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        active: !user.deactivatedAt,
        updatedAt: user.updatedAt.toISOString(),
      };
    });
  }

  async familyInviteCode(
    userId: string,
    familyId: string,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const membership = await this.db.familyMember.findFirst({
      where: { userId, familyId },
      include: { family: { select: { id: true, name: true, code: true } } },
    });
    if (!membership?.family?.code)
      throw new NotFoundException("Family membership was not found");
    await this.audit(
      admin.id,
      AdminAuditAction.FAMILY_INVITE_CODE_VIEWED,
      "Family",
      familyId,
      meta,
      { userId, familyId, familyName: membership.family.name },
    );
    return {
      familyId: membership.family.id,
      familyName: membership.family.name,
      inviteCode: membership.family.code,
    };
  }

  async families(q: FamilySearchQueryDto) {
    const { page, pageSize, skip, take } = this.page(q, 25, 50);
    const where: any = {};
    const s = this.str(q.search);
    const code = this.optionalFamilyCode(q.inviteCode);
    if (s) where.name = { contains: s, mode: "insensitive" };
    if (code) where.code = code;
    const selectedUserId = this.str(q.userId);
    const [total, items] = await Promise.all([
      this.db.family.count({ where }),
      this.db.family.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          createdAt: true,
          members: {
            select: {
              userId: true,
              role: true,
              displayName: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: { select: { members: true } },
        },
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: items.map((f: any) => ({
        familyId: f.id,
        familyName: f.name,
        createdAt: f.createdAt.toISOString(),
        memberCount: f._count?.members ?? f.members?.length ?? 0,
        owners: (f.members ?? [])
          .filter((m: any) => m.role === "OWNER")
          .map((m: any) => ({
            userId: m.userId,
            name: m.user?.name ?? m.displayName,
            email: m.user?.email ?? null,
          })),
        isSelectedUserMember: selectedUserId
          ? Boolean(
              (f.members ?? []).some((m: any) => m.userId === selectedUserId),
            )
          : undefined,
      })),
    };
  }

  async moveUserFamilyImpact(userId: string, q: MoveUserFamilyImpactQueryDto) {
    const targetFamilyId = this.reqStr(q.targetFamilyId, "targetFamilyId");
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        memberships: {
          select: {
            id: true,
            familyId: true,
            role: true,
            family: {
              select: {
                id: true,
                name: true,
                _count: { select: { members: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException("admin.user_not_found");
    const target = await this.db.family.findUnique({
      where: { id: targetFamilyId },
      select: { id: true, name: true },
    });
    if (!target) throw new NotFoundException("admin.family_not_found");
    const source =
      (user.memberships ?? []).find(
        (m: any) => m.familyId !== targetFamilyId,
      ) ?? (user.memberships ?? [])[0];
    if (!source)
      throw new ConflictException("admin.move_source_family_required");
    const sourceFamily = await this.db.family.findUnique({
      where: { id: source.familyId },
      select: {
        id: true,
        name: true,
        members: { select: { userId: true, role: true } },
      },
    });
    if (!sourceFamily)
      throw new NotFoundException("admin.move_source_family_not_found");
    const memberCount =
      sourceFamily.members?.length ?? source.family?._count?.members ?? 0;
    const ownerCount = (sourceFamily.members ?? []).filter(
      (m: any) => m.role === "OWNER",
    ).length;
    const movingUserIsOwner = source.role === "OWNER";
    const movingUserIsSoleOwner = movingUserIsOwner && ownerCount < 2;
    const userAlreadyInTargetFamily = (user.memberships ?? []).some(
      (m: any) => m.familyId === targetFamilyId,
    );
    const sourceFamilyWillBecomeEmpty =
      memberCount === 1 && !userAlreadyInTargetFamily;
    const deletionCounts = sourceFamilyWillBecomeEmpty
      ? await this.familyDeletionImpact(source.familyId)
      : null;
    return {
      sourceFamilyId: source.familyId,
      sourceFamilyName: sourceFamily.name,
      sourceMemberCount: memberCount,
      sourceOwnerCount: ownerCount,
      movingUserIsOwner,
      movingUserIsSoleOwner,
      sourceFamilyWillBecomeEmpty,
      sourceFamilyMustBeDeleted: sourceFamilyWillBecomeEmpty,
      targetFamilyId: target.id,
      targetFamilyName: target.name,
      userAlreadyInTargetFamily,
      ...(deletionCounts ? { deletionCounts } : {}),
    };
  }

  async moveUserFamily(
    userId: string,
    b: MoveUserFamilyDto,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const targetFamilyId = this.reqStr(b.targetFamilyId, "targetFamilyId");
    const role = this.enumVal(b.role ?? "GUEST", FAMILY_ROLES, "role");
    const reason = this.reason(b.reason);
    const sourceFamilyAction = this.enumVal(
      b.sourceFamilyAction,
      SOURCE_FAMILY_ACTIONS,
      "sourceFamilyAction",
    );
    return this.db.$transaction(
      async (tx: any) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            deactivatedAt: true,
            memberships: { select: { id: true, familyId: true, role: true } },
          },
        });
        if (!user) throw new NotFoundException("admin.user_not_found");
        if (user.deactivatedAt)
          throw new BadRequestException("admin.user_requires_family");
        const target = await tx.family.findUnique({
          where: { id: targetFamilyId },
          select: { id: true, name: true },
        });
        if (!target) throw new NotFoundException("admin.family_not_found");
        const current = user.memberships ?? [];
        if (current.some((m: any) => m.familyId === targetFamilyId))
          throw new ConflictException("admin.same_family");
        if (current.length < 1)
          throw new ConflictException("admin.move_source_family_required");
        const source = current[0];
        const sourceFamily = await tx.family.findUnique({
          where: { id: source.familyId },
          select: {
            id: true,
            name: true,
            members: { select: { userId: true, role: true } },
          },
        });
        if (!sourceFamily)
          throw new NotFoundException("admin.move_source_family_not_found");
        const sourceMemberCount = sourceFamily.members?.length ?? 0;
        const sourceOwnerCount = (sourceFamily.members ?? []).filter(
          (m: any) => m.role === "OWNER",
        ).length;
        const sourceWillBeEmpty = sourceMemberCount === 1;
        if (sourceWillBeEmpty && sourceFamilyAction !== "DELETE_IF_EMPTY")
          throw new ConflictException(
            "admin.move_source_family_delete_required",
          );
        if (!sourceWillBeEmpty && sourceFamilyAction === "DELETE_IF_EMPTY")
          throw new ConflictException("admin.move_source_family_not_empty");
        if (
          !sourceWillBeEmpty &&
          source.role === "OWNER" &&
          sourceOwnerCount < 2
        )
          throw new ConflictException("admin.owner_move_blocked");
        await tx.familyMember
          .create({
            data: {
              userId,
              familyId: targetFamilyId,
              displayName: user.name,
              role,
              includeInSchoolWeek: role === "CHILD",
            },
          })
          .catch(() => {
            throw new ConflictException("admin.family_membership_conflict");
          });
        await tx.familyInvitation.updateMany({
          where: {
            invitedUserId: userId,
            status: "pending",
            OR: [{ familyId: targetFamilyId }, { familyId: source.familyId }],
          },
          data: { status: "revoked", revokedAt: new Date() },
        });
        await tx.familyMember.deleteMany({
          where: { userId, familyId: { in: [source.familyId] } },
        });
        if (sourceWillBeEmpty)
          await tx.family
            .delete({ where: { id: source.familyId } })
            .catch(() => {
              throw new ConflictException("admin.move_conflict");
            });
        await tx.adminAuditLog.create({
          data: {
            adminUserId: admin.id,
            action: AdminAuditAction.USER_MOVED_TO_FAMILY,
            targetType: "User",
            targetId: userId,
            metadata: {
              userId,
              sourceFamilyId: source.familyId,
              targetFamilyId,
              targetFamilyName: target.name,
              sourceFamilyDeleted: sourceWillBeEmpty,
              targetRole: role,
              reasonSummary: this.summarize(reason),
            },
            ipAddress: meta.ipAddress ?? null,
          },
        });
        if (sourceWillBeEmpty)
          await tx.adminAuditLog.create({
            data: {
              adminUserId: admin.id,
              action: AdminAuditAction.FAMILY_DELETED_BY_ADMIN,
              targetType: "Family",
              targetId: source.familyId,
              metadata: {
                familyId: source.familyId,
                deletedByMove: true,
                userId,
                targetFamilyId,
                reasonSummary: this.summarize(reason),
              },
              ipAddress: meta.ipAddress ?? null,
            },
          });
        return {
          userId,
          targetFamilyId,
          targetFamilyName: target.name,
          role,
          sourceFamilyId: source.familyId,
          sourceFamilyDeleted: sourceWillBeEmpty,
        };
      },
      { isolationLevel: "Serializable" },
    );
  }

  async createFamilyForUser(
    userId: string,
    b: CreateFamilyForUserDto,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const name = this.limitedStr(b.name, "name", 80);
    const reason = this.reason(b.reason);
    return this.db.$transaction(
      async (tx: any) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            deactivatedAt: true,
            memberships: { select: { id: true, familyId: true } },
          },
        });
        if (!user) throw new NotFoundException("admin.user_not_found");
        if (user.deactivatedAt)
          throw new BadRequestException("admin.user_requires_family");
        if ((user.memberships ?? []).length)
          throw new ConflictException("admin.user_already_in_family");
        const family = await this.createFamilyWithCode(tx, {
          name,
          members: {
            create: { userId: user.id, displayName: user.name, role: "OWNER" },
          },
          shoppingLists: { create: { name: "Family Shopping" } },
        });
        await tx.familyInvitation.updateMany({
          where: { invitedUserId: userId, status: "pending" },
          data: { status: "revoked", revokedAt: new Date() },
        });
        await tx.adminAuditLog.create({
          data: {
            adminUserId: admin.id,
            action: AdminAuditAction.FAMILY_CREATED_BY_ADMIN,
            targetType: "Family",
            targetId: family.id,
            metadata: {
              userId,
              familyId: family.id,
              familyName: family.name,
              reasonSummary: this.summarize(reason),
            },
            ipAddress: meta.ipAddress ?? null,
          },
        });
        return {
          familyId: family.id,
          familyName: family.name,
          userId,
          role: "OWNER",
        };
      },
      { isolationLevel: "Serializable" },
    );
  }

  async statistics() {
    const d30 = new Date(Date.now() - 30 * 864e5);
    const [
      totalUsers,
      totalFamilies,
      regs,
      events,
      tasks,
      reminders,
      activeImports,
      ads,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.family.count(),
      this.db.user.findMany({
        where: { createdAt: { gte: d30 } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      this.db.calendarEvent.count({ where: { createdAt: { gte: d30 } } }),
      this.db.task.count({ where: { createdAt: { gte: d30 } } }),
      this.db.reminder.count({ where: { createdAt: { gte: d30 } } }),
      this.db.calendarIcsSource.count({ where: { active: true } }),
      this.db.advertisement.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const byDay: any = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      byDay[d] = 0;
    }
    regs.forEach((r: any) => {
      const d = r.createdAt.toISOString().slice(0, 10);
      if (d in byDay) byDay[d]++;
    });
    return {
      totalUsers,
      totalFamilies,
      registrationsPerDay: Object.entries(byDay).map(([date, count]) => ({
        date,
        count,
      })),
      calendarEventsCreatedLast30Days: events,
      tasksCreatedLast30Days: tasks,
      remindersCreatedLast30Days: reminders,
      activeCalendarImports: activeImports,
      advertisementsByStatus: ads.map((a: any) => ({
        status: a.status,
        count: a._count._all,
      })),
      advertisementStats: await this.advertisementStats(),
    };
  }

  async advertisements(q: PageQueryDto) {
    const { page, pageSize, skip, take } = this.page(q, 25, 100);
    const where: any = {};
    if (q.status !== undefined)
      where.status = this.enumVal(q.status, AD_STATUSES, "status");
    const [total, items] = await Promise.all([
      this.db.advertisement.count({ where }),
      this.db.advertisement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          placements: { select: { placement: true } },
        },
      }),
    ]);
    return { page, pageSize, total, items: items.map(this.ad) };
  }
  async advertisement(id: string) {
    const a = await this.db.advertisement.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true, email: true } }, placements: { select: { placement: true } } },
    });
    if (!a) throw new NotFoundException("Advertisement not found");
    return { ...this.ad(a), statistics: await this.advertisementStats(id) };
  }
  async createAdvertisement(
    b: AdvertisementMutationDto,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const data = this.adInput(b, true);
    const a = await this.db.$transaction(async (tx: any) => tx.advertisement.create({
      data: { ...data, createdById: admin.id },
      include: { createdBy: { select: { id: true, name: true, email: true } }, placements: { select: { placement: true } } },
    }));
    await this.audit(
      admin.id,
      AdminAuditAction.ADVERTISEMENT_CREATED,
      "Advertisement",
      a.id,
      meta,
      { status: a.status },
    );
    return this.ad(a);
  }
  async updateAdvertisement(
    id: string,
    b: AdvertisementMutationDto,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const current = await this.db.advertisement.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true, email: true } }, placements: { select: { placement: true } } },
    });
    if (!current) throw new NotFoundException("Advertisement not found");
    const data = this.adInput(b, false, current);
    const a = await this.db.$transaction(async (tx: any) => tx.advertisement
      .update({
        where: { id },
        data,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          placements: { select: { placement: true } },
        },
      }))
      .catch(() => {
        throw new NotFoundException("Advertisement not found");
      });
    await this.audit(
      admin.id,
      data.status === "PAUSED"
        ? AdminAuditAction.ADVERTISEMENT_PAUSED
        : data.status === "ACTIVE"
          ? AdminAuditAction.ADVERTISEMENT_PUBLISHED
          : AdminAuditAction.ADVERTISEMENT_UPDATED,
      "Advertisement",
      id,
      meta,
      { changes: Object.keys(data) },
    );
    return this.ad(a);
  }
  async deleteAdvertisement(id: string, admin: AdminRequestUser, meta: Meta) {
    const existing = await this.db.advertisement.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        mobileImagePath: true,
        tabletImagePath: true,
        desktopImagePath: true,
        events: { select: { id: true }, take: 1 },
      },
    });
    if (!existing) throw new NotFoundException("Advertisement not found");
    const soft =
      existing.status === "ACTIVE" ||
      existing.status === "ENDED" ||
      existing.events.length;
    if (soft)
      await this.db.advertisement.update({
        where: { id },
        data: { status: "ENDED" },
      });
    else {
      await this.db.advertisement.delete({ where: { id } });
      for (const p of [
        existing.mobileImagePath,
        existing.tabletImagePath,
        existing.desktopImagePath,
      ])
        void this.removeAdFileIfUnreferenced(p);
    }
    await this.audit(
      admin.id,
      AdminAuditAction.ADVERTISEMENT_UPDATED,
      "Advertisement",
      id,
      meta,
      { deleted: true, softDeleted: soft },
    );
    return { id, deleted: true };
  }

  async uploadAdvertisementImage(
    id: string,
    variant: AdVariant,
    file: {
      buffer?: Buffer;
      mimetype?: string;
      originalname?: string;
      size?: number;
    },
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const v = this.variant(variant);
    const before = await this.db.advertisement.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true, email: true } }, placements: { select: { placement: true } } },
    });
    if (!before) throw new NotFoundException("Advertisement not found");
    const img = this.validateAdImage(file);
    await mkdir(join(AD_UPLOAD_ROOT, id, v.toLowerCase()), { recursive: true });
    const filename = `${randomBytes(16).toString("hex")}.${img.ext}`;
    const rel = `${id}/${v.toLowerCase()}/${filename}`;
    const abs = this.safeAdPath(rel);
    let wrote = false;
    try {
      await writeFile(abs, file.buffer!);
      wrote = true;
      const prefix = v.toLowerCase();
      const data: any = {};
      data[`${prefix}ImagePath`] = rel;
      data[`${prefix}ImageWidth`] = img.width;
      data[`${prefix}ImageHeight`] = img.height;
      data[`${prefix}ImageMimeType`] = img.mimeType;
      const updated = await this.db.advertisement.update({
        where: { id },
        data,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          placements: { select: { placement: true } },
        },
      });
      const old = before[`${prefix}ImagePath`];
      if (old && old !== rel) void this.removeAdFileIfUnreferenced(old);
      await this.audit(
        admin.id,
        old
          ? AdminAuditAction.ADVERTISEMENT_IMAGE_REPLACED
          : AdminAuditAction.ADVERTISEMENT_IMAGE_UPLOADED,
        "Advertisement",
        id,
        meta,
        {
          variant: v,
          width: img.width,
          height: img.height,
          mimeType: img.mimeType,
        },
      );
      return {
        advertisement: this.ad(updated),
        image: this.imageDto(updated, prefix as "mobile" | "tablet" | "desktop"),
      };
    } catch (e) {
      if (wrote) await unlink(abs).catch(() => undefined);
      throw e;
    }
  }

  async removeAdvertisementImage(
    id: string,
    variant: AdVariant,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const v = this.variant(variant);
    if (v === "MOBILE")
      throw new BadRequestException(
        "Mobile advertisement image cannot be removed; replace it instead",
      );
    const a = await this.db.advertisement.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true, email: true } }, placements: { select: { placement: true } } },
    });
    if (!a) throw new NotFoundException("Advertisement not found");
    const prefix = v.toLowerCase();
    const old = a[`${prefix}ImagePath`];
    if (!old) return this.ad(a);
    const data: any = {};
    for (const f of ["Path", "Width", "Height", "MimeType"])
      data[`${prefix}Image${f}`] = null;
    const updated = await this.db.advertisement.update({
      where: { id },
      data,
      include: { createdBy: { select: { id: true, name: true, email: true } }, placements: { select: { placement: true } } },
    });
    void this.removeAdFileIfUnreferenced(old);
    await this.audit(
      admin.id,
      AdminAuditAction.ADVERTISEMENT_IMAGE_REMOVED,
      "Advertisement",
      id,
      meta,
      { variant: v },
    );
    return this.ad(updated);
  }

  async feedbackSubmissions() {
    const items = await this.db.feedbackSubmission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        family: { select: { id: true, name: true } },
      },
    });
    return {
      bugReports: items
        .filter((i: any) => i.type === "bug")
        .map((i: any) => this.feedback(i)),
      generalFeedback: items
        .filter((i: any) => i.type === "feedback")
        .map((i: any) => this.feedback(i)),
    };
  }

  async feedbackSubmission(id: string) {
    const item = await this.db.feedbackSubmission.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        family: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException("Feedback submission not found");
    return this.feedback(item);
  }

  async adminUsers() {
    return (
      await this.db.adminUser.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    ).map(this.admin);
  }
  async createAdmin(
    b: CreateAdminUserDto,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    const email = this.email(b.email);
    const password = this.password(b.password);
    const role = this.enumVal(b.role, ADMIN_ROLES, "role") as AdminRoleDto;
    const u = await this.db.adminUser.create({
      data: {
        email,
        passwordHash: await this.auth.hashPassword(password),
        name: this.reqStr(b.name, "name"),
        role,
        active: b.active === undefined ? true : this.bool(b.active, "active"),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await this.audit(
      admin.id,
      AdminAuditAction.ADMIN_CREATED,
      "AdminUser",
      u.id,
      meta,
      { role },
    );
    return this.admin(u);
  }
  async updateAdmin(
    id: string,
    b: UpdateAdminUserDto,
    admin: AdminRequestUser,
    meta: Meta,
  ) {
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.adminUser.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("Admin user not found");
      const data: any = {};
      if (b.name !== undefined) data.name = this.reqStr(b.name, "name");
      if (b.role !== undefined)
        data.role = this.enumVal(b.role, ADMIN_ROLES, "role");
      if (b.active !== undefined) data.active = this.bool(b.active, "active");
      if (
        current.role === "SUPER_ADMIN" &&
        current.active &&
        ((data.role && data.role !== "SUPER_ADMIN") || data.active === false)
      )
        await this.ensureAnotherSuper(tx, id);
      const u = await tx.adminUser.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.id,
          action:
            data.active === false
              ? AdminAuditAction.ADMIN_DISABLED
              : AdminAuditAction.ADMIN_UPDATED,
          targetType: "AdminUser",
          targetId: id,
          metadata: { changes: Object.keys(data) },
          ipAddress: meta.ipAddress ?? null,
        },
      });
      return this.admin(u);
    });
  }
  async auditLog(q: AuditLogQueryDto, admin: AdminRequestUser) {
    if (admin.role !== "SUPER_ADMIN")
      throw new ForbiddenException("Only SUPER_ADMIN can access audit logs");
    const { page, pageSize, skip, take } = this.page(q, 50, 100);
    const where: any = {};
    if (q.adminId) where.adminUserId = this.reqStr(q.adminId, "adminId");
    if (q.action) where.action = this.reqStr(q.action, "action");
    if (q.from || q.to)
      where.createdAt = {
        ...(q.from ? { gte: this.date(q.from, "from") } : {}),
        ...(q.to ? { lte: this.date(q.to, "to") } : {}),
      };
    const [total, items] = await Promise.all([
      this.db.adminAuditLog.count({ where }),
      this.db.adminAuditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          adminUser: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: items.map((l: any) => ({
        id: l.id,
        adminUser: l.adminUser,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        metadata: this.safeMetadata(l.metadata),
        ipAddress: l.ipAddress,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  private reason(v: unknown) {
    const s = this.limitedStr(v, "reason", 500);
    if (s.length < 3) throw new BadRequestException("reason is required");
    return s;
  }
  private limitedStr(v: unknown, n: string, max: number) {
    const s = this.reqStr(v, n);
    if (s.length > max) throw new BadRequestException(`${n} is too long`);
    return s;
  }
  private summarize(s: string) {
    return s.length <= 80 ? s : `${s.slice(0, 77)}...`;
  }
  private optionalFamilyCode(v: unknown) {
    if (v === undefined || v === null || v === "") return null;
    const compact = this.reqStr(v, "inviteCode")
      .toUpperCase()
      .replace(/[\s-]+/g, "");
    const normalized = compact.startsWith("FA") ? compact : `FA${compact}`;
    if (!/^FA[A-Z0-9]{6}$/.test(normalized))
      throw new BadRequestException("inviteCode is invalid");
    return `FA-${normalized.slice(2)}`;
  }
  private generateFamilyCode() {
    const bytes = randomBytes(6);
    return `FA-${Array.from(bytes, (b) => FAMILY_CODE_ALPHABET[b % FAMILY_CODE_ALPHABET.length]).join("")}`;
  }
  private async createFamilyWithCode(tx: any, data: any) {
    for (let i = 0; i < 12; i++) {
      const code = this.generateFamilyCode();
      const existing = await tx.family
        .findUnique({ where: { code } })
        .catch(() => null);
      if (existing) continue;
      try {
        return await tx.family.create({
          data: { ...data, code },
          select: { id: true, name: true, code: true },
        });
      } catch (e) {
        if (this.isUnique(e)) continue;
        throw e;
      }
    }
    throw new ConflictException("Could not generate a unique family code");
  }
  private isUnique(e: any) {
    return e && typeof e === "object" && e.code === "P2002";
  }
  private async soleOwnerFamilyCount(
    tx: any,
    userId: string,
    memberships: any[],
  ) {
    let count = 0;
    for (const m of memberships) {
      if (
        m.role === "OWNER" &&
        (await tx.familyMember.count({
          where: {
            familyId: m.familyId,
            role: "OWNER",
            userId: { not: userId },
          },
        })) < 1
      )
        count++;
    }
    return count;
  }
  private async countByRelated(model: any, relation: string, familyId: string) {
    return model.count({ where: { [relation]: { familyId } } });
  }
  private countCalendarParticipantsByFamily(familyId: string) {
    return this.countByRelated(
      this.db.calendarEventParticipant,
      "event",
      familyId,
    );
  }
  private countCalendarExceptionsByFamily(familyId: string) {
    return this.countByRelated(
      this.db.calendarEventException,
      "recurringEvent",
      familyId,
    );
  }
  private countShoppingItemsByFamily(familyId: string) {
    return this.countByRelated(
      this.db.shoppingListItem,
      "shoppingList",
      familyId,
    );
  }
  private countShoppingAccessesByFamily(familyId: string) {
    return this.countByRelated(
      this.db.shoppingListAccess,
      "shoppingList",
      familyId,
    );
  }
  private countReminderAudienceByFamily(familyId: string) {
    return this.countByRelated(
      this.db.reminderAudienceMember,
      "reminder",
      familyId,
    );
  }
  private countListItemsByFamily(familyId: string) {
    return this.countByRelated(this.db.listItem, "list", familyId);
  }
  private countWishlistReservationsByFamily(familyId: string) {
    return this.countByRelated(
      this.db.wishlistItemReservation,
      "wishlistItem",
      familyId,
    );
  }

  private safeMetadata(value: any): any {
    if (Array.isArray(value)) return value.map((v) => this.safeMetadata(v));
    if (value && typeof value === "object") {
      const out: any = {};
      for (const [key, nested] of Object.entries(value)) {
        if (
          /password|passwordHash|token|session|secret|privateUrl|invitationToken/i.test(
            key,
          )
        )
          out[key] = "[redacted]";
        else out[key] = this.safeMetadata(nested);
      }
      return out;
    }
    return value;
  }

  private async ensureAnotherSuper(tx: any, id: string) {
    const c = await tx.adminUser.count({
      where: { id: { not: id }, role: "SUPER_ADMIN", active: true },
    });
    if (c < 1)
      throw new BadRequestException(
        "Cannot remove the last active SUPER_ADMIN",
      );
  }
  private async audit(
    adminUserId: string,
    action: string,
    targetType: string,
    targetId: string,
    meta: Meta,
    metadata: any,
  ) {
    await this.db.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        targetType,
        targetId,
        metadata,
        ipAddress: meta.ipAddress ?? null,
      },
    });
  }
  private page(q: PageQueryDto, def: number, max: number) {
    const page = Math.max(1, Number(q.page ?? 1) || 1);
    const pageSize = Math.min(
      max,
      Math.max(1, Number(q.pageSize ?? def) || def),
    );
    return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
  }
  private str(v: unknown) {
    return typeof v === "string" && v.trim() ? v.trim() : null;
  }
  private reqStr(v: unknown, n: string) {
    const s = this.str(v);
    if (!s) throw new BadRequestException(`${n} is required`);
    return s;
  }
  private bool(v: unknown, n: string) {
    if (typeof v !== "boolean")
      throw new BadRequestException(`${n} must be boolean`);
    return v;
  }
  private enumVal(v: unknown, vals: string[], n: string, optional = false) {
    if (optional && v === undefined) return undefined;
    if (typeof v !== "string" || !vals.includes(v))
      throw new BadRequestException(`${n} is invalid`);
    return v;
  }
  private email(v: unknown) {
    const e = this.reqStr(v, "email").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      throw new BadRequestException("email is invalid");
    return e;
  }
  private password(v: unknown) {
    if (typeof v !== "string" || v.length < 8)
      throw new BadRequestException("password must be at least 8 characters");
    return v;
  }
  private date(v: unknown, n: string) {
    const d = new Date(this.reqStr(v, n));
    if (Number.isNaN(d.getTime()))
      throw new BadRequestException(`${n} is invalid`);
    return d;
  }
  private adInput(
    b: AdvertisementMutationDto,
    create: boolean,
    current: any = null,
  ) {
    const data: any = {};
    if (create || b.title !== undefined)
      data.title = this.reqStr(b.title, "title");
    if (b.body !== undefined) data.body = null;
    if (create || b.placements !== undefined || b.placement !== undefined) {
      const placements = this.adPlacements(b.placements !== undefined ? b.placements : b.placement, create);
      data.placements = { deleteMany: {}, create: placements.map((placement: string) => ({ placement })) };
    }
    if (b.status !== undefined)
      data.status = this.enumVal(b.status, AD_STATUSES, "status");
    if (b.imageUrl !== undefined) data.imageUrl = null;
    if (b.altText !== undefined)
      data.altText =
        b.altText === null
          ? null
          : this.limited(this.reqStr(b.altText, "altText"), "altText", 180);
    if (b.targetUrl !== undefined)
      data.targetUrl =
        b.targetUrl === null ? null : this.httpsUrl(b.targetUrl, "targetUrl");
    if (b.startsAt !== undefined)
      data.startsAt =
        b.startsAt === null ? null : this.date(b.startsAt, "startsAt");
    if (b.endsAt !== undefined)
      data.endsAt = b.endsAt === null ? null : this.date(b.endsAt, "endsAt");
    const merged = { ...(current ?? {}), ...data };
    if (merged.startsAt && merged.endsAt && merged.endsAt < merged.startsAt)
      throw new BadRequestException("endsAt cannot be before startsAt");
    const mergedPlacements = data.placements?.create?.map((p: any) => p.placement) ?? this.adPlacementArray(current);
    if (["SCHEDULED", "ACTIVE"].includes(merged.status)) {
      if (mergedPlacements.length === 0) throw new BadRequestException("at least one placement is required before publishing advertisement");
      if (!this.str(merged.altText))
        throw new BadRequestException(
          "altText is required before publishing advertisement",
        );
      if (!merged.targetUrl)
        throw new BadRequestException(
          "targetUrl is required before publishing advertisement",
        );
      this.httpsUrl(merged.targetUrl, "targetUrl");
      if (!merged.mobileImagePath)
        throw new BadRequestException(
          "mobile image is required before publishing advertisement",
        );
      if (!existsSync(this.safeAdPath(merged.mobileImagePath)))
        throw new BadRequestException("mobile image file is missing");
    }
    return data;
  }

  private adPlacements(value: unknown, create: boolean) {
    if (value === undefined || value === null) return create ? [] : [];
    const raw = Array.isArray(value) ? value : [value];
    const out: string[] = [];
    for (const item of raw) {
      const placement = this.enumVal(item, AD_PLACEMENTS, "placement") as string;
      if (!out.includes(placement)) out.push(placement);
    }
    return out;
  }
  private adPlacementArray(a: any) {
    if (Array.isArray(a?.placements)) return a.placements.map((p: any) => typeof p === "string" ? p : p.placement).filter(Boolean);
    return a?.placement ? [a.placement] : [];
  }
  private url(v: unknown, n: string) {
    const s = this.reqStr(v, n);
    try {
      const u = new URL(s);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
      return s;
    } catch {
      throw new BadRequestException(`${n} must be a valid URL`);
    }
  }
  private httpsUrl(v: unknown, n: string) {
    const s = this.reqStr(v, n);
    try {
      const u = new URL(s);
      if (u.protocol !== "https:") throw new Error();
      return s;
    } catch {
      throw new BadRequestException(`${n} must be a valid HTTPS URL`);
    }
  }
  private limited(s: string, n: string, max: number) {
    if (s.length > max) throw new BadRequestException(`${n} is too long`);
    return s;
  }
  private feedback = (f: any) => ({
    id: f.id,
    type: f.type,
    title: this.feedbackTitle(f.message),
    message: f.message,
    createdAt: f.createdAt.toISOString(),
    userId: f.userId,
    userName: f.user?.name ?? null,
    email: f.user?.email ?? null,
    familyId: f.familyId ?? null,
    familyName: f.family?.name ?? null,
    appVersion: f.appVersion ?? null,
    userAgent: f.userAgent ?? null,
    status: f.status ?? "New",
  });
  private feedbackTitle(message: any) {
    const text = String(message ?? "")
      .trim()
      .replace(/\s+/g, " ");
    return text.length > 80
      ? `${text.slice(0, 77)}...`
      : text || "Untitled submission";
  }
  private async advertisementStats(advertisementId?: string) {
    const now = Date.now(), day = 864e5;
    const where = advertisementId ? { advertisementId } : {};
    const events = await ((this.db as any).advertisementEvent?.findMany?.({ where, select: { advertisementId: true, type: true, metadata: true, occurredAt: true } }) ?? Promise.resolve([]));
    const ads = await this.db.advertisement.findMany({
      ...(advertisementId ? { where: { id: advertisementId } } : {}),
      include: { placements: { select: { placement: true } } },
    });
    const count = (type: string, days?: number, placement?: string, id?: string) => events.filter((e: any) =>
      e.type === type && (!id || e.advertisementId === id) && (!days || new Date(e.occurredAt).getTime() >= now - days * day) && (!placement || e.metadata?.placement === placement)
    ).length;
    const summary = (id?: string) => { const impressions = count("IMPRESSION", undefined, undefined, id), clicks = count("CLICK", undefined, undefined, id); return { impressions, clicks, ctr: this.ctr(clicks, impressions), last7Days: { impressions: count("IMPRESSION", 7, undefined, id), clicks: count("CLICK", 7, undefined, id) }, last30Days: { impressions: count("IMPRESSION", 30, undefined, id), clicks: count("CLICK", 30, undefined, id) } }; };
    const total = summary(advertisementId);
    const activeAdvertisementCount = ads.filter((a: any) => a.status === "ACTIVE").length;
    const rows = ads.map((a: any) => ({ id: a.id, title: a.title, status: a.status, placements: this.adPlacementArray(a), ...summary(a.id) }));
    const perPlacement = AD_PLACEMENTS.map((placement) => ({ placement, impressions: count("IMPRESSION", undefined, placement, advertisementId), clicks: count("CLICK", undefined, placement, advertisementId) })).filter((p) => p.impressions || p.clicks);
    return { ...total, activeAdvertisementCount, perPlacement, advertisements: rows };
  }
  private ctr(clicks: number, impressions: number) { return impressions ? Math.round((clicks / impressions) * 10000) / 100 : 0; }
  private ad = (a: any) => ({
    id: a.id,
    title: a.title,
    body: a.body ?? null,
    imageUrl: a.imageUrl ?? null,
    altText: a.altText ?? null,
    targetUrl: a.targetUrl,
    placements: this.adPlacementArray(a),
    status: a.status,
    startsAt: a.startsAt?.toISOString?.() ?? null,
    endsAt: a.endsAt?.toISOString?.() ?? null,
    images: {
      mobile: this.imageDto(a, "mobile"),
      tablet: this.imageDto(a, "tablet"),
      desktop: this.imageDto(a, "desktop"),
    },
    createdBy: a.createdBy,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  });
  private imageDto(a: any, p: "mobile" | "tablet" | "desktop") {
    const path = a[`${p}ImagePath`];
    return path
      ? {
          url: `${AD_PUBLIC_PREFIX}/${path}`,
          width: a[`${p}ImageWidth`],
          height: a[`${p}ImageHeight`],
          mimeType: a[`${p}ImageMimeType`],
        }
      : null;
  }
  private variant(v: unknown): AdVariant {
    return this.enumVal(
      v,
      ["MOBILE", "TABLET", "DESKTOP"],
      "variant",
    ) as AdVariant;
  }
  private safeAdPath(rel: string) {
    const n = normalize(rel).replace(/^(\.\.[\/])+/, "");
    const full = resolve(AD_UPLOAD_ROOT, n);
    if (!full.startsWith(resolve(AD_UPLOAD_ROOT)))
      throw new BadRequestException("Invalid advertisement image path");
    return full;
  }
  private async removeAdFileIfUnreferenced(rel: any) {
    if (!rel) return;
    const c = await this.db.advertisement
      .count({
        where: {
          OR: [
            { mobileImagePath: rel },
            { tabletImagePath: rel },
            { desktopImagePath: rel },
          ],
        },
      })
      .catch(() => 1);
    if (c === 0) await unlink(this.safeAdPath(rel)).catch(() => undefined);
  }
  private validateAdImage(file: {
    buffer?: Buffer;
    mimetype?: string;
    originalname?: string;
    size?: number;
  }) {
    if (!file?.buffer)
      throw new BadRequestException("Advertisement image file is required");
    if ((file.size ?? file.buffer.length) > MAX_AD_IMAGE_BYTES)
      throw new BadRequestException(
        "Advertisement image must be smaller than 5 MB",
      );
    const m = this.detectImage(file.buffer);
    if (!m)
      throw new BadRequestException(
        "Advertisement image must be JPEG, PNG or WebP",
      );
    if (file.mimetype && file.mimetype !== m.mimeType)
      throw new BadRequestException(
        "Advertisement image MIME type does not match file contents",
      );
    if (
      m.width <= 0 ||
      m.height <= 0 ||
      m.width > MAX_AD_IMAGE_DIMENSION ||
      m.height > MAX_AD_IMAGE_DIMENSION
    )
      throw new BadRequestException(
        "Advertisement image dimensions are too large",
      );
    return m;
  }
  private detectImage(
    b: Buffer,
  ): null | { mimeType: string; ext: string; width: number; height: number } {
    if (b.length > 24 && b[0] === 0xff && b[1] === 0xd8) {
      let o = 2;
      while (o + 9 < b.length) {
        if (b[o] !== 0xff) {
          o++;
          continue;
        }
        const marker = b[o + 1];
        const len = b.readUInt16BE(o + 2);
        if ([0xc0, 0xc2].includes(marker))
          return {
            mimeType: "image/jpeg",
            ext: "jpg",
            height: b.readUInt16BE(o + 5),
            width: b.readUInt16BE(o + 7),
          };
        o += 2 + len;
      }
      return null;
    }
    if (b.length > 24 && b.toString("hex", 0, 8) === "89504e470d0a1a0a")
      return {
        mimeType: "image/png",
        ext: "png",
        width: b.readUInt32BE(16),
        height: b.readUInt32BE(20),
      };
    if (
      b.length > 30 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    ) {
      const t = b.toString("ascii", 12, 16);
      if (t === "VP8X")
        return {
          mimeType: "image/webp",
          ext: "webp",
          width: 1 + b.readUIntLE(24, 3),
          height: 1 + b.readUIntLE(27, 3),
        };
      if (t === "VP8 ")
        return {
          mimeType: "image/webp",
          ext: "webp",
          width: b.readUInt16LE(26) & 0x3fff,
          height: b.readUInt16LE(28) & 0x3fff,
        };
      if (t === "VP8L")
        return {
          mimeType: "image/webp",
          ext: "webp",
          width: 1 + (((b[22] & 0x3f) << 8) | b[21]),
          height:
            1 + (((b[24] & 0xf) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)),
        };
    }
    return null;
  }
  private admin = (a: any) => ({
    id: a.id,
    email: a.email,
    name: a.name,
    role: a.role,
    active: a.active,
    lastLoginAt: a.lastLoginAt?.toISOString?.() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  });
}
