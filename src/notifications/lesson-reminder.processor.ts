import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import {
  findUpcomingLessons,
  ScheduledGroup,
} from './lesson-reminder.helper';

// Этапы напоминаний — в минутах до начала урока.
// Cron */5 даёт окно ±2.5 мин, поэтому 60 и 15 ловятся стабильно.
const REMINDER_STAGES_MIN = [60, 15];

@Injectable()
export class LessonReminderProcessor implements OnModuleDestroy {
  private readonly logger = new Logger(LessonReminderProcessor.name);
  private readonly redis: Redis;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {
    // Шарим тот же Redis, что и BullMQ — отдельный клиент чисто для
    // SETNX-ключей дедупликации.
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      // ленивое подключение, чтобы тесты не падали без Redis
      lazyConnect: false,
      maxRetriesPerRequest: null,
    });
    this.redis.on('error', (err) => {
      this.logger.error('Redis dedup client error', err);
    });
  }

  @Cron('*/5 * * * *')
  async tick() {
    const now = new Date();

    const groupsRaw = await this.prisma.group.findMany({
      where: { isActive: true, archivedAt: null },
      select: {
        id: true,
        name: true,
        schedule: true,
        teacher: { select: { userId: true } },
        students: {
          where: { student: { isActive: true } },
          select: { student: { select: { userId: true } } },
        },
      },
    });

    const groups: ScheduledGroup[] = groupsRaw.map((g) => ({
      id: g.id,
      name: g.name,
      schedule: g.schedule,
      teacherUserId: g.teacher.userId,
      studentUserIds: g.students.map((s) => s.student.userId),
    }));

    for (const stage of REMINDER_STAGES_MIN) {
      const upcoming = findUpcomingLessons(groups, now, stage);
      for (const lesson of upcoming) {
        const ok = await this.acquireLock(lesson.groupId, lesson.startUtc, stage);
        if (!ok) continue;

        const recipients = [
          ...lesson.studentUserIds,
          lesson.teacherUserId,
        ].filter(Boolean);

        try {
          await this.notifications.sendLessonReminder(
            recipients,
            lesson.groupName,
            lesson.startTime,
            stage,
          );
          this.logger.log(
            `Sent ${stage}-min reminder for group=${lesson.groupId} ` +
              `lesson=${lesson.startUtc.toISOString()} → ${recipients.length} users`,
          );
        } catch (err) {
          this.logger.error(
            `Failed to send lesson reminder for group=${lesson.groupId}`,
            err,
          );
        }
      }
    }
  }

  // SETNX with TTL — если ключ уже есть, кто-то другой (или предыдущий
  // тик cron) уже разослал реминдер. TTL=12h, чтобы пережить рестарт.
  private async acquireLock(
    groupId: string,
    lessonStart: Date,
    stage: number,
  ): Promise<boolean> {
    const key = `reminded:${groupId}:${lessonStart.toISOString()}:${stage}`;
    try {
      const result = await this.redis.set(key, '1', 'EX', 12 * 60 * 60, 'NX');
      return result === 'OK';
    } catch (err) {
      this.logger.error(`Redis lock failed for ${key}`, err);
      // При недоступности Redis — лучше отправить дубликат, чем не отправить.
      return true;
    }
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch {
      // ignore — connection may already be closed
    }
  }
}
