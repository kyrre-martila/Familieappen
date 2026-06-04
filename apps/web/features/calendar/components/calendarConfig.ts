import {
  Backpack,
  Cake,
  Dumbbell,
  Flame,
  Gift,
  GraduationCap,
  Plane,
  Stethoscope,
  Utensils,
  Users,
  Volleyball,
} from "lucide-react";
import type {
  CalendarMvpEventIcon,
  ReminderSummary,
} from "@familieappen/shared";

import type {
  CalendarCategoryFilter,
  CalendarContentTypeFilter,
  CalendarListFilters,
} from "./calendarTypes";

export const defaultListFilters: CalendarListFilters = {
  contentType: "all",
  familyMemberId: "all",
  category: "all",
};

export const contentTypeOptions = [
  { value: "all", label: "Alle" },
  { value: "events", label: "Hendelser" },
  { value: "reminders", label: "Husk" },
  { value: "meals", label: "Middag" },
] satisfies { value: CalendarContentTypeFilter; label: string }[];

export const categoryOptions = [
  { value: "all", label: "Alle" },
  { value: "sport", label: "Fotball" },
  { value: "school", label: "Skole" },
  { value: "birthday", label: "Bursdag" },
  { value: "music", label: "Musikk" },
  { value: "health", label: "Lege" },
  { value: "travel", label: "Reise" },
  { value: "family", label: "Familie" },
  { value: "general", label: "Generelt" },
] satisfies { value: CalendarCategoryFilter; label: string }[];

export const eventIcons = {
  birthday: Cake,
  family: Users,
  health: Stethoscope,
  meal: Utensils,
  school: GraduationCap,
  sport: Dumbbell,
  travel: Plane,
} satisfies Record<CalendarMvpEventIcon, typeof Cake>;

export const reminderIcons = {
  backpack: Backpack,
  birthday: Cake,
  family: Users,
  flame: Flame,
  gift: Gift,
  health: Stethoscope,
  meal: Utensils,
  school: GraduationCap,
  sport: Volleyball,
  travel: Plane,
} satisfies Record<ReminderSummary["icon"], typeof Cake>;

export const eventToneByIcon = {
  birthday: "purple",
  family: "yellow",
  health: "blue",
  meal: "orange",
  school: "blue",
  sport: "green",
  travel: "blue",
} satisfies Record<
  CalendarMvpEventIcon,
  "blue" | "green" | "orange" | "purple" | "yellow"
>;
