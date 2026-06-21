import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { NotificationPreferencesDto, UpdateNotificationPreferencesRequestDto } from "./dto/notification-preferences.dto";

const preferenceKeys = [
  "shoppingEnabled",
  "calendarEnabled",
  "remindersEnabled",
  "tasksEnabled",
  "mealsEnabled",
  "wishlistEnabled",
  "systemEnabled"
] as const;

type PreferenceModelKey = (typeof preferenceKeys)[number];

type NotificationPreferenceDelegate = {
  upsert(input: {
    where: { userId: string };
    update: Partial<Record<PreferenceModelKey, boolean>>;
    create: { userId: string } & Partial<Record<PreferenceModelKey, boolean>>;
  }): Promise<NotificationPreferenceRecord>;
  findUnique(input: { where: { userId: string } }): Promise<NotificationPreferenceRecord | null>;
};

type NotificationPreferencePrismaClient = {
  notificationPreference: NotificationPreferenceDelegate;
};

type NotificationPreferenceRecord = {
  id: string;
  userId: string;
  shoppingEnabled: boolean;
  calendarEnabled: boolean;
  remindersEnabled: boolean;
  tasksEnabled: boolean;
  mealsEnabled: boolean;
  wishlistEnabled: boolean;
  systemEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  private get notificationPreference(): NotificationPreferenceDelegate {
    return (this.prisma.client as unknown as NotificationPreferencePrismaClient).notificationPreference;
  }

  async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    return this.toDto(await this.getOrCreatePreferences(userId));
  }

  async getOrCreatePreferences(userId: string): Promise<NotificationPreferenceRecord> {
    return this.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });
  }

  async updatePreferences(userId: string, body: UpdateNotificationPreferencesRequestDto): Promise<NotificationPreferencesDto> {
    const data = this.parseUpdate(body);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("At least one notification preference is required");
    }

    const preferences = await this.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });

    return this.toDto(preferences);
  }

  private parseUpdate(body: UpdateNotificationPreferencesRequestDto): Partial<Record<PreferenceModelKey, boolean>> {
    const data: Partial<Record<PreferenceModelKey, boolean>> = {};

    for (const key of preferenceKeys) {
      const value = body[key];

      if (value === undefined) {
        continue;
      }

      if (typeof value !== "boolean") {
        throw new BadRequestException(`${key} must be a boolean`);
      }

      data[key] = value;
    }

    return data;
  }

  private toDto(preferences: NotificationPreferenceRecord): NotificationPreferencesDto {
    return {
      id: preferences.id,
      userId: preferences.userId,
      shoppingEnabled: preferences.shoppingEnabled,
      calendarEnabled: preferences.calendarEnabled,
      remindersEnabled: preferences.remindersEnabled,
      tasksEnabled: preferences.tasksEnabled,
      mealsEnabled: preferences.mealsEnabled,
      wishlistEnabled: preferences.wishlistEnabled,
      systemEnabled: preferences.systemEnabled,
      createdAt: preferences.createdAt.toISOString(),
      updatedAt: preferences.updatedAt.toISOString()
    };
  }
}
