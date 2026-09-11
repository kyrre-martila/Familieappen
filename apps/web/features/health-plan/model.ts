import type { HealthPlanOccurrence } from "../../lib/api";

export function sortOccurrences(items: HealthPlanOccurrence[]) {
  return [...items].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime() || a.id.localeCompare(b.id));
}
export function filterOccurrences(items: HealthPlanOccurrence[], memberId: string, planId: string) {
  return sortOccurrences(items.filter((item) => (!memberId || item.healthPlan.familyMember.id === memberId) && (!planId || item.healthPlanId === planId)));
}
export function isOverdue(item: Pick<HealthPlanOccurrence, "status" | "scheduledAt">, now = new Date()) {
  return item.status === "PENDING" && new Date(item.scheduledAt) < now;
}
export function localDayBounds(now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const tomorrow = new Date(start); tomorrow.setDate(tomorrow.getDate() + 1);
  const horizon = new Date(start); horizon.setDate(horizon.getDate() + 14);
  return { start, tomorrow, horizon };
}
