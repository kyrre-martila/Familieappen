import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyMemberRoleDto } from "../families/dto/family.dto";
import { FamilyAuthorizationService } from "../families/family-authorization.service";
import { PrismaService } from "../prisma";
import {
  CalendarIcsSourceDto,
  CalendarIcsSyncResultDto,
  CreateCalendarIcsSourceRequestDto,
  UpdateCalendarIcsSourceRequestDto
} from "./dto/calendar-ics.dto";

type IcsSourceRecord = {
  id: string;
  familyId: string;
  name: string;
  url: string;
  active: boolean;
  defaultFamilyMemberId: string | null;
  defaultCategory: string;
  lastSyncedAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  syncIntervalMinutes: number;
  nextSyncAt: Date | null;
  lastSyncStartedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ParsedIcsEvent = {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  lastModified: Date | null;
  sequence: number | null;
  status: string | null;
  recurrenceRule: string | null;
  recurrenceId: string | null;
};

type SyncCounts = {
  imported: number;
  updated: number;
  removed: number;
  skipped: number;
};

const VALID_ICONS = new Set(["sport", "school", "birthday", "health", "travel", "family", "meal"]);
const ADMIN_ROLES: FamilyMemberRoleDto[] = ["OWNER", "PARENT"];
const MAX_ICS_BYTES = 5 * 1024 * 1024;
const DEFAULT_SYNC_INTERVAL_MINUTES = 60;
const MIN_SYNC_INTERVAL_MINUTES = 5;
const MAX_SYNC_INTERVAL_MINUTES = 24 * 60;

@Injectable()
export class CalendarIcsSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAuthorization: FamilyAuthorizationService
  ) {}

  async listSources(userId: string, familyId: string): Promise<CalendarIcsSourceDto[]> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    const sources = await (this.prisma.client as any).calendarIcsSource.findMany({
      where: { familyId },
      orderBy: [{ createdAt: "asc" }]
    }) as IcsSourceRecord[];

    return sources.map(toSourceDto);
  }

  async createSource(userId: string, familyId: string, input: CreateCalendarIcsSourceRequestDto): Promise<CalendarIcsSourceDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, ADMIN_ROLES);
    const data = await this.validateSourceInput(familyId, input, true);
    const syncIntervalMinutes = getSyncIntervalMinutes(data);
    const source = await (this.prisma.client as any).calendarIcsSource.create({ data: { familyId, ...data } }) as IcsSourceRecord;
    const updatedSource = await (this.prisma.client as any).calendarIcsSource.update({
      where: { id: source.id },
      data: { nextSyncAt: addRandomMinutes(new Date(), 0, syncIntervalMinutes) }
    }) as IcsSourceRecord;
    return toSourceDto(updatedSource);
  }

  async updateSource(userId: string, familyId: string, sourceId: string, input: UpdateCalendarIcsSourceRequestDto): Promise<CalendarIcsSourceDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, ADMIN_ROLES);
    await this.getFamilySourceOrThrow(familyId, sourceId);
    const data = await this.validateSourceInput(familyId, input, false);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("At least one ICS source field is required");
    }

    const source = await (this.prisma.client as any).calendarIcsSource.update({
      where: { id: sourceId },
      data
    }) as IcsSourceRecord;

    return toSourceDto(source);
  }

  async deleteSource(userId: string, familyId: string, sourceId: string): Promise<CalendarIcsSourceDto> {
    await this.familyAuthorization.requireFamilyRole(userId, familyId, ADMIN_ROLES);
    await this.getFamilySourceOrThrow(familyId, sourceId);
    const source = await (this.prisma.client as any).calendarIcsSource.delete({ where: { id: sourceId } }) as IcsSourceRecord;
    return toSourceDto(source);
  }

  async syncSourceForUser(userId: string, familyId: string, sourceId: string): Promise<CalendarIcsSyncResultDto> {
    await this.familyAuthorization.requireFamilyMember(userId, familyId);
    return this.syncSource(familyId, sourceId);
  }

  async syncSource(familyId: string, sourceId: string): Promise<CalendarIcsSyncResultDto> {
    const source = await this.getFamilySourceOrThrow(familyId, sourceId);

    if (!source.active) {
      throw new BadRequestException("ICS source is inactive");
    }

    await (this.prisma.client as any).calendarIcsSource.update({
      where: { id: source.id },
      data: { lastSyncStartedAt: new Date() }
    });

    try {
      const icsText = await this.fetchIcs(source.url);
      const parsedEvents = parseIcsEvents(icsText);
      const counts = await this.applyParsedEvents(source, parsedEvents);
      const updatedSource = await (this.prisma.client as any).calendarIcsSource.update({
        where: { id: source.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: "success",
          lastSyncError: null,
          nextSyncAt: addRandomMinutes(new Date(), source.syncIntervalMinutes, source.syncIntervalMinutes + 15)
        }
      }) as IcsSourceRecord;

      return { source: toSourceDto(updatedSource), ...counts };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown ICS sync error";
      const updatedSource = await (this.prisma.client as any).calendarIcsSource.update({
        where: { id: source.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: "error",
          lastSyncError: message.slice(0, 500),
          nextSyncAt: addRandomMinutes(new Date(), 15, 30)
        }
      }) as IcsSourceRecord;

      return { source: toSourceDto(updatedSource), imported: 0, updated: 0, removed: 0, skipped: 0 };
    }
  }

  private async applyParsedEvents(source: IcsSourceRecord, parsedEvents: ParsedIcsEvent[]): Promise<SyncCounts> {
    const counts: SyncCounts = { imported: 0, updated: 0, removed: 0, skipped: 0 };
    const seenExternalKeys = new Set<string>();
    const expandedEvents = expandRecurringEvents(parsedEvents);

    for (const event of expandedEvents) {
      if (event.status === "CANCELLED") {
        await (this.prisma.client as any).calendarEvent.deleteMany({
          where: { icsSourceId: source.id, externalUid: externalEventKey(event) }
        });
        counts.removed += 1;
        continue;
      }

      const externalUid = externalEventKey(event);
      if (seenExternalKeys.has(externalUid)) {
        counts.skipped += 1;
        continue;
      }
      seenExternalKeys.add(externalUid);
      const existing = await (this.prisma.client as any).calendarEvent.findFirst({
        where: { icsSourceId: source.id, externalUid },
        select: { id: true }
      }) as { id: string } | null;
      const eventData = {
        familyId: source.familyId,
        title: event.title,
        description: event.description,
        location: event.location,
        icon: VALID_ICONS.has(source.defaultCategory) ? source.defaultCategory : "family",
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        allDay: event.allDay,
        source: "ics",
        icsSourceId: source.id,
        externalUid,
        externalLastModified: event.lastModified,
        externalSequence: event.sequence,
        importedAt: new Date(),
        participants: source.defaultFamilyMemberId
          ? { create: [{ familyMemberId: source.defaultFamilyMemberId }] }
          : undefined
      };

      if (existing) {
        await (this.prisma.client as any).calendarEvent.update({
          where: { id: existing.id },
          data: {
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            icon: eventData.icon,
            startsAt: eventData.startsAt,
            endsAt: eventData.endsAt,
            allDay: eventData.allDay,
            externalLastModified: eventData.externalLastModified,
            externalSequence: eventData.externalSequence,
            importedAt: eventData.importedAt
          }
        });
        if (source.defaultFamilyMemberId) {
          await (this.prisma.client as any).calendarEventParticipant.upsert({
            where: { eventId_familyMemberId: { eventId: existing.id, familyMemberId: source.defaultFamilyMemberId } },
            create: { eventId: existing.id, familyMemberId: source.defaultFamilyMemberId },
            update: {}
          });
        }
        counts.updated += 1;
      } else {
        await (this.prisma.client as any).calendarEvent.create({ data: eventData });
        counts.imported += 1;
      }
    }

    const currentEvents = await (this.prisma.client as any).calendarEvent.findMany({
      where: { icsSourceId: source.id },
      select: { id: true, externalUid: true }
    }) as { id: string; externalUid: string | null }[];
    const removedIds = currentEvents
      .filter((event) => event.externalUid && !seenExternalKeys.has(event.externalUid))
      .map((event) => event.id);

    if (removedIds.length > 0) {
      const result = await (this.prisma.client as any).calendarEvent.deleteMany({ where: { id: { in: removedIds } } }) as { count: number };
      counts.removed += result.count;
    }

    counts.skipped += Math.max(0, parsedEvents.length - expandedEvents.length);
    return counts;
  }

  private async fetchIcs(url: string): Promise<string> {
    const response = await fetch(url, { headers: { Accept: "text/calendar, text/plain;q=0.8, */*;q=0.1" } });

    if (!response.ok) {
      throw new BadRequestException(`ICS feed returned ${response.status}`);
    }

    const text = await response.text();
    if (new TextEncoder().encode(text).length > MAX_ICS_BYTES) {
      throw new BadRequestException("ICS feed is too large");
    }

    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new BadRequestException("ICS feed did not contain calendar events");
    }

    return text;
  }

  private async getFamilySourceOrThrow(familyId: string, sourceId: string): Promise<IcsSourceRecord> {
    const source = await (this.prisma.client as any).calendarIcsSource.findFirst({ where: { id: sourceId, familyId } }) as IcsSourceRecord | null;

    if (!source) {
      throw new NotFoundException("ICS source was not found");
    }

    return source;
  }

  private async validateSourceInput(
    familyId: string,
    input: CreateCalendarIcsSourceRequestDto | UpdateCalendarIcsSourceRequestDto,
    requireRequiredFields: boolean
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};

    if (input.name !== undefined || requireRequiredFields) data.name = validateText(input.name, "Name", 120);
    if (input.url !== undefined || requireRequiredFields) data.url = validateUrl(input.url);
    if (input.active !== undefined) data.active = validateBoolean(input.active, "Active");
    if (input.defaultCategory !== undefined) data.defaultCategory = validateIcon(input.defaultCategory);
    if (input.defaultFamilyMemberId !== undefined) data.defaultFamilyMemberId = await this.validateOptionalFamilyMemberId(familyId, input.defaultFamilyMemberId);
    if (input.syncIntervalMinutes !== undefined) data.syncIntervalMinutes = validateSyncIntervalMinutes(input.syncIntervalMinutes);

    return data;
  }

  private async validateOptionalFamilyMemberId(familyId: string, value: unknown): Promise<string | null> {
    if (value === null || value === "") return null;
    if (typeof value !== "string") throw new BadRequestException("Default family member must be a string");
    const member = await this.prisma.client.familyMember.findFirst({ where: { id: value, familyId }, select: { id: true } });
    if (!member) throw new BadRequestException("Default family member must belong to the family");
    return value;
  }
}

