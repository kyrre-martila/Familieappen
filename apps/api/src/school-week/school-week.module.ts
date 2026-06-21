import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FamiliesModule } from "../families";
import { NotificationsModule } from "../notifications";
import { PrismaModule } from "../prisma";
import { SchoolWeekController } from "./school-week.controller";
import { SchoolWeekService } from "./school-week.service";

@Module({
  imports: [PrismaModule, FamiliesModule, AuthModule, NotificationsModule],
  controllers: [SchoolWeekController],
  providers: [SchoolWeekService]
})
export class SchoolWeekModule {}