import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { FamilyMemberRoleDto } from "../families/dto/family.dto";
import { FamilyAuthorizationService } from "../families/family-authorization.service";
import { PrismaService } from "../prisma";
import { CalendarExportFeedDto, CreateCalendarExportFeedRequestDto, UpdateCalendarExportFeedRequestDto } from "./dto/calendar-ics.dto";

type ExportFeedRecord = {
  id: string; familyId: string; name: string; token: string; enabled: boolean;
  includeEvents: boolean; includeMeals: boolean; includeReminders: boolean;
  includeSchoolWeekReminders: boolean; scope: string; selectedFamilyMemberId: string | null;
  createdByFamilyMemberId: string | null; createdAt: Date; updatedAt: Date;
  selectedMembers?: Array<{ familyMemberId: string }>;
};
type IcsItem = { uid: string; title: string; description: string | null; location?: string | null; startsAt: Date; endsAt?: Date | null; allDay: boolean; updatedAt: Date };
const ADMIN_ROLES: FamilyMemberRoleDto[] = ["OWNER", "PARENT"];
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const FEED_INCLUDE = { selectedMembers: { select: { familyMemberId: true } } };
const MAX_FEEDS_PER_FAMILY = 20;

@Injectable()
export class CalendarIcsFeedService {
  constructor(private readonly prisma: PrismaService, private readonly familyAuthorization: FamilyAuthorizationService) {}

