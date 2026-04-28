import { Injectable, Logger } from '@nestjs/common';
import {
  AttendanceStatus,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import * as tpl from './templates';

interface SendPayload {
  type: NotificationType;
  message: string;
  channel?: NotificationChannel;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  // Public surface: persists IN_APP record + (optionally) pushes to Telegram.
  // The store-then-fanout split keeps the bell icon authoritative even when
  // bot is down or user has not linked their chat yet.
  async sendToUser(userId: string, payload: SendPayload): Promise<void> {
    const channel = payload.channel ?? NotificationChannel.IN_APP;

    await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        message: payload.message,
        channel,
        isRead: false,
      },
    });

    if (channel === NotificationChannel.TELEGRAM) {
      await this.pushTelegram(userId, payload.message);
    }
  }

  async sendToMany(userIds: string[], payload: SendPayload): Promise<void> {
    if (userIds.length === 0) return;
    const channel = payload.channel ?? NotificationChannel.IN_APP;

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type,
        message: payload.message,
        channel,
        isRead: false,
      })),
    });

    if (channel === NotificationChannel.TELEGRAM) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds }, telegramChatId: { not: null } },
        select: { telegramChatId: true },
      });
      for (const u of users) {
        if (u.telegramChatId) {
          await this.telegram.sendMessage(u.telegramChatId, payload.message);
        }
      }
    }
  }

  private async pushTelegram(userId: string, message: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    if (!user?.telegramChatId) return;
    await this.telegram.sendMessage(user.telegramChatId, message);
  }

  // Helper used by all domain notifications: stores an IN_APP record AND
  // fires a Telegram message in parallel — without forcing callers to call
  // sendToUser twice with different channels.
  private async sendBoth(
    userId: string,
    type: NotificationType,
    message: string,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        message,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      },
    });
    await this.pushTelegram(userId, message);
  }

  // ── Domain methods ──────────────────────────────────────────────────────

  async sendPaymentReminder(
    studentId: string,
    daysLeft: number,
  ): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        parents: { include: { parent: { include: { user: true } } } },
        groups: { select: { monthlyFee: true } },
      },
    });
    if (!student) return;

    const amount = student.groups.reduce(
      (acc, link) => acc + Number(link.monthlyFee),
      0,
    );

    await this.sendBoth(
      student.userId,
      NotificationType.PAYMENT,
      tpl.paymentForStudent(daysLeft, amount),
    );

    for (const link of student.parents) {
      await this.sendBoth(
        link.parent.userId,
        NotificationType.PAYMENT,
        tpl.paymentForParent(student.fullName, daysLeft, amount),
      );
    }
  }

  // Called when teacher saves attendance for a lesson — covers all 3
  // statuses (PRESENT/LATE/ABSENT) so parents always know what happened.
  async sendAttendanceToParents(
    studentId: string,
    groupId: string,
    status: AttendanceStatus,
    date: string,
  ): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parents: { include: { parent: { include: { user: true } } } },
      },
    });
    if (!student) return;

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    const groupName = group?.name ?? 'Группа';

    // Self-notification only for LATE/ABSENT — otherwise spamming students
    // for showing up.
    if (
      status === AttendanceStatus.LATE ||
      status === AttendanceStatus.ABSENT
    ) {
      await this.sendBoth(
        student.userId,
        NotificationType.ATTENDANCE,
        tpl.attendanceForStudent(status, groupName, date),
      );
    }

    for (const link of student.parents) {
      await this.sendBoth(
        link.parent.userId,
        NotificationType.ATTENDANCE,
        tpl.attendanceForParent(student.fullName, status, groupName, date),
      );
    }
  }

  // Legacy method kept so the existing `send-absence-alert` queue job stays
  // backward-compatible — internally just forwards to the unified path with
  // ABSENT status.
  async sendAbsenceAlert(studentId: string, date: string): Promise<void> {
    const attendance = await this.prisma.attendance.findFirst({
      where: { studentId, date: new Date(date) },
      orderBy: { createdAt: 'desc' },
      select: { groupId: true },
    });
    if (!attendance) return;
    await this.sendAttendanceToParents(
      studentId,
      attendance.groupId,
      AttendanceStatus.ABSENT,
      date,
    );
  }

  async sendGradeNotification(gradeId: string): Promise<void> {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        student: {
          include: {
            user: true,
            parents: { include: { parent: { include: { user: true } } } },
          },
        },
        group: { select: { name: true } },
      },
    });
    if (!grade) return;

    const score = Number(grade.score);
    const maxScore = Number(grade.maxScore);
    const groupName = grade.group.name;

    await this.sendBoth(
      grade.student.userId,
      NotificationType.GRADE,
      tpl.gradeForStudent(score, maxScore, groupName, grade.lessonType),
    );

    for (const link of grade.student.parents) {
      await this.sendBoth(
        link.parent.userId,
        NotificationType.GRADE,
        tpl.gradeForParent(
          grade.student.fullName,
          score,
          maxScore,
          groupName,
          grade.lessonType,
        ),
      );
    }
  }

  async sendSalaryNotification(
    teacherId: string,
    oldRate: number,
    newRate: number,
  ): Promise<void> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { userId: true, fullName: true },
    });
    if (!teacher) return;

    await this.sendBoth(
      teacher.userId,
      NotificationType.SALARY,
      tpl.salaryRateUpdated(oldRate, newRate),
    );
  }

  async sendLessonReminder(
    userIds: string[],
    groupName: string,
    startTime: string,
    minutesUntil: number,
  ): Promise<void> {
    if (userIds.length === 0) return;

    const message = tpl.lessonReminder(groupName, startTime, minutesUntil);

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: NotificationType.LESSON_REMINDER,
        message,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      })),
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, telegramChatId: { not: null } },
      select: { telegramChatId: true },
    });
    for (const u of users) {
      if (u.telegramChatId) {
        await this.telegram.sendMessage(u.telegramChatId, message);
      }
    }
  }

  async sendAchievementNotification(
    studentId: string,
    achievement: { title: string; icon: string },
  ): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parents: { include: { parent: { include: { user: true } } } },
      },
    });
    if (!student) return;

    await this.sendBoth(
      student.userId,
      NotificationType.ACHIEVEMENT,
      tpl.achievementForStudent(achievement.title, achievement.icon),
    );

    for (const link of student.parents) {
      await this.sendBoth(
        link.parent.userId,
        NotificationType.ACHIEVEMENT,
        tpl.achievementForParent(
          student.fullName,
          achievement.title,
          achievement.icon,
        ),
      );
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

    await this.sendBoth(
      payment.student.userId,
      NotificationType.PAYMENT,
      tpl.paymentReceiptStatus(status, reason),
    );
  }

  async sendHomeworkNotification(
    groupId: string,
    homeworkId: string,
  ): Promise<void> {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      include: { teacher: true, group: { select: { name: true } } },
    });
    if (!homework) return;

    // Fetch students with their parents to fan out — one round-trip.
    const students = await this.prisma.student.findMany({
      where: {
        isActive: true,
        groups: { some: { groupId } },
      },
      select: {
        userId: true,
        fullName: true,
        parents: { select: { parent: { select: { userId: true } } } },
      },
    });

    const studentMessage = tpl.homeworkForStudent(
      homework.teacher.fullName,
      homework.group.name,
      homework.dueDate ?? null,
    );

    for (const s of students) {
      await this.sendBoth(
        s.userId,
        NotificationType.HOMEWORK,
        studentMessage,
      );

      for (const link of s.parents) {
        await this.sendBoth(
          link.parent.userId,
          NotificationType.HOMEWORK,
          tpl.homeworkForParent(
            s.fullName,
            homework.teacher.fullName,
            homework.group.name,
            homework.dueDate ?? null,
          ),
        );
      }
    }
  }

  // ── Read API ────────────────────────────────────────────────────────────

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
