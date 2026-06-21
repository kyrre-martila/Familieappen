import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth";
import { CalendarModule } from "./calendar";
import { ConfigModule } from "./config";
import { FamiliesModule } from "./families";
import { FeedbackModule } from "./feedback";
import { HealthModule } from "./health";
import { HuskModule } from "./husk";
import { MealsModule } from "./meals";
import { NotificationPreferencesModule } from "./notification-preferences";
import { NotificationsModule } from "./notifications";
import { PrismaModule } from "./prisma";
import { SchoolWeekModule } from "./school-week";
import { ShoppingModule } from "./shopping";
import { TasksModule } from "./tasks";
import { WishlistsModule } from "./wishlists";

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    FamiliesModule,
    FeedbackModule,
    ShoppingModule,
    TasksModule,
    MealsModule,
    CalendarModule,
    HuskModule,
    SchoolWeekModule,
    WishlistsModule,
    NotificationPreferencesModule,
    NotificationsModule
  ]
})
export class AppModule {}
