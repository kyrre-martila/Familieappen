import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
import { CreateListItemRequestDto, CreateListRequestDto, ListDto, ListItemDto, UpdateListItemRequestDto, UpdateListRequestDto } from "./dto/list.dto";
import { CreateReminderRequestDto, ReminderDto, UpdateReminderRequestDto } from "./dto/reminder.dto";

type FamilyMemberRecord = {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
  role: "OWNER" | "PARENT" | "CHILD" | "GUEST";
  createdAt: Date;
  updatedAt: Date;
};

type ReminderAudienceMemberRecord = {
  id: string;
  reminderId: string;
  familyMemberId: string;
  createdAt: Date;
  familyMember: FamilyMemberRecord;
};

type ReminderRecord = {
  id: string;
  familyId: string;
  title: string;
  icon: string;
  dueDate: Date | null;
  reminderMinutesBefore: number | null;
  note: string | null;
  sourceType: string | null;
  sourceId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  audienceMembers: ReminderAudienceMemberRecord[];
};

type ListAudienceMemberRecord = {
  id: string;
  listId: string;
  familyMemberId: string;
  createdAt: Date;
  familyMember: FamilyMemberRecord;
};

type ListItemRecord = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  completedAt: Date | null;
  assignedFamilyMemberId: string | null;
  dueDate: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type ListRecord = {
  id: string;
  familyId: string;
  title: string;
  icon: string;
  description: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  audienceMembers: ListAudienceMemberRecord[];
  items: ListItemRecord[];
};

type ReminderUpdateData = {
  title?: string;
  icon?: string;
  dueDate?: Date | null;
  reminderMinutesBefore?: number | null;
  note?: string | null;
  archivedAt?: Date | null;
};

type ListUpdateData = {
  title?: string;
  icon?: string;
  description?: string | null;
  archivedAt?: Date | null;
};

type ListItemUpdateData = {
  title?: string;
  description?: string | null;
  completedAt?: Date | null;
  assignedFamilyMemberId?: string | null;
  dueDate?: Date | null;
  sortOrder?: number;
};

const allowedReminderIcons = new Set(["backpack", "book", "cake", "car", "gift", "grill", "passport", "shirt", "summer", "tooth"]);
const allowedListIcons = new Set(["birthday", "home", "summer", "celebration"]);

