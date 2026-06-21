import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma";
import { AuthModule } from "../auth/auth.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PushNotificationService } from "./push-notification.service";
import { ScheduledSystemNotificationsService } from "./scheduled-system-notifications.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationService, ScheduledSystemNotificationsService],
  exports: [NotificationsService, PushNotificationService, ScheduledSystemNotificationsService]
})
export class NotificationsModule {}
