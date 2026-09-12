import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma";
import { NotificationDto } from "./dto/notifications.dto";

type ExpoTicket = { details?: { error?: string } };

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendToUser(userId: string, notification: NotificationDto): Promise<void> {
    const devices = await this.prisma.client.pushDevice.findMany({
      where: { userId, disabledAt: null },
      select: { id: true, expoPushToken: true },
    }) as Array<{ id: string; expoPushToken: string }>;
    if (!devices.length) return;

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(devices.map(device => ({
          to: device.expoPushToken,
          title: notification.title,
          body: notification.body,
          data: { deepLink: notification.deepLink, notificationId: notification.id },
        }))),
      });
      if (!response.ok) throw new Error(`expo-http-${response.status}`);
      const payload = await response.json() as { data?: ExpoTicket[] };
      const tickets = Array.isArray(payload.data) ? payload.data : [];
      await Promise.all(devices.map(async (device, index) => {
        if (tickets[index]?.details?.error === "DeviceNotRegistered") {
          await this.prisma.client.pushDevice.updateMany({
            where: { id: device.id, userId, disabledAt: null }, data: { disabledAt: new Date() },
          });
        }
      }));
    } catch (error) {
      const code = error instanceof Error && /^expo-http-\d+$/.test(error.message) ? error.message : "transport-error";
      this.logger.warn(`Expo push delivery failed user=${userId} code=${code}`);
    }
  }
}
