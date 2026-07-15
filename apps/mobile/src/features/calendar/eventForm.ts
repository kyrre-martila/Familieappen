import type { CalendarEvent, CalendarEventRecurrenceFrequency } from "@familieappen/shared";

export type CalendarEventForm = {
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  recurrenceFrequency: CalendarEventRecurrenceFrequency;
  recurrenceUntil: string;
  icon: CalendarEvent["icon"];
  reminderMinutesBefore: number | null;
  participantFamilyMemberIds: string[];
};

export type CreateCalendarEventPayload = {
  title: string;
  description: string | null;
  location: string | null;
  icon: CalendarEvent["icon"];
  reminderMinutesBefore: number | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  recurrenceFrequency: CalendarEventRecurrenceFrequency;
  recurrenceUntil: string | null;
  participantFamilyMemberIds: string[];
};

export type SeriesUpdateCalendarEventPayload = {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  recurrenceFrequency?: CalendarEventRecurrenceFrequency;
  recurrenceUntil?: string | null;
};

export type OccurrenceUpdateCalendarEventPayload = Omit<SeriesUpdateCalendarEventPayload, "recurrenceFrequency" | "recurrenceUntil">;
export type UpdateCalendarEventPayload = SeriesUpdateCalendarEventPayload;

export type CalendarEventFormErrors = Partial<Record<keyof CalendarEventForm | "form", string>>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

export const calendarRecurrenceOptions = ["never", "daily", "weekly", "monthly", "yearly"] as const satisfies readonly CalendarEventRecurrenceFrequency[];
export function isCalendarRecurrenceFrequency(value: unknown): value is CalendarEventRecurrenceFrequency { return typeof value === "string" && (calendarRecurrenceOptions as readonly string[]).includes(value); }
export function getCalendarRecurrenceLabel(frequency: CalendarEventRecurrenceFrequency): string { return ({ never: "Aldri", daily: "Daglig", weekly: "Ukentlig", monthly: "Månedlig", yearly: "Årlig" } as const)[frequency]; }
export function getCalendarRecurrenceDescription(frequency: CalendarEventRecurrenceFrequency): string { return ({ never: "Hendelsen skjer bare én gang.", daily: "Hendelsen gjentas hver dag.", weekly: "Hendelsen gjentas hver uke.", monthly: "Hendelsen gjentas hver måned.", yearly: "Hendelsen gjentas hvert år." } as const)[frequency]; }
export function shouldShowCalendarRecurrenceUntil(frequency: CalendarEventRecurrenceFrequency): boolean { return frequency !== "never"; }
export const defaultCalendarEventForm = (date: string): CalendarEventForm => ({ title: "", date, allDay: true, startTime: "09:00", endTime: "10:00", location: "", description: "", recurrenceFrequency: "never", recurrenceUntil: "", icon: "family", reminderMinutesBefore: null, participantFamilyMemberIds: [] });

