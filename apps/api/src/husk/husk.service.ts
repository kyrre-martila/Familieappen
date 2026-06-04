import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
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
  dueDate: Date;
  reminderMinutesBefore: number | null;
  note: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  audienceMembers: ReminderAudienceMemberRecord[];
};

type ReminderUpdateData = {
  title?: string;
  icon?: string;
  dueDate?: Date;
  reminderMinutesBefore?: number | null;
  note?: string | null;
  archivedAt?: Date | null;
};

const allowedIcons = new Set(["backpack", "book", "cake", "car", "gift", "grill", "passport", "shirt", "summer", "tooth"]);

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
    const icon = this.validateOptionalIcon(input.icon);
    const dueDate = this.validateDate(input.dueDate, "Due date");
    const reminderMinutesBefore = this.validateOptionalReminderMinutes(input.reminderMinutesBefore);
    const note = this.validateOptionalText(input.note, "Note", 500);
    const memberIds = await this.validateAudienceMemberIds(familyId, input.scope, input.memberIds);

    const reminder = await this.prisma.client.reminder.create({
      data: {
        familyId,
        title,
        icon,
        dueDate,
        reminderMinutesBefore,
        note,
        createdByUserId: userId,
        audienceMembers: {
          create: memberIds.map((familyMemberId) => ({ familyMemberId }))
        }
      },
      include: this.reminderInclude
    });

    return this.toReminderDto(reminder);
  }

  async updateReminder(userId: string, familyId: string, reminderId: string, input: UpdateReminderRequestDto): Promise<ReminderDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const existingReminder = await this.getFamilyReminderOrThrow(familyId, reminderId);
    const updateData: ReminderUpdateData = {};

    if (input.title !== undefined) {
      updateData.title = this.validateRequiredText(input.title, "Title", 120);
    }

    if (input.icon !== undefined) {
      updateData.icon = this.validateOptionalIcon(input.icon);
    }

    if (input.dueDate !== undefined) {
      updateData.dueDate = this.validateDate(input.dueDate, "Due date");
    }

    if (input.reminderMinutesBefore !== undefined) {
      updateData.reminderMinutesBefore = this.validateOptionalReminderMinutes(input.reminderMinutesBefore);
    }

    if (input.note !== undefined) {
      updateData.note = this.validateOptionalText(input.note, "Note", 500);
    }

    if (input.archivedAt !== undefined) {
      updateData.archivedAt = this.validateOptionalDateTime(input.archivedAt, "Archived at");
    }

    const shouldUpdateAudience = input.scope !== undefined || input.memberIds !== undefined;
    const memberIds = shouldUpdateAudience ? await this.validateAudienceMemberIds(familyId, input.scope, input.memberIds) : [];

    if (Object.keys(updateData).length === 0 && !shouldUpdateAudience) {
      throw new BadRequestException("At least one reminder field is required");
    }

    await this.prisma.client.reminder.update({
      where: { id: existingReminder.id },
      data: updateData
    });

    if (shouldUpdateAudience) {
      await this.prisma.client.reminderAudienceMember.deleteMany({ where: { reminderId: existingReminder.id } });
      await Promise.all(
        memberIds.map((familyMemberId) =>
          this.prisma.client.reminderAudienceMember.create({ data: { reminderId: existingReminder.id, familyMemberId } })
        )
      );
    }

    const reminder = await this.prisma.client.reminder.findUnique({
      where: { id: existingReminder.id },
      include: this.reminderInclude
    });

    if (!reminder) {
      throw new NotFoundException("Reminder was not found");
    }

    return this.toReminderDto(reminder);
  }

  async deleteReminder(userId: string, familyId: string, reminderId: string): Promise<ReminderDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const reminder = await this.getFamilyReminderOrThrow(familyId, reminderId);

    const deletedReminder = await this.prisma.client.reminder.delete({
      where: { id: reminder.id },
      include: this.reminderInclude
    });

    return this.toReminderDto(deletedReminder);
  }

  private readonly reminderInclude = {
    audienceMembers: {
      include: {
        familyMember: true
      },
      orderBy: { createdAt: "asc" }
    }
  };

  private async getFamilyReminderOrThrow(familyId: string, reminderId: string): Promise<ReminderRecord> {
    const reminder = await this.prisma.client.reminder.findFirst({
      where: { id: reminderId, familyId },
      include: this.reminderInclude
    });

    if (!reminder) {
      throw new NotFoundException("Reminder was not found");
    }

    return reminder;
  }

  private async validateAudienceMemberIds(familyId: string, scopeValue: unknown, memberIdsValue: unknown): Promise<string[]> {
    const scope = scopeValue === undefined ? (Array.isArray(memberIdsValue) && memberIdsValue.length > 0 ? "members" : "family") : scopeValue;

    if (scope !== "family" && scope !== "members") {
      throw new BadRequestException("Scope must be family or members");
    }

    if (scope === "family") {
      return [];
    }

    if (!Array.isArray(memberIdsValue) || memberIdsValue.length === 0) {
      throw new BadRequestException("At least one family member is required");
    }

    const memberIds = Array.from(new Set(memberIdsValue.map((memberId) => {
      if (typeof memberId !== "string" || memberId.trim().length === 0) {
        throw new BadRequestException("Family member ids must be strings");
      }

      return memberId.trim();
    })));

    const members = await this.prisma.client.familyMember.findMany({
      where: { familyId, id: { in: memberIds } }
    });

    if (members.length !== memberIds.length) {
      throw new BadRequestException("One or more selected family members were not found");
    }

    return memberIds;
  }

  private validateRequiredText(value: unknown, label: string, maxLength: number): string {
    if (typeof value !== "string") {
      throw new BadRequestException(`${label} is required`);
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      throw new BadRequestException(`${label} is required`);
    }

    if (trimmedValue.length > maxLength) {
      throw new BadRequestException(`${label} is too long`);
    }

    return trimmedValue;
  }

  private validateOptionalText(value: unknown, label: string, maxLength: number): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${label} must be text`);
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length > maxLength) {
      throw new BadRequestException(`${label} is too long`);
    }

    return trimmedValue || null;
  }

  private validateOptionalIcon(value: unknown): string {
    if (value === undefined || value === null || value === "") {
      return "backpack";
    }

    if (typeof value !== "string" || !allowedIcons.has(value)) {
      throw new BadRequestException("Icon is not supported");
    }

    return value;
  }

  private validateDate(value: unknown, label: string): Date {
    if (typeof value !== "string") {
      throw new BadRequestException(`${label} is required`);
    }

    const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      throw new BadRequestException(`${label} is invalid`);
    }

    return dateValue;
  }

  private validateOptionalDateTime(value: unknown, label: string): Date | null {
    if (value === null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${label} must be a date`);
    }

    const dateValue = new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      throw new BadRequestException(`${label} is invalid`);
    }

    return dateValue;
  }

  private validateOptionalReminderMinutes(value: unknown): number | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10080) {
      throw new BadRequestException("Reminder setting is invalid");
    }

    return value;
  }

  private toReminderDto(reminder: ReminderRecord): ReminderDto {
    const memberIds = reminder.audienceMembers.map((audienceMember) => audienceMember.familyMemberId);

    return {
      id: reminder.id,
      familyId: reminder.familyId,
      title: reminder.title,
      icon: reminder.icon,
      dueDate: reminder.dueDate.toISOString(),
      date: reminder.dueDate.toISOString().slice(0, 10),
      reminderMinutesBefore: reminder.reminderMinutesBefore,
      reminder: reminder.reminderMinutesBefore === null ? null : {
        minutesBefore: reminder.reminderMinutesBefore,
        label: this.getReminderLabel(reminder.reminderMinutesBefore)
      },
      note: reminder.note,
      scope: memberIds.length === 0 ? "family" : "members",
      memberIds,
      createdByUserId: reminder.createdByUserId,
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
      archivedAt: reminder.archivedAt?.toISOString() ?? null,
      audienceMembers: reminder.audienceMembers.map((audienceMember) => ({
        id: audienceMember.id,
        reminderId: audienceMember.reminderId,
        familyMemberId: audienceMember.familyMemberId,
        createdAt: audienceMember.createdAt.toISOString(),
        familyMember: {
          id: audienceMember.familyMember.id,
          userId: audienceMember.familyMember.userId,
          familyId: audienceMember.familyMember.familyId,
          displayName: audienceMember.familyMember.displayName,
          role: audienceMember.familyMember.role,
          createdAt: audienceMember.familyMember.createdAt.toISOString(),
          updatedAt: audienceMember.familyMember.updatedAt.toISOString()
        }
      }))
    };
  }

  private getReminderLabel(minutesBefore: number): string {
    if (minutesBefore === 0) {
      return "På dagen";
    }

    if (minutesBefore === 1440) {
      return "Dagen før";
    }

    return `${minutesBefore} min før`;
  }
}
