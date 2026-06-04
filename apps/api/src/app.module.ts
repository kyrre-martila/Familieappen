import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { CalendarModule } from "./calendar";
import { ConfigModule } from "./config";
import { FamiliesModule } from "./families";
import { HealthModule } from "./health";
import { HuskModule } from "./husk";
import { MealsModule } from "./meals";
import { PrismaModule } from "./prisma";
import { ShoppingModule } from "./shopping";
import { TasksModule } from "./tasks";
import { WishlistsModule } from "./wishlists";

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule, AuthModule, FamiliesModule, ShoppingModule, TasksModule, MealsModule, CalendarModule, HuskModule, WishlistsModule]
})
export class AppModule {}
