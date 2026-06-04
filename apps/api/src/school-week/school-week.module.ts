import { Module } from "@nestjs/common";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { SchoolWeekController } from "./school-week.controller";
import { SchoolWeekService } from "./school-week.service";

@Module({
  imports: [PrismaModule, FamiliesModule],
  controllers: [SchoolWeekController],
  providers: [SchoolWeekService]
})
export class SchoolWeekModule {}
