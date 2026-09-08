export type CalendarIcsSyncStatus = "success" | "error" | "never";
export type CalendarExportScopeDto = "family" | "mine" | "selectedParticipant";

export interface CalendarIcsSourceDto {
  id: string;
  familyId: string;
  name: string;
  url: string;
  active: boolean;
  defaultFamilyMemberId: string | null;
  defaultCategory: string;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  syncIntervalMinutes: number;
  nextSyncAt: string | null;
  lastSyncStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarIcsSourceRequestDto {
  name?: unknown;
  url?: unknown;
  active?: unknown;
  defaultFamilyMemberId?: unknown;
  defaultCategory?: unknown;
  syncIntervalMinutes?: unknown;
}

export interface UpdateCalendarIcsSourceRequestDto {
  name?: unknown;
  url?: unknown;
  active?: unknown;
  defaultFamilyMemberId?: unknown;
  defaultCategory?: unknown;
  syncIntervalMinutes?: unknown;
}

export interface CalendarIcsSyncResultDto {
  source: CalendarIcsSourceDto;
  imported: number;
  updated: number;
  removed: number;
  skipped: number;
}

export interface CalendarExportFeedDto {
  id: string;
  familyId: string;
  name: string;
  enabled: boolean;
  privateUrl: string;
  includeEvents: boolean;
  includeMeals: boolean;
  includeReminders: boolean;
  includeSchoolWeekReminders: boolean;
  scope: CalendarExportScopeDto;
  selectedMemberIds: string[];
  mineFamilyMemberId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyCalendarExportFeedDto extends Omit<CalendarExportFeedDto, "selectedMemberIds" | "mineFamilyMemberId"> {
  selectedFamilyMemberId: string | null;
}

export interface UpdateCalendarExportFeedRequestDto {
  name?: unknown;
  enabled?: unknown;
  includeEvents?: unknown;
  includeMeals?: unknown;
  includeReminders?: unknown;
  includeSchoolWeekReminders?: unknown;
  scope?: unknown;
  selectedMemberIds?: unknown;
  /** @deprecated Use selectedMemberIds. Kept for older deployed web clients. */
  selectedFamilyMemberId?: unknown;
}

export interface CreateCalendarExportFeedRequestDto extends UpdateCalendarExportFeedRequestDto {
  name?: unknown;
}
