import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { FamilyMemberRoleDto } from "../families/dto/family.dto";
import { FamilyAuthorizationService } from "../families/family-authorization.service";
import { PrismaService } from "../prisma";
import { CalendarExportFeedDto, UpdateCalendarExportFeedRequestDto } from "./dto/calendar-ics.dto";

type ExportFeedRecord = {
  id: string;
  familyId: string;
  token: string;
  enabled: boolean;
  includeEvents: boolean;
  includeMeals: boolean;
  includeReminders: boolean;
  includeSchoolWeekReminders: boolean;
  scope: string;
  selectedFamilyMemberId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type IcsItem = {
  uid: string;
  title: string;
  description: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  allDay: boolean;
  updatedAt: Date;
};

const ADMIN_ROLES: FamilyMemberRoleDto[] = ["OWNER", "PARENT"];
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

@Injectable()
export class CalendarIcsFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async getOrCreateFeed(userId: string, familyId: string): Promise<CalendarExportFeedDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const feed = await this.ensureFeed(familyId);
    return toFeedDto(feed);
  }

  async updateFeed(userId: string, familyId: string, input: UpdateCalendarExportFeedRequestDto): Promise<CalendarExportFeedDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, ADMIN_ROLES);
    const feed = await this.ensureFeed(familyId);
    const data = await this.validateUpdateInput(familyId, input);

    if (Object.keys(data).length === 0) throw new BadRequestException("At least one calendar feed setting is required");

    const updated = await (this.prisma.client as any).calendarExportFeed.update({ where: { id: feed.id }, data }) as ExportFeedRecord;
    return toFeedDto(updated);
  }

  async regenerateFeedToken(userId: string, familyId: string): Promise<CalendarExportFeedDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, ADMIN_ROLES);
    const feed = await this.ensureFeed(familyId);
    const updated = await (this.prisma.client as any).calendarExportFeed.update({
      where: { id: feed.id },
      data: { token: createFeedToken(), enabled: true }
    }) as ExportFeedRecord;
    return toFeedDto(updated);
  }

  async renderFeed(tokenWithSuffix: string): Promise<string> {
    const token = tokenWithSuffix.replace(/\.ics$/i, "");
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
      throw new NotFoundException("Calendar feed was not found");
    }

    const feed = await (this.prisma.client as any).calendarExportFeed.findUnique({ where: { token } }) as ExportFeedRecord | null;

    if (!feed || !feed.enabled) {
      throw new NotFoundException("Calendar feed was not found");
    }

    const items = await this.collectFeedItems(feed);
    return renderCalendar(feed.familyId, items);
  }

  private async collectFeedItems(feed: ExportFeedRecord): Promise<IcsItem[]> {
    const items: IcsItem[] = [];
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const to = new Date(Date.UTC(now.getUTCFullYear() + 1, 11, 31, 23, 59, 59));

    if (feed.includeEvents) {
      const events = await (this.prisma.client as any).calendarEvent.findMany({
        where: {
          familyId: feed.familyId,
          startsAt: { lte: to },
          OR: [{ endsAt: { gte: from } }, { endsAt: null, startsAt: { gte: from } }],
          ...(feed.scope === "selectedParticipant" && feed.selectedFamilyMemberId
            ? { participants: { some: { familyMemberId: feed.selectedFamilyMemberId } } }
            : {})
        },
        include: { participants: { include: { familyMember: true } } }
      }) as Array<any>;

      items.push(...events.map((event) => ({
        uid: `event-${event.id}@familieappen`,
        title: event.title,
        description: withParticipants(event.description, event.participants),
        location: event.location,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        allDay: event.allDay,
        updatedAt: event.updatedAt
      })));
    }

    if (feed.includeMeals) {
      const meals = await (this.prisma.client as any).mealPlanDay.findMany({
        where: { familyId: feed.familyId, deletedAt: null, date: { gte: from, lte: to } }
      }) as Array<any>;
      items.push(...meals.map((meal) => ({
        uid: `meal-${meal.id}@familieappen`,
        title: `Middag: ${meal.mealName}`,
        description: meal.notes,
        startsAt: meal.date,
        allDay: true,
        updatedAt: meal.updatedAt
      })));
    }

    if (feed.includeReminders) {
      const reminders = await (this.prisma.client as any).reminder.findMany({
        where: { familyId: feed.familyId, archivedAt: null, dueDate: { not: null, gte: from, lte: to } },
        include: { audienceMembers: { include: { familyMember: true } } }
      }) as Array<any>;
      items.push(...reminders.map((reminder) => ({
        uid: `husk-${reminder.id}@familieappen`,
        title: `Husk: ${reminder.title}`,
        description: withParticipants(reminder.note, reminder.audienceMembers),
        startsAt: reminder.dueDate,
        allDay: true,
        updatedAt: reminder.updatedAt
      })));
    }

    if (feed.includeSchoolWeekReminders) {
      const schoolReminders = await (this.prisma.client as any).schoolWeekReminder.findMany({
        where: { familyId: feed.familyId, deletedAt: null, date: { not: null, gte: from, lte: to } },
        include: { childFamilyMember: true }
      }) as Array<any>;
      items.push(...schoolReminders.map((reminder) => ({
        uid: `school-week-${reminder.id}@familieappen`,
        title: `Skoleuka: ${reminder.title}`,
        description: [reminder.note, reminder.childFamilyMember?.displayName ? `Gjelder: ${reminder.childFamilyMember.displayName}` : null].filter(Boolean).join("\n") || null,
        startsAt: reminder.date,
        allDay: true,
        updatedAt: reminder.updatedAt
      })));
    }

    return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.title.localeCompare(b.title, "nb"));
  }

  private async ensureFeed(familyId: string): Promise<ExportFeedRecord> {
    const existing = await (this.prisma.client as any).calendarExportFeed.findUnique({ where: { familyId } }) as ExportFeedRecord | null;
    if (existing) return existing;
    return (await (this.prisma.client as any).calendarExportFeed.create({
      data: { familyId, token: createFeedToken(), enabled: false }
    })) as ExportFeedRecord;
  }

  private async validateUpdateInput(familyId: string, input: UpdateCalendarExportFeedRequestDto): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (input.enabled !== undefined) data.enabled = validateBoolean(input.enabled, "Enabled");
    if (input.includeEvents !== undefined) data.includeEvents = validateBoolean(input.includeEvents, "Include events");
    if (input.includeMeals !== undefined) data.includeMeals = validateBoolean(input.includeMeals, "Include meals");
    if (input.includeReminders !== undefined) data.includeReminders = validateBoolean(input.includeReminders, "Include reminders");
    if (input.includeSchoolWeekReminders !== undefined) data.includeSchoolWeekReminders = validateBoolean(input.includeSchoolWeekReminders, "Include school week reminders");
    if (input.scope !== undefined) data.scope = validateScope(input.scope);
    if (input.selectedFamilyMemberId !== undefined) data.selectedFamilyMemberId = await this.validateOptionalFamilyMemberId(familyId, input.selectedFamilyMemberId);
    return data;
  }

  private async validateOptionalFamilyMemberId(familyId: string, value: unknown): Promise<string | null> {
    if (value === null || value === "") return null;
    if (typeof value !== "string") throw new BadRequestException("Selected family member must be a string");
    const member = await this.prisma.client.familyMember.findFirst({ where: { id: value, familyId }, select: { id: true } });
    if (!member) throw new BadRequestException("Selected family member must belong to the family");
    return value;
  }
}

