import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
import { NotificationsService } from "../notifications";
import { PrismaService } from "../prisma";
import { CreateTaskRequestDto, TaskDto, UpdateTaskRequestDto } from "./dto/task.dto";

type TaskRecord = {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  assignedFamilyMemberId: string | null;
  assignedMemberIds: string[];
  createdByUserId: string | null;
  completed: boolean;
  completedAt: Date | null;
  completedByUserId: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService,
    private readonly notificationsService: NotificationsService
  ) {}

  async listTasks(userId: string, familyId: string): Promise<TaskDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);

    const tasks = await this.prisma.client.task.findMany({
      where: { familyId },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }]
    });

    return tasks.map((task: TaskRecord) => this.toTaskDto(task));
  }

  async createTask(userId: string, familyId: string, input: CreateTaskRequestDto = {}): Promise<TaskDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const title = this.validateTitle(input.title);
    const description = this.validateDescription(input.description);
    const assignedMemberIds = await this.validateAssignedFamilyMembers(familyId, input.assignedMemberIds ?? input.assignedFamilyMemberId);
    const assignedFamilyMemberId = assignedMemberIds[0] ?? null;
    const dueDate = this.validateDueDate(input.dueDate);

    const task = await this.prisma.client.task.create({
      data: {
        familyId,
        title,
        description,
        assignedFamilyMemberId,
        assignedMemberIds,
        createdByUserId: userId,
        dueDate
      }
    });

    this.notifyTaskCreated(userId, task);
    return this.toTaskDto(task);
  }

  async toggleTask(userId: string, familyId: string, taskId: string): Promise<TaskDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const task = await this.getFamilyTaskOrThrow(familyId, taskId);
    const nextCompleted = !task.completed;

    const updatedTask = await this.prisma.client.task.update({
      where: { id: task.id },
      data: {
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
        completedByUserId: nextCompleted ? userId : null
      }
    });

    if (nextCompleted) this.notifyTaskCompleted(userId, updatedTask);
    return this.toTaskDto(updatedTask);
  }

  async updateTask(userId: string, familyId: string, taskId: string, input: UpdateTaskRequestDto = {}): Promise<TaskDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const task = await this.getFamilyTaskOrThrow(familyId, taskId);
    const title = input.title !== undefined ? this.validateTitle(input.title) : undefined;
    const description = input.description !== undefined ? this.validateDescription(input.description) : undefined;
    const shouldUpdateAssignees = input.assignedMemberIds !== undefined || input.assignedFamilyMemberId !== undefined;
    const assignedMemberIds = shouldUpdateAssignees ? await this.validateAssignedFamilyMembers(familyId, input.assignedMemberIds ?? input.assignedFamilyMemberId) : undefined;
    const assignedFamilyMemberId = assignedMemberIds ? assignedMemberIds[0] ?? null : undefined;
    const dueDate = input.dueDate !== undefined ? this.validateDueDate(input.dueDate) : undefined;

    if (title === undefined && description === undefined && assignedFamilyMemberId === undefined && dueDate === undefined) {
      throw new BadRequestException("At least one task field is required");
    }

    const updatedTask = await this.prisma.client.task.update({
      where: { id: task.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(assignedFamilyMemberId !== undefined && assignedMemberIds !== undefined ? { assignedFamilyMemberId, assignedMemberIds } : {}),
        ...(dueDate !== undefined ? { dueDate } : {})
      }
    });

    this.notifyTask(userId, updatedTask, "task_updated");
    if (shouldUpdateAssignees && assignedMemberIds && !this.sameStringSet(task.assignedMemberIds, assignedMemberIds)) {
      this.notifyTaskCreated(userId, updatedTask);
    }
    return this.toTaskDto(updatedTask);
  }

  private notifyTaskCreated(userId: string, task: TaskRecord): void {
    void this.notifyTask(userId, task, "task_created");
  }

  private notifyTaskCompleted(userId: string, task: TaskRecord): void {
    void this.notifyTask(userId, task, "task_completed");
  }

  private async notifyTask(userId: string, task: TaskRecord, type: "task_created" | "task_completed" | "task_updated" | "task_deleted"): Promise<void> {
    try {
      const actorName = await this.notificationsService.getUserDisplayName(userId);
      let recipientUserIds: string[] | undefined;
      if ((type === "task_created" || type === "task_updated") && task.assignedMemberIds.length > 0) {
        recipientUserIds = await this.notificationsService.getUserIdsForFamilyMemberIds(task.familyId, task.assignedMemberIds);
      } else if (type === "task_completed") {
        const assigneeUsers = await this.notificationsService.getUserIdsForFamilyMemberIds(task.familyId, task.assignedMemberIds);
        recipientUserIds = [...new Set([...assigneeUsers, ...(task.createdByUserId ? [task.createdByUserId] : [])])];
      }
      await this.notificationsService.createNotificationForFamilyMembers({
        familyId: task.familyId,
        actorUserId: userId,
        recipientUserIds,
        type,
        title: type === "task_created" ? "Ny oppgave" : type === "task_completed" ? "Oppgave fullført" : type === "task_deleted" ? "Oppgave slettet" : "Oppgave oppdatert",
        body: `${actorName} ${type === "task_created" ? "la til" : type === "task_completed" ? "fullførte" : type === "task_deleted" ? "slettet" : "oppdaterte"} ${task.title}`,
        entityType: "task",
        entityId: task.id,
        deepLink: `/tasks`,
        ...(type === "task_created" ? {} : { cooldownMinutes: 30 })
      });
    } catch (error) {
      this.logger.warn(`Failed to create task notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteTask(userId: string, familyId: string, taskId: string): Promise<TaskDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const task = await this.getFamilyTaskOrThrow(familyId, taskId);

    const deletedTask = await this.prisma.client.task.delete({
      where: { id: task.id }
    });

    this.notifyTask(userId, deletedTask, "task_deleted");
    return this.toTaskDto(deletedTask);
  }

  async getDashboardTasks(userId: string, familyId: string): Promise<TaskDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);

    const tasks = await this.prisma.client.task.findMany({
      where: { familyId },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
      take: 5
    });

    return tasks.map((task: TaskRecord) => this.toTaskDto(task));
  }

  private async getFamilyTaskOrThrow(familyId: string, taskId: string): Promise<TaskRecord> {
    const task = await this.prisma.client.task.findFirst({
      where: {
        id: taskId,
        familyId
      }
    });

    if (!task) {
      throw new NotFoundException("Task was not found");
    }

    return task;
  }

  private sameStringSet(first: string[], second: string[]): boolean {
    if (first.length !== second.length) return false;
    const secondSet = new Set(second);
    return first.every((value) => secondSet.has(value));
  }

  private validateTitle(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Task title is required");
    }

    const title = value.trim();

    if (title.length < 1 || title.length > 120) {
      throw new BadRequestException("Task title must be between 1 and 120 characters");
    }

    return title;
  }

  private validateDescription(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Task description must be text");
    }

    const description = value.trim();

    if (description.length > 500) {
      throw new BadRequestException("Task description must be 500 characters or fewer");
    }

    return description.length === 0 ? null : description;
  }

  private async validateAssignedFamilyMembers(familyId: string, value: unknown): Promise<string[]> {
    if (value === undefined || value === null || value === "") {
      return [];
    }

    const rawMemberIds = Array.isArray(value) ? value : [value];

    if (!rawMemberIds.every((memberId): memberId is string => typeof memberId === "string" && memberId.length > 0)) {
      throw new BadRequestException("Assigned family members must be valid family members");
    }

    const memberIds = [...new Set(rawMemberIds)];

    if (memberIds.length === 0) {
      return [];
    }

    const members = await this.prisma.client.familyMember.findMany({
      where: {
        id: { in: memberIds },
        familyId
      },
      select: { id: true }
    });

    if (members.length !== memberIds.length) {
      throw new BadRequestException("Assigned family members must belong to this family");
    }

    const validIds = new Set(members.map((member) => member.id));
    return memberIds.filter((memberId) => validIds.has(memberId));
  }

  private validateDueDate(value: unknown): Date | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Due date must be a valid date");
    }

    const dueDate = new Date(value);

    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException("Due date must be a valid date");
    }

    return dueDate;
  }

  private toTaskDto(task: TaskRecord): TaskDto {
    return {
      id: task.id,
      familyId: task.familyId,
      title: task.title,
      description: task.description,
      assignedFamilyMemberId: task.assignedFamilyMemberId,
      assignedMemberIds: task.assignedMemberIds?.length ? task.assignedMemberIds : (task.assignedFamilyMemberId ? [task.assignedFamilyMemberId] : []),
      createdByUserId: task.createdByUserId,
      completed: task.completed,
      completedAt: task.completedAt?.toISOString() ?? null,
      completedByUserId: task.completedByUserId,
      dueDate: task.dueDate?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    };
  }
}
