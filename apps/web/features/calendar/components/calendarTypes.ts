import type { CalendarMvpEvent, MealSummary, ReminderSummary } from "@familieappen/shared";

export type CalendarContentTypeFilter = "all" | "events" | "reminders" | "meals";
export type CalendarCategoryFilter =
  | "all"
  | "sport"
  | "school"
  | "birthday"
  | "music"
  | "health"
  | "travel"
  | "family"
  | "general";

export interface CalendarListFilters {
  contentType: CalendarContentTypeFilter;
  familyMemberId: string;
  category: CalendarCategoryFilter;
}

export interface CalendarListDayGroup {
  date: string;
  events: CalendarMvpEvent[];
  meal: MealSummary | undefined;
  reminders: ReminderSummary[];
}
