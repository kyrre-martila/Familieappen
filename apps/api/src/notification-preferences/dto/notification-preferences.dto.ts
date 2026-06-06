export interface NotificationPreferencesDto {
  id: string;
  userId: string;
  calendar_events: boolean;
  calendar_reminders: boolean;
  husk_reminders: boolean;
  wishlist_shared: boolean;
  family_invites: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesRequestDto {
  calendar_events?: unknown;
  calendar_reminders?: unknown;
  husk_reminders?: unknown;
  wishlist_shared?: unknown;
  family_invites?: unknown;
}
