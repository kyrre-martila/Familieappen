import type { CalendarEvent } from "@familieappen/shared";

export type CalendarEventForm = {
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
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
  recurrenceFrequency: "never";
  recurrenceUntil: null;
  participantFamilyMemberIds: string[];
};

export type UpdateCalendarEventPayload = {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
};

export type CalendarEventFormErrors = Partial<Record<keyof CalendarEventForm | "form", string>>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

export const defaultCalendarEventForm = (date: string): CalendarEventForm => ({ title: "", date, allDay: true, startTime: "09:00", endTime: "10:00", location: "", description: "" });

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

export function validateCalendarEventForm(form: CalendarEventForm): CalendarEventFormErrors {
  const errors: CalendarEventFormErrors = {};
  if (!form.title.trim()) errors.title = "Tittel må fylles ut.";
  if (!isValidDateString(form.date)) errors.date = "Velg en gyldig dato.";
  if (!form.allDay) {
    if (!isValidTimeString(form.startTime)) errors.startTime = "Velg et gyldig starttidspunkt.";
    if (!isValidTimeString(form.endTime)) errors.endTime = "Velg et gyldig sluttidspunkt.";
    if (!errors.startTime && !errors.endTime && form.endTime <= form.startTime) errors.endTime = "Sluttid må være etter starttid.";
  }
  return errors;
}

function normalizeTime(time: string | null | undefined, fallback: string) {
  const match = time?.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : fallback;
}

export function calendarEventToForm(event: Pick<CalendarEvent, "title" | "date" | "allDay" | "startTime" | "endTime" | "location" | "description">): CalendarEventForm {
  return { title: event.title, date: event.date, allDay: event.allDay, startTime: normalizeTime(event.startTime, "09:00"), endTime: normalizeTime(event.endTime, "10:00"), location: event.location ?? "", description: event.description ?? "" };
}

export function createCalendarEventPayload(form: CalendarEventForm): CreateCalendarEventPayload {
  return {
    title: form.title.trim(), description: form.description.trim() || null, location: form.location.trim() || null, icon: "family", reminderMinutesBefore: null,
    startsAt: toLocalDateTimeString(form.date, form.startTime, form.allDay), endsAt: form.allDay ? toLocalDateTimeString(form.date, null, true) : toLocalDateTimeString(form.date, form.endTime, false),
    allDay: form.allDay, recurrenceFrequency: "never", recurrenceUntil: null, participantFamilyMemberIds: [],
  };
}

export function updateCalendarEventPayload(form: CalendarEventForm): UpdateCalendarEventPayload {
  return { title: form.title.trim(), description: form.description.trim() || null, location: form.location.trim() || null, startsAt: toLocalDateTimeString(form.date, form.startTime, form.allDay), endsAt: form.allDay ? toLocalDateTimeString(form.date, null, true) : toLocalDateTimeString(form.date, form.endTime, false), allDay: form.allDay };
}
