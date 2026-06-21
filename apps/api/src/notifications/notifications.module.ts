import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PushNotificationService } from "./push-notification.service";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationService],
  exports: [NotificationsService, PushNotificationService]
})
export class NotificationsModule {}
