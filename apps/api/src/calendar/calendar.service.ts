import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { FamilyMemberRoleDto } from "../families/dto/family.dto";
import { FamilyAuthorizationService } from "../families/family-authorization.service";
import { NotificationsService } from "../notifications";
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
  includeInSchoolWeek: boolean;
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
  recurrenceUntil: Date | null;
  source: string;
  icsSourceId: string | null;
  externalUid: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: CalendarEventParticipantRecord[];
};

type CalendarEventOccurrence = CalendarEventRecord & {
  recurringEventId?: string;
  occurrenceDate?: string;
  isRecurringOccurrence?: boolean;
};

type CalendarEventExceptionRecord = {
  id: string; recurringEventId: string; occurrenceDate: Date; isDeleted: boolean;
  overrideStartsAt: Date | null; overrideEndsAt: Date | null; overrideTitle: string | null;
  overrideDescription: string | null; overrideLocation: string | null; overrideIcon: string | null;
  overrideReminderMinutesBefore: number | null; overrideAllDay: boolean | null;
  overrideParticipantsSet: boolean; overrideParticipantFamilyMemberIds: string[]; createdAt: Date; updatedAt: Date;
};

const MAX_RECURRENCE_OCCURRENCES = 300;

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService,
    private readonly notificationsService: NotificationsService
  ) {}

  async listEvents(userId: string, familyId: string, query: ListCalendarEventsQueryDto = {}): Promise<CalendarEventDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const { from, to } = this.validateDateRange(query.from, query.to);

    const events = await (this.prisma.client as any).calendarEvent.findMany({
      where: {
        familyId,
        startsAt: { lte: to },
        OR: [
          { recurrenceFrequency: { not: "never" }, source: "manual", icsSourceId: null },
          { endsAt: { gte: from } },
          { endsAt: null, startsAt: { gte: from } }
        ],
        AND: [{ OR: [{ icsSourceId: null }, { icsSource: { active: true } }] }]
      },
      include: this.eventIncludeWithExceptions,
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }]
    });

    return events
      .flatMap((event: CalendarEventRecord) => this.expandEventForRange(event, from, to))
      .sort((first: CalendarEventOccurrence, second: CalendarEventOccurrence) =>
        first.startsAt.getTime() - second.startsAt.getTime() || first.createdAt.getTime() - second.createdAt.getTime()
      )
      .map((event: CalendarEventOccurrence) => this.toCalendarEventDto(event));
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
    const recurrenceUntil = this.validateRecurrenceUntil(input.recurrenceUntil, startsAt, recurrenceFrequency);
    this.validateRecurrenceOccurrenceLimit(startsAt, recurrenceFrequency, recurrenceUntil);
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
        recurrenceUntil,
        createdByUserId: userId,
        participants: {
          create: participantFamilyMemberIds.map((familyMemberId) => ({ familyMemberId }))
        }
      },
      include: this.eventIncludeWithExceptions
    });

    await this.notifyCalendarEvent(userId, event, "calendar_event_created");
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

    if (input.recurrenceUntil !== undefined) {
      updateData.recurrenceUntil = this.validateOptionalDateTime(input.recurrenceUntil, "Recurrence end date");
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
    const nextFrequency = (updateData.recurrenceFrequency as CalendarEventRecurrenceFrequency | undefined) ?? existingEvent.recurrenceFrequency;
    const nextUntil = updateData.recurrenceUntil === undefined ? existingEvent.recurrenceUntil : (updateData.recurrenceUntil as Date | null);
    updateData.recurrenceUntil = this.validateRecurrenceUntil(nextUntil?.toISOString() ?? null, nextStartsAt, nextFrequency);
    this.validateRecurrenceOccurrenceLimit(nextStartsAt, nextFrequency, updateData.recurrenceUntil as Date | null);

    const updatedEvent = await this.prisma.client.calendarEvent.update({
      where: { id: existingEvent.id },
      data: updateData,
      include: this.eventIncludeWithExceptions
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
        include: this.eventIncludeWithExceptions
      });

      if (!eventWithParticipants) {
        throw new NotFoundException("Calendar event was not found");
      }

      await this.notifyCalendarEvent(userId, eventWithParticipants, "calendar_event_updated");
      return this.toCalendarEventDto(eventWithParticipants);
    }

    await this.notifyCalendarEvent(userId, updatedEvent, "calendar_event_updated");
    return this.toCalendarEventDto(updatedEvent);
  }

  async deleteEvent(userId: string, familyId: string, eventId: string): Promise<CalendarEventDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const event = await this.getFamilyEventOrThrow(familyId, eventId);

    const deletedEvent = await this.prisma.client.calendarEvent.delete({
      where: { id: event.id },
      include: this.eventInclude
    });

    await this.notifyCalendarEvent(userId, deletedEvent, "calendar_event_deleted");
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

  private readonly eventIncludeWithExceptions = {
    ...this.eventInclude,
    recurrenceExceptions: true
  };

  private async getFamilyEventOrThrow(familyId: string, eventId: string): Promise<CalendarEventRecord> {
    const event = await this.prisma.client.calendarEvent.findFirst({
      where: {
        id: eventId,
        familyId
      },
      include: this.eventIncludeWithExceptions
    });

    if (!event) {
      throw new NotFoundException("Calendar event was not found");
    }

    return event;
  }

  async updateOccurrence(userId: string, familyId: string, eventId: string, occurrenceDateValue: string, input: UpdateCalendarEventRequestDto = {}): Promise<CalendarEventDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const event = await this.getFamilyEventOrThrow(familyId, eventId);
    const occurrenceDate = this.validateOccurrenceDate(event, occurrenceDateValue);
    const data: Record<string, unknown> = { isDeleted: false };
    if (input.title !== undefined) data.overrideTitle = this.validateTitle(input.title);
    if (input.description !== undefined) data.overrideDescription = this.validateOptionalText(input.description, "Description", 500);
    if (input.location !== undefined) data.overrideLocation = this.validateOptionalText(input.location, "Location", 160);
    if (input.icon !== undefined) data.overrideIcon = this.validateOptionalIcon(input.icon);
    if (input.reminderMinutesBefore !== undefined) data.overrideReminderMinutesBefore = this.validateOptionalReminderMinutes(input.reminderMinutesBefore);
    if (input.allDay !== undefined) data.overrideAllDay = this.validateOptionalBoolean(input.allDay);
    if (input.startsAt !== undefined) data.overrideStartsAt = this.validateDateTime(input.startsAt, "Start time");
    if (input.endsAt !== undefined) data.overrideEndsAt = this.validateOptionalDateTime(input.endsAt, "End time");
    if (input.participantFamilyMemberIds !== undefined) {
      data.overrideParticipantsSet = true;
      data.overrideParticipantFamilyMemberIds = await this.validateParticipantFamilyMemberIds(familyId, input.participantFamilyMemberIds);
    }
    const nextStartsAt = (data.overrideStartsAt as Date | undefined) ?? event.startsAt;
    const nextAllDay = (data.overrideAllDay as boolean | undefined) ?? event.allDay;
    const nextEndsAt = this.normalizeEndsAt(
      nextStartsAt,
      data.overrideEndsAt === undefined ? event.endsAt : (data.overrideEndsAt as Date | null),
      nextAllDay
    );
    data.overrideEndsAt = nextEndsAt;
    this.validateEventWindow(nextStartsAt, nextEndsAt);

    await (this.prisma.client as any).calendarEventException.upsert({
      where: { recurringEventId_occurrenceDate: { recurringEventId: event.id, occurrenceDate } },
      create: { recurringEventId: event.id, occurrenceDate, ...data },
      update: data
    });
    const refreshed = await this.getFamilyEventOrThrow(familyId, event.id);
    const occurrence = this.expandEventForRange(refreshed, occurrenceDate, occurrenceDate)[0];
    if (!occurrence) throw new NotFoundException("Calendar occurrence was not found");
    await this.notifyCalendarEvent(userId, occurrence, "calendar_event_updated");
    return this.toCalendarEventDto(occurrence);
  }

  private async notifyCalendarEvent(
    userId: string,
    event: CalendarEventOccurrence,
    type: "calendar_event_created" | "calendar_event_updated" | "calendar_event_deleted"
  ): Promise<void> {
    if (event.source !== "manual" || event.icsSourceId !== null) return;

    try {
      const actorName = await this.notificationsService.getUserDisplayName(userId);
      const participantMemberIds = event.participants.map((participant) => participant.familyMemberId);
      const recipientUserIds = participantMemberIds.length
        ? await this.notificationsService.getUserIdsForFamilyMemberIds(event.familyId, participantMemberIds)
        : undefined;
      const eventId = event.recurringEventId ?? event.id;
      const eventDate = event.occurrenceDate ?? formatDate(event.startsAt);
      const occurrenceDateQuery = event.isRecurringOccurrence && event.occurrenceDate
        ? `&occurrenceDate=${encodeURIComponent(event.occurrenceDate)}`
        : "";

      await this.notificationsService.createNotificationForFamilyMembers({
        familyId: event.familyId,
        actorUserId: userId,
        recipientUserIds,
        type,
        title: type === "calendar_event_created" ? "Ny kalenderhendelse" : type === "calendar_event_deleted" ? "Kalenderhendelse slettet" : "Kalenderhendelse oppdatert",
        body: `${actorName} ${type === "calendar_event_created" ? "la til" : type === "calendar_event_deleted" ? "slettet" : "oppdaterte"} ${event.title}`,
        entityType: "calendar_event",
        entityId: eventId,
        deepLink: `/calendar?view=day&date=${encodeURIComponent(eventDate)}&eventId=${encodeURIComponent(eventId)}${occurrenceDateQuery}`,
        ...(type === "calendar_event_created" ? {} : { cooldownMinutes: 30 })
      });
    } catch (error) {
      this.logger.warn(`Failed to create calendar notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteOccurrence(userId: string, familyId: string, eventId: string, occurrenceDateValue: string): Promise<void> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const event = await this.getFamilyEventOrThrow(familyId, eventId);
    const occurrenceDate = this.validateOccurrenceDate(event, occurrenceDateValue);
    await (this.prisma.client as any).calendarEventException.upsert({
      where: { recurringEventId_occurrenceDate: { recurringEventId: event.id, occurrenceDate } },
      create: { recurringEventId: event.id, occurrenceDate, isDeleted: true },
      update: { isDeleted: true }
    });
    const occurrence = this.expandEventForRange(event, occurrenceDate, occurrenceDate)[0] ?? { ...event, recurringEventId: event.id, occurrenceDate: formatDate(occurrenceDate), isRecurringOccurrence: true };
    await this.notifyCalendarEvent(userId, occurrence, "calendar_event_deleted");
  }

  private expandEventForRange(event: CalendarEventRecord & { recurrenceExceptions?: CalendarEventExceptionRecord[] }, from: Date, to: Date): CalendarEventOccurrence[] {
    if (event.recurrenceFrequency === "never" || event.source !== "manual" || event.icsSourceId !== null) {
      return this.eventOverlapsRange(event, from, to) ? [event] : [];
    }
    if (!event.recurrenceUntil) return [];

    const exceptions = new Map((event.recurrenceExceptions ?? []).map((exception) => [formatDate(exception.occurrenceDate), exception]));
    const occurrences: CalendarEventOccurrence[] = [];
    const durationMs = event.endsAt ? event.endsAt.getTime() - event.startsAt.getTime() : 0;
    const generationFrom = new Date(from.getTime() - Math.max(durationMs, 0));
    const generationTo = new Date(Math.min(to.getTime(), event.recurrenceUntil.getTime()));

    for (const occurrenceStart of this.getOccurrenceStartsInRange(event.startsAt, event.recurrenceFrequency, generationFrom, generationTo)) {
      const occurrenceDate = formatDate(occurrenceStart);
      const exception = exceptions.get(occurrenceDate);
      if (exception?.isDeleted) continue;
      const startsAt = exception?.overrideStartsAt ?? occurrenceStart;
      const endsAt = exception?.overrideEndsAt ?? (event.endsAt ? new Date(startsAt.getTime() + durationMs) : null);
      const participantIds = exception?.overrideParticipantFamilyMemberIds ?? [];
      const participants = exception?.overrideParticipantsSet
        ? event.participants.filter((p) => participantIds.includes(p.familyMemberId))
        : event.participants;
      const occurrence = {
        ...event,
        id: `${event.id}::${occurrenceDate}`,
        title: exception?.overrideTitle ?? event.title,
        description: exception?.overrideDescription ?? event.description,
        location: exception?.overrideLocation ?? event.location,
        icon: exception?.overrideIcon ?? event.icon,
        reminderMinutesBefore: exception?.overrideReminderMinutesBefore ?? event.reminderMinutesBefore,
        allDay: exception?.overrideAllDay ?? event.allDay,
        startsAt,
        endsAt,
        participants,
        recurringEventId: event.id,
        occurrenceDate,
        isRecurringOccurrence: true
      };
      if (this.eventOverlapsRange(occurrence, from, to)) occurrences.push(occurrence);
    }
    return occurrences;
  }

  private eventOverlapsRange(event: Pick<CalendarEventRecord, "startsAt" | "endsAt">, from: Date, to: Date): boolean {
    const eventEnd = event.endsAt ?? event.startsAt;
    return event.startsAt <= to && eventEnd >= from;
  }

  private getOccurrenceStartsInRange(
    seriesStart: Date,
    frequency: Exclude<CalendarEventRecurrenceFrequency, "never">,
    from: Date,
    to: Date
  ): Date[] {
    const starts: Date[] = [];
    let cursor = new Date(seriesStart);

    let generated = 0;

    while (cursor < from && generated < MAX_RECURRENCE_OCCURRENCES) {
      cursor = this.nextOccurrenceStart(seriesStart, cursor, frequency);
      generated += 1;
    }

    while (cursor <= to && generated < MAX_RECURRENCE_OCCURRENCES) {
      starts.push(new Date(cursor));
      cursor = this.nextOccurrenceStart(seriesStart, cursor, frequency);
      generated += 1;
    }

    return starts;
  }

  private nextOccurrenceStart(seriesStart: Date, current: Date, frequency: Exclude<CalendarEventRecurrenceFrequency, "never">): Date {
    const next = new Date(current);

    if (frequency === "daily") {
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    }

    if (frequency === "weekly") {
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    }

    if (frequency === "monthly") {
      return this.nextValidCalendarDate(seriesStart, current, "month");
    }

    return this.nextValidCalendarDate(seriesStart, current, "year");
  }

  private nextValidCalendarDate(seriesStart: Date, current: Date, unit: "month" | "year"): Date {
    const desiredDay = seriesStart.getUTCDate();
    const desiredMonth = seriesStart.getUTCMonth();
    let year = current.getUTCFullYear();
    let month = current.getUTCMonth();

    do {
      if (unit === "month") {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      } else {
        year += 1;
        month = desiredMonth;
      }
    } while (!this.isValidCalendarDate(year, month, desiredDay));

    return new Date(Date.UTC(
      year,
      month,
      desiredDay,
      seriesStart.getUTCHours(),
      seriesStart.getUTCMinutes(),
      seriesStart.getUTCSeconds(),
      seriesStart.getUTCMilliseconds()
    ));
  }

  private isValidCalendarDate(year: number, month: number, day: number): boolean {
    const date = new Date(Date.UTC(year, month, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day;
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


  private validateRecurrenceUntil(value: unknown, startsAt: Date, frequency: CalendarEventRecurrenceFrequency): Date | null {
    if (frequency === "never") return null;
    const until = this.validateOptionalDateTime(value, "Recurrence end date");
    if (!until) throw new BadRequestException("Recurrence end date is required");
    if (until < startsAt) throw new BadRequestException("Recurrence end date must be on or after start date");
    return until;
  }

  private validateRecurrenceOccurrenceLimit(startsAt: Date, frequency: CalendarEventRecurrenceFrequency, until: Date | null): void {
    if (frequency === "never") return;
    if (!until) throw new BadRequestException("Recurrence end date is required");
    const starts = this.getOccurrenceStartsInRange(startsAt, frequency, startsAt, until);
    if (starts.length > MAX_RECURRENCE_OCCURRENCES) {
      throw new BadRequestException(`Recurring series cannot exceed ${MAX_RECURRENCE_OCCURRENCES} occurrences`);
    }
  }

  private validateOccurrenceDate(event: CalendarEventRecord, value: string): Date {
    if (event.recurrenceFrequency === "never" || !event.recurrenceUntil) {
      throw new BadRequestException("Calendar event is not a recurring series");
    }
    const occurrenceDate = this.validateDateTime(value, "Occurrence date");
    const dateKey = formatDate(occurrenceDate);
    const matches = this.getOccurrenceStartsInRange(event.startsAt, event.recurrenceFrequency, event.startsAt, event.recurrenceUntil)
      .some((start) => formatDate(start) === dateKey);
    if (!matches) throw new BadRequestException("Occurrence date is not part of this recurring series");
    return new Date(`${dateKey}T00:00:00.000Z`);
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

  private toCalendarEventDto(event: CalendarEventOccurrence): CalendarEventDto {
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
      recurrenceUntil: event.recurrenceUntil?.toISOString() ?? null,
      recurrence: event.recurrenceFrequency === "never" ? null : { frequency: event.recurrenceFrequency, until: event.recurrenceUntil?.toISOString() ?? null },
      recurringEventId: event.recurringEventId,
      occurrenceDate: event.occurrenceDate,
      isRecurringOccurrence: event.isRecurringOccurrence,
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
          includeInSchoolWeek: participant.familyMember.includeInSchoolWeek ?? true,
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
