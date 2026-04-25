import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface SendPayload {
  type: NotificationType;
  message: string;
  channel?: NotificationChannel;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async sendToUser(userId: string, payload: SendPayload): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        message: payload.message,
        channel: payload.channel ?? NotificationChannel.IN_APP,
        isRead: false,
      },
    });

    if (payload.channel === NotificationChannel.TELEGRAM) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true },
      });
      if (user?.telegramChatId) {
        // TelegramService will be injected lazily to avoid circular deps
        this.logger.log(
          `[Telegram] Would send to ${user.telegramChatId}: ${payload.message}`,
        );
      }
    }
  }

  async sendToMany(userIds: string[], payload: SendPayload): Promise<void> {
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type,
        message: payload.message,
        channel: payload.channel ?? NotificationChannel.IN_APP,
        isRead: false,
      })),
    });
  }

  async sendPaymentReminder(
    studentId: string,
    daysLeft: number,
  ): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        parent: { include: { user: true } },
      },
    });
    if (!student) return;

    const amount = Number(student.monthlyFee);
    const message =
      daysLeft > 0
        ? `💳 До оплаты осталось ${daysLeft} дней. Сумма: ${amount.toLocaleString('ru-RU')} сум`
        : `⚠️ Срок оплаты прошёл. Сумма: ${amount.toLocaleString('ru-RU')} сум`;

    await this.sendToUser(student.userId, {
      type: NotificationType.PAYMENT,
      message,
    });
    if (student.parent) {
      await this.sendToUser(student.parent.userId, {
        type: NotificationType.PAYMENT,
        message,
      });
    }
  }

  async sendAbsenceAlert(studentId: string, date: string): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: { include: { user: true } } },
    });
    if (!student?.parent) return;

    const message = `⚠️ ${student.fullName} не пришёл на урок ${date}`;
    await this.sendToUser(student.parent.userId, {
      type: NotificationType.ATTENDANCE,
      message,
    });
  }

  async sendAchievementNotification(
    studentId: string,
    achievement: { title: string; icon: string },
  ): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { parent: { include: { user: true } } },
    });
    if (!student) return;

    await this.sendToUser(student.userId, {
      type: NotificationType.ACHIEVEMENT,
      message: `🏆 Новое достижение: ${achievement.title} ${achievement.icon}`,
    });

    if (student.parent) {
      await this.sendToUser(student.parent.userId, {
        type: NotificationType.ACHIEVEMENT,
        message: `🏆 ${student.fullName} получил новое достижение: ${achievement.title} ${achievement.icon}`,
      });
    }
  }

  async sendReceiptStatusNotification(
    paymentId: string,
    status: 'CONFIRMED' | 'REJECTED',
    reason?: string,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { student: { include: { user: true } } },
    });
    if (!payment) return;

    const statusText =
      status === 'CONFIRMED' ? '✅ подтверждён' : '❌ отклонён';
    let message = `💳 Ваш чек об оплате ${statusText}`;
    if (status === 'REJECTED' && reason) {
      message += `. Причина: ${reason}`;
    }

    await this.sendToUser(payment.student.userId, {
      type: NotificationType.PAYMENT,
      message,
    });
  }

  async sendHomeworkNotification(
    groupId: string,
    homeworkId: string,
  ): Promise<void> {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      include: { teacher: true },
    });
    if (!homework) return;

    const students = await this.prisma.student.findMany({
      where: { groupId, isActive: true },
      select: { userId: true },
    });

    const message = `📚 Новое домашнее задание от ${homework.teacher.fullName}`;
    const userIds = students.map((s) => s.userId);
    if (userIds.length > 0) {
      await this.sendToMany(userIds, {
        type: NotificationType.HOMEWORK,
        message,
      });
    }
  }

  async getNotifications(
    userId: string,
    params: {
      isRead?: boolean;
      type?: NotificationType;
      limit?: number;
      page?: number;
    },
  ) {
    const limit = params.limit ?? 20;
    const page = params.page ?? 0;
    const where: any = { userId };
    if (params.isRead !== undefined) where.isRead = params.isRead;
    if (params.type) where.type = params.type;

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: page * limit,
      }),
    ]);

    return { total, notifications };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
