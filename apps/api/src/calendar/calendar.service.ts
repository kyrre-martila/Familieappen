import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyMemberRoleDto } from "../families/dto/family.dto";
import { FamilyAuthorizationService } from "../families/family-authorization.service";
import { PrismaService } from "../prisma";
import {
  CalendarEventDto,
  CreateCalendarEventRequestDto,
  ListCalendarEventsQueryDto,
  UpdateCalendarEventRequestDto,
  CalendarEventRecurrenceFrequencyDto
} from "./dto/calendar.dto";

type FamilyMemberRecord = {
  id: string;
  userId: string | null;
  familyId: string;
  displayName: string;
  role: FamilyMemberRoleDto;
  createdAt: Date;
  updatedAt: Date;
};

type CalendarEventParticipantRecord = {
  id: string;
  eventId: string;
  familyMemberId: string;
  createdAt: Date;
  familyMember: FamilyMemberRecord;
};

type CalendarEventRecurrenceFrequency = CalendarEventRecurrenceFrequencyDto;

type CalendarEventRecord = {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  location: string | null;
  icon: string;
  reminderMinutesBefore: number | null;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  recurrenceFrequency: CalendarEventRecurrenceFrequency;
  source: string;
  icsSourceId: string | null;
  externalUid: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: CalendarEventParticipantRecord[];
};

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async listEvents(userId: string, familyId: string, query: ListCalendarEventsQueryDto = {}): Promise<CalendarEventDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const { from, to } = this.validateDateRange(query.from, query.to);

    const events = await (this.prisma.client as any).calendarEvent.findMany({
      where: {
        familyId,
        startsAt: { lte: to },
        OR: [{ endsAt: { gte: from } }, { endsAt: null, startsAt: { gte: from } }],
        AND: [{ OR: [{ icsSourceId: null }, { icsSource: { active: true } }] }]
      },
      include: this.eventInclude,
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }]
    });

    return events.map((event: CalendarEventRecord) => this.toCalendarEventDto(event));
  }

  async createEvent(
    userId: string,
    familyId: string,
    input: CreateCalendarEventRequestDto = {}
  ): Promise<CalendarEventDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const title = this.validateTitle(input.title);
    const description = this.validateOptionalText(input.description, "Description", 500);
    const location = this.validateOptionalText(input.location, "Location", 160);
    const icon = this.validateOptionalIcon(input.icon);
    const reminderMinutesBefore = this.validateOptionalReminderMinutes(input.reminderMinutesBefore);
    const allDay = this.validateOptionalBoolean(input.allDay);
    const startsAt = this.validateDateTime(input.startsAt, "Start time");
    const endsAt = this.normalizeEndsAt(startsAt, this.validateOptionalDateTime(input.endsAt, "End time"), allDay);
    const recurrenceFrequency = this.validateOptionalRecurrenceFrequency(input.recurrenceFrequency);
    const participantFamilyMemberIds = await this.validateParticipantFamilyMemberIds(
      familyId,
      input.participantFamilyMemberIds
    );

    this.validateEventWindow(startsAt, endsAt);

    const event = await this.prisma.client.calendarEvent.create({
      data: {
        familyId,
        title,
        description,
        location,
        icon,
        reminderMinutesBefore,
        startsAt,
        endsAt,
        allDay,
        recurrenceFrequency,
        createdByUserId: userId,
        participants: {
          create: participantFamilyMemberIds.map((familyMemberId) => ({ familyMemberId }))
        }
      },
      include: this.eventInclude
    });

    return this.toCalendarEventDto(event);
  }

  async updateEvent(
    userId: string,
    familyId: string,
    eventId: string,
    input: UpdateCalendarEventRequestDto = {}
  ): Promise<CalendarEventDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const existingEvent = await this.getFamilyEventOrThrow(familyId, eventId);
    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) {
      updateData.title = this.validateTitle(input.title);
    }

    if (input.description !== undefined) {
      updateData.description = this.validateOptionalText(input.description, "Description", 500);
    }

    if (input.location !== undefined) {
      updateData.location = this.validateOptionalText(input.location, "Location", 160);
    }

    if (input.icon !== undefined) {
      updateData.icon = this.validateOptionalIcon(input.icon);
    }

    if (input.reminderMinutesBefore !== undefined) {
      updateData.reminderMinutesBefore = this.validateOptionalReminderMinutes(input.reminderMinutesBefore);
    }

    if (input.recurrenceFrequency !== undefined) {
      updateData.recurrenceFrequency = this.validateOptionalRecurrenceFrequency(input.recurrenceFrequency);
    }

    if (input.startsAt !== undefined) {
      updateData.startsAt = this.validateDateTime(input.startsAt, "Start time");
    }

    if (input.endsAt !== undefined) {
      updateData.endsAt = this.validateOptionalDateTime(input.endsAt, "End time");
    }

    if (input.allDay !== undefined) {
      updateData.allDay = this.validateOptionalBoolean(input.allDay);
    }

    const shouldUpdateParticipants = input.participantFamilyMemberIds !== undefined;
    const participantFamilyMemberIds = shouldUpdateParticipants
      ? await this.validateParticipantFamilyMemberIds(familyId, input.participantFamilyMemberIds)
      : [];

    if (Object.keys(updateData).length === 0 && !shouldUpdateParticipants) {
      throw new BadRequestException("At least one calendar event field is required");
    }

    const nextStartsAt = (updateData.startsAt as Date | undefined) ?? existingEvent.startsAt;
    const nextAllDay = (updateData.allDay as boolean | undefined) ?? existingEvent.allDay;
    const nextEndsAt = this.normalizeEndsAt(
      nextStartsAt,
      updateData.endsAt === undefined ? existingEvent.endsAt : (updateData.endsAt as Date | null),
      nextAllDay
    );
    updateData.endsAt = nextEndsAt;
    this.validateEventWindow(nextStartsAt, nextEndsAt);

    const updatedEvent = await this.prisma.client.calendarEvent.update({
      where: { id: existingEvent.id },
      data: updateData,
      include: this.eventInclude
    });

    if (shouldUpdateParticipants) {
      await this.prisma.client.calendarEventParticipant.deleteMany({ where: { eventId: existingEvent.id } });

      await Promise.all(
        participantFamilyMemberIds.map((familyMemberId) =>
          this.prisma.client.calendarEventParticipant.create({ data: { eventId: existingEvent.id, familyMemberId } })
        )
      );

      const eventWithParticipants = await this.prisma.client.calendarEvent.findUnique({
        where: { id: existingEvent.id },
        include: this.eventInclude
      });

      if (!eventWithParticipants) {
        throw new NotFoundException("Calendar event was not found");
      }

      return this.toCalendarEventDto(eventWithParticipants);
    }

    return this.toCalendarEventDto(updatedEvent);
  }

  async deleteEvent(userId: string, familyId: string, eventId: string): Promise<CalendarEventDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const event = await this.getFamilyEventOrThrow(familyId, eventId);

    const deletedEvent = await this.prisma.client.calendarEvent.delete({
      where: { id: event.id },
      include: this.eventInclude
    });

    return this.toCalendarEventDto(deletedEvent);
  }

  private readonly eventInclude = {
    participants: {
      include: {
        familyMember: true
      },
      orderBy: { createdAt: "asc" }
    }
  };

  private async getFamilyEventOrThrow(familyId: string, eventId: string): Promise<CalendarEventRecord> {
    const event = await this.prisma.client.calendarEvent.findFirst({
      where: {
        id: eventId,
        familyId
      },
      include: this.eventInclude
    });

    if (!event) {
      throw new NotFoundException("Calendar event was not found");
    }

    return event;
  }

  private validateDateRange(fromValue: unknown, toValue: unknown): { from: Date; to: Date } {
    const now = new Date();
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const defaultTo = new Date(defaultFrom);
    defaultTo.setUTCDate(defaultTo.getUTCDate() + 30);

    const from = fromValue === undefined ? defaultFrom : this.validateDateTime(fromValue, "From date");
    const to = toValue === undefined ? defaultTo : this.validateDateTime(toValue, "To date");

    if (to < from) {
      throw new BadRequestException("To date must be after from date");
    }

    return { from, to };
  }

  private validateTitle(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Calendar event title is required");
    }

    const title = value.trim();

    if (title.length < 1 || title.length > 120) {
      throw new BadRequestException("Calendar event title must be between 1 and 120 characters");
    }

    return title;
  }

  private validateOptionalText(value: unknown, fieldName: string, maxLength: number): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${fieldName} must be text`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
      throw new BadRequestException(`${fieldName} must be ${maxLength} characters or fewer`);
    }

    return text.length === 0 ? null : text;
  }

  private validateOptionalIcon(value: unknown): string {
    if (value === undefined || value === null || value === "") {
      return "family";
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Icon must be text");
    }

    const icon = value.trim();
    const allowedIcons = new Set(["sport", "school", "birthday", "health", "travel", "family", "meal"]);

    if (!allowedIcons.has(icon)) {
      throw new BadRequestException("Icon must be a valid calendar category");
    }

    return icon;
  }

  private validateOptionalReminderMinutes(value: unknown): number | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new BadRequestException("Reminder must be a whole number of minutes");
    }

    const allowedReminders = new Set([15, 60, 1440]);

    if (!allowedReminders.has(value)) {
      throw new BadRequestException("Reminder must be none, 15 minutes, 1 hour, or 1 day before");
    }

    return value;
  }

  private validateDateTime(value: unknown, fieldName: string): Date {
    if (typeof value !== "string") {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }

  private validateOptionalDateTime(value: unknown, fieldName: string): Date | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    return this.validateDateTime(value, fieldName);
  }

  private validateOptionalBoolean(value: unknown): boolean {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value !== "boolean") {
      throw new BadRequestException("All-day must be true or false");
    }

    return value;
  }

  private validateOptionalRecurrenceFrequency(value: unknown): CalendarEventRecurrenceFrequency {
    if (value === undefined || value === null || value === "") {
      return "never";
    }

    if (typeof value !== "string") {
      throw new BadRequestException("Recurrence must be a valid frequency");
    }

    const allowedFrequencies = new Set(["never", "daily", "weekly", "monthly", "yearly"]);

    if (!allowedFrequencies.has(value)) {
      throw new BadRequestException("Recurrence must be never, daily, weekly, monthly, or yearly");
    }

    return value as CalendarEventRecurrenceFrequency;
  }

  private normalizeEndsAt(startsAt: Date, endsAt: Date | null, allDay: boolean): Date {
    if (endsAt) {
      return endsAt;
    }

    if (allDay) {
      return startsAt;
    }

    return new Date(startsAt.getTime() + 60 * 60 * 1000);
  }

  private validateEventWindow(startsAt: Date, endsAt: Date | null): void {
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException("End time must be after start time");
    }
  }

  private async validateParticipantFamilyMemberIds(familyId: string, value: unknown): Promise<string[]> {
    if (value === undefined || value === null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException("Participants must be a list of family members");
    }

    const ids = [...new Set(value)];

    if (!ids.every((id) => typeof id === "string" && id.trim().length > 0)) {
      throw new BadRequestException("Participants must be valid family members");
    }

    const members = await this.prisma.client.familyMember.findMany({
      where: {
        familyId,
        id: { in: ids }
      },
      select: { id: true }
    });

    if (members.length !== ids.length) {
      throw new BadRequestException("Participants must belong to this family");
    }

    return ids as string[];
  }

  private toCalendarEventDto(event: CalendarEventRecord): CalendarEventDto {
    return {
      id: event.id,
      familyId: event.familyId,
      title: event.title,
      description: event.description,
      location: event.location,
      icon: event.icon,
      reminderMinutesBefore: event.reminderMinutesBefore,
      date: formatDate(event.startsAt),
      endDate: event.endsAt ? formatDate(event.endsAt) : null,
      startTime: event.allDay ? null : formatTime(event.startsAt),
      endTime: event.allDay || !event.endsAt ? null : formatTime(event.endsAt),
      reminder: event.reminderMinutesBefore === null ? null : {
        minutesBefore: event.reminderMinutesBefore,
        label: formatReminderLabel(event.reminderMinutesBefore)
      },
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      allDay: event.allDay,
      recurrenceFrequency: event.recurrenceFrequency,
      recurrence: event.recurrenceFrequency === "never" ? null : { frequency: event.recurrenceFrequency },
      source: event.source,
      icsSourceId: event.icsSourceId,
      externalUid: event.externalUid,
      createdByUserId: event.createdByUserId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      participants: event.participants.map((participant) => ({
        id: participant.id,
        eventId: participant.eventId,
        familyMemberId: participant.familyMemberId,
        createdAt: participant.createdAt.toISOString(),
        familyMember: {
          id: participant.familyMember.id,
          userId: participant.familyMember.userId,
          familyId: participant.familyMember.familyId,
          displayName: participant.familyMember.displayName,
          avatarUrl: null,
          role: participant.familyMember.role,
          createdAt: participant.familyMember.createdAt.toISOString(),
          updatedAt: participant.familyMember.updatedAt.toISOString()
        }
      }))
    };
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

function formatReminderLabel(minutes: number): string {
  if (minutes === 0) {
    return "Ved start";
  }

  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? "1 dag før" : `${days} dager før`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 time før" : `${hours} timer før`;
  }

  return `${minutes} min før`;
}
