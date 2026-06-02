import type { CalendarMvpEvent, CalendarMvpFamilyMember, MealSummary, ReminderSummary } from "@familieappen/shared";

export const mockToday = "2025-06-03";

export const familyMembers: CalendarMvpFamilyMember[] = [
  { id: "fiona", name: "Fiona", initials: "FI", avatarColor: "green" },
  { id: "even-olai", name: "Even-Olai", initials: "EO", avatarColor: "blue" },
  { id: "elisabeth", name: "Elisabeth", initials: "EK", avatarColor: "orange" },
  { id: "alma", name: "Alma", initials: "AL", avatarColor: "purple" }
];

export const meals: MealSummary[] = [
  { date: "2025-06-02", title: "Laks" },
  { date: "2025-06-03", title: "Taco" },
  { date: "2025-06-04", title: "Pasta" },
  { date: "2025-06-06", title: "Pizza" }
];

export const reminders: ReminderSummary[] = [
  { id: "gymtoy-alma", date: "2025-06-03", title: "Gymtøy Alma", icon: "backpack", participantIds: ["alma"] },
  { id: "grillmat", date: "2025-06-03", title: "Ta med grillmat", icon: "flame", participantIds: ["elisabeth"] },
  { id: "gave-emma", date: "2025-06-03", title: "Gave Emma", icon: "gift", participantIds: ["fiona"] },
  { id: "kontingent", date: "2025-06-03", title: "Betal kontingent", icon: "sport", participantIds: ["even-olai"] },
  { id: "bibliotek", date: "2025-06-03", title: "Levere bøker", icon: "school", participantIds: ["alma"] },
  { id: "tannlege-husk", date: "2025-06-04", title: "Husk tannlegekort", icon: "health", participantIds: ["alma"] },
  { id: "pass", date: "2025-06-06", title: "Pakk pass", icon: "travel", participantIds: [] }
];

export const calendarEvents: CalendarMvpEvent[] = [
  {
    id: "rg-trening",
    title: "RG trening",
    date: "2025-06-03",
    startTime: "16:30",
    endTime: "18:00",
    allDay: false,
    location: "Kirkeneshallen",
    description: "Rytmisk gymnastikk etter skolen.",
    icon: "sport",
    participantIds: ["fiona"],
    source: "manual",
    isImported: false,
    reminder: { minutesBefore: 30, label: "30 min før" },
    recurrence: { rule: "FREQ=WEEKLY" }
  },
  {
    id: "fotballtrening",
    title: "Fotballtrening",
    date: "2025-06-03",
    startTime: "18:00",
    endTime: "19:30",
    allDay: false,
    location: "Bjørnevatn kunstgress",
    description: null,
    icon: "sport",
    participantIds: ["even-olai"],
    source: "ics",
    isImported: true,
    reminder: { minutesBefore: 60, label: "1 time før" },
    recurrence: null
  },
  {
    id: "middag",
    title: "Middag",
    date: "2025-06-03",
    startTime: "17:00",
    endTime: "17:45",
    allDay: false,
    location: "Hjemme",
    description: null,
    icon: "meal",
    participantIds: [],
    source: "manual",
    isImported: false,
    reminder: null,
    recurrence: null
  },
  {
    id: "farmor-bursdag",
    title: "Farmor bursdag",
    date: "2025-06-03",
    startTime: null,
    endTime: null,
    allDay: true,
    location: "Hele dagen",
    description: null,
    icon: "birthday",
    participantIds: [],
    source: "manual",
    isImported: false,
    reminder: { minutesBefore: 1440, label: "Dagen før" },
    recurrence: { rule: "FREQ=YEARLY" }
  },
  {
    id: "familiekveld",
    title: "Familiekveld",
    date: "2025-06-03",
    startTime: "20:00",
    endTime: "21:30",
    allDay: false,
    location: "Stue",
    description: null,
    icon: "family",
    participantIds: [],
    source: "manual",
    isImported: false,
    reminder: null,
    recurrence: null
  },
  {
    id: "tannlege",
    title: "Tannlege",
    date: "2025-06-04",
    startTime: "14:00",
    endTime: "14:30",
    allDay: false,
    location: "Tannlegesenteret",
    description: null,
    icon: "health",
    participantIds: ["alma"],
    source: "manual",
    isImported: false,
    reminder: { minutesBefore: 120, label: "2 timer før" },
    recurrence: null
  },
  {
    id: "klasseavslutning",
    title: "Klasseavslutning",
    date: "2025-06-05",
    startTime: "17:30",
    endTime: "19:00",
    allDay: false,
    location: "Fjellvik skole",
    description: null,
    icon: "school",
    participantIds: ["alma", "elisabeth"],
    source: "manual",
    isImported: false,
    reminder: null,
    recurrence: null
  },
  {
    id: "hyttetur",
    title: "Hyttetur",
    date: "2025-06-07",
    startTime: "09:00",
    endTime: "15:00",
    allDay: false,
    location: "Trysil",
    description: null,
    icon: "travel",
    participantIds: [],
    source: "manual",
    isImported: false,
    reminder: { minutesBefore: 1440, label: "Dagen før" },
    recurrence: null
  }
];
