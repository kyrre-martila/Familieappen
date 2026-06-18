import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
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

    return this.toTaskDto(updatedTask);
  }

  async deleteTask(userId: string, familyId: string, taskId: string): Promise<TaskDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const task = await this.getFamilyTaskOrThrow(familyId, taskId);

    const deletedTask = await this.prisma.client.task.delete({
      where: { id: task.id }
    });

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
