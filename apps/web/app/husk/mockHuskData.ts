export type HuskTab = "husk" | "lister" | "skoleuka";

export type HuskReminderGroup = "today" | "tomorrow" | "week" | "later";

export type HuskReminderIcon =
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

export interface HuskFamilyMember {
  id: string;
  name: string;
  initials: string;
  tone: "blue" | "green" | "orange" | "pink" | "purple";
}

export interface HuskReminder {
  id: string;
  title: string;
  scopeText: string;
  dateLabel: string;
  group: HuskReminderGroup;
  icon: HuskReminderIcon;
  tone: "blue" | "green" | "orange" | "pink" | "purple" | "yellow";
  memberIds: string[];
}

export type HuskListIcon = "birthday" | "home" | "summer" | "celebration";

export interface HuskListGroup {
  id: string;
  title: string;
  completedCount: number;
  totalCount: number;
  archived: boolean;
  icon: HuskListIcon;
  tone: "blue" | "green" | "orange" | "purple";
  memberIds: string[];
}

export type HuskListSection = "active" | "completed";

export interface HuskListDetailItem {
  id: string;
  title: string;
  completed: boolean;
  assignedMemberIds: string[];
  description?: string;
  dueLabel?: string;
}

export interface HuskListDetail {
  id: string;
  title: string;
  scopeText: string;
  completedCount: number;
  totalCount: number;
  familyMembers: HuskFamilyMember[];
  items: HuskListDetailItem[];
}

export type HuskSchoolWeekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export interface HuskSchoolWeekItem {
  id: string;
  title: string;
  icon: HuskReminderIcon;
  tone: "blue" | "green" | "orange" | "purple" | "yellow";
}

export interface HuskSchoolWeekChildPlan {
  childId: string;
  days: Record<HuskSchoolWeekday, HuskSchoolWeekItem[]>;
}

export interface HuskMockData {
  familyMembers: HuskFamilyMember[];
  reminders: HuskReminder[];
  listGroups: HuskListGroup[];
  schoolWeek: HuskSchoolWeekChildPlan[];
}

export const huskMockData: HuskMockData = {
  familyMembers: [
    { id: "elisabeth", name: "Elisabeth", initials: "EL", tone: "pink" },
    { id: "kyrre", name: "Kyrre", initials: "KY", tone: "green" },
    { id: "fiona", name: "Fiona", initials: "FI", tone: "orange" },
    { id: "alma", name: "Alma", initials: "AL", tone: "purple" },
    { id: "even-olai", name: "Even-Olai", initials: "EO", tone: "blue" },
  ],
  reminders: [
    {
      id: "reminder-gymtoy",
      title: "Gymtøy",
      scopeText: "Fiona",
      dateLabel: "I dag",
      group: "today",
      icon: "shirt",
      tone: "yellow",
      memberIds: ["fiona"],
    },
    {
      id: "reminder-library-book",
      title: "Bibliotekbok",
      scopeText: "Fiona",
      dateLabel: "I dag",
      group: "today",
      icon: "book",
      tone: "blue",
      memberIds: ["fiona"],
    },
    {
      id: "reminder-grill-food",
      title: "Ta med grillmat",
      scopeText: "Alma",
      dateLabel: "I dag",
      group: "today",
      icon: "backpack",
      tone: "pink",
      memberIds: ["alma"],
    },
    {
      id: "reminder-emma-gift",
      title: "Kjøp gave til Emma",
      scopeText: "Hele familien",
      dateLabel: "I morgen",
      group: "tomorrow",
      icon: "gift",
      tone: "orange",
      memberIds: ["elisabeth", "even-olai", "fiona", "alma"],
    },
    {
      id: "reminder-dentist",
      title: "Tannlege",
      scopeText: "Even-Olai",
      dateLabel: "I morgen",
      group: "tomorrow",
      icon: "tooth",
      tone: "green",
      memberIds: ["even-olai"],
    },
    {
      id: "reminder-workshop",
      title: "Bestille verkstedtime",
      scopeText: "Elisabeth",
      dateLabel: "Tirsdag 10. juni",
      group: "week",
      icon: "car",
      tone: "green",
      memberIds: ["elisabeth"],
    },
    {
      id: "reminder-passports",
      title: "Husk pass",
      scopeText: "Hele familien",
      dateLabel: "Lørdag 14. juni",
      group: "week",
      icon: "passport",
      tone: "purple",
      memberIds: ["elisabeth", "even-olai", "fiona", "alma"],
    },
    {
      id: "reminder-birthday-even-olai",
      title: "Bursdag Even-Olai",
      scopeText: "Even-Olai",
      dateLabel: "Mandag 16. juni",
      group: "later",
      icon: "cake",
      tone: "pink",
      memberIds: ["even-olai"],
    },
    {
      id: "reminder-summer-holiday",
      title: "Planlegg sommerferie",
      scopeText: "Hele familien",
      dateLabel: "Uke 26",
      group: "later",
      icon: "summer",
      tone: "blue",
      memberIds: ["elisabeth", "even-olai", "fiona", "alma"],
    },
  ],
  listGroups: [
    {
      id: "list-konfirmasjon-alma",
      title: "Konfirmasjon Alma",
      completedCount: 7,
      totalCount: 15,
      archived: false,
      icon: "celebration",
      tone: "purple",
      memberIds: ["elisabeth", "kyrre", "alma", "even-olai", "fiona"],
    },
    {
      id: "list-sommerferie-2025",
      title: "Sommerferie 2025",
      completedCount: 5,
      totalCount: 12,
      archived: false,
      icon: "summer",
      tone: "orange",
      memberIds: ["elisabeth", "kyrre", "alma", "even-olai", "fiona"],
    },
    {
      id: "list-bursdag-even-olai",
      title: "Bursdag Even-Olai (10 år)",
      completedCount: 3,
      totalCount: 8,
      archived: false,
      icon: "birthday",
      tone: "green",
      memberIds: ["elisabeth", "even-olai"],
    },
    {
      id: "list-oppussing-stue",
      title: "Oppussing stue",
      completedCount: 2,
      totalCount: 9,
      archived: false,
      icon: "home",
      tone: "blue",
      memberIds: ["kyrre", "elisabeth"],
    },
    {
      id: "list-sommer-archive",
      title: "Sommeravslutning 2025",
      completedCount: 4,
      totalCount: 4,
      archived: true,
      icon: "celebration",
      tone: "purple",
      memberIds: ["elisabeth", "kyrre", "alma", "even-olai", "fiona"],
    },
  ],
  schoolWeek: [
    {
      childId: "fiona",
      days: {
        monday: [],
        tuesday: [{ id: "fiona-tuesday-gymtoy", title: "Gymtøy", icon: "shirt", tone: "purple" }],
        wednesday: [{ id: "fiona-wednesday-library", title: "Bibliotekbok", icon: "book", tone: "blue" }],
        thursday: [{ id: "fiona-thursday-grill", title: "Ta med grillmat", icon: "grill", tone: "orange" }],
        friday: [],
      },
    },
    {
      childId: "alma",
      days: {
        monday: [{ id: "alma-monday-reader", title: "Lesebok", icon: "book", tone: "blue" }],
        tuesday: [],
        wednesday: [{ id: "alma-wednesday-gymtoy", title: "Gymtøy", icon: "shirt", tone: "purple" }],
        thursday: [],
        friday: [{ id: "alma-friday-cuddly-toy", title: "Kosedyrdag", icon: "gift", tone: "orange" }],
      },
    },
    {
      childId: "even-olai",
      days: {
        monday: [],
        tuesday: [{ id: "even-tuesday-football", title: "Fotballsko", icon: "backpack", tone: "green" }],
        wednesday: [],
        thursday: [{ id: "even-thursday-food-health", title: "Mat og helse", icon: "grill", tone: "orange" }],
        friday: [],
      },
    },
  ],
};

