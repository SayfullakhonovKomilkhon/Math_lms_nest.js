import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import {
  attendanceReminderPhase,
  lessonOccurrencesForTashkentDay,
  nextAttendanceReminderAt,
  tashkentDayBounds,
  TASHKENT_TIME_ZONE,
} from './attendance-reminder.helper';

const FIVE_MINUTES = 5 * 60 * 1000;

@Injectable()
export class AttendanceReminderProcessor {
  private readonly logger = new Logger(AttendanceReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('* * * * *', { timeZone: TASHKENT_TIME_ZONE })
  async tick(now = new Date()): Promise<void> {
    try {
      await this.materializeTodaysLessons(now);
      await this.processDueSessions(now);
    } catch (error) {
      this.logger.error('Attendance reminder tick failed', error);
    }
  }

  private async materializeTodaysLessons(now: Date): Promise<void> {
    const groups = await this.prisma.group.findMany({
      where: {
        isActive: true,
        archivedAt: null,
        teacher: { isActive: true, user: { isActive: true } },
      },
      select: {
        id: true,
        schedule: true,
        students: {
          where: { student: { isActive: true } },
          select: { studentId: true },
        },
      },
    });

    for (const group of groups) {
      for (const lesson of lessonOccurrencesForTashkentDay(
        group.schedule,
        now,
      )) {
        const firstReminderAt = new Date(lesson.start.getTime() - FIVE_MINUTES);
        if (now.getTime() < firstReminderAt.getTime()) continue;

        const expectedStudentIds = Array.from(
          new Set(group.students.map((link) => link.studentId)),
        );

        await this.prisma.attendanceReminderSession.upsert({
          where: {
            groupId_scheduledStart: {
              groupId: group.id,
              scheduledStart: lesson.start,
            },
          },
          update: {},
          create: {
            groupId: group.id,
            scheduledStart: lesson.start,
            scheduledEnd: lesson.end,
            expectedStudentIds,
            nextReminderAt: firstReminderAt,
            completedAt: expectedStudentIds.length === 0 ? now : null,
          },
        });
      }
    }
  }

  private async processDueSessions(now: Date): Promise<void> {
    const sessions = await this.prisma.attendanceReminderSession.findMany({
      where: { completedAt: null, nextReminderAt: { lte: now } },
      include: {
        group: {
          select: {
            name: true,
            teacher: {
              select: { userId: true, user: { select: { isActive: true } } },
            },
          },
        },
      },
      orderBy: { nextReminderAt: 'asc' },
      take: 100,
    });

    for (const session of sessions) {
      const expectedStudentIds = Array.from(
        new Set(session.expectedStudentIds),
      );
      if (expectedStudentIds.length === 0) {
        await this.completeSession(session.id, now);
        continue;
      }

      const bounds = tashkentDayBounds(session.scheduledStart);
      const marked = await this.prisma.attendance.findMany({
        where: {
          groupId: session.groupId,
          studentId: { in: expectedStudentIds },
          date: { gte: bounds.start, lt: bounds.end },
        },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      const markedIds = new Set(marked.map((record) => record.studentId));
      const missingCount = expectedStudentIds.filter(
        (studentId) => !markedIds.has(studentId),
      ).length;

      if (missingCount === 0) {
        await this.completeSession(session.id, now);
        continue;
      }

      // Atomically claim this due reminder. This prevents duplicate messages
      // if two API instances run the cron at the same minute.
      const claimUntil = new Date(now.getTime() + FIVE_MINUTES);
      const claimed = await this.prisma.attendanceReminderSession.updateMany({
        where: {
          id: session.id,
          completedAt: null,
          nextReminderAt: session.nextReminderAt,
        },
        data: { nextReminderAt: claimUntil },
      });
      if (claimed.count === 0) continue;

      const phase = attendanceReminderPhase(
        now,
        session.scheduledStart,
        session.scheduledEnd,
      );

      try {
        if (session.group.teacher.user.isActive) {
          await this.notifications.sendAttendanceReminder(
            session.group.teacher.userId,
            session.group.name,
            phase,
            expectedStudentIds.length - missingCount,
            expectedStudentIds.length,
          );
        }

        await this.prisma.attendanceReminderSession.update({
          where: { id: session.id },
          data: {
            lastReminderAt: now,
            nextReminderAt: nextAttendanceReminderAt(
              now,
              session.scheduledStart,
              session.scheduledEnd,
            ),
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed attendance reminder for group=${session.groupId}`,
          error,
        );
        // The five-minute claim expires automatically via nextReminderAt,
        // allowing the scheduler to retry a transient failure.
      }
    }
  }

  private async completeSession(id: string, completedAt: Date): Promise<void> {
    await this.prisma.attendanceReminderSession.updateMany({
      where: { id, completedAt: null },
      data: { completedAt },
    });
  }
}
