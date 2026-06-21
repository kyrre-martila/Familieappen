import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { NotificationsModule } from "../notifications";
import { CalendarController } from "./calendar.controller";
import { CalendarIcsController, CalendarIcsFeedController } from "./calendar-ics.controller";
import { CalendarIcsFeedService } from "./calendar-ics-feed.service";
import { CalendarIcsSyncCron } from "./calendar-ics-sync.cron";
import { CalendarIcsSyncService } from "./calendar-ics-sync.service";
import { CalendarService } from "./calendar.service";

@Module({
  imports: [PrismaModule, FamiliesModule, AuthModule, NotificationsModule],
  controllers: [CalendarController, CalendarIcsController, CalendarIcsFeedController],
  providers: [CalendarService, CalendarIcsSyncService, CalendarIcsFeedService, CalendarIcsSyncCron],
  exports: [CalendarService, CalendarIcsSyncService, CalendarIcsFeedService]
})
export class CalendarModule {}
