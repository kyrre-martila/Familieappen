import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { CalendarModule } from "./calendar";
import { ConfigModule } from "./config";
import { FamiliesModule } from "./families";
import { HealthModule } from "./health";
import { MealsModule } from "./meals";
import { PrismaModule } from "./prisma";
import { ShoppingModule } from "./shopping";
import { TasksModule } from "./tasks";

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule, AuthModule, FamiliesModule, ShoppingModule, TasksModule, MealsModule, CalendarModule]
})
export class AppModule {}
