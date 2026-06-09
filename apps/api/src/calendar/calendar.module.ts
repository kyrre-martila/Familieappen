import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";

@Module({
  imports: [PrismaModule, FamiliesModule, AuthModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService]
})
export class CalendarModule {}
