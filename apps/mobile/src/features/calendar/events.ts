import type { CalendarEvent } from "@familieappen/shared";

export type CalendarEventViewModel = {
  id: string;
  title: string;
  date: string;
  timeLabel: string;
  accessibilityTimeLabel: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  icon: string;
  participantNames: string[];
  isImported: boolean;
  isRecurringOccurrence: boolean;
  occurrenceDate?: string;
  source: string;
  sourceLabel: string;
  reminderLabel: string | null;
  recurrenceLabel: string | null;
  detailDateLabel: string;
  createdByUserId: string | null;
  recurringEventId?: string;
};


const dateFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function parseCalendarDateString(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatCalendarEventDate(date: string): string {
  const label = dateFormatter.format(parseCalendarDateString(date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getCalendarEventRecurrenceLabel(event: Pick<CalendarEvent, "recurrence" | "recurrenceFrequency" | "isRecurringOccurrence">): string | null {
  const frequency = event.recurrence?.frequency ?? event.recurrenceFrequency;
  if (!frequency || frequency === "never") return null;
  const base = ({ daily: "Gjentas daglig", weekly: "Gjentas ukentlig", monthly: "Gjentas månedlig", yearly: "Gjentas årlig" } as Record<string, string>)[frequency] ?? "Gjentakende hendelse";
  return event.isRecurringOccurrence ? `${base} • enkeltforekomst` : base;
}

export function getCalendarEventSourceLabel(event: Pick<CalendarEvent, "source" | "icsSourceId">): string {
  if (event.source === "ics" || event.icsSourceId) return "Importert kalender";
  if (event.source === "school-week") return "Skoleuka";
  return "FamilieAppen";
}

export function getCalendarEventIdentity(event: Pick<CalendarEventViewModel, "id" | "occurrenceDate" | "recurringEventId" | "isRecurringOccurrence">): { eventId: string; occurrenceDate?: string } {
  if (event.isRecurringOccurrence && event.recurringEventId && event.occurrenceDate) return { eventId: event.recurringEventId, occurrenceDate: event.occurrenceDate };
  return { eventId: event.id };
}

export function buildCalendarEventDetailPath(input: { eventId: string; occurrenceDate?: string }): { pathname: "/(app)/calendar/[eventId]"; params: { eventId: string; occurrenceDate?: string } } {
  return { pathname: "/(app)/calendar/[eventId]", params: input.occurrenceDate ? { eventId: input.eventId, occurrenceDate: input.occurrenceDate } : { eventId: input.eventId } };
}

export function findCalendarEventOccurrence(events: CalendarEvent[], eventId: string, occurrenceDate?: string): CalendarEvent | null {
  if (occurrenceDate) {
    const occurrence = events.find((event) => event.recurringEventId === eventId && event.occurrenceDate === occurrenceDate);
    if (occurrence) return occurrence;
  }
  const direct = events.find((event) => event.id === eventId);
  if (direct) return direct;
  return events.find((event) => event.recurringEventId === eventId) ?? null;
}

function normalizeTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function formatEventTimeLabel(event: Pick<CalendarEvent, "allDay" | "startTime" | "endTime">): string {
  if (event.allDay) return "Hele dagen";
  const startTime = normalizeTime(event.startTime);
  const endTime = normalizeTime(event.endTime);
  if (!startTime) return "Tid ikke satt";
  return endTime ? `${startTime}–${endTime}` : startTime;
}

export function mapCalendarEventToViewModel(event: CalendarEvent): CalendarEventViewModel {
  const participantNames = event.participants.map((participant) => participant.familyMember.displayName).filter(Boolean);
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    timeLabel: formatEventTimeLabel(event),
    accessibilityTimeLabel: formatEventTimeLabel(event).replace("–", " til "),
    allDay: event.allDay,
    startTime: normalizeTime(event.startTime),
    endTime: normalizeTime(event.endTime),
    location: event.location,
    description: event.description,
    icon: event.icon,
    participantNames,
    isImported: event.source === "ics" || event.icsSourceId !== null,
    isRecurringOccurrence: Boolean(event.isRecurringOccurrence),
    occurrenceDate: event.occurrenceDate,
    source: event.source,
    sourceLabel: getCalendarEventSourceLabel(event),
    reminderLabel: event.reminder?.label ?? null,
    recurrenceLabel: getCalendarEventRecurrenceLabel(event),
    detailDateLabel: formatCalendarEventDate(event.date),
    createdByUserId: event.createdByUserId,
    recurringEventId: event.recurringEventId,
  };
}

function sortTime(event: CalendarEventViewModel): string {
  if (event.allDay) return "";
  return event.startTime ?? "99:99";
}

export function sortCalendarEvents(events: CalendarEventViewModel[]): CalendarEventViewModel[] {
  return [...events].sort((first, second) => {
    if (first.allDay !== second.allDay) return first.allDay ? -1 : 1;
    const timeComparison = sortTime(first).localeCompare(sortTime(second));
    if (timeComparison !== 0) return timeComparison;
    const titleComparison = first.title.localeCompare(second.title, "nb");
    if (titleComparison !== 0) return titleComparison;
    return first.id.localeCompare(second.id);
  });
}
