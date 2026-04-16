import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {
    super();
  }

  // Every day at 09:00
  @Cron('0 9 * * *')
  async checkPaymentReminders() {
    this.logger.log('Checking payment reminders...');
    await this.notificationsQueue.add('check-payment-reminders', {});
  }

  async process(job: Job) {
    try {
      switch (job.name) {
        case 'check-payment-reminders':
          return await this.processPaymentReminders();
        case 'send-absence-alert':
          return await this.notificationsService.sendAbsenceAlert(
            job.data.studentId,
            job.data.date,
          );
        case 'send-homework-notification':
          return await this.notificationsService.sendHomeworkNotification(
            job.data.groupId,
            job.data.homeworkId,
          );
      }
    } catch (err) {
      console.error(`[NotificationsProcessor] Error processing job ${job.name} (${job.id}):`, err);
      // Don't rethrow — log and continue so queue doesn't stall
    }
  }

  private async processPaymentReminders() {
    const settings = await this.prisma.setting.findMany({
      where: {
        key: { in: ['payment_reminder_days_1', 'payment_reminder_days_2', 'payment_reminder_days_3'] },
      },
    });

    const reminderDays = settings.map((s) => parseInt(s.value, 10)).filter((d) => !isNaN(d));

    const now = new Date();
    const activeStudents = await this.prisma.student.findMany({
      where: { isActive: true },
      include: {
        payments: {
          where: { status: PaymentStatus.CONFIRMED },
          orderBy: { confirmedAt: 'desc' },
          take: 1,
          select: { nextPaymentDate: true },
        },
      },
    });

    for (const student of activeStudents) {
      const lastPayment = student.payments[0];
      if (!lastPayment?.nextPaymentDate) continue;

      const nextDate = new Date(lastPayment.nextPaymentDate);
      const diffMs = nextDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        await this.notificationsService.sendPaymentReminder(student.id, daysLeft);
      } else if (reminderDays.includes(daysLeft)) {
        await this.notificationsService.sendPaymentReminder(student.id, daysLeft);
      }
    }
  }
}