export function parseIcsEvents(icsText: string): ParsedIcsEvent[] {
  const lines = unfoldIcsLines(icsText);
  const events: ParsedIcsEvent[] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = [];
    else if (line === "END:VEVENT" && current) {
      const event = parseIcsEvent(current);
      if (event) events.push(event);
      current = null;
    } else if (current) current.push(line);
  }

  return events;
}

function unfoldIcsLines(icsText: string): string[] {
  return icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").reduce<string[]>((lines, line) => {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) lines[lines.length - 1] += line.slice(1);
    else lines.push(line.trimEnd());
    return lines;
  }, []);
}

function parseIcsEvent(lines: string[]): ParsedIcsEvent | null {
  const props = new Map<string, { params: Map<string, string>; value: string }[]>();
  for (const line of lines) {
    const parsed = parseProperty(line);
    if (!parsed) continue;
    const items = props.get(parsed.name) ?? [];
    items.push({ params: parsed.params, value: parsed.value });
    props.set(parsed.name, items);
  }

  const uid = getProp(props, "UID")?.value?.trim();
  const dtstart = getProp(props, "DTSTART");
  if (!uid || !dtstart) return null;

  const parsedStart = parseIcsDateValue(dtstart.value, dtstart.params);
  if (!parsedStart) return null;

  const dtend = getProp(props, "DTEND");
  const duration = getProp(props, "DURATION")?.value ?? null;
  const parsedEnd = dtend ? parseIcsDateValue(dtend.value, dtend.params) : null;
  const fallbackEnd = duration ? addDuration(parsedStart.date, duration) : null;

  return {
    uid,
    title: unescapeIcsText(getProp(props, "SUMMARY")?.value ?? "Uten tittel"),
    description: nullableText(unescapeIcsText(getProp(props, "DESCRIPTION")?.value ?? "")),
    location: nullableText(unescapeIcsText(getProp(props, "LOCATION")?.value ?? "")),
    startsAt: parsedStart.date,
    endsAt: parsedEnd?.date ?? fallbackEnd,
    allDay: parsedStart.allDay,
    lastModified: parseIcsDateValue(getProp(props, "LAST-MODIFIED")?.value ?? "", new Map())?.date ?? null,
    sequence: parseInteger(getProp(props, "SEQUENCE")?.value),
    status: getProp(props, "STATUS")?.value?.trim().toUpperCase() ?? null,
    recurrenceRule: getProp(props, "RRULE")?.value ?? null,
    recurrenceId: getProp(props, "RECURRENCE-ID")?.value ?? null
  };
}

