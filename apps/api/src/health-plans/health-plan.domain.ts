export const DEFAULT_HEALTH_PLAN_TIMEZONE = "Europe/Oslo";

export type HealthPlanScheduleInput =
  | { recurrenceType: "DAILY" }
  | { recurrenceType: "WEEKDAYS"; weekdays: number[] }
  | { recurrenceType: "INTERVAL_DAYS"; intervalDays: number; anchorDate: Date };

export type HealthPlanLevelInput = {
  levelIndex: number;
  steps: Array<{
    stepOrder: number;
    durationDays?: number | null;
    autoAdvance: boolean;
    schedules: Array<{ actionCount: number }>;
  }>;
};

/** Validates invariants that span rows and therefore cannot be expressed by Prisma alone. */
export function assertValidHealthPlanLevels(levels: HealthPlanLevelInput[]): void {
  if (levels.length === 0 || !levels.some((level) => level.levelIndex === 0)) {
    throw new Error("A health plan must contain level 0 (the base plan)");
  }

  const indexes = levels.map((level) => level.levelIndex);
  if (indexes.some((index) => !Number.isInteger(index) || index < 0)) {
    throw new Error("Health plan level indexes must be non-negative integers");
  }
  if (new Set(indexes).size !== indexes.length) {
    throw new Error("Health plan level indexes must be unique");
  }

  const sortedIndexes = [...indexes].sort((left, right) => left - right);
  if (sortedIndexes.some((index, position) => index !== position)) {
    throw new Error("Health plan levels must be contiguous from level 0");
  }

  for (const level of levels) {
    if (level.steps.length === 0) {
      throw new Error(`Health plan level ${level.levelIndex} must contain at least one step`);
    }
    const orders = level.steps.map((step) => step.stepOrder);
    if (new Set(orders).size !== orders.length || orders.some((order, position) => order !== position)) {
      throw new Error(`Steps in health plan level ${level.levelIndex} must be uniquely ordered from 0`);
    }
    for (const step of level.steps) {
      if (step.durationDays != null && (!Number.isInteger(step.durationDays) || step.durationDays <= 0)) {
        throw new Error("A fixed step duration must be a positive whole number of days");
      }
      if (step.autoAdvance && step.durationDays == null) {
        throw new Error("An open-ended health plan step cannot advance automatically");
      }
      if (step.schedules.length === 0 || step.schedules.some((schedule) => schedule.actionCount < 1)) {
        throw new Error("Every health plan step needs schedules with at least one action");
      }
    }
  }
}

export function assertValidHealthPlanSchedule(schedule: HealthPlanScheduleInput): void {
  if (schedule.recurrenceType === "WEEKDAYS") {
    if (
      schedule.weekdays.length === 0 ||
      new Set(schedule.weekdays).size !== schedule.weekdays.length ||
      schedule.weekdays.some((weekday) => !Number.isInteger(weekday) || weekday < 1 || weekday > 7)
    ) {
      throw new Error("Weekday schedules require unique ISO weekdays from 1 through 7");
    }
  }

  if (
    schedule.recurrenceType === "INTERVAL_DAYS" &&
    (!Number.isInteger(schedule.intervalDays) || schedule.intervalDays <= 0 || !schedule.anchorDate)
  ) {
    throw new Error("Interval schedules require a positive interval and an anchor date");
  }
}

/** Moves the progress clock forward by the pause, so paused wall-clock time is not consumed. */
export function resumeProgressStartedAt(progressStartedAt: Date, pausedAt: Date, resumedAt: Date): Date {
  if (resumedAt.getTime() < pausedAt.getTime()) {
    throw new Error("A health plan cannot resume before it was paused");
  }
  return new Date(progressStartedAt.getTime() + resumedAt.getTime() - pausedAt.getTime());
}

/** MISSED is deliberately derived, rather than persisted as mutable historical state. */
export function isHealthPlanOccurrenceMissed(status: string, scheduledAt: Date, now: Date): boolean {
  return status === "PENDING" && scheduledAt.getTime() < now.getTime();
}
