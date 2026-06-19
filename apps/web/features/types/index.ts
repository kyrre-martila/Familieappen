import type {
  CalendarMvpEventIcon,
  CalendarMvpEventSource,
  CalendarViewMode,
  MealSummary,
  ReminderSummary,
} from "@familieappen/shared";

export type DomainTone = "blue" | "green" | "orange" | "pink" | "purple" | "yellow";

export type FamilyMember = {
  id: string;
  familyId?: string;
  userId?: string | null;
  name: string;
  displayName?: string;
  initials: string;
  avatarUrl?: string | null;
  avatarColor?: Exclude<DomainTone, "pink" | "yellow">;
  tone?: Exclude<DomainTone, "yellow">;
  role?: "owner" | "parent" | "child" | "guest";
  isChild?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CalendarRecurrenceFrequency = "never" | "daily" | "weekly" | "monthly" | "yearly";

export type CalendarRecurrence = {
  frequency: Exclude<CalendarRecurrenceFrequency, "never">;
};

export type CalendarEvent = {
  id: string;
  familyId?: string;
  title: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  icon: CalendarMvpEventIcon;
  participantIds: string[];
  source: CalendarMvpEventSource;
  isImported: boolean;
  reminder: { minutesBefore: number; label: string } | null;
  recurrence: CalendarRecurrence | null;
  recurringEventId?: string;
  occurrenceDate?: string;
  isRecurringOccurrence?: boolean;
  createdByMemberId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  pending?: boolean;
};

export type ReminderAudience = {
  memberIds: string[];
  label?: string;
};

export type Reminder = {
  id: string;
  familyId?: string;
  title: string;
  scopeText: string;
  dateLabel: string;
  dueDate?: string | null;
  group: "today" | "tomorrow" | "week" | "later";
  icon:
    | "backpack"
    | "book"
    | "cake"
    | "car"
    | "gift"
    | "grill"
    | "passport"
    | "shirt"
    | "summer"
    | "tooth";
  tone: DomainTone;
  memberIds: string[];
  audience?: ReminderAudience;
  note?: string;
  reminderMinutesBefore?: number | null;
  isPrivate?: boolean;
  completed?: boolean;
  recurrence?: CalendarRecurrence | null;
  createdAt?: string;
  updatedAt?: string;
  pending?: boolean;
};

export type List = {
  id: string;
  familyId?: string;
  title: string;
  scopeText?: string;
  completedCount: number;
  totalCount: number;
  archived: boolean;
  icon?: "birthday" | "home" | "summer" | "celebration";
  tone?: Exclude<DomainTone, "pink" | "yellow">;
  memberIds: string[];
  familyMembers?: FamilyMember[];
  items?: ListItem[];
  createdAt?: string;
  updatedAt?: string;
  pending?: boolean;
};

export type ListItem = {
  id: string;
  listId?: string;
  title: string;
  completed: boolean;
  assignedMemberIds: string[];
  description?: string;
  dueLabel?: string;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  pending?: boolean;
};

export type Meal = {
  id: string;
  familyId?: string;
  title: string;
  icon: string;
  date?: string;
  plannedByMemberId?: string | null;
  notes?: string | null;
  recurrence?: CalendarRecurrence | null;
  createdAt?: string;
  updatedAt?: string;
  pending?: boolean;
};

export type SchoolReminder = {
  id: string;
  familyId?: string;
  childFamilyMemberId?: string;
  title: string;
  icon: Reminder["icon"];
  category?: Reminder["icon"];
  weekday?: SchoolWeekday;
  date?: string | null;
  occurrenceDate?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: "weekly";
  recurrenceEndDate?: string | null;
  recurringSeriesId?: string | null;
  exceptionOfId?: string | null;
  tone: Exclude<DomainTone, "pink">;
  memberIds?: string[];
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  pending?: boolean;
};

export type SchoolWeekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export type SchoolWeekEntry = SchoolReminder & {
  childId: string;
  weekday: SchoolWeekday;
};

export type SchoolWeekChild = {
  childId: string;
  familyId?: string;
  days: Record<SchoolWeekday, SchoolReminder[]>;
  createdAt?: string;
  updatedAt?: string;
};

export type CalendarFamilyMember = FamilyMember;
export type CalendarReminderChip = ReminderSummary;
export type CalendarMealChip = MealSummary;
export type CalendarSelectedView = CalendarViewMode;
export type ReminderFamilyMember = FamilyMember;
export type ListDetail = List;
export type SchoolWeek = SchoolWeekChild;
