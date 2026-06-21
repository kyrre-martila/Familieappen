import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma";
import { NotificationsService } from "./notifications.service";

type FamilyRecord = { id: string };
type SchoolWeekReminderRecord = {
  id: string;
  childFamilyMemberId: string;
  weekday: string;
  date: Date | null;
  isRecurring: boolean;
  recurrenceEndDate: Date | null;
  exceptionOfId: string | null;
  deletedAt: Date | null;
};

const dayMs = 86400000;
const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const norwegianWeekdays = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"] as const;
const norwegianMonths = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"] as const;

@Injectable()
export class ScheduledSystemNotificationsService {
  private readonly logger = new Logger(ScheduledSystemNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runHourlySystemNotifications(): Promise<void> {
    await this.runMissingMealNotifications();
    await this.runMissingSchoolWeekNotifications();
  }

  async runMissingMealNotifications(now = new Date()): Promise<void> {
    const families = await this.listFamiliesWithUsers();
    await Promise.all(families.filter((family) => this.isInStableWindow(family.id, now, 11, 14)).map((family) => this.createMissingMealNotificationIfNeeded(family.id, now)));
  }

  async runMissingSchoolWeekNotifications(now = new Date()): Promise<void> {
    if (now.getDay() !== 0) return;
    const families = await this.listFamiliesWithUsers();
    await Promise.all(families.filter((family) => this.isInStableWindow(family.id, now, 12, 18)).map((family) => this.createMissingSchoolWeekNotificationIfNeeded(family.id, now)));
  }

  async createMissingMealNotificationIfNeeded(familyId: string, now = new Date()): Promise<void> {
    try {
      const targetDate = this.addDays(this.startOfDay(now), 2);
      const entityId = this.toDateString(targetDate);
      const meal = await this.prisma.client.mealPlanDay.findFirst({ where: { familyId, date: targetDate, deletedAt: null }, select: { id: true } });
      if (meal) return;
      if (await this.hasFamilyNotification(familyId, "system_meal_missing", "meal_day", entityId)) return;
      await this.notificationsService.createNotificationForFamilyMembers({
        familyId,
        actorUserId: null,
        type: "system_meal_missing",
        title: "Middag mangler",
        body: `Det er ikke planlagt middag for ${this.formatWeekdayAndDate(targetDate)} ennå.`,
        entityType: "meal_day",
        entityId,
        deepLink: `/meals?date=${encodeURIComponent(entityId)}`,
        allowSelfNotification: true
      });
    } catch (error) {
      this.logger.warn(`Failed to create missing meal system notification for family ${familyId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createMissingSchoolWeekNotificationIfNeeded(familyId: string, now = new Date()): Promise<void> {
    try {
      const weekStart = this.nextMonday(now);
      const entityId = this.toDateString(weekStart);
      const childIds = await this.getIncludedSchoolWeekChildIds(familyId);
      if (childIds.length === 0) return;
      if (await this.hasVisibleSchoolWeekItem(familyId, childIds, weekStart)) return;
      if (await this.hasFamilyNotification(familyId, "system_school_week_missing", "school_week", entityId)) return;
      await this.notificationsService.createNotificationForFamilyMembers({
        familyId,
        actorUserId: null,
        type: "system_school_week_missing",
        title: "Skoleuka mangler",
        body: "Skoleuka for neste uke er ikke planlagt ennå.",
        entityType: "school_week",
        entityId,
        deepLink: "/husk?tab=school",
        allowSelfNotification: true
      });
    } catch (error) {
      this.logger.warn(`Failed to create missing school week system notification for family ${familyId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listFamiliesWithUsers(): Promise<FamilyRecord[]> {
    return this.prisma.client.family.findMany({ where: { members: { some: { userId: { not: null } } } }, select: { id: true } });
  }

  private async getIncludedSchoolWeekChildIds(familyId: string): Promise<string[]> {
    const children = await this.prisma.client.familyMember.findMany({ where: { familyId, role: "CHILD", includeInSchoolWeek: true }, select: { id: true } });
    return children.map((child) => child.id);
  }

  private async hasVisibleSchoolWeekItem(familyId: string, childIds: string[], weekStart: Date): Promise<boolean> {
    const weekEnd = this.addDays(weekStart, 6);
    const records = await (this.prisma.client as any).schoolWeekReminder.findMany({
      where: {
        familyId,
        childFamilyMemberId: { in: childIds },
        OR: [
          { isRecurring: false, date: { gte: weekStart, lte: weekEnd } },
          { isRecurring: true, deletedAt: null, date: { lte: weekEnd }, OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: weekStart } }] },
          { exceptionOfId: { not: null }, date: { gte: weekStart, lte: weekEnd } }
        ]
      }
    }) as SchoolWeekReminderRecord[];
    const exceptionKeys = new Set(records.filter((record) => record.exceptionOfId && record.date).map((record) => `${record.exceptionOfId}:${this.toDateString(record.date!)}`));
    return records.some((record) => {
      if (record.exceptionOfId) return !record.deletedAt && Boolean(record.date);
      if (!record.isRecurring) return !record.deletedAt && Boolean(record.date);
      const occurrenceDate = this.dateForWeekday(weekStart, record.weekday);
      if (!record.date || occurrenceDate < this.startOfDay(record.date)) return false;
      if (record.recurrenceEndDate && occurrenceDate > this.startOfDay(record.recurrenceEndDate)) return false;
      return !exceptionKeys.has(`${record.id}:${this.toDateString(occurrenceDate)}`);
    });
  }

  private async hasFamilyNotification(familyId: string, type: string, entityType: string, entityId: string): Promise<boolean> {
    const notification = await (this.prisma.client as any).notification.findFirst({ where: { familyId, type, entityType, entityId }, select: { id: true } });
    return Boolean(notification);
  }

  private isInStableWindow(familyId: string, now: Date, startHour: number, endHour: number): boolean {
    const totalMinutes = (endHour - startHour) * 60;
    const slotMinute = startHour * 60 + (this.hashString(familyId) % totalMinutes);
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    return currentMinute >= slotMinute && currentMinute < slotMinute + 60;
  }

  private hashString(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private nextMonday(date: Date): Date {
    const start = this.startOfDay(date);
    const daysUntilMonday = ((8 - start.getDay()) % 7) || 1;
    return this.addDays(start, daysUntilMonday);
  }

  private dateForWeekday(weekStart: Date, weekday: string): Date {
    const index = weekdays.indexOf(weekday as (typeof weekdays)[number]);
    return this.addDays(weekStart, Math.max(index, 0));
  }

  private addDays(date: Date, days: number): Date { return new Date(this.startOfDay(date).getTime() + days * dayMs); }
  private startOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  private toDateString(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
  private formatWeekdayAndDate(date: Date): string { return `${norwegianWeekdays[date.getDay()]} ${date.getDate()}. ${norwegianMonths[date.getMonth()]}`; }
}
