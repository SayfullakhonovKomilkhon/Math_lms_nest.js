import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('push-receipts') private readonly receiptsQueue: Queue,
  ) {}

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
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) return;
    const devices = await this.prisma.devicePushToken.findMany({
      where: { userId: { in: uniqueUserIds }, isActive: true },
      select: { token: true },
    });
    if (devices.length === 0) return;

    const uniqueDevices = [
      ...new Map(devices.map((item) => [item.token, item])).values(),
    ];

    for (let offset = 0; offset < uniqueDevices.length; offset += 100) {
      const chunk = uniqueDevices.slice(offset, offset + 100);
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
              channelId: this.channelIdFor(data),
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

        const receipts = chunk.flatMap((device, index) => {
          const ticket = payload.data?.[index];
          if (ticket?.status !== 'ok' || !ticket.id) {
            if (ticket?.status === 'error') {
              this.logger.warn(
                `Expo rejected push: ${ticket.details?.error ?? ticket.message ?? 'unknown error'}`,
              );
            }
            return [];
          }
          return [{ id: ticket.id, token: device.token }];
        });
        if (receipts.length > 0) {
          await this.receiptsQueue.add(
            'check',
            { receipts },
            {
              delay: 15 * 60 * 1000,
              attempts: 3,
              backoff: { type: 'exponential', delay: 5 * 60 * 1000 },
              removeOnComplete: 100,
              removeOnFail: 250,
            },
          );
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

  private channelIdFor(data?: PushData) {
    switch (data?.screen) {
      case 'schedule':
        return 'lessons';
      case 'grades':
      case 'attendance':
      case 'homework':
      case 'achievements':
        return 'progress';
      case 'payment':
        return 'payments';
      default:
        return 'general';
    }
  }
}
