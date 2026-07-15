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
};

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
