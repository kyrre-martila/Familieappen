import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { CalendarModule } from "./calendar";
import { ConfigModule } from "./config";
import { FamiliesModule } from "./families";
import { HealthModule } from "./health";
import { HuskModule } from "./husk";
import { MealsModule } from "./meals";
import { NotificationPreferencesModule } from "./notification-preferences";
import { PrismaModule } from "./prisma";
import { SchoolWeekModule } from "./school-week";
import { ShoppingModule } from "./shopping";
import { TasksModule } from "./tasks";
import { WishlistsModule } from "./wishlists";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    FamiliesModule,
    ShoppingModule,
    TasksModule,
    MealsModule,
    CalendarModule,
    HuskModule,
    SchoolWeekModule,
    WishlistsModule,
    NotificationPreferencesModule
  ]
})
export class AppModule {}
