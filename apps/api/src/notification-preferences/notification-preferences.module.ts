import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { PrismaModule } from "../prisma";
import { NotificationPreferencesController } from "./notification-preferences.controller";
import { NotificationPreferencesService } from "./notification-preferences.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationPreferencesController],
  providers: [NotificationPreferencesService]
})
export class NotificationPreferencesModule {}
