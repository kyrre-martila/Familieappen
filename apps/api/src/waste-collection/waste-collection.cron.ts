import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma";
import { WasteCollectionService } from "./waste-collection.service";
@Injectable()
export class WasteCollectionCron {
  private readonly logger = new Logger(WasteCollectionCron.name);
  constructor(private readonly prisma: PrismaService, private readonly service: WasteCollectionService) {}
  @Cron(CronExpression.EVERY_HOUR)
  async syncDue(): Promise<void> {
    const now = new Date();
    const due = await (this.prisma.client as any).wasteCollectionSubscription.findMany({ where: { enabled: true, OR: [{ nextSyncAt: null }, { nextSyncAt: { lte: now } }] }, select: { id: true }, take: 20 });
    for (const item of due) {
      const claimed = await (this.prisma.client as any).wasteCollectionSubscription.updateMany({ where: { id: item.id, enabled: true, OR: [{ nextSyncAt: null }, { nextSyncAt: { lte: now } }] }, data: { nextSyncAt: new Date(now.getTime() + 15 * 60_000) } });
      if (claimed.count !== 1) continue;
      try { await this.service.syncSubscription(item.id); } catch (error) { this.logger.warn(`Waste collection sync failed for subscription ${item.id}`); }
    }
  }
}
