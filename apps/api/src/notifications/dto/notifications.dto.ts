export const NOTIFICATION_TYPES = [
  "shopping_item_added",
  "shopping_item_completed",
  "shopping_list_shared",
  "family_invite_received",
  "family_invite_accepted",
  "family_access_requested",
  "calendar_event_created",
  "calendar_event_updated",
  "reminder_created",
  "reminder_updated",
  "task_created",
  "task_completed",
  "wishlist_item_added",
  "wishlist_shared"
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationDto {
  id: string;
  familyId: string;
  recipientUserId: string;
  actorUserId: string | null;
  type: NotificationType | string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PushDeviceDto {
  id: string;
  userId: string;
  expoPushToken: string;
  platform: "ios" | "android" | "web" | string | null;
  deviceName: string | null;
  appVersion: string | null;
  lastSeenAt: string;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterPushDeviceRequestDto {
  expoPushToken?: unknown;
  platform?: unknown;
  deviceName?: unknown;
  appVersion?: unknown;
}
