import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsProcessor extends WorkerHost {
    private notificationsService;
    private prisma;
    private notificationsQueue;
    private readonly logger;
    constructor(notificationsService: NotificationsService, prisma: PrismaService, notificationsQueue: Queue);
    checkPaymentReminders(): Promise<void>;
    process(job: Job): Promise<void>;
    private processPaymentReminders;
}
