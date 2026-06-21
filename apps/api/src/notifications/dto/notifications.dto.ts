export const NOTIFICATION_TYPES = [
  "shopping_item_added",
  "shopping_item_completed",
  "shopping_list_shared",
  "list_created",
  "list_item_added",
  "family_invite_received",
  "family_invite_accepted",
  "family_access_requested",
  "calendar_event_created",
  "calendar_event_updated",
  "calendar_event_deleted",
  "reminder_created",
  "reminder_updated",
  "reminder_deleted",
  "task_created",
  "task_updated",
  "task_deleted",
  "task_completed",
  "meal_planned",
  "meal_updated",
  "meal_deleted",
  "wishlist_item_added",
  "wishlist_item_created",
  "wishlist_item_updated",
  "wishlist_item_unreserved",
  "wishlist_item_reserved",
  "wishlist_item_deleted",
  "wishlist_shared",
  "school_week_item_created",
  "school_week_item_updated",
  "system_meal_missing",
  "system_school_week_missing"
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
