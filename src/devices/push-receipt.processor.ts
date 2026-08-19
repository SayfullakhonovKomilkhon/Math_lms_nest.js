import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

type ReceiptJob = { receipts: Array<{ id: string; token: string }> };
type ExpoReceipt = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

@Processor('push-receipts')
export class PushReceiptProcessor extends WorkerHost {
  private readonly logger = new Logger(PushReceiptProcessor.name);
  private readonly endpoint = 'https://exp.host/--/api/v2/push/getReceipts';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ReceiptJob>) {
    if (job.name !== 'check' || job.data.receipts.length === 0) return;

    const tokenById = new Map(
      job.data.receipts.map((receipt) => [receipt.id, receipt.token]),
    );
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [...tokenById.keys()] }),
    });
    if (!response.ok) {
      throw new Error(
        `Expo receipt endpoint responded with ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Record<string, ExpoReceipt>;
    };
    const receipts = payload.data ?? {};
    if (Object.keys(receipts).length === 0) {
      throw new Error('Expo receipts are not ready yet');
    }

    const invalidTokens: string[] = [];
    for (const [id, receipt] of Object.entries(receipts)) {
      if (receipt.status !== 'error') continue;
      const error =
        receipt.details?.error ?? receipt.message ?? 'unknown error';
      if (error === 'DeviceNotRegistered') {
        const token = tokenById.get(id);
        if (token) invalidTokens.push(token);
      } else {
        this.logger.warn(`Expo receipt ${id} failed: ${error}`);
      }
    }

    if (invalidTokens.length > 0) {
      await this.prisma.devicePushToken.updateMany({
        where: { token: { in: invalidTokens } },
        data: { isActive: false },
      });
    }
  }
}
