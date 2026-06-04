import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyAuthorizationService } from "../families";
import { PrismaService } from "../prisma";
import { CreateSchoolWeekReminderRequestDto, SchoolWeekMutationScopeDto, SchoolWeekReminderDto, SchoolWeekdayDto, UpdateSchoolWeekReminderRequestDto } from "./dto/school-week.dto";

type SchoolWeekReminderRecord = {
  id: string;
  familyId: string;
  childFamilyMemberId: string;
  title: string;
  icon: string;
  weekday: string;
  date: Date | null;
  isRecurring: boolean;
  recurrenceFrequency: string;
  recurrenceEndDate: Date | null;
  recurringSeriesId: string | null;
  exceptionOfId: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type SchoolWeekReminderUpdateData = {
  childFamilyMemberId?: string;
  title?: string;
  icon?: string;
  weekday?: SchoolWeekdayDto;
  date?: Date | null;
  isRecurring?: boolean;
  recurrenceFrequency?: "weekly";
  recurrenceEndDate?: Date | null;
  note?: string | null;
  deletedAt?: Date | null;
};

const weekdays: SchoolWeekdayDto[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const allowedIcons = new Set(["backpack", "book", "cake", "car", "gift", "grill", "passport", "shirt", "summer", "tooth"]);
const dayMs = 86400000;

@Injectable()
export class SchoolWeekService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async listWeek(userId: string, familyId: string, weekStartValue: unknown): Promise<SchoolWeekReminderDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const weekStart = this.validateWeekStart(weekStartValue);
    const weekEnd = this.addDays(weekStart, 6);

    const records = await (this.prisma.client as any).schoolWeekReminder.findMany({
      where: {
        familyId,
        OR: [
          { isRecurring: false, date: { gte: weekStart, lte: weekEnd } },
          { isRecurring: true, deletedAt: null, date: { lte: weekEnd }, OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: weekStart } }] },
          { exceptionOfId: { not: null }, date: { gte: weekStart, lte: weekEnd } }
        ]
      },
      orderBy: [{ weekday: "asc" }, { createdAt: "asc" }]
    }) as SchoolWeekReminderRecord[];

    const exceptionKeys = new Set(records.filter((record) => record.exceptionOfId && record.date).map((record) => `${record.exceptionOfId}:${this.toDateString(record.date!)}`));
    const visible: SchoolWeekReminderDto[] = [];

    for (const record of records) {
      if (record.exceptionOfId) {
        if (!record.deletedAt && record.date) visible.push(this.toDto(record, record.date));
        continue;
      }

      if (!record.isRecurring) {
        if (!record.deletedAt && record.date) visible.push(this.toDto(record, record.date));
        continue;
      }

      const occurrenceDate = this.dateForWeekday(weekStart, record.weekday as SchoolWeekdayDto);
      if (!record.date || occurrenceDate < this.startOfUtcDay(record.date)) continue;
      if (record.recurrenceEndDate && occurrenceDate > this.startOfUtcDay(record.recurrenceEndDate)) continue;
      if (exceptionKeys.has(`${record.id}:${this.toDateString(occurrenceDate)}`)) continue;
      visible.push(this.toDto(record, occurrenceDate));
    }

    return visible.sort((a, b) => weekdays.indexOf(a.weekday) - weekdays.indexOf(b.weekday) || a.title.localeCompare(b.title, "nb"));
  }

  async createReminder(userId: string, familyId: string, input: CreateSchoolWeekReminderRequestDto): Promise<SchoolWeekReminderDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const childFamilyMemberId = await this.validateChildFamilyMemberId(familyId, input.childFamilyMemberId ?? input.childId);
    const title = this.validateRequiredText(input.title, "Title", 120);
    const icon = this.validateIcon(input.icon ?? input.category);
    const weekday = this.validateWeekday(input.weekday);
    const date = this.validateDate(input.date, "Date");
    const isRecurring = this.validateBoolean(input.isRecurring ?? input.recurring, false);
    const recurrenceFrequency = this.validateRecurrenceFrequency(input.recurrenceFrequency);
    const recurrenceEndDate = this.validateOptionalDate(input.recurrenceEndDate, "Recurrence end date");
    const note = this.validateOptionalText(input.note, "Note", 500);

    if (this.weekdayForDate(date) !== weekday) throw new BadRequestException("Weekday must match date");
    if (recurrenceEndDate && recurrenceEndDate < date) throw new BadRequestException("Recurrence end date cannot be before date");

    const reminder = await (this.prisma.client as any).schoolWeekReminder.create({
      data: { familyId, childFamilyMemberId, title, icon, weekday, date, isRecurring, recurrenceFrequency, recurrenceEndDate: isRecurring ? recurrenceEndDate : null, note }
    }) as SchoolWeekReminderRecord;

    return this.toDto(reminder, date);
  }

  async updateReminder(userId: string, familyId: string, reminderId: string, input: UpdateSchoolWeekReminderRequestDto): Promise<SchoolWeekReminderDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const existing = await this.getFamilyReminderOrThrow(familyId, reminderId);
    const scope = this.validateScope(input.scope, existing.isRecurring ? "occurrence" : "series");
    const occurrenceDate = this.validateOptionalDate(input.occurrenceDate, "Occurrence date") ?? existing.date;
    const updateData = await this.buildUpdateData(familyId, input);

    if (Object.keys(updateData).length === 0) throw new BadRequestException("At least one school week field is required");

    if (existing.isRecurring && scope === "occurrence") {
      if (!occurrenceDate) throw new BadRequestException("Occurrence date is required");
      const exception = await this.upsertException(existing, occurrenceDate, updateData);
      return this.toDto(exception, occurrenceDate);
    }

    const updated = await (this.prisma.client as any).schoolWeekReminder.update({ where: { id: existing.id }, data: updateData }) as SchoolWeekReminderRecord;
    return this.toDto(updated, updated.date ?? occurrenceDate ?? new Date());
  }

  async deleteReminder(userId: string, familyId: string, reminderId: string, scopeValue: unknown, occurrenceDateValue: unknown): Promise<SchoolWeekReminderDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const existing = await this.getFamilyReminderOrThrow(familyId, reminderId);
    const scope = this.validateScope(scopeValue, existing.isRecurring ? "occurrence" : "series");
    const occurrenceDate = this.validateOptionalDate(occurrenceDateValue, "Occurrence date") ?? existing.date;

    if (existing.isRecurring && scope === "occurrence") {
      if (!occurrenceDate) throw new BadRequestException("Occurrence date is required");
      const tombstone = await this.upsertException(existing, occurrenceDate, { deletedAt: new Date() });
      return this.toDto(tombstone, occurrenceDate);
    }

    const deleted = await (this.prisma.client as any).schoolWeekReminder.update({ where: { id: existing.id }, data: { deletedAt: new Date() } }) as SchoolWeekReminderRecord;
    return this.toDto(deleted, deleted.date ?? occurrenceDate ?? new Date());
  }

  private async buildUpdateData(familyId: string, input: UpdateSchoolWeekReminderRequestDto): Promise<SchoolWeekReminderUpdateData> {
    const updateData: SchoolWeekReminderUpdateData = {};
    if (input.childFamilyMemberId !== undefined || (input as any).childId !== undefined) updateData.childFamilyMemberId = await this.validateChildFamilyMemberId(familyId, input.childFamilyMemberId ?? (input as any).childId);
    if (input.title !== undefined) updateData.title = this.validateRequiredText(input.title, "Title", 120);
    if (input.icon !== undefined || input.category !== undefined) updateData.icon = this.validateIcon(input.icon ?? input.category);
    if (input.weekday !== undefined) updateData.weekday = this.validateWeekday(input.weekday);
    if (input.date !== undefined) updateData.date = this.validateDate(input.date, "Date");
    if (input.isRecurring !== undefined || input.recurring !== undefined) updateData.isRecurring = this.validateBoolean(input.isRecurring ?? input.recurring, false);
    if (input.recurrenceFrequency !== undefined) updateData.recurrenceFrequency = this.validateRecurrenceFrequency(input.recurrenceFrequency);
    if (input.recurrenceEndDate !== undefined) updateData.recurrenceEndDate = this.validateOptionalDate(input.recurrenceEndDate, "Recurrence end date");
    if (input.note !== undefined) updateData.note = this.validateOptionalText(input.note, "Note", 500);
    if (updateData.date && updateData.weekday && this.weekdayForDate(updateData.date) !== updateData.weekday) throw new BadRequestException("Weekday must match date");
    return updateData;
  }

  private async upsertException(existing: SchoolWeekReminderRecord, occurrenceDate: Date, updateData: SchoolWeekReminderUpdateData): Promise<SchoolWeekReminderRecord> {
    const date = this.startOfUtcDay(occurrenceDate);
    const prior = await (this.prisma.client as any).schoolWeekReminder.findFirst({ where: { familyId: existing.familyId, exceptionOfId: existing.id, date } }) as SchoolWeekReminderRecord | null;
    const data = {
      familyId: existing.familyId,
      childFamilyMemberId: updateData.childFamilyMemberId ?? existing.childFamilyMemberId,
      title: updateData.title ?? existing.title,
      icon: updateData.icon ?? existing.icon,
      weekday: updateData.weekday ?? existing.weekday,
      date: updateData.date ?? date,
      isRecurring: false,
      recurrenceFrequency: "weekly",
      recurrenceEndDate: null,
      recurringSeriesId: existing.recurringSeriesId ?? existing.id,
      exceptionOfId: existing.id,
      note: updateData.note !== undefined ? updateData.note : existing.note,
      deletedAt: updateData.deletedAt ?? null
    };
    if (prior) return (await (this.prisma.client as any).schoolWeekReminder.update({ where: { id: prior.id }, data })) as SchoolWeekReminderRecord;
    return (await (this.prisma.client as any).schoolWeekReminder.create({ data })) as SchoolWeekReminderRecord;
  }

  private async getFamilyReminderOrThrow(familyId: string, reminderId: string): Promise<SchoolWeekReminderRecord> {
    const reminder = await (this.prisma.client as any).schoolWeekReminder.findFirst({ where: { id: reminderId, familyId } }) as SchoolWeekReminderRecord | null;
    if (!reminder || reminder.deletedAt) throw new NotFoundException("School week reminder was not found");
    return reminder;
  }

  private async validateChildFamilyMemberId(familyId: string, value: unknown): Promise<string> {
    if (typeof value !== "string" || !value.trim()) throw new BadRequestException("Child family member id is required");
    const member = await this.prisma.client.familyMember.findFirst({ where: { id: value.trim(), familyId, role: "CHILD" } });
    if (!member) throw new BadRequestException("Child family member was not found");
    return value.trim();
  }

  private validateWeekStart(value: unknown): Date {
    const date = this.validateDate(value, "Week start");
    if (date.getUTCDay() !== 1) throw new BadRequestException("Week start must be a Monday");
    return date;
  }

  private validateDate(value: unknown, label: string): Date {
    if (typeof value !== "string") throw new BadRequestException(`${label} is required`);
    const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
    if (Number.isNaN(dateValue.getTime())) throw new BadRequestException(`${label} is invalid`);
    return this.startOfUtcDay(dateValue);
  }

  private validateOptionalDate(value: unknown, label: string): Date | null {
    if (value === undefined || value === null || value === "") return null;
    return this.validateDate(value, label);
  }

  private validateWeekday(value: unknown): SchoolWeekdayDto {
    if (typeof value !== "string" || !weekdays.includes(value as SchoolWeekdayDto)) throw new BadRequestException("Weekday is invalid");
    return value as SchoolWeekdayDto;
  }

  private validateRecurrenceFrequency(value: unknown): "weekly" {
    if (value === undefined || value === null || value === "") return "weekly";
    if (value !== "weekly") throw new BadRequestException("Only weekly recurrence is supported");
    return "weekly";
  }

  private validateScope(value: unknown, fallback: SchoolWeekMutationScopeDto): SchoolWeekMutationScopeDto {
    if (value === undefined || value === null || value === "") return fallback;
    if (value !== "occurrence" && value !== "series") throw new BadRequestException("Scope must be occurrence or series");
    return value;
  }

  private validateBoolean(value: unknown, fallback: boolean): boolean {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value !== "boolean") throw new BadRequestException("Recurring must be true or false");
    return value;
  }

  private validateIcon(value: unknown): string {
    if (value === undefined || value === null || value === "") return "backpack";
    if (typeof value !== "string" || !allowedIcons.has(value)) throw new BadRequestException("Icon is not supported");
    return value;
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

  private dateForWeekday(weekStart: Date, weekday: SchoolWeekdayDto): Date {
    return this.addDays(weekStart, weekdays.indexOf(weekday));
  }

  private weekdayForDate(date: Date): SchoolWeekdayDto {
    const weekday = weekdays[date.getUTCDay() - 1];
    if (!weekday) throw new BadRequestException("Date must be a school weekday");
    return weekday;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(this.startOfUtcDay(date).getTime() + days * dayMs);
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private toDateString(date: Date): string {
    return this.startOfUtcDay(date).toISOString().slice(0, 10);
  }

  private toDto(reminder: SchoolWeekReminderRecord, occurrenceDate: Date): SchoolWeekReminderDto {
    return {
      id: reminder.id,
      familyId: reminder.familyId,
      childFamilyMemberId: reminder.childFamilyMemberId,
      title: reminder.title,
      icon: reminder.icon,
      category: reminder.icon,
      weekday: reminder.weekday as SchoolWeekdayDto,
      date: reminder.date ? this.toDateString(reminder.date) : null,
      occurrenceDate: this.toDateString(occurrenceDate),
      isRecurring: reminder.isRecurring,
      recurrenceFrequency: "weekly",
      recurrenceEndDate: reminder.recurrenceEndDate ? this.toDateString(reminder.recurrenceEndDate) : null,
      recurringSeriesId: reminder.recurringSeriesId,
      exceptionOfId: reminder.exceptionOfId,
      note: reminder.note,
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
      deletedAt: reminder.deletedAt?.toISOString() ?? null
    };
  }
}
