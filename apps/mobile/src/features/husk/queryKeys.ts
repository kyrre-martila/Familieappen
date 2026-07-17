export const huskQueryKeys = {
  families: ["husk", "families"] as const,
  reminders: (familyId: string) => ["husk", "reminders", familyId] as const,
  lists: (familyId: string) => ["husk", "lists", familyId] as const,
};