function parseProperty(line: string): { name: string; params: Map<string, string>; value: string } | null {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 1) return null;
  const head = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [rawName, ...rawParams] = head.split(";");
  const params = new Map<string, string>();
  rawParams.forEach((param) => {
    const [key, ...parts] = param.split("=");
    params.set(key.toUpperCase(), parts.join("=").replace(/^"|"$/g, ""));
  });
  return { name: rawName.toUpperCase(), params, value };
}

function getProp(props: Map<string, { params: Map<string, string>; value: string }[]>, name: string) {
  return props.get(name)?.[0] ?? null;
}

function parseIcsDateValue(value: string, params: Map<string, string>): { date: Date; allDay: boolean } | null {
  if (!value) return null;
  const allDay = params.get("VALUE") === "DATE" || /^\d{8}$/.test(value);
  if (allDay) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    if (!isValidDateParts(year, month, day)) return null;
    return { date: new Date(Date.UTC(year, month - 1, day)), allDay: true };
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number);
  if (!isValidDateParts(year, month, day) || hour > 23 || minute > 59 || second > 60) return null;
  const timeZone = params.get("TZID");
  return { date: timeZone ? zonedTimeToUtc(year, month, day, hour, minute, second, timeZone) : new Date(Date.UTC(year, month - 1, day, hour, minute, second)), allDay: false };
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, timeZone: string): Date {
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(utc);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const asZone = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    const diff = asZone - target;
    if (diff === 0) return utc;
    utc = new Date(utc.getTime() - diff);
  }

  return utc;
}

