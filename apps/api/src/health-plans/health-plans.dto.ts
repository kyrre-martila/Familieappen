export type RecurrenceTypeDto = "DAILY" | "WEEKDAYS" | "INTERVAL_DAYS";

export interface CreateHealthPlanActionDto {
  title: string;
  instruction?: string | null;
  sortOrder: number;
}

export interface CreateHealthPlanScheduleDto {
  recurrenceType: RecurrenceTypeDto;
  localTime: string;
  timezone?: string;
  weekdays?: number[];
  intervalDays?: number;
  anchorDate?: string;
  actions: CreateHealthPlanActionDto[];
}

export interface CreateHealthPlanStepDto {
  stepOrder: number;
  name?: string | null;
  description?: string | null;
  durationDays?: number | null;
  autoAdvance?: boolean;
  schedules: CreateHealthPlanScheduleDto[];
}

export interface CreateHealthPlanLevelDto {
  levelIndex: number;
  name?: string | null;
  description?: string | null;
  steps: CreateHealthPlanStepDto[];
}

export interface CreateHealthPlanDto {
  familyMemberId: string;
  name: string;
  description?: string | null;
  levels: CreateHealthPlanLevelDto[];
  notificationRecipientIds?: string[];
}

export interface UpdateHealthPlanNotificationRecipientsDto { familyMemberIds: string[]; }

export interface UpdateHealthPlanDto {
  name?: string;
  description?: string | null;
  action?: { id: string; title: string; instruction?: string | null };
}

export interface CreateHealthPlanNoteDto {
  text: string;
  occurrenceId?: string;
  sourceActionId?: string;
}

export interface UpdateHealthPlanOccurrenceDto {
  status: "COMPLETED" | "SKIPPED" | "SNOOZED";
  scheduledAt?: string;
  note?: string;
}

export interface ListHealthPlanOccurrencesQueryDto {
  from?: string;
  to?: string;
  familyMemberId?: string;
  healthPlanId?: string;
  limit?: string;
}
