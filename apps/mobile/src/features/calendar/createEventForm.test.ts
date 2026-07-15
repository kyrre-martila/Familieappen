import { calendarRecurrenceOptions, createCalendarEventPayload, getCalendarRecurrenceLabel, isValidDateString, toLocalDateTimeString, validateCreateCalendarEventForm, type CreateCalendarEventForm } from "./createEventForm";
function assertEqual<T>(actual: T, expected: T, description: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
function form(overrides: Partial<CreateCalendarEventForm> = {}): CreateCalendarEventForm { return { title: " Trening ", date: "2026-03-29", allDay: false, startTime: "09:00", endTime: "10:00", location: " Hallen ", description: " Ta med sko ", recurrenceFrequency: "never", recurrenceUntil: "", ...overrides }; }
assertEqual(calendarRecurrenceOptions.map(getCalendarRecurrenceLabel), ["Aldri", "Daglig", "Ukentlig", "Månedlig", "Årlig"], "all supported frequencies have Norwegian labels");
assertEqual(validateCreateCalendarEventForm(form()), {}, "valid timed event passes validation");
assertEqual(validateCreateCalendarEventForm(form({ title: "   " })).title, "Tittel må fylles ut.", "whitespace title is rejected");
assertEqual(validateCreateCalendarEventForm(form({ date: "2026-02-30" })).date, "Velg en gyldig dato.", "invalid dates are rejected");
assertEqual(validateCreateCalendarEventForm(form({ endTime: "08:59" })).endTime, "Sluttid må være etter starttid.", "end before start is rejected");
assertEqual(validateCreateCalendarEventForm(form({ allDay: true, startTime: "99:99", endTime: "00:00" })), {}, "all-day events do not require valid visible times");
assertEqual(validateCreateCalendarEventForm(form({ recurrenceFrequency: "daily", recurrenceUntil: "" })).recurrenceUntil, "Velg sluttdato for gjentakelsen.", "recurring events require an until date");
assertEqual(validateCreateCalendarEventForm(form({ recurrenceFrequency: "weekly", recurrenceUntil: "2026-03-28" })).recurrenceUntil, "Sluttdato kan ikke være før startdato.", "recurrence until before start is rejected");
assertEqual(validateCreateCalendarEventForm(form({ recurrenceFrequency: "monthly", recurrenceUntil: "2026-03-29" })), {}, "same-day recurrence until follows backend on-or-after contract");
assertEqual(validateCreateCalendarEventForm(form({ recurrenceFrequency: "yearly", recurrenceUntil: "2026-10-25" })), {}, "Norwegian DST date stays valid");
assertEqual(isValidDateString("2026-10-25"), true, "DST date validates without UTC parsing");
assertEqual(toLocalDateTimeString("2026-10-25", "09:30", false), "2026-10-25T09:30:00.000Z", "local date/time string is built without toISOString UTC shift");
assertEqual(createCalendarEventPayload(form()), { title: "Trening", description: "Ta med sko", location: "Hallen", icon: "family", reminderMinutesBefore: null, startsAt: "2026-03-29T09:00:00.000Z", endsAt: "2026-03-29T10:00:00.000Z", allDay: false, recurrenceFrequency: "never", recurrenceUntil: null, participantFamilyMemberIds: [] }, "payload matches backend create contract");
assertEqual(createCalendarEventPayload(form({ recurrenceFrequency: "weekly", recurrenceUntil: "2026-04-30" })).recurrenceUntil, "2026-04-30T23:59:59.999Z", "recurrence until is sent as backend end-of-day string without toISOString");
