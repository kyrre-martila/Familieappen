import { FamilyMemberDto } from "../../families/dto/family.dto";

export interface ReminderAudienceMemberDto {
  id: string;
  reminderId: string;
  familyMemberId: string;
  createdAt: string;
  familyMember: FamilyMemberDto;
}

export interface ReminderDto {
  id: string;
  familyId: string;
  title: string;
  icon: string;
  dueDate: string | null;
  date: string | null;
  reminderMinutesBefore: number | null;
  reminder: { minutesBefore: number; label: string } | null;
  note: string | null;
  scope: "family" | "members";
  memberIds: string[];
  sourceType: string | null;
  sourceId: string | null;
  isPrivate: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  audienceMembers: ReminderAudienceMemberDto[];
}

export interface CreateReminderRequestDto {
  title?: unknown;
  icon?: unknown;
  dueDate?: unknown;
  reminderMinutesBefore?: unknown;
  note?: unknown;
  scope?: unknown;
  memberIds?: unknown;
  sourceType?: unknown;
  sourceId?: unknown;
  isPrivate?: unknown;
}

export interface UpdateReminderRequestDto {
  title?: unknown;
  icon?: unknown;
  dueDate?: unknown;
  reminderMinutesBefore?: unknown;
  note?: unknown;
  scope?: unknown;
  memberIds?: unknown;
  archivedAt?: unknown;
  isPrivate?: unknown;
}