export const huskListDetails: HuskListDetail[] = [
  {
    id: "list-konfirmasjon-alma",
    title: "Konfirmasjon Alma",
    scopeText: "Hele familien",
    completedCount: 7,
    totalCount: 15,
    familyMembers: huskMockData.familyMembers,
    items: [
      {
        id: "bestille-lokale",
        title: "Bestille lokale",
        completed: false,
        assignedMemberIds: ["kyrre"],
      },
      {
        id: "fotograf",
        title: "Fotograf",
        completed: false,
        assignedMemberIds: ["elisabeth"],
      },
      {
        id: "kirke-bekreftet",
        title: "Kirke bekreftet",
        completed: false,
        assignedMemberIds: ["elisabeth"],
        description: "Kirken er bekreftet for lørdag 24. mai.",
        dueLabel: "24. mai 2025",
      },
      {
        id: "lage-gjesteliste",
        title: "Lage gjesteliste",
        completed: false,
        assignedMemberIds: [],
      },
      {
        id: "bestille-mat-og-drikke",
        title: "Bestille mat og drikke",
        completed: false,
        assignedMemberIds: ["elisabeth", "kyrre", "alma"],
      },
      {
        id: "kjope-antrekk-til-alma",
        title: "Kjøpe antrekk til Alma",
        completed: false,
        assignedMemberIds: ["even-olai"],
      },
      {
        id: "lage-bordkort",
        title: "Lage bordkort",
        completed: false,
        assignedMemberIds: [],
      },
      {
        id: "planlegge-pynt",
        title: "Planlegge pynt",
        completed: false,
        assignedMemberIds: ["elisabeth"],
      },
      {
        id: "invitasjoner-sendt",
        title: "Invitasjoner sendt",
        completed: true,
        assignedMemberIds: ["elisabeth", "kyrre", "alma"],
      },
      {
        id: "velge-dato",
        title: "Velge dato",
        completed: true,
        assignedMemberIds: ["kyrre"],
      },
      {
        id: "sette-budsjett",
        title: "Sette budsjett",
        completed: true,
        assignedMemberIds: ["even-olai"],
      },
    ],
  },
];
