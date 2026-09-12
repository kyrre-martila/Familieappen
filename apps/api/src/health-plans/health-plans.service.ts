import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
import { assertValidHealthPlanLevels, assertValidHealthPlanSchedule, DEFAULT_HEALTH_PLAN_TIMEZONE, resumeProgressStartedAt } from "./health-plan.domain";
import { CreateHealthPlanDto, CreateHealthPlanNoteDto, ListHealthPlanOccurrencesQueryDto, UpdateHealthPlanDto, UpdateHealthPlanOccurrenceDto } from "./health-plans.dto";

const LIMITS = { levels: 10, steps: 20, schedules: 20, actions: 20 } as const;
type Client = PrismaService["client"];
type PlanStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
type HistoryType = "CREATED" | "PAUSED" | "RESUMED" | "LEVEL_INCREASED" | "LEVEL_DECREASED" | "STEP_ADVANCED" | "STATUS_CHANGED" | "DEFINITION_UPDATED";
type PlanState = {
  id: string; familyId: string; status: PlanStatus; updatedAt: Date; pausedAt: Date | null;
  activeLevelId: string | null; activeStepId: string | null;
  activeLevelStartedAt: Date | null; activeStepStartedAt: Date | null;
  generationNotBefore: Date | null;
};

@Injectable()
export class HealthPlansService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: FamilyAuthorizationService) {}

  async list(userId: string, familyId: string) {
    await this.authorization.requireFamilyMember(userId, familyId);
    return this.prisma.client.healthPlan.findMany({
      where: { familyId },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      include: {
        familyMember: true,
        activeLevel: { select: { id: true, levelIndex: true, name: true } },
        activeStep: { select: { id: true, stepOrder: true, name: true } },
      },
    });
  }

  async get(userId: string, familyId: string, id: string) {
    await this.authorization.requireFamilyMember(userId, familyId);
    return this.getPlan(id, familyId, this.prisma.client, true);
  }

  async create(userId: string, familyId: string, input: CreateHealthPlanDto) {
    const actor = await this.authorization.requireFamilyMember(userId, familyId);
    const validated = this.validateDefinition(input);
    const member = await this.prisma.client.familyMember.findFirst({ where: { id: input.familyMemberId, familyId }, select: { id: true } });
    if (!member) throw new BadRequestException("Family member must belong to the active family");

    return this.prisma.client.$transaction(async (tx) => {
      const plan = await tx.healthPlan.create({ data: { familyId, familyMemberId: input.familyMemberId, name: validated.name, description: validated.description, createdByUserId: userId } });
      for (const levelInput of input.levels) {
        const level = await tx.healthPlanLevel.create({ data: { healthPlanId: plan.id, levelIndex: levelInput.levelIndex, name: this.optionalText(levelInput.name, 120, "Level name"), description: this.optionalText(levelInput.description, 1000, "Level description") } });
        for (const stepInput of levelInput.steps) {
          const step = await tx.healthPlanStep.create({ data: { healthPlanId: plan.id, levelId: level.id, stepOrder: stepInput.stepOrder, name: this.optionalText(stepInput.name, 120, "Step name"), description: this.optionalText(stepInput.description, 1000, "Step description"), durationDays: stepInput.durationDays ?? null, autoAdvance: stepInput.autoAdvance ?? false } });
          for (const scheduleInput of stepInput.schedules) {
            const schedule = await tx.healthPlanSchedule.create({ data: { stepId: step.id, recurrenceType: scheduleInput.recurrenceType, localTime: this.localTime(scheduleInput.localTime), timezone: this.timezone(scheduleInput.timezone), weekdays: scheduleInput.weekdays ?? [], intervalDays: scheduleInput.intervalDays ?? null, anchorDate: scheduleInput.anchorDate ? this.date(scheduleInput.anchorDate, "anchorDate") : null } });
            for (const action of scheduleInput.actions) await tx.healthPlanAction.create({ data: { scheduleId: schedule.id, title: this.requiredText(action.title, 160, "Action title"), instruction: this.optionalText(action.instruction, 2000, "Action instruction"), sortOrder: action.sortOrder } });
          }
        }
      }
      await this.writeHistory(tx, plan.id, "CREATED", userId, actor.displayName, { status: "DRAFT" });
      return this.getPlan(plan.id, familyId, tx, true);
    });
  }

  async update(userId: string, familyId: string, id: string, input: UpdateHealthPlanDto) {
    const actor = await this.authorization.requireFamilyMember(userId, familyId);
    if (input.name === undefined && input.description === undefined && input.action === undefined) throw new BadRequestException("At least one editable field is required");
    return this.prisma.client.$transaction(async (tx) => {
      const plan = await this.getPlan(id, familyId, tx, false) as PlanState;
      if (plan.status === "COMPLETED" || plan.status === "ARCHIVED") throw new ConflictException("Completed and archived plans cannot be edited");
      if (input.name !== undefined || input.description !== undefined) await tx.healthPlan.update({ where: { id }, data: { ...(input.name !== undefined ? { name: this.requiredText(input.name, 120, "Plan name") } : {}), ...(input.description !== undefined ? { description: this.optionalText(input.description, 2000, "Plan description") } : {}) } });
      if (input.action) {
        const old = await tx.healthPlanAction.findFirst({ where: { id: input.action.id, retiredAt: null, schedule: { step: { healthPlanId: id } } } });
        if (!old) throw new NotFoundException("Action was not found");
        const occurrenceCount = await tx.healthPlanOccurrence.count({ where: { sourceActionId: old.id } });
        if (occurrenceCount === 0) {
          await tx.healthPlanAction.update({ where: { id: old.id }, data: { title: this.requiredText(input.action.title, 160, "Action title"), instruction: this.optionalText(input.action.instruction, 2000, "Action instruction") } });
        } else {
          const now = new Date();
          await tx.healthPlanAction.update({ where: { id: old.id }, data: { retiredAt: now } });
          await tx.healthPlanAction.create({ data: { scheduleId: old.scheduleId, sortOrder: old.sortOrder, title: this.requiredText(input.action.title, 160, "Action title"), instruction: this.optionalText(input.action.instruction, 2000, "Action instruction"), effectiveFrom: now } });
          // No generator exists yet: future unresolved snapshots are skipped, never rewritten or deleted.
          await tx.healthPlanOccurrence.updateMany({ where: { sourceActionId: old.id, scheduledAt: { gt: now }, status: { in: ["PENDING", "SNOOZED"] } }, data: { status: "SKIPPED", completedAt: null, completedByUserId: null } });
        }
      }
      await this.writeHistory(tx, id, "DEFINITION_UPDATED", userId, actor.displayName, { definitionEdited: true });
      return this.getPlan(id, familyId, tx, true);
    });
  }

  start(userId: string, familyId: string, id: string) { return this.transition(userId, familyId, id, "DRAFT", "STATUS_CHANGED", async (tx, plan, now) => {
    const level = await tx.healthPlanLevel.findFirst({ where: { healthPlanId: id, levelIndex: 0 } });
    const step = level && await tx.healthPlanStep.findFirst({ where: { healthPlanId: id, levelId: level.id, stepOrder: 0 } });
    if (!level || !step) throw new ConflictException("Plan has no valid base level and first step");
    return { status: "ACTIVE", activeLevelId: level.id, activeStepId: step.id, activeLevelStartedAt: now, activeStepStartedAt: now, generationNotBefore: now, pausedAt: null };
  }); }
  pause(userId: string, familyId: string, id: string) { return this.transition(userId, familyId, id, "ACTIVE", "PAUSED", async (tx, _plan, now) => {
    // Preserve audit rows, but remove future work from the active queue. Resume
    // generates a fresh rolling horizon against the shifted logical clocks.
    await tx.healthPlanOccurrence.updateMany({ where: { healthPlanId: id, scheduledAt: { gt: now }, status: { in: ["PENDING", "SNOOZED"] } }, data: { status: "SKIPPED", completedAt: null, completedByUserId: null } });
    return { status: "PAUSED", pausedAt: now };
  }); }
  resume(userId: string, familyId: string, id: string) { return this.transition(userId, familyId, id, "PAUSED", "RESUMED", async (_tx, plan, now) => {
    if (!plan.pausedAt || !plan.activeLevelStartedAt || !plan.activeStepStartedAt) throw new ConflictException("Paused plan has invalid progress timestamps");
    return { status: "ACTIVE", pausedAt: null, activeLevelStartedAt: resumeProgressStartedAt(plan.activeLevelStartedAt, plan.pausedAt, now), activeStepStartedAt: resumeProgressStartedAt(plan.activeStepStartedAt, plan.pausedAt, now), generationNotBefore: now };
  }); }
  levelUp(userId: string, familyId: string, id: string) { return this.moveLevel(userId, familyId, id, 1, "LEVEL_INCREASED"); }
  levelDown(userId: string, familyId: string, id: string) { return this.moveLevel(userId, familyId, id, -1, "LEVEL_DECREASED"); }
  complete(userId: string, familyId: string, id: string) { return this.transition(userId, familyId, id, ["ACTIVE", "PAUSED"], "STATUS_CHANGED", async (tx, plan, now) => {
    // Keep the progress pointers and generation boundary as terminal context, but
    // atomically remove unresolved work at or after the completion instant.
    await tx.healthPlanOccurrence.updateMany({ where: { healthPlanId: id, familyId, scheduledAt: { gte: now }, status: { in: ["PENDING", "SNOOZED"] } }, data: { status: "SKIPPED", completedAt: null, completedByUserId: null } });
    return { status: "COMPLETED", pausedAt: null, __metadata: { fromStatus: plan.status, toStatus: "COMPLETED" } };
  }); }
  // Internal progression primitive for the Run 3 scheduler. It is deliberately
  // not reachable from HTTP; the scheduler must decide that the duration elapsed.
  private advanceStep(userId: string, familyId: string, id: string) { return this.transition(userId, familyId, id, "ACTIVE", "STEP_ADVANCED", async (tx, plan, now) => {
    const current = await tx.healthPlanStep.findFirst({ where: { id: plan.activeStepId, healthPlanId: id } });
    if (!current?.autoAdvance || current.durationDays == null) throw new ConflictException("Current step cannot advance automatically");
    const next = await tx.healthPlanStep.findFirst({ where: { healthPlanId: id, levelId: current.levelId, stepOrder: current.stepOrder + 1 } });
    if (!next) throw new ConflictException("Current step is the last step in this level");
    return { activeStepId: next.id, activeStepStartedAt: now, generationNotBefore: now, __metadata: { fromStepId: current.id, toStepId: next.id } };
  }); }
  archive(userId: string, familyId: string, id: string) { return this.transition(userId, familyId, id, ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"], "STATUS_CHANGED", async () => ({ status: "ARCHIVED", pausedAt: null, __metadata: { toStatus: "ARCHIVED" } })); }

  private async moveLevel(userId: string, familyId: string, id: string, delta: 1 | -1, event: "LEVEL_INCREASED" | "LEVEL_DECREASED") {
    return this.transition(userId, familyId, id, "ACTIVE", event, async (tx, plan, now) => {
      const current = await tx.healthPlanLevel.findFirst({ where: { id: plan.activeLevelId, healthPlanId: id } });
      if (!current) throw new ConflictException("Plan has no current level");
      const next = await tx.healthPlanLevel.findFirst({ where: { healthPlanId: id, levelIndex: current.levelIndex + delta } });
      if (!next) throw new ConflictException(delta > 0 ? "Plan has no higher level" : "Plan is already at the base level");
      const firstStep = await tx.healthPlanStep.findFirst({ where: { healthPlanId: id, levelId: next.id, stepOrder: 0 } });
      if (!firstStep) throw new ConflictException("Target level has no first step");
      return { activeLevelId: next.id, activeStepId: firstStep.id, activeLevelStartedAt: now, activeStepStartedAt: now, generationNotBefore: now, __metadata: { fromLevelId: current.id, fromLevelIndex: current.levelIndex, toLevelId: next.id, toLevelIndex: next.levelIndex } };
    });
  }

  async addNote(userId: string, familyId: string, id: string, input: CreateHealthPlanNoteDto) {
    await this.authorization.requireFamilyMember(userId, familyId); const plan = await this.getPlan(id, familyId, this.prisma.client, false) as PlanState;
    if (plan.status === "COMPLETED" || plan.status === "ARCHIVED") throw new ConflictException("Completed and archived plans cannot receive notes");
    if (input.occurrenceId && input.sourceActionId) throw new BadRequestException("A note may have only one specific target");
    if (input.occurrenceId && !await this.prisma.client.healthPlanOccurrence.findFirst({ where: { id: input.occurrenceId, healthPlanId: id, familyId } })) throw new NotFoundException("Occurrence was not found");
    if (input.sourceActionId && !await this.prisma.client.healthPlanAction.findFirst({ where: { id: input.sourceActionId, schedule: { step: { healthPlanId: id } } } })) throw new NotFoundException("Action was not found");
    return this.prisma.client.healthPlanNote.create({ data: { healthPlanId: id, occurrenceId: input.occurrenceId, sourceActionId: input.sourceActionId, authorUserId: userId, text: this.requiredText(input.text, 4000, "Note") } });
  }
  async history(userId: string, familyId: string, id: string) { await this.authorization.requireFamilyMember(userId, familyId); await this.getPlan(id, familyId, this.prisma.client, false); return this.prisma.client.healthPlanHistory.findMany({ where: { healthPlanId: id }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] }); }
  async log(userId: string, familyId: string, id: string) {
    await this.authorization.requireFamilyMember(userId, familyId);
    await this.getPlan(id, familyId, this.prisma.client, false);
    const [history, notes] = await Promise.all([
      this.prisma.client.healthPlanHistory.findMany({ where: { healthPlanId: id }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 500 }),
      this.prisma.client.healthPlanNote.findMany({
        where: { healthPlanId: id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 500,
        include: {
          authorUser: { select: { displayName: true } },
          occurrence: { select: { scheduledAt: true, actionTitle: true, sourceAction: { select: { schedule: { select: { step: { select: { stepOrder: true, level: { select: { levelIndex: true } } } } } } } } } },
          sourceAction: { select: { title: true, schedule: { select: { localTime: true, step: { select: { stepOrder: true, level: { select: { levelIndex: true } } } } } } } },
        },
      }),
    ]);
    return { history, notes: notes.map(({ authorUser, occurrence, sourceAction, ...note }) => ({
      ...note,
      authorDisplayName: authorUser?.displayName || null,
      targetContext: occurrence ? { kind: "OCCURRENCE", actionTitle: occurrence.actionTitle, scheduledAt: occurrence.scheduledAt, levelIndex: occurrence.sourceAction.schedule.step.level.levelIndex, stepOrder: occurrence.sourceAction.schedule.step.stepOrder }
        : sourceAction ? { kind: "ACTION", actionTitle: sourceAction.title, localTime: sourceAction.schedule.localTime, levelIndex: sourceAction.schedule.step.level.levelIndex, stepOrder: sourceAction.schedule.step.stepOrder }
          : null,
    })) };
  }
  async occurrences(userId: string, familyId: string, id: string, query: ListHealthPlanOccurrencesQueryDto) {
    await this.authorization.requireFamilyMember(userId, familyId); await this.getPlan(id, familyId, this.prisma.client, false);
    const from = query.from ? this.date(query.from, "from") : undefined; const to = query.to ? this.date(query.to, "to") : undefined;
    if (from && to && from >= to) throw new BadRequestException("from must be before to");
    return this.prisma.client.healthPlanOccurrence.findMany({ where: { healthPlanId: id, familyId, scheduledAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } }, orderBy: [{ scheduledAt: "asc" }, { id: "asc" }], take: 1000 });
  }
  async occurrenceFeed(userId: string, familyId: string, query: ListHealthPlanOccurrencesQueryDto) {
    await this.authorization.requireFamilyMember(userId, familyId);
    const from = query.from ? this.date(query.from, "from") : undefined;
    const to = query.to ? this.date(query.to, "to") : undefined;
    if (from && to && from >= to) throw new BadRequestException("from must be before to");
    const parsedLimit = query.limit === undefined ? 100 : Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) throw new BadRequestException("limit must be an integer between 1 and 500");
    const occurrences = await this.prisma.client.healthPlanOccurrence.findMany({
      where: {
        familyId,
        // A work-surface feed contains unresolved work only while its plan is
        // active. Resolved rows remain visible as immutable history.
        OR: [
          { status: { in: ["COMPLETED", "SKIPPED"] } },
          { status: { in: ["PENDING", "SNOOZED"] }, healthPlan: { status: "ACTIVE" } },
        ],
        ...(query.healthPlanId ? { healthPlanId: query.healthPlanId } : {}),
        ...(query.familyMemberId ? { healthPlan: { familyMemberId: query.familyMemberId } } : {}),
        scheduledAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) },
      },
      orderBy: [{ scheduledAt: "asc" }, { sourceAction: { sortOrder: "asc" } }, { id: "asc" }],
      take: parsedLimit,
      include: {
        healthPlan: { select: { id: true, name: true, status: true, familyMember: { select: { id: true, displayName: true } } } },
        sourceAction: { select: { schedule: { select: { step: { select: { stepOrder: true, name: true, level: { select: { levelIndex: true, name: true } } } } } } } },
      },
    });
    return occurrences.map(({ sourceAction, ...occurrence }) => ({
      ...occurrence,
      occurrenceLevel: sourceAction?.schedule?.step?.level ?? null,
      occurrenceStep: sourceAction?.schedule?.step ? { stepOrder: sourceAction.schedule.step.stepOrder, name: sourceAction.schedule.step.name } : null,
    }));
  }
  async updateOccurrence(userId: string, familyId: string, id: string, occurrenceId: string, input: UpdateHealthPlanOccurrenceDto) {
    await this.authorization.requireFamilyMember(userId, familyId);
    return this.prisma.client.$transaction(async (tx) => {
      const plan = await this.getPlan(id, familyId, tx, false) as PlanState;
      if (plan.status === "COMPLETED" || plan.status === "ARCHIVED") throw new ConflictException("Completed and archived plans cannot receive notes or occurrence changes");
      const occurrence = await tx.healthPlanOccurrence.findFirst({ where: { id: occurrenceId, healthPlanId: id, familyId } });
      if (!occurrence) throw new NotFoundException("Occurrence was not found");
      if (!["PENDING", "SNOOZED"].includes(occurrence.status)) throw new ConflictException("Occurrence is already resolved");
      const data = input.status === "COMPLETED" ? { status: "COMPLETED", completedAt: new Date(), completedByUserId: userId } : input.status === "SKIPPED" ? { status: "SKIPPED", completedAt: null, completedByUserId: null } : { status: "SNOOZED", scheduledAt: this.futureDate(input.scheduledAt), completedAt: null, completedByUserId: null };
      const changed = await tx.healthPlanOccurrence.updateMany({ where: { id: occurrenceId, healthPlanId: id, familyId, status: occurrence.status, updatedAt: occurrence.updatedAt }, data });
      if (changed.count !== 1) throw new ConflictException("Occurrence changed concurrently; reload before retrying");
      if (input.note !== undefined) await tx.healthPlanNote.create({ data: { healthPlanId: id, occurrenceId, authorUserId: userId, text: this.requiredText(input.note, 4000, "Note") } });
      return tx.healthPlanOccurrence.findFirst({ where: { id: occurrenceId, healthPlanId: id, familyId } });
    });
  }

  private async transition(userId: string, familyId: string, id: string, allowed: PlanStatus | PlanStatus[], event: HistoryType, change: (tx: Client, plan: PlanState, now: Date) => Promise<Record<string, unknown>>) {
    const actor = await this.authorization.requireFamilyMember(userId, familyId);
    return this.prisma.client.$transaction(async (tx) => {
      const plan = await this.getPlan(id, familyId, tx, false) as PlanState; const statuses = Array.isArray(allowed) ? allowed : [allowed];
      if (!statuses.includes(plan.status)) throw new ConflictException(`Command is not valid while plan is ${plan.status}`);
      const now = new Date(); const data = await change(tx, plan, now); const metadata = data.__metadata ?? { fromStatus: plan.status, toStatus: data.status ?? plan.status }; delete data.__metadata;
      const changed = await tx.healthPlan.updateMany({ where: { id, familyId, status: plan.status, updatedAt: plan.updatedAt }, data });
      if (changed.count !== 1) throw new ConflictException("Plan changed concurrently; reload before retrying");
      await this.writeHistory(tx, id, event, userId, actor.displayName, metadata);
      return this.getPlan(id, familyId, tx, true);
    });
  }
  private writeHistory(tx: Client, healthPlanId: string, type: HistoryType, actorUserId: string, actorDisplayName: string, metadata: unknown) { return tx.healthPlanHistory.create({ data: { healthPlanId, type, actorUserId, actorDisplayName, metadata } }); }
  private async getPlan(id: string, familyId: string, client: Client, details: boolean) { const plan = await client.healthPlan.findFirst({ where: { id, familyId }, ...(details ? { include: { familyMember: true, activeLevel: { select: { id: true, levelIndex: true, name: true } }, activeStep: { select: { id: true, stepOrder: true, name: true } }, levels: { orderBy: { levelIndex: "asc" }, include: { steps: { orderBy: { stepOrder: "asc" }, include: { schedules: { where: { retiredAt: null }, include: { actions: { where: { retiredAt: null }, orderBy: { sortOrder: "asc" } } } } } } } }, notes: { orderBy: { createdAt: "asc" } } } } : {}) }); if (!plan) throw new NotFoundException("Health plan was not found"); return plan; }

  private validateDefinition(input: CreateHealthPlanDto) {
    if (!input || !Array.isArray(input.levels) || input.levels.length > LIMITS.levels) throw new BadRequestException(`A plan must have at most ${LIMITS.levels} levels`);
    for (const level of input.levels) {
      if (!Array.isArray(level.steps) || level.steps.length > LIMITS.steps) throw new BadRequestException(`A level must have at most ${LIMITS.steps} steps`);
      for (const step of level.steps) {
        if (!Array.isArray(step.schedules) || step.schedules.length > LIMITS.schedules) throw new BadRequestException(`A step must have at most ${LIMITS.schedules} schedules`);
        for (const schedule of step.schedules) {
          if (!Array.isArray(schedule.actions) || schedule.actions.length > LIMITS.actions) throw new BadRequestException(`A schedule must have at most ${LIMITS.actions} actions`);
          const orders = schedule.actions.map((action) => action.sortOrder); if (orders.some((order, index) => order !== index)) throw new BadRequestException("Action sort orders must be contiguous from 0");
          try { assertValidHealthPlanSchedule(schedule.recurrenceType === "WEEKDAYS" ? { recurrenceType: "WEEKDAYS", weekdays: schedule.weekdays ?? [] } : schedule.recurrenceType === "INTERVAL_DAYS" ? { recurrenceType: "INTERVAL_DAYS", intervalDays: schedule.intervalDays ?? 0, anchorDate: schedule.anchorDate ? this.date(schedule.anchorDate, "anchorDate") : new Date(NaN) } : { recurrenceType: "DAILY" }); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Invalid schedule"); }
          if (!["DAILY", "WEEKDAYS", "INTERVAL_DAYS"].includes(schedule.recurrenceType)) throw new BadRequestException("Invalid recurrence type");
          if (schedule.recurrenceType === "DAILY" && ((schedule.weekdays?.length ?? 0) > 0 || schedule.intervalDays != null || schedule.anchorDate != null)) throw new BadRequestException("Daily schedules cannot contain weekday or interval fields");
          if (schedule.recurrenceType === "WEEKDAYS" && (schedule.intervalDays != null || schedule.anchorDate != null)) throw new BadRequestException("Weekday schedules cannot contain interval fields");
          if (schedule.recurrenceType === "INTERVAL_DAYS" && (schedule.weekdays?.length ?? 0) > 0) throw new BadRequestException("Interval schedules cannot contain weekdays");
          this.localTime(schedule.localTime); this.timezone(schedule.timezone);
        }
      }
    }
    try { assertValidHealthPlanLevels(input.levels.map((level) => ({ levelIndex: level.levelIndex, steps: level.steps.map((step) => ({ stepOrder: step.stepOrder, durationDays: step.durationDays, autoAdvance: step.autoAdvance ?? false, schedules: step.schedules.map((schedule) => ({ actionCount: schedule.actions.length })) })) }))); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Invalid plan definition"); }
    return { name: this.requiredText(input.name, 120, "Plan name"), description: this.optionalText(input.description, 2000, "Plan description") };
  }
  private requiredText(value: unknown, max: number, label: string) { if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > max) throw new BadRequestException(`${label} must be between 1 and ${max} characters`); return value.trim(); }
  private optionalText(value: unknown, max: number, label: string): string | null { if (value == null || value === "") return null; if (typeof value !== "string" || value.trim().length > max) throw new BadRequestException(`${label} must be at most ${max} characters`); return value.trim() || null; }
  private date(value: string, label: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label} must be a valid ISO date`); return date; }
  private futureDate(value?: string) { if (!value) throw new BadRequestException("scheduledAt is required for snooze"); const date = this.date(value, "scheduledAt"); if (date <= new Date()) throw new BadRequestException("Snooze time must be in the future"); return date; }
  private localTime(value: unknown) { if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) throw new BadRequestException("localTime must be HH:mm or HH:mm:ss"); return new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}.000Z`); }
  private timezone(value?: string) { const timezone = value?.trim() || DEFAULT_HEALTH_PLAN_TIMEZONE; try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { throw new BadRequestException("timezone must be a valid IANA time zone"); } return timezone; }
}
