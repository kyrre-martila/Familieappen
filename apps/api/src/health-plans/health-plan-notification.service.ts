import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma";
import { NotificationsService } from "../notifications/notifications.service";

export const HEALTH_PLAN_NOTIFICATION_CATCH_UP_MINUTES = 30;
export const HEALTH_PLAN_NOTIFICATION_TITLE = "Helseplan";
export const HEALTH_PLAN_NOTIFICATION_BODY = "Du har en planlagt helseplan-hendelse.";

type DueOccurrence = {
  id: string;
  familyId: string;
  scheduledAt: Date;
  healthPlanId: string;
  healthPlan: { notificationRecipients: Array<{ familyMember: { userId: string | null; user: { deactivatedAt: Date | null; notificationPreferences: { healthPlansEnabled: boolean } | null } | null } }> };
};

@Injectable()
export class HealthPlanNotificationService {
  private readonly logger = new Logger(HealthPlanNotificationService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run(): Promise<void> { await this.processDue(); }

  async processDue(now = new Date()): Promise<{ processed: number; created: number; skipped: number; failed: number }> {
    const since = new Date(now.getTime() - HEALTH_PLAN_NOTIFICATION_CATCH_UP_MINUTES * 60_000);
    const occurrences = await this.prisma.client.healthPlanOccurrence.findMany({
      where: { status: { in: ["PENDING", "SNOOZED"] }, scheduledAt: { gte: since, lte: now }, healthPlan: { status: "ACTIVE" } },
      select: { id: true, familyId: true, healthPlanId: true, scheduledAt: true, healthPlan: { select: { notificationRecipients: { select: { familyMember: { select: { userId: true, user: { select: { deactivatedAt: true, notificationPreferences: { select: { healthPlansEnabled: true } } } } } } } } } } },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }], take: 500,
    }) as DueOccurrence[];
    let created = 0; let skipped = 0; let failed = 0;
    for (const occurrence of occurrences) {
      for (const recipient of occurrence.healthPlan.notificationRecipients) {
        const user = recipient.familyMember.user; const userId = recipient.familyMember.userId;
        if (!userId || !user || user.deactivatedAt || user.notificationPreferences?.healthPlansEnabled === false) { skipped += 1; continue; }
        try {
          // Re-read the eligibility immediately before ledger creation. Database
          // uniqueness below handles overlapping workers; resolved/paused rows are
          // not intentionally notified from the stale batch snapshot.
          const stillDue = await this.prisma.client.healthPlanOccurrence.findFirst({ where: { id: occurrence.id, familyId: occurrence.familyId, scheduledAt: occurrence.scheduledAt, status: { in: ["PENDING", "SNOOZED"] }, healthPlan: { status: "ACTIVE" } }, select: { id: true } });
          if (!stillDue) { skipped += 1; continue; }
          const notification = await this.notifications.createNotificationAndDeliver({
            familyId: occurrence.familyId, recipientUserId: userId, actorUserId: null,
            type: "health_plan_occurrence", title: HEALTH_PLAN_NOTIFICATION_TITLE, body: HEALTH_PLAN_NOTIFICATION_BODY,
            entityType: "healthPlanOccurrence", entityId: occurrence.id, deepLink: "/health-plans", allowSelfNotification: true,
            dedupeKey: `health-plan-occurrence:${occurrence.id}:${userId}:${occurrence.scheduledAt.toISOString()}`,
          });
          if (notification) created += 1; else skipped += 1;
        } catch (error) {
          failed += 1;
          const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
          this.logger.warn(`Health-plan notification failed occurrence=${occurrence.id} family=${occurrence.familyId} code=${code}`);
        }
      }
    }
    this.logger.log(`Health-plan notifications processed=${occurrences.length} created=${created} skipped=${skipped} failed=${failed}`);
    return { processed: occurrences.length, created, skipped, failed };
  }
}
