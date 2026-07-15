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

export type CalendarEventEditScope = "occurrence" | "series";

export const calendarEventEditScopes: CalendarEventEditScope[] = ["occurrence", "series"];

export type CalendarEventDeleteScope = CalendarEventEditScope;
export const calendarEventDeleteScopes: CalendarEventDeleteScope[] = calendarEventEditScopes;

export function parseCalendarEventDeleteScope(scope: string | string[] | null | undefined): CalendarEventDeleteScope | null {
  return parseCalendarEventEditScope(scope);
}

export function getCalendarEventDeleteRestriction(event: Pick<CalendarEventViewModel, "id" | "isImported" | "source"> | Pick<CalendarEvent, "id" | "source" | "icsSourceId"> | null): string | null {
  if (!event?.id) return "Hendelsen mangler en gyldig id.";
  const imported = "isImported" in event ? event.isImported : event.source === "ics" || Boolean(event.icsSourceId);
  if (imported || event.source === "ics") return "Importerte kalenderhendelser kan ikke slettes i FamilieAppen.";
  return null;
}

export function canDeleteCalendarEvent(event: Parameters<typeof getCalendarEventDeleteRestriction>[0]): boolean {
  return getCalendarEventDeleteRestriction(event) === null;
}

export function requiresCalendarEventDeleteScope(event: Pick<CalendarEventViewModel, "isRecurringOccurrence" | "recurringEventId" | "occurrenceDate" | "isImported" | "source"> | null): boolean {
  return requiresCalendarEventEditScope(event);
}

export function getCalendarEventDeleteScopes(event: Parameters<typeof requiresCalendarEventDeleteScope>[0]): CalendarEventDeleteScope[] {
  return requiresCalendarEventDeleteScope(event) ? calendarEventDeleteScopes : [];
}

export function getCalendarEventDeleteScopeLabel(scope: CalendarEventDeleteScope): string {
  return getCalendarEventEditScopeLabel(scope);
}

export function getCalendarEventDeleteScopeDescription(scope: CalendarEventDeleteScope, occurrenceDate?: string): string {
  if (scope === "occurrence") return occurrenceDate ? `Sletter bare hendelsen ${formatCalendarEventDate(occurrenceDate)}.` : "Sletter bare hendelsen på valgt dato.";
  return "Sletter alle hendelsene i denne serien.";
}

export function validateCalendarEventDeleteScope(input: { previousEvent: Pick<CalendarEvent, "id" | "source" | "icsSourceId" | "isRecurringOccurrence" | "recurringEventId" | "occurrenceDate"> | null; scope?: CalendarEventDeleteScope | null; occurrenceDate?: string }): string | null {
  const restriction = getCalendarEventDeleteRestriction(input.previousEvent);
  if (restriction) return restriction;
  if (input.scope !== undefined && input.scope !== null && input.scope !== "occurrence" && input.scope !== "series") return "Ugyldig slettevalg.";
  if (input.scope === "occurrence" && !isValidCalendarOccurrenceDate(input.occurrenceDate)) return "Kun denne krever en gyldig forekomstdato.";
  if (input.previousEvent?.isRecurringOccurrence && input.previousEvent.recurringEventId && !input.scope) return "Velg om du vil slette kun denne hendelsen eller hele serien.";
  return null;
}

export function buildCalendarEventDeletePath(input: { eventId: string; scope?: CalendarEventDeleteScope | null; occurrenceDate?: string }): string | null {
  if (input.scope === "occurrence") {
    if (!isValidCalendarOccurrenceDate(input.occurrenceDate)) return null;
    return `/calendar/events/${encodeURIComponent(input.eventId)}/occurrences/${encodeURIComponent(input.occurrenceDate)}`;
  }
  if (input.scope === "series" || input.scope == null) return `/calendar/events/${encodeURIComponent(input.eventId)}`;
  return null;
}


const dateFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseCalendarDateString(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatCalendarEventDate(date: string): string {
  const label = dateFormatter.format(parseCalendarDateString(date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getCalendarEventRecurrenceLabel(event: Pick<CalendarEvent, "recurrence" | "recurrenceFrequency" | "recurrenceUntil" | "isRecurringOccurrence">): string | null {
  const frequency = event.recurrence?.frequency ?? event.recurrenceFrequency;
  if (!frequency || frequency === "never") return null;
  const base = ({ daily: "Gjentas daglig", weekly: "Gjentas ukentlig", monthly: "Gjentas månedlig", yearly: "Gjentas årlig" } as Record<string, string>)[frequency] ?? "Gjentakende hendelse";
  const until = event.recurrenceUntil ?? event.recurrence?.until;
  const date = typeof until === "string" ? until.slice(0, 10) : null;
  const withUntil = date ? `${base} til ${date.split("-").reverse().join(".")}` : base;
  return event.isRecurringOccurrence ? `${withUntil} • enkeltforekomst` : withUntil;
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

export function isValidCalendarOccurrenceDate(date: string | null | undefined): date is string {
  if (!datePattern.test(date ?? "")) return false;
  const [year, month, day] = (date ?? "").split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export function parseCalendarEventEditScope(scope: string | string[] | null | undefined): CalendarEventEditScope | null {
  const value = Array.isArray(scope) ? scope[0] : scope;
  return value === "occurrence" || value === "series" ? value : null;
}

export function getCalendarEventEditScopeLabel(scope: CalendarEventEditScope): string {
  return scope === "occurrence" ? "Kun denne" : "Hele serien";
}

export function getCalendarEventEditScopeDescription(scope: CalendarEventEditScope): string {
  return scope === "occurrence" ? "Endrer bare hendelsen på valgt dato." : "Endrer alle hendelsene i denne serien.";
}

export function requiresCalendarEventEditScope(event: Pick<CalendarEventViewModel, "isRecurringOccurrence" | "recurringEventId" | "occurrenceDate" | "isImported" | "source"> | null): boolean {
  return Boolean(event && !event.isImported && event.source !== "ics" && event.isRecurringOccurrence && event.recurringEventId && event.occurrenceDate);
}

export function getCalendarEventEditScopes(event: Parameters<typeof requiresCalendarEventEditScope>[0]): CalendarEventEditScope[] {
  return requiresCalendarEventEditScope(event) ? calendarEventEditScopes : [];
}

export function validateCalendarEventEditRoute(input: { isRecurringOccurrence?: boolean; scope?: CalendarEventEditScope | null; occurrenceDate?: string }): string | null {
  if (input.scope === "occurrence" && !isValidCalendarOccurrenceDate(input.occurrenceDate)) return "Kun denne krever en gyldig forekomstdato.";
  if (input.isRecurringOccurrence && !input.scope) return "Velg om du vil redigere kun denne hendelsen eller hele serien.";
  return null;
}

export function validateCalendarEventUpdateScope(input: { previousEvent: Pick<CalendarEvent, "isRecurringOccurrence" | "recurringEventId" | "occurrenceDate"> | null; scope?: CalendarEventEditScope | null; occurrenceDate?: string }): string | null {
  if (input.scope === "occurrence" && !isValidCalendarOccurrenceDate(input.occurrenceDate)) return "Kun denne krever en gyldig forekomstdato.";
  if (input.previousEvent?.isRecurringOccurrence && input.previousEvent.recurringEventId && !input.scope) return "Velg om du vil redigere kun denne hendelsen eller hele serien.";
  return null;
}

export function getCalendarEventSeriesHydrationError(event: Pick<CalendarEvent, "id" | "isRecurringOccurrence" | "recurringEventId"> | null, eventId: string, scope?: CalendarEventEditScope | null): string | null {
  if (scope !== "series" || !event) return null;
  if (event.isRecurringOccurrence || event.recurringEventId || event.id !== eventId) return "Mobilappen mangler sikkert seriegrunnlag for denne gjentakende hendelsen. Prøv web inntil kalender-API-et kan hente selve serien direkte.";
  return null;
}

export function buildUpdatedCalendarEventDetailPath(input: { requestedEventId: string; scope?: CalendarEventEditScope | null; event: Pick<CalendarEvent, "recurringEventId" | "occurrenceDate"> }): ReturnType<typeof buildCalendarEventDetailPath> {
  return buildCalendarEventDetailPath({ eventId: input.event.recurringEventId ?? input.requestedEventId, occurrenceDate: input.scope === "series" ? undefined : input.event.occurrenceDate });
}

export function buildCalendarEventEditPath(input: { eventId: string; occurrenceDate?: string; scope?: CalendarEventEditScope }): { pathname: "/(app)/calendar/[eventId]/edit"; params: { eventId: string; occurrenceDate?: string; scope?: CalendarEventEditScope } } {
  const params: { eventId: string; occurrenceDate?: string; scope?: CalendarEventEditScope } = { eventId: input.eventId };
  if (input.occurrenceDate) params.occurrenceDate = input.occurrenceDate;
  if (input.scope) params.scope = input.scope;
  return { pathname: "/(app)/calendar/[eventId]/edit", params };
}

export function getCalendarEventEditRestriction(event: Pick<CalendarEventViewModel, "id" | "isImported" | "isRecurringOccurrence" | "recurrenceLabel" | "source"> | null): string | null {
  if (!event?.id) return "Hendelsen mangler en gyldig id.";
  if (event.isImported || event.source === "ics") return "Importerte kalenderhendelser kan ikke redigeres i appen ennå.";
  return null;
}

export function canEditCalendarEvent(event: Parameters<typeof getCalendarEventEditRestriction>[0]): boolean {
  return getCalendarEventEditRestriction(event) === null;
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

export function findCalendarEventSeries(events: CalendarEvent[], eventId: string): CalendarEvent | null {
  const direct = events.find((event) => event.id === eventId && !event.isRecurringOccurrence);
  if (direct) return direct;
  return events.find((event) => event.id === eventId) ?? null;
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
