import { FamilyMemberDto } from "../../families/dto/family.dto";

export interface CalendarEventParticipantDto {
  id: string;
  eventId: string;
  familyMemberId: string;
  createdAt: string;
  familyMember: FamilyMemberDto;
}

export type CalendarEventRecurrenceFrequencyDto = "never" | "daily" | "weekly" | "monthly" | "yearly";

export interface CalendarEventDto {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  location: string | null;
  icon: string;
  reminderMinutesBefore: number | null;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reminder: { minutesBefore: number; label: string } | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  recurrenceFrequency: CalendarEventRecurrenceFrequencyDto;
  recurrence: { frequency: CalendarEventRecurrenceFrequencyDto; until: string | null } | null;
  recurrenceUntil?: string | null;
  /** Present for generated recurring occurrences; points back to the persisted series event. */
  recurringEventId?: string;
  /** YYYY-MM-DD date this generated occurrence starts on. */
  occurrenceDate?: string;
  /** True when this DTO is generated from a recurring series instead of a DB row. */
  isRecurringOccurrence?: boolean;
  source: string;
  icsSourceId: string | null;
  externalUid: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: CalendarEventParticipantDto[];
}

export interface ListCalendarEventsQueryDto {
  from?: unknown;
  to?: unknown;
}

export interface CreateCalendarEventRequestDto {
  title?: unknown;
  description?: unknown;
  location?: unknown;
  icon?: unknown;
  reminderMinutesBefore?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  allDay?: unknown;
  recurrenceFrequency?: unknown;
  recurrenceUntil?: unknown;
  participantFamilyMemberIds?: unknown;
}

export interface UpdateCalendarEventRequestDto {
  title?: unknown;
  description?: unknown;
  location?: unknown;
  icon?: unknown;
  reminderMinutesBefore?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  allDay?: unknown;
  recurrenceFrequency?: unknown;
  recurrenceUntil?: unknown;
  participantFamilyMemberIds?: unknown;
}

export type UpdateCalendarEventOccurrenceRequestDto = UpdateCalendarEventRequestDto;
