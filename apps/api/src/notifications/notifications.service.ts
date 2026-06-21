import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { NotificationPreferencesService } from "../notification-preferences/notification-preferences.service";
import { NotificationDto, RegisterPushDeviceRequestDto, PushDeviceDto } from "./dto/notifications.dto";

type NotificationRecord = NotificationDto & { createdAt: Date; updatedAt: Date; readAt: Date | null };
type PushDeviceRecord = Omit<PushDeviceDto, "createdAt" | "updatedAt" | "lastSeenAt" | "disabledAt"> & {
  createdAt: Date; updatedAt: Date; lastSeenAt: Date; disabledAt: Date | null;
};

type CreateNotificationInput = {
  familyId: string; recipientUserId: string; actorUserId?: string | null; type: string; title: string; body: string;
  entityType?: string | null; entityId?: string | null; deepLink?: string | null; allowSelfNotification?: boolean; allowNonFamilyRecipient?: boolean; cooldownMinutes?: number;
};

type CreateFamilyNotificationsInput = Omit<CreateNotificationInput, "recipientUserId"> & {
  excludeUserIds?: string[]; recipientUserIds?: string[];
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly notificationPreferencesService: NotificationPreferencesService) {}

  async listNotifications(userId: string, query: { unreadOnly?: string; limit?: string; cursor?: string; before?: string }): Promise<NotificationDto[]> {
    const take = this.parseLimit(query.limit);
    const where: Record<string, unknown> = { recipientUserId: userId };
    if (query.unreadOnly === "true") where.readAt = null;
    if (query.before) where.createdAt = { lt: new Date(query.before) };

    const args: Record<string, unknown> = { where, orderBy: { createdAt: "desc" }, take };
    if (query.cursor) {
      args.cursor = { id: query.cursor };
      args.skip = 1;
    }

    const rows = (await this.notification.findMany(args)) as NotificationRecord[];
    return rows.map((row: NotificationRecord) => this.toNotificationDto(row));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notification.count({ where: { recipientUserId: userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<NotificationDto> {
    const row = await this.notification.findFirst({ where: { id, recipientUserId: userId } });
    if (!row) throw new NotFoundException("Notification was not found");
    return this.toNotificationDto(await this.notification.update({ where: { id }, data: { readAt: row.readAt ?? new Date() } }));
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    return this.notification.updateMany({ where: { recipientUserId: userId, readAt: null }, data: { readAt: new Date() } });
  }

  async registerDevice(userId: string, body: RegisterPushDeviceRequestDto): Promise<PushDeviceDto> {
    const expoPushToken = this.requiredString(body.expoPushToken, "expoPushToken");
    const data = {
      userId,
      platform: this.optionalString(body.platform, "platform"),
      deviceName: this.optionalString(body.deviceName, "deviceName"),
      appVersion: this.optionalString(body.appVersion, "appVersion"),
      lastSeenAt: new Date(),
      disabledAt: null
    };
    const row = await this.pushDevice.upsert({ where: { expoPushToken }, update: data, create: { expoPushToken, ...data } });
    return this.toPushDeviceDto(row);
  }

  async disableDevice(userId: string, id: string): Promise<PushDeviceDto> {
    const row = await this.pushDevice.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException("Push device was not found");
    return this.toPushDeviceDto(await this.pushDevice.update({ where: { id }, data: { disabledAt: new Date() } }));
  }


  async hasRecentNotification(input: { recipientUserId: string; type: string; entityType?: string | null; entityId?: string | null; cooldownMinutes: number }): Promise<boolean> {
    const since = new Date(Date.now() - input.cooldownMinutes * 60 * 1000);
    const row = await this.notification.findFirst({
      where: {
        recipientUserId: input.recipientUserId,
        type: input.type,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        createdAt: { gte: since }
      },
      select: { id: true }
    });
    return Boolean(row);
  }

  async createNotification(input: CreateNotificationInput): Promise<NotificationDto | null> {
    if (input.actorUserId === input.recipientUserId && !input.allowSelfNotification) return null;
    if (!input.allowNonFamilyRecipient) await this.requireFamilyUser(input.familyId, input.recipientUserId);
    if (input.actorUserId) await this.requireFamilyUser(input.familyId, input.actorUserId);
    if (!(await this.isNotificationTypeEnabled(input.recipientUserId, input.type))) return null;
    if (input.cooldownMinutes !== undefined && await this.hasRecentNotification({
      recipientUserId: input.recipientUserId,
      type: input.type,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      cooldownMinutes: input.cooldownMinutes
    })) return null;
    const { allowNonFamilyRecipient, allowSelfNotification, cooldownMinutes, ...data } = input;
    void allowNonFamilyRecipient;
    void allowSelfNotification;
    void cooldownMinutes;
    const row = await this.notification.create({ data: { ...data, actorUserId: input.actorUserId ?? null, entityType: input.entityType ?? null, entityId: input.entityId ?? null, deepLink: input.deepLink ?? null } });
    return this.toNotificationDto(row);
  }

  async getUserDisplayName(userId: string): Promise<string> {
    const user = await (this.prisma.client as any).user.findUnique({ where: { id: userId }, select: { displayName: true, firstName: true, name: true, email: true } });
    return user?.displayName || user?.firstName || user?.name || user?.email || "Noen";
  }

  async getUserIdsForFamilyMemberIds(familyId: string, familyMemberIds: string[]): Promise<string[]> {
    if (familyMemberIds.length === 0) return [];
    const members = await this.familyMember.findMany({ where: { familyId, id: { in: [...new Set(familyMemberIds)] }, userId: { not: null } }, select: { userId: true } });
    return [...new Set((members as Array<{ userId: string | null }>).map((member) => member.userId).filter((userId): userId is string => Boolean(userId)))];
  }

  async createNotificationForFamilyMembers(input: CreateFamilyNotificationsInput): Promise<NotificationDto[]> {
    const members = await this.familyMember.findMany({ where: { familyId: input.familyId, userId: { not: null } } });
    const excluded = new Set(input.excludeUserIds ?? []);
    if (input.actorUserId && !input.allowSelfNotification) excluded.add(input.actorUserId);
    const allowed = input.recipientUserIds ? new Set(input.recipientUserIds) : null;
    const { excludeUserIds, recipientUserIds: _recipientUserIds, ...notificationInput } = input;
    void excludeUserIds;
    void _recipientUserIds;
    const recipientUserIds = (members as Array<{ userId: string | null }>)
      .map((member) => member.userId)
      .filter((userId): userId is string => typeof userId === "string");
    const notifications = await Promise.all(recipientUserIds
      .filter((userId) => !excluded.has(userId) && (!allowed || allowed.has(userId)))
      .map((recipientUserId: string) => this.createNotification({ ...notificationInput, recipientUserId })));
    return notifications.filter((notification): notification is NotificationDto => Boolean(notification));
  }

  private async isNotificationTypeEnabled(userId: string, type: string): Promise<boolean> {
    const category = this.getPreferenceCategory(type);
    if (!category) return true;

    const preferences = await this.notificationPreferencesService.getOrCreatePreferences(userId);
    return preferences[category];
  }

  private getPreferenceCategory(type: string): "shoppingEnabled" | "calendarEnabled" | "remindersEnabled" | "tasksEnabled" | "mealsEnabled" | "wishlistEnabled" | "systemEnabled" | null {
    if (type.startsWith("shopping_") || type === "list_created" || type === "list_item_added") return "shoppingEnabled";
    if (type.startsWith("calendar_")) return "calendarEnabled";
    if (type.startsWith("reminder_")) return "remindersEnabled";
    if (type.startsWith("task_")) return "tasksEnabled";
    if (type.startsWith("meal_")) return "mealsEnabled";
    if (type.startsWith("wishlist_")) return "wishlistEnabled";
    if (type.startsWith("system_")) return "systemEnabled";
    return null;
  }

  private async requireFamilyUser(familyId: string, userId: string): Promise<void> {
    const membership = await this.familyMember.findFirst({ where: { familyId, userId } });
    if (!membership) throw new BadRequestException("Recipient must belong to the family");
  }

  private parseLimit(value?: string): number { const n = value ? Number(value) : 50; return Math.min(Math.max(Number.isFinite(n) ? n : 50, 1), 100); }
  private requiredString(value: unknown, field: string): string { if (typeof value !== "string" || !value.trim()) throw new BadRequestException(`${field} is required`); return value.trim(); }
  private optionalString(value: unknown, field: string): string | null { if (value === undefined || value === null || value === "") return null; if (typeof value !== "string") throw new BadRequestException(`${field} must be a string`); return value.trim(); }
  private toNotificationDto(row: NotificationRecord): NotificationDto { return { ...row, readAt: row.readAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
  private toPushDeviceDto(row: PushDeviceRecord): PushDeviceDto { return { ...row, lastSeenAt: row.lastSeenAt.toISOString(), disabledAt: row.disabledAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
  private get notification() { return (this.prisma.client as any).notification; }
  private get pushDevice() { return (this.prisma.client as any).pushDevice; }
  private get familyMember() { return (this.prisma.client as any).familyMember; }
}
