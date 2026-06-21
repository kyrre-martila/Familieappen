import { Injectable } from "@nestjs/common";
import { NotificationDto } from "./dto/notifications.dto";

@Injectable()
export class PushNotificationService {
  async sendToUser(_userId: string, _notification: NotificationDto): Promise<void> {
    // Placeholder for future Expo push delivery. Intentionally inactive.
  }
}
