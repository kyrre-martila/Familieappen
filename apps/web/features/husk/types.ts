import type {
  FamilyMember,
  List,
  Reminder,
  SchoolReminder,
  SchoolWeek,
  SchoolWeekday,
} from "../types";

export type HuskTab = "paminnelser" | "oppgaver" | "skoleuka";
export type HuskPersonFilter = "all" | "family" | (string & {});

export type HuskFilters = {
  person: HuskPersonFilter;
  hidePrevious: boolean;
};

export type ListFilters = {
  person: HuskPersonFilter;
  showArchived: boolean;
};

export type HuskFamilyMember = FamilyMember & {
  tone: NonNullable<FamilyMember["tone"]>;
};
export type HuskReminder = Reminder;
export type HuskReminderGroup = Reminder["group"];
export type HuskReminderIcon = Reminder["icon"];
export type HuskListGroup = List & {
  icon: NonNullable<List["icon"]>;
  tone: NonNullable<List["tone"]>;
};
export type HuskListIcon = NonNullable<List["icon"]>;
export type HuskSchoolWeekday = SchoolWeekday;
export type HuskSchoolWeekItem = SchoolReminder;
export type HuskSchoolWeekChildPlan = SchoolWeek;

export type SchoolCreateDraft = {
  weekday: HuskSchoolWeekday;
  dateLabel: string;
  title: string;
  note: string;
  icon: HuskReminderIcon;
  recurring: boolean;
  endDate: string;
};
