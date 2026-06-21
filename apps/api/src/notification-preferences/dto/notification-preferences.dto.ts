export interface NotificationPreferencesDto {
  id: string;
  userId: string;
  shoppingEnabled: boolean;
  calendarEnabled: boolean;
  remindersEnabled: boolean;
  tasksEnabled: boolean;
  mealsEnabled: boolean;
  wishlistEnabled: boolean;
  systemEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesRequestDto {
  shoppingEnabled?: unknown;
  calendarEnabled?: unknown;
  remindersEnabled?: unknown;
  tasksEnabled?: unknown;
  mealsEnabled?: unknown;
  wishlistEnabled?: unknown;
  systemEnabled?: unknown;
}
