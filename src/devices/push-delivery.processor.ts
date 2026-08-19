import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ExpoPushService, PushDeliveryJob } from './expo-push.service';

@Processor('push-delivery')
export class PushDeliveryProcessor extends WorkerHost {
  constructor(private readonly expoPush: ExpoPushService) {
    super();
  }

  async process(job: Job<PushDeliveryJob>) {
    if (job.name !== 'deliver') return;
    await this.expoPush.deliverToUsers(
      job.data.userIds,
      job.data.title,
      job.data.body,
      job.data.data,
    );
  }
}
