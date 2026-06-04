export type SchoolWeekdayDto = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
export type SchoolWeekRecurrenceFrequencyDto = "weekly";
export type SchoolWeekMutationScopeDto = "occurrence" | "series";

export interface SchoolWeekReminderDto {
  id: string;
  familyId: string;
  childFamilyMemberId: string;
  title: string;
  icon: string;
  category: string;
  weekday: SchoolWeekdayDto;
  date: string | null;
  occurrenceDate: string;
  isRecurring: boolean;
  recurrenceFrequency: SchoolWeekRecurrenceFrequencyDto;
  recurrenceEndDate: string | null;
  recurringSeriesId: string | null;
  exceptionOfId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateSchoolWeekReminderRequestDto {
  childFamilyMemberId?: unknown;
  childId?: unknown;
  title?: unknown;
  icon?: unknown;
  category?: unknown;
  weekday?: unknown;
  date?: unknown;
  isRecurring?: unknown;
  recurring?: unknown;
  recurrenceFrequency?: unknown;
  recurrenceEndDate?: unknown;
  note?: unknown;
}

export interface UpdateSchoolWeekReminderRequestDto {
  childFamilyMemberId?: unknown;
  childId?: unknown;
  title?: unknown;
  icon?: unknown;
  category?: unknown;
  weekday?: unknown;
  date?: unknown;
  occurrenceDate?: unknown;
  isRecurring?: unknown;
  recurring?: unknown;
  recurrenceFrequency?: unknown;
  recurrenceEndDate?: unknown;
  note?: unknown;
  scope?: unknown;
}
