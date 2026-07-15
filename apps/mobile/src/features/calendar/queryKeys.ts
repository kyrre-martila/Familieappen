export const calendarQueryKeys = {
  families: ["calendar", "families"] as const,
  events: (familyId: string, from: string, to: string) => ["calendar", "events", familyId, from, to] as const,
  day: (familyId: string, date: string) => ["calendar", "events", familyId, "day", date] as const,
};