function expandRecurringEvents(events: ParsedIcsEvent[]): ParsedIcsEvent[] {
  const expanded: ParsedIcsEvent[] = [];
  const now = new Date();
  const horizon = new Date(Date.UTC(now.getUTCFullYear() + 1, 11, 31, 23, 59, 59));

  for (const event of events) {
    if (!event.recurrenceRule) {
      expanded.push(event);
      continue;
    }

    const rule = parseRrule(event.recurrenceRule);
    const frequency = rule.get("FREQ");
    if (!["DAILY", "WEEKLY", "MONTHLY"].includes(frequency ?? "")) {
      expanded.push(event);
      continue;
    }

    const count = Math.min(Number(rule.get("COUNT") ?? 52), 370);
    const until = parseIcsDateValue(rule.get("UNTIL") ?? "", new Map())?.date ?? horizon;
    const duration = event.endsAt ? event.endsAt.getTime() - event.startsAt.getTime() : null;
    let occurrenceStart = new Date(event.startsAt);

    for (let index = 0; index < count && occurrenceStart <= until && occurrenceStart <= horizon; index += 1) {
      expanded.push({
        ...event,
        uid: index === 0 ? event.uid : `${event.uid}#${occurrenceStart.toISOString().slice(0, 10)}`,
        startsAt: new Date(occurrenceStart),
        endsAt: duration === null ? null : new Date(occurrenceStart.getTime() + duration),
        recurrenceId: index === 0 ? event.recurrenceId : occurrenceStart.toISOString()
      });
      occurrenceStart = addFrequency(occurrenceStart, frequency ?? "DAILY");
    }
  }

  return expanded;
}

