import type {
  CalendarMvpEvent,
  CalendarMvpFamilyMember,
  CalendarViewMode,
  MealSummary,
  ReminderSummary,
} from "@familieappen/shared";
import type {
  HuskFamilyMember,
  HuskListDetail,
  HuskListDetailItem,
  HuskListGroup,
  HuskReminder,
  HuskSchoolWeekChildPlan,
  HuskSchoolWeekItem,
} from "../../app/husk/mockHuskData";
import type { MockMeal } from "../../app/meals/mockMealPlanData";

export type CalendarEvent = CalendarMvpEvent;
export type CalendarFamilyMember = CalendarMvpFamilyMember;
export type CalendarReminderChip = ReminderSummary;
export type CalendarMealChip = MealSummary;
export type CalendarSelectedView = CalendarViewMode;

export type Reminder = HuskReminder;
export type ReminderFamilyMember = HuskFamilyMember;
export type List = HuskListGroup;
export type ListDetail = HuskListDetail;
export type ListItem = HuskListDetailItem;
export type SchoolReminder = HuskSchoolWeekItem;
export type SchoolWeek = HuskSchoolWeekChildPlan;
export type Meal = MockMeal;
