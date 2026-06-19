export type CalendarEventSource = "manual" | "ics" | "school-week";

export type CalendarEventIcon =
  | "sport"
  | "school"
  | "birthday"
  | "health"
  | "travel"
  | "family"
  | "meal";

export interface CalendarEventReminder {
  minutesBefore: number;
  label: string;
}

export type CalendarEventRecurrenceFrequency = "never" | "daily" | "weekly" | "monthly" | "yearly";

export interface CalendarEventRecurrence {
  frequency: Exclude<CalendarEventRecurrenceFrequency, "never">;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  icon: CalendarEventIcon;
  participantIds: string[];
  source: CalendarEventSource;
  isImported: boolean;
  reminder: CalendarEventReminder | null;
  recurrence: CalendarEventRecurrence | null;
}

export interface MealSummary {
  date: string;
  title: string;
}

export interface ReminderSummary {
  id: string;
  date: string;
  title: string;
  icon: CalendarEventIcon | "gift" | "flame" | "backpack";
  participantIds: string[];
}

export interface FamilyMember {
  id: string;
  name: string;
  initials: string;
  avatarColor: "green" | "blue" | "orange" | "purple";
}

export type CalendarViewMode = "day" | "month" | "list";

export type CalendarImportSyncFrequency =
  | "automatic"
  | "daily"
  | "weekly"
  | "manual";

export type CalendarExportScope = "family" | "mine" | "selectedParticipant";

export interface CalendarExportFeed {
  isEnabled: boolean;
  privateUrl: string;
  token: string;
  includeEvents: boolean;
  includeMeals: boolean;
  includeReminders: boolean;
  scope: CalendarExportScope;
  selectedParticipantId: string | null;
}

export interface CalendarImportSource {
  id: string;
  name: string;
  icsUrl: string;
  defaultParticipantId: string;
  defaultIcon: CalendarEventIcon;
  syncFrequency: CalendarImportSyncFrequency;
  lastSyncedAt: string | null;
  isActive: boolean;
}