function parseRrule(value: string): Map<string, string> {
  const rule = new Map<string, string>();
  value.split(";").forEach((part) => {
    const [key, rawValue] = part.split("=");
    if (key && rawValue) rule.set(key.toUpperCase(), rawValue.toUpperCase());
  });
  return rule;
}

function addFrequency(date: Date, frequency: string): Date {
  const next = new Date(date);
  if (frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
  else if (frequency === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function addDuration(date: Date, duration: string): Date | null {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(duration);
  if (!match) return null;
  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  return new Date(date.getTime() + (((Number(days) * 24 + Number(hours)) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000);
}

function externalEventKey(event: ParsedIcsEvent): string {
  return event.recurrenceId ? `${event.uid}:${event.recurrenceId}` : event.uid;
}

function unescapeIcsText(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function validateText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") throw new BadRequestException(`${label} is required`);
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > maxLength) throw new BadRequestException(`${label} must be between 1 and ${maxLength} characters`);
  return trimmed;
}

function validateUrl(value: unknown): string {
  const url = validateText(value, "ICS URL", 2000);
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new BadRequestException("ICS URL must be http or https");
    return parsed.toString();
  } catch {
    throw new BadRequestException("ICS URL must be a valid URL");
  }
}

function validateBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new BadRequestException(`${label} must be boolean`);
  return value;
}

function validateIcon(value: unknown): string {
  if (typeof value !== "string" || !VALID_ICONS.has(value)) throw new BadRequestException("Default icon/category is invalid");
  return value;
}

function toSourceDto(source: IcsSourceRecord): CalendarIcsSourceDto {
  return {
    id: source.id,
    familyId: source.familyId,
    name: source.name,
    url: source.url,
    active: source.active,
    defaultFamilyMemberId: source.defaultFamilyMemberId,
    defaultCategory: source.defaultCategory,
    lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
    lastSyncStatus: source.lastSyncStatus,
    lastSyncError: source.lastSyncError,
    syncIntervalMinutes: source.syncIntervalMinutes,
    nextSyncAt: source.nextSyncAt?.toISOString() ?? null,
    lastSyncStartedAt: source.lastSyncStartedAt?.toISOString() ?? null,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString()
  };
}

function getSyncIntervalMinutes(data: Record<string, unknown>): number {
  return typeof data.syncIntervalMinutes === "number" ? data.syncIntervalMinutes : DEFAULT_SYNC_INTERVAL_MINUTES;
}

function addRandomMinutes(date: Date, minMinutes: number, maxMinutes: number): Date {
  const jitterMinutes = minMinutes + Math.random() * (maxMinutes - minMinutes);
  return new Date(date.getTime() + Math.round(jitterMinutes * 60 * 1000));
}

function validateSyncIntervalMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new BadRequestException("Sync interval must be an integer number of minutes");
  if (value < MIN_SYNC_INTERVAL_MINUTES || value > MAX_SYNC_INTERVAL_MINUTES) {
    throw new BadRequestException(`Sync interval must be between ${MIN_SYNC_INTERVAL_MINUTES} and ${MAX_SYNC_INTERVAL_MINUTES} minutes`);
  }
  return value;
}