  async listFeeds(userId: string, familyId: string): Promise<CalendarExportFeedDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const feeds = await (this.prisma.client as any).calendarExportFeed.findMany({ where: { familyId }, include: FEED_INCLUDE, orderBy: { createdAt: "asc" } }) as ExportFeedRecord[];
    return feeds.map(toFeedDto);
  }

  async getFeed(userId: string, familyId: string, feedId: string): Promise<CalendarExportFeedDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    return toFeedDto(await this.requireFeed(familyId, feedId));
  }

  async createFeed(userId: string, familyId: string, input: CreateCalendarExportFeedRequestDto): Promise<CalendarExportFeedDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, ADMIN_ROLES);
    const count = await (this.prisma.client as any).calendarExportFeed.count({ where: { familyId } });
    if (count >= MAX_FEEDS_PER_FAMILY) throw new BadRequestException(`A family can have at most ${MAX_FEEDS_PER_FAMILY} calendar feeds`);
    const member = await this.prisma.client.familyMember.findFirst({ where: { familyId, userId }, select: { id: true } });
    const data = await this.validateInput(familyId, input, true);
    const selectedMemberIds = data.selectedMemberIds as string[]; delete data.selectedMemberIds;
    const created = await (this.prisma.client as any).calendarExportFeed.create({ data: { ...data, familyId, token: createFeedToken(), enabled: input.enabled === undefined ? true : data.enabled, createdByFamilyMemberId: member?.id ?? null, selectedMembers: { create: selectedMemberIds.map(familyMemberId => ({ familyMemberId })) } }, include: FEED_INCLUDE }) as ExportFeedRecord;
    return toFeedDto(created);
  }

  async updateFeed(userId: string, familyId: string, feedId: string, input: UpdateCalendarExportFeedRequestDto): Promise<CalendarExportFeedDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, ADMIN_ROLES);
    const feed = await this.requireFeed(familyId, feedId);
    const data = await this.validateInput(familyId, input, false);
    const ids = data.selectedMemberIds as string[] | undefined; delete data.selectedMemberIds;
    const merged = { ...feed, ...data, selectedMemberIds: ids ?? feed.selectedMembers?.map(row => row.familyMemberId) ?? [] };
    validateConfiguration(merged);
    const updated = await (this.prisma.client as any).calendarExportFeed.update({ where: { id: feed.id }, data: { ...data, ...(ids ? { selectedMembers: { deleteMany: {}, create: ids.map(familyMemberId => ({ familyMemberId })) } } : {}) }, include: FEED_INCLUDE }) as ExportFeedRecord;
    return toFeedDto(updated);
  }

  async deleteFeed(userId: string, familyId: string, feedId: string): Promise<CalendarExportFeedDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, ADMIN_ROLES);
    const feed = await this.requireFeed(familyId, feedId);
    await (this.prisma.client as any).calendarExportFeed.delete({ where: { id: feed.id } });
    return toFeedDto(feed);
  }

  async regenerateFeedToken(userId: string, familyId: string, feedId: string): Promise<CalendarExportFeedDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, ADMIN_ROLES);
    const feed = await this.requireFeed(familyId, feedId);
    return toFeedDto(await (this.prisma.client as any).calendarExportFeed.update({ where: { id: feed.id }, data: { token: createFeedToken() }, include: FEED_INCLUDE }));
  }

  // Compatibility for older web clients. It returns the original/oldest feed without changing its token.
  async getOrCreateFeed(userId: string, familyId: string): Promise<CalendarExportFeedDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    let feed = await (this.prisma.client as any).calendarExportFeed.findFirst({ where: { familyId }, include: FEED_INCLUDE, orderBy: { createdAt: "asc" } });
    if (!feed) {
      const member = await this.prisma.client.familyMember.findFirst({ where: { familyId, userId }, select: { id: true } });
      feed = await (this.prisma.client as any).calendarExportFeed.create({ data: { familyId, name: "Familiekalender", token: createFeedToken(), enabled: false, createdByFamilyMemberId: member?.id ?? null }, include: FEED_INCLUDE });
    }
    return toFeedDto(feed);
  }
  async updateLegacyFeed(userId: string, familyId: string, input: UpdateCalendarExportFeedRequestDto) { const feed = await this.getOrCreateFeed(userId, familyId); return this.updateFeed(userId, familyId, feed.id, input); }
  async regenerateLegacyFeed(userId: string, familyId: string) { const feed = await this.getOrCreateFeed(userId, familyId); return this.regenerateFeedToken(userId, familyId, feed.id); }

  async renderFeed(tokenWithSuffix: string): Promise<string> {
    const token = tokenWithSuffix.replace(/\.ics$/i, "");
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw new NotFoundException("Calendar feed was not found");
    const feed = await (this.prisma.client as any).calendarExportFeed.findUnique({ where: { token }, include: FEED_INCLUDE }) as ExportFeedRecord | null;
    if (!feed || !feed.enabled) throw new NotFoundException("Calendar feed was not found");
    return renderCalendar(feed.familyId, await this.collectFeedItems(feed));
  }

  private async collectFeedItems(feed: ExportFeedRecord): Promise<IcsItem[]> {
    const items: IcsItem[] = []; const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const to = new Date(Date.UTC(now.getUTCFullYear() + 1, 11, 31, 23, 59, 59));
    const selectedIds = feed.scope === "selectedParticipant" ? feed.selectedMembers?.map(row => row.familyMemberId) ?? [] : feed.scope === "mine" && feed.createdByFamilyMemberId ? [feed.createdByFamilyMemberId] : [];
    if (feed.includeEvents) {
      const events = await (this.prisma.client as any).calendarEvent.findMany({ where: { familyId: feed.familyId, startsAt: { lte: to }, OR: [{ endsAt: { gte: from } }, { endsAt: null, startsAt: { gte: from } }], ...(selectedIds.length ? { participants: { some: { familyMemberId: { in: selectedIds } } } } : {}) }, include: { participants: { include: { familyMember: true } } } }) as any[];
      items.push(...events.map(event => ({ uid: `event-${event.id}@familieappen`, title: event.title, description: withParticipants(event.description, event.participants), location: event.location, startsAt: event.startsAt, endsAt: event.endsAt, allDay: event.allDay, updatedAt: event.updatedAt })));
    }
    if (feed.includeMeals) {
      const meals = await (this.prisma.client as any).mealPlanDay.findMany({ where: { familyId: feed.familyId, deletedAt: null, date: { gte: from, lte: to } } }) as any[];
      items.push(...meals.map(meal => ({ uid: `meal-${meal.id}@familieappen`, title: `Middag: ${meal.mealName}`, description: meal.notes, startsAt: meal.date, allDay: true, updatedAt: meal.updatedAt })));
    }
    if (feed.includeReminders) {
      const reminders = await (this.prisma.client as any).reminder.findMany({ where: { familyId: feed.familyId, archivedAt: null, isPrivate: false, dueDate: { not: null, gte: from, lte: to } }, include: { audienceMembers: { include: { familyMember: true } } } }) as any[];
      items.push(...reminders.map(reminder => ({ uid: `husk-${reminder.id}@familieappen`, title: `Husk: ${reminder.title}`, description: withParticipants(reminder.note, reminder.audienceMembers), startsAt: reminder.dueDate, allDay: true, updatedAt: reminder.updatedAt })));
    }
    if (feed.includeSchoolWeekReminders) {
      const reminders = await (this.prisma.client as any).schoolWeekReminder.findMany({ where: { familyId: feed.familyId, deletedAt: null, date: { not: null, gte: from, lte: to }, childFamilyMember: { role: "CHILD", includeInSchoolWeek: true } }, include: { childFamilyMember: true } }) as any[];
      items.push(...reminders.map(reminder => ({ uid: `school-week-${reminder.id}@familieappen`, title: `Skoleuka: ${reminder.title}`, description: [reminder.note, reminder.childFamilyMember?.displayName ? `Gjelder: ${reminder.childFamilyMember.displayName}` : null].filter(Boolean).join("\n") || null, startsAt: reminder.date, allDay: true, updatedAt: reminder.updatedAt })));
    }
    return items.sort((a,b) => a.startsAt.getTime()-b.startsAt.getTime() || a.title.localeCompare(b.title,"nb"));
  }

  private async requireFeed(familyId: string, feedId: string): Promise<ExportFeedRecord> {
    const feed = await (this.prisma.client as any).calendarExportFeed.findFirst({ where: { id: feedId, familyId }, include: FEED_INCLUDE }) as ExportFeedRecord | null;
    if (!feed) throw new NotFoundException("Calendar feed was not found"); return feed;
  }
  private async validateInput(familyId: string, input: UpdateCalendarExportFeedRequestDto, creating: boolean): Promise<Record<string, any>> {
    const data: Record<string, any> = {};
    if (input.name !== undefined || creating) data.name = validateName(input.name);
    for (const [key,label] of [["enabled","Enabled"],["includeEvents","Include events"],["includeMeals","Include meals"],["includeReminders","Include reminders"],["includeSchoolWeekReminders","Include school week reminders"]] as const) if (input[key] !== undefined) data[key] = validateBoolean(input[key],label);
    if (input.scope !== undefined) data.scope = validateScope(input.scope);
    if (input.selectedMemberIds !== undefined) data.selectedMemberIds = await this.validateMemberIds(familyId,input.selectedMemberIds);
    if (input.selectedMemberIds === undefined && input.selectedFamilyMemberId !== undefined) data.selectedMemberIds = await this.validateMemberIds(familyId, input.selectedFamilyMemberId ? [input.selectedFamilyMemberId] : []);
    if (creating) { data.includeEvents ??= true; data.includeMeals ??= true; data.includeReminders ??= true; data.includeSchoolWeekReminders ??= true; data.scope ??= "family"; data.selectedMemberIds ??= []; validateConfiguration(data); }
    return data;
  }
  private async validateMemberIds(familyId: string, value: unknown): Promise<string[]> {
    if (!Array.isArray(value) || value.some(id => typeof id !== "string")) throw new BadRequestException("Selected member IDs must be an array of strings");
    const ids = [...new Set(value as string[])]; if (ids.length !== value.length) throw new BadRequestException("Selected family members must be unique");
    const count = await this.prisma.client.familyMember.count({ where: { familyId, id: { in: ids } } });
    if (count !== ids.length) throw new BadRequestException("Every selected family member must belong to the family"); return ids;
  }
}
function createFeedToken() { return randomBytes(32).toString("base64url"); }
function toFeedDto(feed: ExportFeedRecord): CalendarExportFeedDto { return { id: feed.id, familyId: feed.familyId, name: feed.name, enabled: feed.enabled, privateUrl: `${PUBLIC_API_URL}/calendar/feed/${feed.token}.ics`, includeEvents: feed.includeEvents, includeMeals: feed.includeMeals, includeReminders: feed.includeReminders, includeSchoolWeekReminders: feed.includeSchoolWeekReminders, scope: feed.scope as any, selectedMemberIds: feed.selectedMembers?.map(row => row.familyMemberId) ?? (feed.selectedFamilyMemberId ? [feed.selectedFamilyMemberId] : []), createdAt: feed.createdAt.toISOString(), updatedAt: feed.updatedAt.toISOString() }; }
function validateName(value: unknown) { if (typeof value !== "string" || !value.trim()) throw new BadRequestException("Calendar feed name is required"); const name=value.trim(); if(name.length>80) throw new BadRequestException("Calendar feed name must be 80 characters or fewer"); return name; }
function validateConfiguration(feed: any) { if(!feed.includeEvents&&!feed.includeMeals&&!feed.includeReminders&&!feed.includeSchoolWeekReminders) throw new BadRequestException("Select at least one content category"); if(feed.scope==="selectedParticipant" && !feed.selectedMemberIds?.length) throw new BadRequestException("Select at least one family member"); }
function validateBoolean(value: unknown,label:string) { if(typeof value!=="boolean") throw new BadRequestException(`${label} must be boolean`); return value; }
function validateScope(value:unknown) { if(value!=="family"&&value!=="mine"&&value!=="selectedParticipant") throw new BadRequestException("Calendar feed scope is invalid"); return value; }

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
