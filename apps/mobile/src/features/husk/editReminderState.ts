import type { Reminder } from "@familieappen/shared";

export type EditReminderScreenState = "invalid" | "loading" | "error" | "missing-context" | "not-found" | "hydrating" | "ready";

export function resolveEditReminderScreenState(input: { reminderId: string | null; loading: boolean; familiesLoading: boolean; error: unknown; missingContext: boolean; reminder: Reminder | null; formReady: boolean }): EditReminderScreenState {
  if (!input.reminderId) return "invalid";
  if (input.loading || input.familiesLoading) return "loading";
  if (input.error) return "error";
  if (input.missingContext) return "missing-context";
  if (!input.reminder) return "not-found";
  if (!input.formReady) return "hydrating";
  return "ready";
}
