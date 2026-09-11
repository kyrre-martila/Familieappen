import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma";
import { DEFAULT_HEALTH_PLAN_TIMEZONE } from "./health-plan.domain";
import { addLocalDays, calendarExpiry, localDateTimeToInstant, localParts, recurrenceMatches, type Recurrence } from "./health-plan-scheduling.domain";

export const HEALTH_PLAN_GENERATION_HORIZON_DAYS = 14;
export const HEALTH_PLAN_GENERATION_LOOKBACK_HOURS = 4;

@Injectable()
export class HealthPlanSchedulerService {
  private readonly logger = new Logger(HealthPlanSchedulerService.name);
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledRun(): Promise<void> { await this.runOnce(); }

  async runOnce(now = new Date()): Promise<void> {
    const plans = await this.prisma.client.healthPlan.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    for (const plan of plans) {
      try { await this.runPlan(plan.id, now); }
      catch (error) { this.logger.warn(`Health-plan scheduler skipped plan ${plan.id}: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }

  private async runPlan(id: string, now: Date): Promise<void> {
    // Progress first. Loop supports a restart after several elapsed short steps.
    for (;;) {
      const advanced = await this.advanceIfDue(id, now);
      if (!advanced) break;
    }
    const plan = await this.prisma.client.healthPlan.findFirst({ where: { id, status: "ACTIVE" }, include: { activeStep: { include: { schedules: { include: { actions: true } } } } } });
    if (!plan?.activeStep) return;
    const from = new Date(now.getTime() - HEALTH_PLAN_GENERATION_LOOKBACK_HOURS * 3_600_000);
    const to = new Date(now.getTime() + HEALTH_PLAN_GENERATION_HORIZON_DAYS * 86_400_000);
    const rows: Record<string, unknown>[] = [];
    for (const schedule of plan.activeStep.schedules) {
      const zone = schedule.timezone || DEFAULT_HEALTH_PLAN_TIMEZONE;
      let date = localParts(from, zone);
      const endDate = localParts(to, zone);
      for (;;) {
        const day = { year: date.year, month: date.month, day: date.day };
        const instant = localDateTimeToInstant(day, schedule.localTime, zone);
        if (instant >= from && instant <= to && instant >= schedule.effectiveFrom && (!schedule.retiredAt || instant < schedule.retiredAt) && recurrenceMatches(day, schedule as Recurrence)) {
          for (const action of schedule.actions) if (instant >= action.effectiveFrom && (!action.retiredAt || instant < action.retiredAt)) rows.push({ healthPlanId: plan.id, familyId: plan.familyId, sourceActionId: action.id, scheduledAt: instant, originalScheduledAt: instant, timezone: zone, actionTitle: action.title, actionInstruction: action.instruction });
        }
        if (day.year === endDate.year && day.month === endDate.month && day.day === endDate.day) break;
        date = { ...date, ...addLocalDays(day, 1) };
      }
    }
    if (rows.length) await this.prisma.client.healthPlanOccurrence.createMany({ data: rows, skipDuplicates: true });
  }

  private async advanceIfDue(id: string, now: Date): Promise<boolean> {
    return this.prisma.client.$transaction(async (tx) => {
      const plan = await tx.healthPlan.findFirst({ where: { id, status: "ACTIVE" }, include: { activeStep: true } });
      const step = plan?.activeStep;
      if (!plan || !step?.autoAdvance || step.durationDays == null || !plan.activeStepStartedAt) return false;
      // Step progress has one stable plan-wide clock even when its schedules use
      // different zones. A future plan.timezone column can replace this constant.
      const zone = DEFAULT_HEALTH_PLAN_TIMEZONE;
      const expiry = calendarExpiry(plan.activeStepStartedAt, step.durationDays, zone);
      if (expiry > now) return false;
      const next = await tx.healthPlanStep.findFirst({ where: { healthPlanId: id, levelId: step.levelId, stepOrder: step.stepOrder + 1 } });
      if (!next) return false; // final autoAdvance step remains active, without repeated history
      const changed = await tx.healthPlan.updateMany({ where: { id, status: "ACTIVE", activeStepId: step.id, updatedAt: plan.updatedAt }, data: { activeStepId: next.id, activeStepStartedAt: expiry } });
      if (changed.count !== 1) return false;
      await tx.healthPlanOccurrence.updateMany({ where: { healthPlanId: id, scheduledAt: { gte: expiry }, status: { in: ["PENDING", "SNOOZED"] }, sourceAction: { schedule: { stepId: step.id } } }, data: { status: "SKIPPED", completedAt: null, completedByUserId: null } });
      await tx.healthPlanHistory.create({ data: { healthPlanId: id, type: "STEP_ADVANCED", actorDisplayName: "System", metadata: { fromStepId: step.id, toStepId: next.id, effectiveAt: expiry.toISOString() } } });
      return true;
    });
  }
}
