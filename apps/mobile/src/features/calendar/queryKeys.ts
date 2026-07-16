export const calendarQueryKeys = {
  families: ["calendar", "families"] as const,
  events: (familyId: string, from: string, to: string) => ["calendar", "events", familyId, from, to] as const,
  day: (familyId: string, date: string) => ["calendar", "events", familyId, "day", date] as const,
  detail: (familyId: string, eventId: string, occurrenceDate: string | null, lookupDate: string) => ["calendar", "events", familyId, "detail", eventId, occurrenceDate, lookupDate] as const,
  duplicate: (familyId: string, eventId: string, sourceDate: string | null, occurrenceDate: string | null) => ["calendar", "events", familyId, "duplicate", eventId, sourceDate, occurrenceDate] as const,
  familyMembers: (familyId: string) => ["calendar", "familyMembers", familyId] as const,
};
