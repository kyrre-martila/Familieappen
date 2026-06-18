import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma";
import { CalendarIcsSyncService } from "./calendar-ics-sync.service";

type DueIcsSource = {
  id: string;
  familyId: string;
  syncIntervalMinutes: number;
};

const BATCH_SIZE = 25;
const CLAIM_MINUTES = 15;
const SUCCESS_JITTER_MINUTES = 15;
const FAILURE_RETRY_MINUTES_MIN = 15;
const FAILURE_RETRY_MINUTES_MAX = 30;

@Injectable()
export class CalendarIcsSyncCron {
  private readonly logger = new Logger(CalendarIcsSyncCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: CalendarIcsSyncService
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncDueSources(): Promise<void> {
    const now = new Date();
    const sources = await (this.prisma.client as any).calendarIcsSource.findMany({
      where: {
        active: true,
        OR: [{ nextSyncAt: null }, { nextSyncAt: { lte: now } }]
      },
      orderBy: [{ nextSyncAt: "asc" }, { createdAt: "asc" }],
      take: BATCH_SIZE,
      select: { id: true, familyId: true, syncIntervalMinutes: true }
    }) as DueIcsSource[];

    if (sources.length === 0) return;

    this.logger.log(`Starting automatic ICS sync for ${sources.length} source(s)`);

    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (const source of sources) {
      const claimed = await this.claimSource(source.id, now);
      if (!claimed) {
        skipped += 1;
        continue;
      }

      try {
        const result = await this.syncService.syncSource(source.familyId, source.id);
        if (result.source.lastSyncStatus === "error") {
          failed += 1;
          this.logger.warn(`Automatic ICS sync failed for source ${source.id}: ${result.source.lastSyncError ?? "Unknown error"}`);
          await this.scheduleRetry(source.id);
          continue;
        }

        synced += 1;
        await this.scheduleNextSync(source.id, source.syncIntervalMinutes);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "Unknown ICS sync error";
        this.logger.warn(`Automatic ICS sync failed for source ${source.id}: ${message}`);
        await this.scheduleRetry(source.id);
      }
    }

    this.logger.log(`Finished automatic ICS sync: ${synced} succeeded, ${failed} failed, ${skipped} skipped`);
  }

  private async claimSource(sourceId: string, dueAt: Date): Promise<boolean> {
    const result = await (this.prisma.client as any).calendarIcsSource.updateMany({
      where: {
        id: sourceId,
        active: true,
        OR: [{ nextSyncAt: null }, { nextSyncAt: { lte: dueAt } }]
      },
      data: {
        lastSyncStartedAt: new Date(),
        nextSyncAt: addMinutes(new Date(), CLAIM_MINUTES)
      }
    }) as { count: number };

    return result.count === 1;
  }

  private async scheduleNextSync(sourceId: string, syncIntervalMinutes: number): Promise<void> {
    await (this.prisma.client as any).calendarIcsSource.update({
      where: { id: sourceId },
      data: { nextSyncAt: addRandomMinutes(new Date(), syncIntervalMinutes, syncIntervalMinutes + SUCCESS_JITTER_MINUTES) }
    });
  }

  private async scheduleRetry(sourceId: string): Promise<void> {
    await (this.prisma.client as any).calendarIcsSource.update({
      where: { id: sourceId },
      data: { nextSyncAt: addRandomMinutes(new Date(), FAILURE_RETRY_MINUTES_MIN, FAILURE_RETRY_MINUTES_MAX) }
    });
  }
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addRandomMinutes(date: Date, minMinutes: number, maxMinutes: number): Date {
  const jitterMinutes = minMinutes + Math.random() * (maxMinutes - minMinutes);
  return addMinutes(date, Math.round(jitterMinutes));
}
