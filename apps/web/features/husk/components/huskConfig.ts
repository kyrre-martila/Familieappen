import type { LucideIcon } from "lucide-react";
import {
  Backpack,
  BookOpen,
  Briefcase,
  Cake,
  Car,
  Gift,
  Home,
  Shirt,
  Stethoscope,
  Tent,
  Utensils,
} from "lucide-react";

import type {
  HuskListIcon,
  HuskFilters,
  HuskPersonFilter,
  HuskReminder,
  HuskReminderGroup,
  HuskReminderIcon,
  ListFilters,
  HuskSchoolWeekday,
  HuskTab,
} from "../types";

export const tabs = [
  { value: "paminnelser", label: "Påminnelser" },
  { value: "oppgaver", label: "Oppgaver" },
  { value: "skoleuka", label: "Skoleuka" },
] satisfies { value: HuskTab; label: string }[];

export const titleByTab = {
  paminnelser: "Påminnelser",
  oppgaver: "Oppgaver",
  skoleuka: "Skoleuka",
} satisfies Record<HuskTab, string>;

export const reminderGroupLabels = {
  today: "I dag",
  tomorrow: "I morgen",
  week: "Denne uka",
  later: "Senere",
} satisfies Record<HuskReminderGroup, string>;

export const reminderGroupOrder: HuskReminderGroup[] = [
  "today",
  "tomorrow",
  "week",
  "later",
];

export const reminderIcons = {
  backpack: Backpack,
  book: BookOpen,
  cake: Cake,
  car: Car,
  gift: Gift,
  grill: Utensils,
  passport: Briefcase,
  shirt: Shirt,
  summer: Tent,
  tooth: Stethoscope,
} satisfies Record<HuskReminderIcon, LucideIcon>;

export const listIcons = {
  birthday: Cake,
  celebration: Gift,
  home: Home,
  summer: Tent,
} satisfies Record<HuskListIcon, LucideIcon>;

export const schoolWeekdays = [
  { value: "monday", label: "Mandag", dayOffset: 0 },
  { value: "tuesday", label: "Tirsdag", dayOffset: 1 },
  { value: "wednesday", label: "Onsdag", dayOffset: 2 },
  { value: "thursday", label: "Torsdag", dayOffset: 3 },
  { value: "friday", label: "Fredag", dayOffset: 4 },
] satisfies { value: HuskSchoolWeekday; label: string; dayOffset: number }[];

export const schoolQuickExamples = [
  "Gymtøy",
  "Bibliotekbok",
  "Ta med grillmat",
  "Mat og helse",
  "Kosedyrdag",
  "Fotballsko",
  "Matpakke",
] as const;

export const schoolIconOptions = [
  { value: "shirt", label: "Gymtøy" },
  { value: "book", label: "Bok" },
  { value: "grill", label: "Mat" },
  { value: "backpack", label: "Sekk" },
  { value: "gift", label: "Dag" },
] satisfies { value: HuskReminderIcon; label: string }[];

export const personFilterOptions = [
  { value: "family", label: "Hele familien" },
  { value: "kyrre", label: "Kyrre" },
  { value: "elisabeth", label: "Elisabeth" },
  { value: "fiona", label: "Fiona" },
  { value: "alma", label: "Alma" },
  { value: "even-olai", label: "Even-Olai" },
] satisfies { value: HuskPersonFilter; label: string }[];

export const defaultHuskFilters: HuskFilters = {
  person: "family",
  showPrevious: false,
};
export const defaultListFilters: ListFilters = {
  person: "all",
  showArchived: false,
};
export const schoolChildIds = ["fiona", "alma", "even-olai"] as const;

export const previousReminders: HuskReminder[] = [
  {
    id: "previous-gymtoy",
    title: "Gymtøy",
    scopeText: "Fiona",
    dateLabel: "I går",
    group: "today",
    icon: "shirt",
    tone: "yellow",
    memberIds: ["fiona"],
  },
  {
    id: "previous-library-book",
    title: "Bibliotekbok",
    scopeText: "Fiona",
    dateLabel: "Mandag",
    group: "today",
    icon: "book",
    tone: "blue",
    memberIds: ["fiona"],
  },
  {
    id: "previous-rainwear",
    title: "Ta med regntøy",
    scopeText: "Alma",
    dateLabel: "Forrige uke",
    group: "today",
    icon: "backpack",
    tone: "purple",
    memberIds: ["alma"],
  },
];
