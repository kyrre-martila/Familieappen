import { FamilyMemberDto } from "../../families/dto/family.dto";

export interface CalendarEventParticipantDto {
  id: string;
  eventId: string;
  familyMemberId: string;
  createdAt: string;
  familyMember: FamilyMemberDto;
}

export interface CalendarEventDto {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  location: string | null;
  icon: string;
  reminderMinutesBefore: number | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reminder: { minutesBefore: number; label: string } | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
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
  participantFamilyMemberIds?: unknown;
}