function createFeedToken(): string {
  return randomBytes(32).toString("base64url");
}

function toFeedDto(feed: ExportFeedRecord): CalendarExportFeedDto {
  return {
    id: feed.id,
    familyId: feed.familyId,
    enabled: feed.enabled,
    privateUrl: `${PUBLIC_API_URL}/calendar/feed/${feed.token}.ics`,
    includeEvents: feed.includeEvents,
    includeMeals: feed.includeMeals,
    includeReminders: feed.includeReminders,
    includeSchoolWeekReminders: feed.includeSchoolWeekReminders,
    scope: feed.scope as CalendarExportFeedDto["scope"],
    selectedFamilyMemberId: feed.selectedFamilyMemberId,
    createdAt: feed.createdAt.toISOString(),
    updatedAt: feed.updatedAt.toISOString()
  };
}

function renderCalendar(familyId: string, items: IcsItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FamilieAppen//Private Calendar//NO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:FamilieAppen",
    "X-WR-CALDESC:Privat FamilieAppen kalenderabonnement"
  ];

  for (const item of items) {
    lines.push(...renderEvent(familyId, item));
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

function renderEvent(familyId: string, item: IcsItem): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(item.uid)}`,
    `DTSTAMP:${formatDateTime(new Date())}`,
    `LAST-MODIFIED:${formatDateTime(item.updatedAt)}`,
    `SUMMARY:${escapeIcsText(item.title)}`
  ];

  if (item.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(item.startsAt)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDate(addUtcDays(item.endsAt ?? item.startsAt, item.endsAt ? 0 : 1))}`);
  } else {
    lines.push(`DTSTART:${formatDateTime(item.startsAt)}`);
    if (item.endsAt) lines.push(`DTEND:${formatDateTime(item.endsAt)}`);
  }

  if (item.description) lines.push(`DESCRIPTION:${escapeIcsText(item.description)}`);
  if (item.location) lines.push(`LOCATION:${escapeIcsText(item.location)}`);
  lines.push(`CATEGORIES:${escapeIcsText(`FamilieAppen ${familyId}`)}`);
  lines.push("END:VEVENT");
  return lines;
}

function withParticipants(text: string | null, audience: Array<any>): string | null {
  const names = audience.map((item) => item.familyMember?.displayName).filter(Boolean);
  const parts = [text, names.length > 0 ? `Deltakere: ${names.join(", ")}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : null;
}

function validateBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new BadRequestException(`${label} must be boolean`);
  return value;
}

function validateScope(value: unknown): string {
  if (value !== "family" && value !== "mine" && value !== "selectedParticipant") throw new BadRequestException("Calendar feed scope is invalid");
  return value;
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)}T${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(date.getUTCSeconds()).padStart(2, "0")}Z`;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}
