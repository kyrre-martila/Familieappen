import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { MealsController } from "./meals.controller";
import { MealsService } from "./meals.service";

@Module({
  imports: [AuthModule, FamiliesModule, PrismaModule],
  controllers: [MealsController],
  providers: [MealsService],
  exports: [MealsService]
})
export class MealsModule {}
