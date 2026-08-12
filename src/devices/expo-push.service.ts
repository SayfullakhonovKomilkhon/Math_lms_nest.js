import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PushData = Record<string, string | number | boolean | null>;

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly endpoint = 'https://exp.host/--/api/v2/push/send';

  constructor(private readonly prisma: PrismaService) {}

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: PushData,
  ) {
    return this.sendToUsers([userId], title, body, data);
  }

  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: PushData,
  ) {
    if (userIds.length === 0) return;
    const devices = await this.prisma.devicePushToken.findMany({
      where: { userId: { in: userIds }, isActive: true },
      select: { token: true },
    });
    if (devices.length === 0) return;

    for (let offset = 0; offset < devices.length; offset += 100) {
      const chunk = devices.slice(offset, offset + 100);
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            chunk.map(({ token }) => ({
              to: token,
              sound: 'default',
              title,
              body: this.toPlainText(body),
              data: data ?? {},
              priority: 'high',
              channelId: 'default',
            })),
          ),
        });

        if (!response.ok) {
          this.logger.warn(`Expo push responded with ${response.status}`);
          continue;
        }

        const payload = (await response.json()) as { data?: ExpoTicket[] };
        const invalidTokens = chunk
          .filter(
            (_, index) =>
              payload.data?.[index]?.details?.error === 'DeviceNotRegistered',
          )
          .map((device) => device.token);
        if (invalidTokens.length > 0) {
          await this.prisma.devicePushToken.updateMany({
            where: { token: { in: invalidTokens } },
            data: { isActive: false },
          });
        }
      } catch (error) {
        this.logger.warn(
          `Expo push delivery failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private toPlainText(value: string) {
    return value
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
