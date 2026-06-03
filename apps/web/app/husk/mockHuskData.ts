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

export interface HuskSchoolDayPlan {
  id: string;
  dayLabel: string;
  dateLabel: string;
  focus: string;
  packing: string[];
  notes: string;
}

export interface HuskMockData {
  familyMembers: HuskFamilyMember[];
  reminders: HuskReminder[];
  listGroups: HuskListGroup[];
  schoolWeek: HuskSchoolDayPlan[];
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
      id: "school-monday",
      dayLabel: "Mandag",
      dateLabel: "2. juni",
      focus: "Lesing og svømming",
      packing: ["Badetøy", "Lesemappe"],
      notes: "Husk vått pose til svømmetøy.",
    },
    {
      id: "school-wednesday",
      dayLabel: "Onsdag",
      dateLabel: "4. juni",
      focus: "Uteskole",
      packing: ["Sitteunderlag", "Varm drikke", "Ekstra sokker"],
      notes: "Oppmøte ved skogporten kl. 08:30.",
    },
    {
      id: "school-friday",
      dayLabel: "Fredag",
      dateLabel: "6. juni",
      focus: "Innlevering og vennegruppe",
      packing: ["Bibliotekbok", "Gymbag"],
      notes: "Vennegruppen går hjem med Nora etter skolen.",
    },
  ],
};