@Injectable()
export class HuskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async listReminders(userId: string, familyId: string): Promise<ReminderDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);

    const reminders = await this.prisma.client.reminder.findMany({
      where: { familyId, archivedAt: null },
      include: this.reminderInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
    });

    return reminders.map((reminder) => this.toReminderDto(reminder));
  }

  async createReminder(userId: string, familyId: string, input: CreateReminderRequestDto): Promise<ReminderDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const title = this.validateRequiredText(input.title, "Title", 120);
    const icon = this.validateOptionalReminderIcon(input.icon);
    const dueDate = input.dueDate === undefined || input.dueDate === null || input.dueDate === "" ? null : this.validateDate(input.dueDate, "Due date");
    const reminderMinutesBefore = this.validateOptionalReminderMinutes(input.reminderMinutesBefore);
    const note = this.validateOptionalText(input.note, "Note", 500);
    const sourceType = this.validateOptionalText(input.sourceType, "Source type", 40);
    const sourceId = this.validateOptionalText(input.sourceId, "Source id", 120);
    const memberIds = await this.validateAudienceMemberIds(familyId, input.scope, input.memberIds);

    try {
      const reminder = await this.prisma.client.reminder.create({
        data: {
          familyId,
          title,
          icon,
          dueDate,
          reminderMinutesBefore,
          note,
          sourceType,
          sourceId,
          createdByUserId: userId,
          audienceMembers: {
            create: memberIds.map((familyMemberId) => ({ familyMemberId }))
          }
        },
        include: this.reminderInclude
      });

      return this.toReminderDto(reminder);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Ligger allerede i Husk");
      }

      throw error;
    }

  }

  async updateReminder(userId: string, familyId: string, reminderId: string, input: UpdateReminderRequestDto): Promise<ReminderDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const existingReminder = await this.getFamilyReminderOrThrow(familyId, reminderId);
    const updateData: ReminderUpdateData = {};

    if (input.title !== undefined) updateData.title = this.validateRequiredText(input.title, "Title", 120);
    if (input.icon !== undefined) updateData.icon = this.validateOptionalReminderIcon(input.icon);
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate === null || input.dueDate === "" ? null : this.validateDate(input.dueDate, "Due date");
    if (input.reminderMinutesBefore !== undefined) updateData.reminderMinutesBefore = this.validateOptionalReminderMinutes(input.reminderMinutesBefore);
    if (input.note !== undefined) updateData.note = this.validateOptionalText(input.note, "Note", 500);
    if (input.archivedAt !== undefined) updateData.archivedAt = this.validateOptionalDateTime(input.archivedAt, "Archived at");

    const shouldUpdateAudience = input.scope !== undefined || input.memberIds !== undefined;
    const memberIds = shouldUpdateAudience ? await this.validateAudienceMemberIds(familyId, input.scope, input.memberIds) : [];

    if (Object.keys(updateData).length === 0 && !shouldUpdateAudience) {
      throw new BadRequestException("At least one reminder field is required");
    }

    await this.prisma.client.reminder.update({ where: { id: existingReminder.id }, data: updateData });

    if (shouldUpdateAudience) {
      await this.prisma.client.reminderAudienceMember.deleteMany({ where: { reminderId: existingReminder.id } });
      await Promise.all(memberIds.map((familyMemberId) => this.prisma.client.reminderAudienceMember.create({ data: { reminderId: existingReminder.id, familyMemberId } })));
    }

    return this.toReminderDto(await this.getFamilyReminderOrThrow(familyId, existingReminder.id));
  }

  async deleteReminder(userId: string, familyId: string, reminderId: string): Promise<ReminderDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const reminder = await this.getFamilyReminderOrThrow(familyId, reminderId);
    return this.toReminderDto(await this.prisma.client.reminder.delete({ where: { id: reminder.id }, include: this.reminderInclude }));
  }

  async listLists(userId: string, familyId: string): Promise<ListDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);

    const lists = await (this.prisma.client as any).list.findMany({
      where: { familyId },
      include: this.listInclude,
      orderBy: [{ archivedAt: "asc" }, { updatedAt: "desc" }]
    });

    return lists.map((list: ListRecord) => this.toListDto(list));
  }

  async createList(userId: string, familyId: string, input: CreateListRequestDto): Promise<ListDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const title = this.validateRequiredText(input.title, "Title", 120);
    const icon = this.validateOptionalListIcon(input.icon ?? input.category);
    const description = this.validateOptionalText(input.description, "Description", 1000);
    const memberIds = await this.validateAudienceMemberIds(familyId, input.scope, input.memberIds);

    const list = await (this.prisma.client as any).list.create({
      data: {
        familyId,
        title,
        icon,
        description,
        audienceMembers: { create: memberIds.map((familyMemberId) => ({ familyMemberId })) }
      },
      include: this.listInclude
    });

    return this.toListDto(list);
  }

  async updateList(userId: string, familyId: string, listId: string, input: UpdateListRequestDto): Promise<ListDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const existingList = await this.getFamilyListOrThrow(familyId, listId);
    const updateData: ListUpdateData = {};

    if (input.title !== undefined) updateData.title = this.validateRequiredText(input.title, "Title", 120);
    if (input.icon !== undefined || input.category !== undefined) updateData.icon = this.validateOptionalListIcon(input.icon ?? input.category);
    if (input.description !== undefined) updateData.description = this.validateOptionalText(input.description, "Description", 1000);
    if (input.archivedAt !== undefined) updateData.archivedAt = this.validateOptionalDateTime(input.archivedAt, "Archived at");

    const shouldUpdateAudience = input.scope !== undefined || input.memberIds !== undefined;
    const memberIds = shouldUpdateAudience ? await this.validateAudienceMemberIds(familyId, input.scope, input.memberIds) : [];

    if (Object.keys(updateData).length === 0 && !shouldUpdateAudience) {
      throw new BadRequestException("At least one list field is required");
    }

    await (this.prisma.client as any).list.update({ where: { id: existingList.id }, data: updateData });

    if (shouldUpdateAudience) {
      await (this.prisma.client as any).listAudienceMember.deleteMany({ where: { listId: existingList.id } });
      await Promise.all(memberIds.map((familyMemberId) => (this.prisma.client as any).listAudienceMember.create({ data: { listId: existingList.id, familyMemberId } })));
    }

    return this.toListDto(await this.getFamilyListOrThrow(familyId, existingList.id));
  }

  async deleteList(userId: string, familyId: string, listId: string): Promise<ListDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const list = await this.getFamilyListOrThrow(familyId, listId);
    return this.toListDto(await (this.prisma.client as any).list.delete({ where: { id: list.id }, include: this.listInclude }));
  }

  async createListItem(userId: string, familyId: string, listId: string, input: CreateListItemRequestDto): Promise<ListItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const list = await this.getFamilyListOrThrow(familyId, listId);
    const title = this.validateRequiredText(input.title, "Title", 160);
    const description = this.validateOptionalText(input.description, "Description", 1000);
    const assignedFamilyMemberId = await this.validateOptionalFamilyMemberId(familyId, input.assignedFamilyMemberId ?? this.firstAssignedMemberId(input.assignedMemberIds));
    const dueDate = input.dueDate === undefined || input.dueDate === null || input.dueDate === "" ? null : this.validateDate(input.dueDate, "Due date");
    const sortOrder = input.sortOrder === undefined ? await this.getNextSortOrder(list.id) : this.validateSortOrder(input.sortOrder);

    return this.toListItemDto(await (this.prisma.client as any).listItem.create({
      data: { listId: list.id, title, description, assignedFamilyMemberId, dueDate, sortOrder }
    }));
  }

  async updateListItem(userId: string, familyId: string, listId: string, itemId: string, input: UpdateListItemRequestDto): Promise<ListItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const item = await this.getFamilyListItemOrThrow(familyId, listId, itemId);
    const updateData: ListItemUpdateData = {};

    if (input.title !== undefined) updateData.title = this.validateRequiredText(input.title, "Title", 160);
    if (input.description !== undefined) updateData.description = this.validateOptionalText(input.description, "Description", 1000);
    if (input.completedAt !== undefined) updateData.completedAt = this.validateOptionalDateTime(input.completedAt, "Completed at");
    if (input.assignedFamilyMemberId !== undefined || input.assignedMemberIds !== undefined) {
      updateData.assignedFamilyMemberId = await this.validateOptionalFamilyMemberId(familyId, input.assignedFamilyMemberId ?? this.firstAssignedMemberId(input.assignedMemberIds));
    }
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate === null || input.dueDate === "" ? null : this.validateDate(input.dueDate, "Due date");
    if (input.sortOrder !== undefined) updateData.sortOrder = this.validateSortOrder(input.sortOrder);

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException("At least one list item field is required");
    }

    return this.toListItemDto(await (this.prisma.client as any).listItem.update({ where: { id: item.id }, data: updateData }));
  }

  async deleteListItem(userId: string, familyId: string, listId: string, itemId: string): Promise<ListItemDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const item = await this.getFamilyListItemOrThrow(familyId, listId, itemId);
    return this.toListItemDto(await (this.prisma.client as any).listItem.delete({ where: { id: item.id } }));
  }

  async completeListItem(userId: string, familyId: string, listId: string, itemId: string): Promise<ListItemDto> {
    return this.updateListItem(userId, familyId, listId, itemId, { completedAt: new Date().toISOString() });
  }

  async uncompleteListItem(userId: string, familyId: string, listId: string, itemId: string): Promise<ListItemDto> {
    return this.updateListItem(userId, familyId, listId, itemId, { completedAt: null });
  }

  private readonly reminderInclude = {
    audienceMembers: {
      include: { familyMember: true },
      orderBy: { createdAt: "asc" as const }
    }
  };

  private readonly listInclude = {
    audienceMembers: {
      include: { familyMember: true },
      orderBy: { createdAt: "asc" as const }
    },
    items: {
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }]
    }
  };

  private async getFamilyReminderOrThrow(familyId: string, reminderId: string): Promise<ReminderRecord> {
    const reminder = await this.prisma.client.reminder.findFirst({ where: { id: reminderId, familyId }, include: this.reminderInclude });
    if (!reminder) throw new NotFoundException("Reminder was not found");
    return reminder;
  }

  private async getFamilyListOrThrow(familyId: string, listId: string): Promise<ListRecord> {
    const list = await (this.prisma.client as any).list.findFirst({ where: { id: listId, familyId }, include: this.listInclude });
    if (!list) throw new NotFoundException("List was not found");
    return list;
  }

  private async getFamilyListItemOrThrow(familyId: string, listId: string, itemId: string): Promise<ListItemRecord> {
    await this.getFamilyListOrThrow(familyId, listId);
    const item = await (this.prisma.client as any).listItem.findFirst({ where: { id: itemId, listId } });
    if (!item) throw new NotFoundException("List item was not found");
    return item;
  }

  private async validateAudienceMemberIds(familyId: string, scopeValue: unknown, memberIdsValue: unknown): Promise<string[]> {
    const scope = scopeValue === undefined ? (Array.isArray(memberIdsValue) && memberIdsValue.length > 0 ? "members" : "family") : scopeValue;
    if (scope !== "family" && scope !== "members") throw new BadRequestException("Scope must be family or members");
    if (scope === "family") return [];
    if (!Array.isArray(memberIdsValue) || memberIdsValue.length === 0) throw new BadRequestException("At least one family member is required");

    const memberIds = Array.from(new Set(memberIdsValue.map((memberId) => {
      if (typeof memberId !== "string" || memberId.trim().length === 0) throw new BadRequestException("Family member ids must be strings");
      return memberId.trim();
    })));

    const members = await this.prisma.client.familyMember.findMany({ where: { familyId, id: { in: memberIds } } });
    if (members.length !== memberIds.length) throw new BadRequestException("One or more selected family members were not found");
    return memberIds;
  }

  private async validateOptionalFamilyMemberId(familyId: string, value: unknown): Promise<string | null> {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") throw new BadRequestException("Assigned family member id must be a string");
    const memberId = value.trim();
    if (!memberId) return null;
    const member = await this.prisma.client.familyMember.findFirst({ where: { id: memberId, familyId } });
    if (!member) throw new BadRequestException("Assigned family member was not found");
    return memberId;
  }

  private firstAssignedMemberId(value: unknown): unknown {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    return value[0];
  }

  private validateRequiredText(value: unknown, label: string, maxLength: number): string {
    if (typeof value !== "string") throw new BadRequestException(`${label} is required`);
    const trimmedValue = value.trim();
    if (!trimmedValue) throw new BadRequestException(`${label} is required`);
    if (trimmedValue.length > maxLength) throw new BadRequestException(`${label} is too long`);
    return trimmedValue;
  }

  private validateOptionalText(value: unknown, label: string, maxLength: number): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") throw new BadRequestException(`${label} must be text`);
    const trimmedValue = value.trim();
    if (trimmedValue.length > maxLength) throw new BadRequestException(`${label} is too long`);
    return trimmedValue || null;
  }

  private validateOptionalReminderIcon(value: unknown): string {
    if (value === undefined || value === null || value === "") return "backpack";
    if (typeof value !== "string" || !allowedReminderIcons.has(value)) throw new BadRequestException("Icon is not supported");
    return value;
  }

  private validateOptionalListIcon(value: unknown): string {
    if (value === undefined || value === null || value === "") return "home";
    if (typeof value !== "string" || !allowedListIcons.has(value)) throw new BadRequestException("Icon is not supported");
    return value;
  }

  private validateDate(value: unknown, label: string): Date {
    if (typeof value !== "string") throw new BadRequestException(`${label} is required`);
    const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
    if (Number.isNaN(dateValue.getTime())) throw new BadRequestException(`${label} is invalid`);
    return dateValue;
  }

  private validateOptionalDateTime(value: unknown, label: string): Date | null {
    if (value === null) return null;
    if (typeof value !== "string") throw new BadRequestException(`${label} must be a date`);
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) throw new BadRequestException(`${label} is invalid`);
    return dateValue;
  }

  private validateOptionalReminderMinutes(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10080) throw new BadRequestException("Reminder setting is invalid");
    return value;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
  }

  private validateSortOrder(value: unknown): number {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100000) throw new BadRequestException("Sort order is invalid");
    return value;
  }

  private async getNextSortOrder(listId: string): Promise<number> {
    const aggregate = await (this.prisma.client as any).listItem.aggregate({ where: { listId }, _max: { sortOrder: true } });
    return (aggregate._max.sortOrder ?? -1) + 1;
  }

  private toReminderDto(reminder: ReminderRecord): ReminderDto {
    const memberIds = reminder.audienceMembers.map((audienceMember) => audienceMember.familyMemberId);
    return {
      id: reminder.id,
      familyId: reminder.familyId,
      title: reminder.title,
      icon: reminder.icon,
      dueDate: reminder.dueDate?.toISOString() ?? null,
      date: reminder.dueDate?.toISOString().slice(0, 10) ?? null,
      reminderMinutesBefore: reminder.reminderMinutesBefore,
      reminder: reminder.reminderMinutesBefore === null ? null : { minutesBefore: reminder.reminderMinutesBefore, label: this.getReminderLabel(reminder.reminderMinutesBefore) },
      note: reminder.note,
      scope: memberIds.length === 0 ? "family" : "members",
      memberIds,
      sourceType: reminder.sourceType,
      sourceId: reminder.sourceId,
      createdByUserId: reminder.createdByUserId,
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
      archivedAt: reminder.archivedAt?.toISOString() ?? null,
      audienceMembers: reminder.audienceMembers.map((audienceMember) => ({
        id: audienceMember.id,
        reminderId: audienceMember.reminderId,
        familyMemberId: audienceMember.familyMemberId,
        createdAt: audienceMember.createdAt.toISOString(),
        familyMember: this.toFamilyMemberDto(audienceMember.familyMember)
      }))
    };
  }

  private toListDto(list: ListRecord): ListDto {
    const memberIds = list.audienceMembers.map((audienceMember) => audienceMember.familyMemberId);
    const completedCount = list.items.filter((item) => item.completedAt !== null).length;
    return {
      id: list.id,
      familyId: list.familyId,
      title: list.title,
      icon: list.icon,
      category: list.icon,
      description: list.description,
      archivedAt: list.archivedAt?.toISOString() ?? null,
      archived: list.archivedAt !== null,
      scope: memberIds.length === 0 ? "family" : "members",
      memberIds,
      completedCount,
      totalCount: list.items.length,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
      audienceMembers: list.audienceMembers.map((audienceMember) => ({
        id: audienceMember.id,
        listId: audienceMember.listId,
        familyMemberId: audienceMember.familyMemberId,
        createdAt: audienceMember.createdAt.toISOString(),
        familyMember: this.toFamilyMemberDto(audienceMember.familyMember)
      })),
      items: list.items.map((item) => this.toListItemDto(item))
    };
  }

  private toListItemDto(item: ListItemRecord): ListItemDto {
    return {
      id: item.id,
      listId: item.listId,
      title: item.title,
      description: item.description,
      completedAt: item.completedAt?.toISOString() ?? null,
      completed: item.completedAt !== null,
      assignedFamilyMemberId: item.assignedFamilyMemberId,
      dueDate: item.dueDate?.toISOString() ?? null,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private toFamilyMemberDto(familyMember: FamilyMemberRecord) {
    return {
      id: familyMember.id,
      userId: familyMember.userId,
      familyId: familyMember.familyId,
      displayName: familyMember.displayName,
      role: familyMember.role,
      createdAt: familyMember.createdAt.toISOString(),
      updatedAt: familyMember.updatedAt.toISOString()
    };
  }

  private getReminderLabel(minutesBefore: number): string {
    if (minutesBefore === 0) return "På dagen";
    if (minutesBefore === 1440) return "Dagen før";
    return `${minutesBefore} min før`;
  }
}
