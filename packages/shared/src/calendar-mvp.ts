export type CalendarEventSource = "manual" | "ics";

export type CalendarEventIcon = "sport" | "school" | "birthday" | "health" | "travel" | "family" | "meal";

export interface CalendarEventReminder {
  minutesBefore: number;
  label: string;
}

export interface CalendarEventRecurrence {
  rule?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
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

export type CalendarImportSyncFrequency = "automatic" | "daily" | "weekly" | "manual";

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
