export const API_ERROR_CODES = {
  AUTH_REQUIRES_AUTH: "auth.requires_auth",
  AUTH_INVALID_TOKEN: "auth.invalid_token",
  AUTH_EXPIRED_TOKEN: "auth.expired_token",
  AUTH_INVALID_CREDENTIALS: "auth.invalid_credentials",
  AUTH_EMAIL_ALREADY_EXISTS: "auth.email_already_exists",
  FAMILY_MISSING_CONTEXT: "family.missing_context",
  FAMILY_ACCESS_DENIED: "family.access_denied",
  FAMILY_NOT_FOUND: "family.not_found",
  SHOPPING_ITEM_NOT_FOUND: "shopping.item_not_found",
  TASK_NOT_FOUND: "task.not_found",
  CALENDAR_EVENT_NOT_FOUND: "calendar.event_not_found",
  REMINDER_NOT_FOUND: "husk.reminder_not_found",
  WISHLIST_NOT_FOUND: "wishlist.not_found",
  WISHLIST_INVALID_SHARE_TOKEN: "wishlist.invalid_share_token",
  WISHLIST_ITEM_MISMATCH: "wishlist.item_mismatch",
  VALIDATION_INVALID_INPUT: "validation.invalid_input",
  VALIDATION_MISSING_FIELD: "validation.missing_field",
  SERVER_INTERNAL_ERROR: "server.internal_error"
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
