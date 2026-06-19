import {
  Backpack,
  BookOpen,
  Briefcase,
  Cake,
  CalendarCheck,
  Car,
  Circle,
  Dumbbell,
  Gift,
  ShoppingCart,
  Home,
  Music,
  PawPrint,
  Pill,
  Plane,
  School,
  Stethoscope,
  Theater,
  Trophy,
  Users,
  UtensilsCrossed,
  Volleyball,
  Waves,
  type LucideIcon
} from "lucide-react";
import type { CalendarMvpEvent } from "@familieappen/shared";

export type EventFormIconId =
  | "generelt"
  | "fotball"
  | "turn"
  | "svomming"
  | "trening"
  | "skole"
  | "skolesekk"
  | "lekser"
  | "bursdag"
  | "gave"
  | "musikk"
  | "kultur"
  | "middag"
  | "familie"
  | "kjoring"
  | "handling"
  | "lege"
  | "tannlege"
  | "medisin"
  | "reise"
  | "jobb"
  | "mote"
  | "kjaeledyr"
  | "avtale"
  | "hjemme";

export interface EventIconOption {
  id: EventFormIconId;
  label: string;
  Icon: LucideIcon;
}

export interface CalendarEventFormDraft {
  title: string;
  iconId: EventFormIconId | "";
  participantIds: string[];
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  repeat: string;
  reminder: string;
  location: string;
  description: string;
}

export const eventIconOptions: EventIconOption[] = [
  { id: "generelt", label: "Generelt", Icon: Circle },
  { id: "fotball", label: "Fotball", Icon: Volleyball },
  { id: "turn", label: "Turn", Icon: Trophy },
  { id: "svomming", label: "Svømming", Icon: Waves },
  { id: "trening", label: "Trening", Icon: Dumbbell },
  { id: "skole", label: "Skole", Icon: School },
  { id: "skolesekk", label: "Skolesekk", Icon: Backpack },
  { id: "lekser", label: "Lekser", Icon: BookOpen },
  { id: "bursdag", label: "Bursdag", Icon: Cake },
  { id: "gave", label: "Gave", Icon: Gift },
  { id: "musikk", label: "Musikk", Icon: Music },
  { id: "kultur", label: "Kultur", Icon: Theater },
  { id: "middag", label: "Middag", Icon: UtensilsCrossed },
  { id: "familie", label: "Familie", Icon: Users },
  { id: "kjoring", label: "Kjøring", Icon: Car },
  { id: "handling", label: "Handling", Icon: ShoppingCart },
  { id: "lege", label: "Lege", Icon: Stethoscope },
  { id: "tannlege", label: "Tannlege", Icon: Stethoscope },
  { id: "medisin", label: "Medisin", Icon: Pill },
  { id: "reise", label: "Reise", Icon: Plane },
  { id: "jobb", label: "Jobb", Icon: Briefcase },
  { id: "mote", label: "Møte", Icon: Users },
  { id: "kjaeledyr", label: "Kjæledyr", Icon: PawPrint },
  { id: "avtale", label: "Avtale", Icon: CalendarCheck },
  { id: "hjemme", label: "Hjemme", Icon: Home }
];

export const repeatOptions = ["Aldri", "Daglig", "Ukentlig", "Månedlig", "Årlig"];
export const reminderOptions = ["Ingen", "15 minutter før", "1 time før", "1 dag før"];

export function getIconOption(iconId: EventFormIconId | "") {
  return eventIconOptions.find((option) => option.id === iconId) ?? null;
}

export function getDraftStorageKey(mode: "create" | "edit", eventId?: string) {
  return mode === "edit" && eventId ? `familieappen:event-form:edit:${eventId}` : "familieappen:event-form:new";
}

export function getDefaultEventFormDraft(event?: CalendarMvpEvent | null): CalendarEventFormDraft {
  return {
    title: event?.title ?? "",
    iconId: event ? mapMockEventIcon(event.icon) : "",
    participantIds: event?.participantIds ?? [],
    date: event?.date ?? "",
    endDate: event?.endDate ?? event?.date ?? "",
    startTime: event?.startTime ?? "",
    endTime: event?.endTime ?? "",
    allDay: event?.allDay ?? false,
    repeat: mapRecurrenceToRepeatLabel(event?.recurrence ?? null),
    reminder: event?.reminder?.label ?? "Ingen",
    location: event?.location ?? "",
    description: event?.description ?? ""
  };
}

export function mapEventFormIconToCalendarIcon(iconId: EventFormIconId | ""): CalendarMvpEvent["icon"] {
  const iconMap = {
    avtale: "family",
    bursdag: "birthday",
    familie: "family",
    fotball: "sport",
    gave: "birthday",
    generelt: "family",
    handling: "family",
    hjemme: "family",
    jobb: "family",
    kjaeledyr: "family",
    kjoring: "travel",
    kultur: "family",
    lege: "health",
    lekser: "school",
    middag: "meal",
    medisin: "health",
    mote: "family",
    musikk: "family",
    reise: "travel",
    skole: "school",
    skolesekk: "school",
    svomming: "sport",
    tannlege: "health",
    trening: "sport",
    turn: "sport"
  } satisfies Record<EventFormIconId, CalendarMvpEvent["icon"]>;

  return iconId ? iconMap[iconId] : "family";
}

export function mapRepeatLabelToRecurrence(repeat: string): CalendarMvpEvent["recurrence"] {
  switch (repeat) {
    case "Daglig":
      return { frequency: "daily" };
    case "Ukentlig":
      return { frequency: "weekly" };
    case "Månedlig":
      return { frequency: "monthly" };
    case "Årlig":
      return { frequency: "yearly" };
    default:
      return null;
  }
}

function mapRecurrenceToRepeatLabel(recurrence: CalendarMvpEvent["recurrence"]): string {
  switch (recurrence?.frequency) {
    case "daily":
      return "Daglig";
    case "weekly":
      return "Ukentlig";
    case "monthly":
      return "Månedlig";
    case "yearly":
      return "Årlig";
    default:
      return "Aldri";
  }
}

export function mapReminderLabelToReminder(reminder: string): CalendarMvpEvent["reminder"] {
  switch (reminder) {
    case "15 minutter før":
      return { minutesBefore: 15, label: reminder };
    case "1 time før":
      return { minutesBefore: 60, label: reminder };
    case "1 dag før":
      return { minutesBefore: 1440, label: reminder };
    default:
      return null;
  }
}

function mapMockEventIcon(icon: CalendarMvpEvent["icon"]): EventFormIconId {
  const iconMap = {
    birthday: "bursdag",
    family: "familie",
    health: "lege",
    meal: "middag",
    school: "skole",
    sport: "trening",
    travel: "reise"
  } satisfies Record<CalendarMvpEvent["icon"], EventFormIconId>;

  return iconMap[icon];
}