export function isValidDateString(date: string): boolean {
  if (!datePattern.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export function isValidTimeString(time: string): boolean {
  if (!timePattern.test(time)) return false;
  const [hours, minutes] = time.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function toLocalDateTimeString(date: string, time: string | null | undefined, allDay: boolean): string {
  return `${date}T${allDay || !time ? "00:00" : time}:00.000Z`;
}

export function recurrenceUntilToApiDateTime(date: string): string { return `${date}T23:59:59.999Z`; }
export function apiDateTimeToLocalDate(value: string | null | undefined): string { return typeof value === "string" && datePattern.test(value.slice(0, 10)) ? value.slice(0, 10) : ""; }
export function validateCalendarRecurrence(form: Pick<CalendarEventForm, "date" | "recurrenceFrequency" | "recurrenceUntil">): CalendarEventFormErrors {
  const errors: CalendarEventFormErrors = {};
  if (!isCalendarRecurrenceFrequency(form.recurrenceFrequency)) errors.recurrenceFrequency = "Velg en gyldig gjentakelse.";
  if (form.recurrenceFrequency === "never") return errors;
  if (!form.recurrenceUntil) errors.recurrenceUntil = "Velg sluttdato for gjentakelsen.";
  else if (!isValidDateString(form.recurrenceUntil)) errors.recurrenceUntil = "Velg en gyldig sluttdato.";
  else if (isValidDateString(form.date) && form.recurrenceUntil < form.date) errors.recurrenceUntil = "Sluttdato kan ikke være før startdato.";
  return errors;
}

export function validateCalendarEventForm(form: CalendarEventForm, options: { allowRecurrence?: boolean } = {}): CalendarEventFormErrors {
  const errors: CalendarEventFormErrors = {};
  if (!form.title.trim()) errors.title = "Tittel må fylles ut.";
  if (!isValidDateString(form.date)) errors.date = "Velg en gyldig dato.";
  if (!form.allDay) {
    if (!isValidTimeString(form.startTime)) errors.startTime = "Velg et gyldig starttidspunkt.";
    if (!isValidTimeString(form.endTime)) errors.endTime = "Velg et gyldig sluttidspunkt.";
    if (!errors.startTime && !errors.endTime && form.endTime <= form.startTime) errors.endTime = "Sluttid må være etter starttid.";
  }
  if (options.allowRecurrence !== false) Object.assign(errors, validateCalendarRecurrence(form));
  return errors;
}

function normalizeTime(time: string | null | undefined, fallback: string) {
  const match = time?.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : fallback;
}

type CalendarEventFormSource = Pick<CalendarEvent, "title" | "date" | "allDay" | "startTime" | "endTime" | "location" | "description" | "recurrence" | "recurrenceFrequency" | "recurrenceUntil" | "icon" | "reminderMinutesBefore" | "participants"> & { participantIds?: string[] };

function getParticipantIds(event: CalendarEventFormSource): string[] {
  if (Array.isArray(event.participantIds)) return [...event.participantIds];
  return event.participants.map((participant) => participant.familyMember.id);
}

export function calendarEventToForm(event: CalendarEventFormSource): CalendarEventForm {
  const frequency = event.recurrence?.frequency ?? event.recurrenceFrequency ?? "never";
  return { title: event.title, date: event.date, allDay: event.allDay, startTime: normalizeTime(event.startTime, "09:00"), endTime: normalizeTime(event.endTime, "10:00"), location: event.location ?? "", description: event.description ?? "", recurrenceFrequency: isCalendarRecurrenceFrequency(frequency) ? frequency : "never", recurrenceUntil: apiDateTimeToLocalDate(event.recurrenceUntil ?? event.recurrence?.until), icon: event.icon, reminderMinutesBefore: event.reminderMinutesBefore, participantFamilyMemberIds: getParticipantIds(event) };
}

export function calendarEventToDuplicateCreateForm(event: Parameters<typeof calendarEventToForm>[0]): CalendarEventForm {
  return calendarEventToForm(event);
}

export function encodeCalendarEventInitialValues(form: CalendarEventForm): string {
  return encodeURIComponent(JSON.stringify(form));
}

export function decodeCalendarEventInitialValues(value: string | string[] | null | undefined, fallback: CalendarEventForm): CalendarEventForm {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CalendarEventForm>;
    return { ...fallback, ...parsed, participantFamilyMemberIds: Array.isArray(parsed.participantFamilyMemberIds) ? parsed.participantFamilyMemberIds : fallback.participantFamilyMemberIds };
  } catch {
    return fallback;
  }
}

export function createCalendarEventPayload(form: CalendarEventForm): CreateCalendarEventPayload {
  return {
    title: form.title.trim(), description: form.description.trim() || null, location: form.location.trim() || null, icon: form.icon, reminderMinutesBefore: form.reminderMinutesBefore,
    startsAt: toLocalDateTimeString(form.date, form.startTime, form.allDay), endsAt: form.allDay ? toLocalDateTimeString(form.date, null, true) : toLocalDateTimeString(form.date, form.endTime, false),
    allDay: form.allDay, recurrenceFrequency: form.recurrenceFrequency, recurrenceUntil: form.recurrenceFrequency === "never" ? null : recurrenceUntilToApiDateTime(form.recurrenceUntil), participantFamilyMemberIds: form.participantFamilyMemberIds,
  };
}

export function updateCalendarEventPayload(form: CalendarEventForm, options: { includeRecurrence?: boolean } = {}): SeriesUpdateCalendarEventPayload | OccurrenceUpdateCalendarEventPayload {
  const payload: SeriesUpdateCalendarEventPayload = { title: form.title.trim(), description: form.description.trim() || null, location: form.location.trim() || null, startsAt: toLocalDateTimeString(form.date, form.startTime, form.allDay), endsAt: form.allDay ? toLocalDateTimeString(form.date, null, true) : toLocalDateTimeString(form.date, form.endTime, false), allDay: form.allDay };
  if (options.includeRecurrence) { payload.recurrenceFrequency = form.recurrenceFrequency; payload.recurrenceUntil = form.recurrenceFrequency === "never" ? null : recurrenceUntilToApiDateTime(form.recurrenceUntil); }
  return payload;
}
export function occurrenceUpdateCalendarEventPayload(form: CalendarEventForm): OccurrenceUpdateCalendarEventPayload {
  const { recurrenceFrequency: _frequency, recurrenceUntil: _until, ...payload } = updateCalendarEventPayload(form, { includeRecurrence: false }) as SeriesUpdateCalendarEventPayload;
  return payload;
}
