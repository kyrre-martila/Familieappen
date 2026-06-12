import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { CalendarController } from "./calendar.controller";
import { CalendarIcsController, CalendarIcsFeedController } from "./calendar-ics.controller";
import { CalendarIcsFeedService } from "./calendar-ics-feed.service";
import { CalendarIcsSyncService } from "./calendar-ics-sync.service";
import { CalendarService } from "./calendar.service";

@Module({
  imports: [PrismaModule, FamiliesModule, AuthModule],
  controllers: [CalendarController, CalendarIcsController, CalendarIcsFeedController],
  providers: [CalendarService, CalendarIcsSyncService, CalendarIcsFeedService],
  exports: [CalendarService, CalendarIcsSyncService, CalendarIcsFeedService]
})
export class CalendarModule {}
