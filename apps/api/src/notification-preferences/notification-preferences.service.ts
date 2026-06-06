import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { NotificationPreferencesDto, UpdateNotificationPreferencesRequestDto } from "./dto/notification-preferences.dto";

const preferenceKeys = {
  calendar_events: "calendarEvents",
  calendar_reminders: "calendarReminders",
  husk_reminders: "huskReminders",
  wishlist_shared: "wishlistShared",
  family_invites: "familyInvites"
} as const;

type PreferenceApiKey = keyof typeof preferenceKeys;
type PreferenceModelKey = (typeof preferenceKeys)[PreferenceApiKey];

type NotificationPreferenceDelegate = {
  upsert(input: {
    where: { userId: string };
    update: Partial<Record<PreferenceModelKey, boolean>>;
    create: { userId: string } & Partial<Record<PreferenceModelKey, boolean>>;
  }): Promise<NotificationPreferenceRecord>;
};

type NotificationPreferencePrismaClient = {
  notificationPreference: NotificationPreferenceDelegate;
};

type NotificationPreferenceRecord = {
  id: string;
  userId: string;
  calendarEvents: boolean;
  calendarReminders: boolean;
  huskReminders: boolean;
  wishlistShared: boolean;
  familyInvites: boolean;
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
    const preferences = await this.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });

    return this.toDto(preferences);
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

    for (const [apiKey, modelKey] of Object.entries(preferenceKeys) as Array<[PreferenceApiKey, PreferenceModelKey]>) {
      const value = body[apiKey];

      if (value === undefined) {
        continue;
      }

      if (typeof value !== "boolean") {
        throw new BadRequestException(`${apiKey} must be a boolean`);
      }

      data[modelKey] = value;
    }

    return data;
  }

  private toDto(preferences: NotificationPreferenceRecord): NotificationPreferencesDto {
    return {
      id: preferences.id,
      userId: preferences.userId,
      calendar_events: preferences.calendarEvents,
      calendar_reminders: preferences.calendarReminders,
      husk_reminders: preferences.huskReminders,
      wishlist_shared: preferences.wishlistShared,
      family_invites: preferences.familyInvites,
      createdAt: preferences.createdAt.toISOString(),
      updatedAt: preferences.updatedAt.toISOString()
    };
  }
}
