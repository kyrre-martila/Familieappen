import type { CalendarEvent } from "@familieappen/shared";

export type CreateCalendarEventForm = {
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

export type CreateCalendarEventErrors = Partial<Record<keyof CreateCalendarEventForm | "form", string>>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

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

export function validateCreateCalendarEventForm(form: CreateCalendarEventForm): CreateCalendarEventErrors {
  const errors: CreateCalendarEventErrors = {};
  if (!form.title.trim()) errors.title = "Tittel må fylles ut.";
  if (!isValidDateString(form.date)) errors.date = "Velg en gyldig dato.";
  if (!form.allDay) {
    if (!isValidTimeString(form.startTime)) errors.startTime = "Velg et gyldig starttidspunkt.";
    if (!isValidTimeString(form.endTime)) errors.endTime = "Velg et gyldig sluttidspunkt.";
    if (!errors.startTime && !errors.endTime && form.endTime <= form.startTime) errors.endTime = "Sluttid må være etter starttid.";
  }
  return errors;
}

export function createCalendarEventPayload(form: CreateCalendarEventForm): CreateCalendarEventPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    location: form.location.trim() || null,
    icon: "family",
    reminderMinutesBefore: null,
    startsAt: toLocalDateTimeString(form.date, form.startTime, form.allDay),
    endsAt: form.allDay ? toLocalDateTimeString(form.date, null, true) : toLocalDateTimeString(form.date, form.endTime, false),
    allDay: form.allDay,
    recurrenceFrequency: "never",
    recurrenceUntil: null,
    participantFamilyMemberIds: [],
  };
}
