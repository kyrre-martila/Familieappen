import type { CreateHealthPlanInput, HealthPlan, HealthPlanOccurrence } from "../../lib/api";

export const ISO_WEEKDAYS = [
  { value: 1, label: "Ma" }, { value: 2, label: "Ti" },
  { value: 3, label: "On" }, { value: 4, label: "To" },
  { value: 5, label: "Fr" }, { value: 6, label: "Lø" },
  { value: 7, label: "Sø" },
] as const;

export type ScheduleDraft = { localTime: string; recurrenceType: "DAILY" | "WEEKDAYS" | "INTERVAL_DAYS"; weekdays: number[]; intervalDays: number | string; actions: Array<{ title: string; instruction: string }> };
export type StepDraft = { durationDays: string; autoAdvance: boolean; schedules: ScheduleDraft[] };
export type LevelDraft = { steps: StepDraft[] };
export const blankSchedule = (): ScheduleDraft => ({ localTime: "20:00", recurrenceType: "DAILY", weekdays: [], intervalDays: 2, actions: [{ title: "", instruction: "" }] });
export const blankStep = (): StepDraft => ({ durationDays: "", autoAdvance: false, schedules: [blankSchedule()] });
export const blankLevel = (): LevelDraft => ({ steps: [blankStep()] });

export function localDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function withStepDuration(step: StepDraft, durationDays: string): StepDraft {
  return { ...step, durationDays, autoAdvance: durationDays === "" ? false : step.autoAdvance };
}

export function buildCreateHealthPlanInput(name: string, description: string, familyMemberId: string, levels: LevelDraft[], today = new Date()): CreateHealthPlanInput {
  if (!name.trim()) throw new Error("Navn på planen er påkrevd.");
  if (!familyMemberId) throw new Error("Velg et familiemedlem.");
  if (!levels.length) throw new Error("Planen må ha en basisplan.");
  return { name: name.trim(), description: description.trim() || null, familyMemberId, levels: levels.map((level, levelIndex) => {
    if (!level.steps.length) throw new Error("Hvert trinn må ha minst ett delsteg.");
    return { levelIndex, steps: level.steps.map((step, stepOrder) => {
      const durationDays = step.durationDays === "" ? null : Number(step.durationDays);
      if (durationDays !== null && (!Number.isInteger(durationDays) || durationDays < 1)) throw new Error("Varighet må være et heltall på minst 1.");
      if (step.autoAdvance && durationDays === null) throw new Error("Automatisk overgang krever varighet på minst 1 dag.");
      if (!step.schedules.length) throw new Error("Hvert delsteg må ha minst ett tidspunkt.");
      return { stepOrder, durationDays, autoAdvance: stepOrder < level.steps.length - 1 && step.autoAdvance, schedules: step.schedules.map(schedule => {
        if (!schedule.actions.length) throw new Error("Hvert tidspunkt må ha minst én hendelse.");
        if (schedule.actions.some(action => !action.title.trim())) throw new Error("Alle hendelser må ha en tittel.");
        if (schedule.recurrenceType === "WEEKDAYS" && (!schedule.weekdays.length || schedule.weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7))) throw new Error("Velg minst én gyldig ukedag (mandag 1 til søndag 7).");
        const intervalDays = Number(schedule.intervalDays);
        if (schedule.recurrenceType === "INTERVAL_DAYS" && (!Number.isInteger(intervalDays) || intervalDays < 1)) throw new Error("Intervall må være et heltall på minst 1.");
        return { localTime: schedule.localTime, recurrenceType: schedule.recurrenceType, ...(schedule.recurrenceType === "WEEKDAYS" ? { weekdays: [...schedule.weekdays].sort((a, b) => a - b) } : {}), ...(schedule.recurrenceType === "INTERVAL_DAYS" ? { intervalDays, anchorDate: localDateInTimeZone(today, "Europe/Oslo") } : {}), actions: schedule.actions.map((action, sortOrder) => ({ title: action.title.trim(), instruction: action.instruction.trim() || null, sortOrder })) };
      }) };
    }) };
  }) };
}

export function plansForMember(plans: HealthPlan[], memberId: string) { return plans.filter(plan => !memberId || plan.familyMemberId === memberId); }
export function compatiblePlanId(plans: HealthPlan[], memberId: string, planId: string) { return !planId || plansForMember(plans, memberId).some(plan => plan.id === planId) ? planId : ""; }
export function isOccurrenceActionable(item: Pick<HealthPlanOccurrence, "status" | "healthPlan">) { return item.healthPlan.status === "ACTIVE" && (item.status === "PENDING" || item.status === "SNOOZED"); }
export function occurrenceMenuActions(item: Pick<HealthPlanOccurrence, "status" | "healthPlan">) { return isOccurrenceActionable(item) ? ["COMPLETED", "SKIPPED", "SNOOZED", "NOTE"] as const : ["NOTE"] as const; }
export function planProgressLabel(plan: Pick<HealthPlan, "status" | "activeLevel" | "activeStep">) { if (!plan.activeLevel || !plan.activeStep) return null; return `${plan.activeLevel.levelIndex === 0 ? "Basisplan" : `Trinn ${plan.activeLevel.levelIndex}`} · Del ${plan.activeStep.stepOrder + 1}`; }

const WEEKDAY_NAMES = ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag"];
export function recurrenceLabel(schedule: Pick<import("../../lib/api").HealthPlanSchedule, "recurrenceType" | "weekdays" | "intervalDays">) {
  if (schedule.recurrenceType === "DAILY") return "Hver dag";
  if (schedule.recurrenceType === "INTERVAL_DAYS") return `Hver ${schedule.intervalDays}. dag`;
  const names = schedule.weekdays.map(day => WEEKDAY_NAMES[day - 1]).filter(Boolean);
  return names.length < 2 ? (names[0] ?? "Utvalgte ukedager") : `${names.slice(0, -1).join(", ")} og ${names.at(-1)}`;
}
export function availablePlanActions(plan: Pick<HealthPlan, "status" | "activeLevelId" | "levels">) {
  const levels = plan.levels ?? []; const current = levels.find(level => level.id === plan.activeLevelId);
  return {
    start: plan.status === "DRAFT", pause: plan.status === "ACTIVE", resume: plan.status === "PAUSED",
    complete: plan.status === "ACTIVE" || plan.status === "PAUSED", archive: plan.status === "DRAFT" || plan.status === "COMPLETED",
    levelUp: plan.status === "ACTIVE" && !!current && levels.some(level => level.levelIndex === current.levelIndex + 1),
    levelDown: plan.status === "ACTIVE" && !!current && levels.some(level => level.levelIndex === current.levelIndex - 1),
  };
}

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
