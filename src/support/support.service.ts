import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExpoPushService } from '../devices/expo-push.service';
import {
  AvailabilityDto,
  BookingDto,
  FeedbackDto,
  MoveDto,
  ReasonDto,
  ResultDto,
  TimeOffDto,
} from './support.dto';
import {
  clashesWithSchedule,
  DAY,
  localDate,
  midnight,
  MINUTE,
  overlaps,
} from './support-time';
export type SupportActor = { id: string; role: Role };
type DB = Prisma.TransactionClient;
const person = { id: true, fullName: true } as const;
const bookingInclude = {
  student: { select: person },
  session: { include: { teacher: { select: person } } },
  referrer: { select: person },
  feedback: { include: { group: { select: { id: true, name: true } } } },
} satisfies Prisma.SupportBookingInclude;

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: ExpoPushService,
  ) {}

  // All support scheduling writes share a DB lock across API instances. The
  // capacity/conflict reads occur AFTER this lock under READ COMMITTED.
  private transaction<T>(work: (db: DB) => Promise<T>) {
    return this.prisma.$transaction(
      async (db) => {
        await db.$executeRaw`SELECT pg_advisory_xact_lock(73510421)`;
        return work(db);
      },
      { timeout: 15000, maxWait: 10000 },
    );
  }
  private async teacher(db: DB, user: SupportActor) {
    const teacher = await db.teacher.findFirst({
      where: { userId: user.id, isActive: true, user: { isActive: true } },
    });
    if (!teacher || user.role !== Role.TEACHER)
      throw new ForbiddenException('Нужен активный профиль преподавателя');
    return teacher;
  }
  private async referral(db: DB, id: string, teacherId: string) {
    if (!id) throw new BadRequestException('Выберите отзыв об уроке');
    const feedback = await db.lessonFeedback.findUnique({ where: { id } });
    if (!feedback) throw new NotFoundException('Отзыв не найден');
    if (
      feedback.teacherId !== teacherId &&
      !(await db.supportBooking.findFirst({
        where: { feedbackId: id, session: { teacherId } },
      }))
    ) {
      throw new ForbiddenException('Нет доступа к этому ученику');
    }
    return feedback;
  }
  private async family(db: DB, studentId: string) {
    const student = await db.student.findUniqueOrThrow({
      where: { id: studentId },
      select: {
        userId: true,
        parents: { select: { parent: { select: { userId: true } } } },
      },
    });
    return [student.userId, ...student.parents.map((x) => x.parent.userId)];
  }
  private async notify(db: DB, userIds: string[], message: string) {
    const ids = [...new Set(userIds)];
    await db.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        message,
        type: 'LESSON_REMINDER',
        data: { feature: 'support', screen: 'support' },
      })),
    });
    await db.supportPushOutbox.create({ data: { userIds: ids, message } });
  }
  private async bookingNotice(
    db: DB,
    id: string,
    message: string,
    extra: string[] = [],
  ) {
    const b = await db.supportBooking.findUniqueOrThrow({
      where: { id },
      include: {
        student: true,
        session: { include: { teacher: true } },
        referrer: true,
      },
    });
    const time = b.session.startAt.toLocaleString('ru-RU', {
      timeZone: 'Asia/Tashkent',
      dateStyle: 'short',
      timeStyle: 'short',
    });
    await this.notify(
      db,
      [
        ...(await this.family(db, b.studentId)),
        b.session.teacher.userId,
        b.referrer.userId,
        ...extra,
      ],
      `${b.student.fullName}: ${message}. ${time} (Ташкент), ${b.session.teacher.fullName}, ${b.session.location}.`,
    );
  }
  async groupFeedback(groupId: string, date: string, user: SupportActor) {
    if (
      !groupId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ||
      !Number.isFinite(Date.parse(date))
    )
      throw new BadRequestException('Укажите группу и дату');
    const teacher = await this.teacher(this.prisma, user);
    if (
      !(await this.prisma.group.findFirst({
        where: { id: groupId, teacherId: teacher.id },
      }))
    )
      throw new ForbiddenException();
    return this.prisma.lessonFeedback.findMany({
      where: { groupId, date: new Date(date) },
      orderBy: { createdAt: 'asc' },
    });
  }
  async saveFeedback(dto: FeedbackDto, user: SupportActor) {
    if (dto.date > localDate(new Date()))
      throw new BadRequestException('Нельзя оставлять отзыв о будущем уроке');
    if (!dto.topic.trim()) throw new BadRequestException('Укажите тему урока');
    return this.transaction(async (db) => {
      const teacher = await this.teacher(db, user);
      const membership = await db.studentGroup.findFirst({
        where: {
          groupId: dto.groupId,
          studentId: dto.studentId,
          group: { teacherId: teacher.id, isActive: true },
          student: { isActive: true },
        },
      });
      if (!membership)
        throw new ForbiddenException(
          'Ученик должен быть в вашей активной группе',
        );
      const { date, ...values } = dto;
      const feedback = await db.lessonFeedback.upsert({
        where: {
          groupId_studentId_date: {
            groupId: dto.groupId,
            studentId: dto.studentId,
            date: new Date(date),
          },
        },
        create: { ...values, date: new Date(date), teacherId: teacher.id },
        update: { ...values, teacherId: teacher.id },
      });
      await this.notify(
        db,
        await this.family(db, dto.studentId),
        `Преподаватель оставил отзыв за ${date}: ${dto.topic}. Подробности в разделе «Отзывы и помощь».`,
      );
      return feedback;
    });
  }
  async overview(user: SupportActor) {
    const staff = user.role === Role.TEACHER;
    const teacher = staff ? await this.teacher(this.prisma, user) : null;
    const studentScope: Prisma.StudentWhereInput =
      user.role === Role.STUDENT
        ? { userId: user.id }
        : { parents: { some: { parent: { userId: user.id } } } };
    const bookingWhere: Prisma.SupportBookingWhereInput = teacher
      ? {
          OR: [
            { referrerId: teacher.id },
            { session: { teacherId: teacher.id } },
          ],
        }
      : { student: studentScope };
    const [bookings, feedback, availability, timeOff] = await Promise.all([
      this.prisma.supportBooking.findMany({
        where: {
          ...bookingWhere,
          session: { startAt: { gte: new Date(Date.now() - 90 * DAY) } },
        },
        include: bookingInclude,
        orderBy: { session: { startAt: 'asc' } },
        take: 1000,
      }),
      this.prisma.lessonFeedback.findMany({
        where: teacher ? { teacherId: teacher.id } : { student: studentScope },
        include: {
          student: { select: person },
          teacher: { select: person },
          group: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      teacher
        ? this.prisma.supportAvailability.findMany({
            where: { teacherId: teacher.id },
            orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
          })
        : [],
      teacher
        ? this.prisma.supportTimeOff.findMany({
            where: { teacherId: teacher.id, endAt: { gt: new Date() } },
            orderBy: { startAt: 'asc' },
          })
        : [],
    ]);
    return {
      teacherId: teacher?.id,
      availability,
      timeOff,
      feedback: feedback.map(({ privateNote, ...f }) =>
        staff ? { ...f, privateNote } : f,
      ),
      bookings: bookings.map(({ feedback: f, ...b }) => {
        const { privateNote: _privateNote, ...publicFeedback } = f;
        return { ...b, feedback: staff ? f : publicFeedback };
      }),
    };
  }
  async teachers() {
    return this.prisma.teacher.findMany({
      where: {
        isActive: true,
        user: { isActive: true },
        OR: [
          { supportAvailability: { some: {} } },
          { supportSessions: { some: { startAt: { gt: new Date() } } } },
        ],
      },
      select: person,
      orderBy: { fullName: 'asc' },
    });
  }
  async setAvailability(dto: AvailabilityDto, user: SupportActor) {
    for (const [i, w] of dto.windows.entries()) {
      if (w.endMinute - w.startMinute < w.duration || !w.location.trim())
        throw new BadRequestException(
          'Проверьте длительность окна и место занятия',
        );
      if (
        dto.windows
          .slice(i + 1)
          .some(
            (x) =>
              x.weekday === w.weekday &&
              x.startMinute < w.endMinute &&
              w.startMinute < x.endMinute,
          )
      )
        throw new BadRequestException('Окна доступности пересекаются');
    }
    return this.transaction(async (db) => {
      const teacher = await this.teacher(db, user);
      await db.supportAvailability.deleteMany({
        where: { teacherId: teacher.id },
      });
      await db.supportAvailability.createMany({
        data: dto.windows.map((w) => ({ ...w, teacherId: teacher.id })),
      });
      return { saved: true };
    });
  }
  async addTimeOff(dto: TimeOffDto, user: SupportActor) {
    const startAt = new Date(dto.startAt),
      endAt = new Date(dto.endAt);
    if (
      endAt <= startAt ||
      endAt <= new Date() ||
      endAt.getTime() - startAt.getTime() > 366 * DAY ||
      !dto.reason.trim()
    )
      throw new BadRequestException('Проверьте даты и причину отсутствия');
    return this.transaction(async (db) => {
      const teacher = await this.teacher(db, user);
      if (
        await db.supportBooking.findFirst({
          where: {
            status: 'BOOKED',
            session: {
              teacherId: teacher.id,
              startAt: { lt: endAt },
              endAt: { gt: startAt },
            },
          },
        })
      )
        throw new ConflictException(
          'Сначала перенесите или отмените записи на это время',
        );
      return db.supportTimeOff.create({
        data: {
          teacherId: teacher.id,
          startAt,
          endAt,
          reason: dto.reason.trim(),
        },
      });
    });
  }
  async deleteTimeOff(id: string, user: SupportActor) {
    return this.transaction(async (db) => {
      const teacher = await this.teacher(db, user);
      return db.supportTimeOff.deleteMany({
        where: { id, teacherId: teacher.id },
      });
    });
  }
  private async available(
    db: DB,
    teacherId: string,
    studentId: string,
    ignoreBooking?: string,
  ) {
    const now = new Date(),
      until = new Date(Date.now() + 28 * DAY);
    const teacher = await db.teacher.findFirst({
      where: { id: teacherId, isActive: true, user: { isActive: true } },
      include: {
        supportAvailability: true,
        groups: { where: { isActive: true } },
        supportTimeOff: {
          where: { endAt: { gt: now }, startAt: { lt: until } },
        },
      },
    });
    const student = await db.student.findFirst({
      where: { id: studentId, isActive: true, user: { isActive: true } },
      include: {
        groups: {
          where: { group: { isActive: true } },
          include: { group: true },
        },
      },
    });
    if (!teacher || !student)
      throw new BadRequestException('Преподаватель или ученик недоступен');
    const [sessions, studentBookings] = await Promise.all([
      db.supportSession.findMany({
        where: { teacherId, endAt: { gt: now }, startAt: { lt: until } },
        include: {
          bookings: {
            where: {
              status: { not: 'CANCELLED' },
              ...(ignoreBooking ? { id: { not: ignoreBooking } } : {}),
            },
            select: { id: true },
          },
        },
      }),
      db.supportBooking.findMany({
        where: {
          studentId,
          status: 'BOOKED',
          ...(ignoreBooking ? { id: { not: ignoreBooking } } : {}),
          session: { endAt: { gt: now }, startAt: { lt: until } },
        },
        include: { session: true },
      }),
    ]);
    const candidates = new Map<
      string,
      {
        startAt: Date;
        endAt: Date;
        capacity: number;
        location: string;
        sessionId?: string;
        remaining: number;
      }
    >();
    for (let day = midnight(now).getTime(); day < until.getTime(); day += DAY) {
      const weekday = new Date(day + 5 * 60 * MINUTE).getUTCDay();
      for (const w of teacher.supportAvailability.filter(
        (w) => w.weekday === weekday,
      )) {
        for (
          let m = w.startMinute;
          m + w.duration <= w.endMinute;
          m += w.duration
        ) {
          const startAt = new Date(day + m * MINUTE),
            endAt = new Date(day + (m + w.duration) * MINUTE);
          candidates.set(startAt.toISOString(), {
            startAt,
            endAt,
            capacity: w.capacity,
            remaining: w.capacity,
            location: w.location,
          });
        }
      }
    }
    // Existing sessions retain their capacity and location after timetable edits.
    for (const s of sessions.filter(
      (s) => s.bookings.length > 0 || candidates.has(s.startAt.toISOString()),
    ))
      candidates.set(s.startAt.toISOString(), {
        startAt: s.startAt,
        endAt: s.endAt,
        capacity: s.capacity,
        location: s.location,
        sessionId: s.id,
        remaining: s.capacity - s.bookings.length,
      });
    return [...candidates.values()]
      .filter((s) => {
        if (s.startAt <= now || s.startAt >= until || s.remaining <= 0)
          return false;
        if (
          teacher.groups.some((g) =>
            clashesWithSchedule(g.schedule, s.startAt, s.endAt),
          ) ||
          student.groups.some((g) =>
            clashesWithSchedule(g.group.schedule, s.startAt, s.endAt),
          )
        )
          return false;
        if (
          teacher.supportTimeOff.some((t) =>
            overlaps(s.startAt, s.endAt, t.startAt, t.endAt),
          )
        )
          return false;
        if (
          studentBookings.some((b) =>
            overlaps(s.startAt, s.endAt, b.session.startAt, b.session.endAt),
          )
        )
          return false;
        return !sessions.some(
          (other) =>
            other.id !== s.sessionId &&
            other.bookings.length > 0 &&
            overlaps(s.startAt, s.endAt, other.startAt, other.endAt),
        );
      })
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }
  async slots(
    teacherId: string,
    feedbackId: string,
    user: SupportActor,
    bookingId?: string,
  ) {
    if (!teacherId) throw new BadRequestException('Выберите суппорта');
    const teacher = await this.teacher(this.prisma, user);
    const f = await this.referral(this.prisma, feedbackId, teacher.id);
    if (bookingId) {
      const booking = await this.managedBooking(
        this.prisma,
        bookingId,
        teacher.id,
      );
      if (booking.feedbackId !== feedbackId)
        throw new BadRequestException('Запись не соответствует отзыву');
    }
    return this.available(this.prisma, teacherId, f.studentId, bookingId);
  }
  private async createBooking(
    db: DB,
    dto: BookingDto,
    teacherId: string,
    ignoreBooking?: string,
  ) {
    const f = await this.referral(db, dto.feedbackId, teacherId);
    if (!dto.task.trim())
      throw new BadRequestException('Укажите задачу занятия');
    const slot = (
      await this.available(db, dto.teacherId, f.studentId, ignoreBooking)
    ).find((s) => s.startAt.getTime() === new Date(dto.startAt).getTime());
    if (!slot)
      throw new ConflictException(
        'Время уже занято или недоступно. Обновите свободные окна',
      );
    const session = slot.sessionId
      ? { id: slot.sessionId }
      : await db.supportSession.create({
          data: {
            teacherId: dto.teacherId,
            startAt: slot.startAt,
            endAt: slot.endAt,
            capacity: slot.capacity,
            location: slot.location,
          },
        });
    return db.supportBooking.create({
      data: {
        feedbackId: f.id,
        studentId: f.studentId,
        sessionId: session.id,
        referrerId: f.teacherId,
        task: dto.task.trim(),
      },
    });
  }
  async book(dto: BookingDto, user: SupportActor) {
    return this.transaction(async (db) => {
      const teacher = await this.teacher(db, user);
      const b = await this.createBooking(db, dto, teacher.id);
      await this.bookingNotice(
        db,
        b.id,
        `запись на бесплатное дополнительное занятие подтверждена. Задача: ${b.task}`,
      );
      return b;
    });
  }
  private async managedBooking(db: DB, id: string, teacherId: string) {
    const b = await db.supportBooking.findUnique({
      where: { id },
      include: { session: { include: { teacher: true } } },
    });
    if (!b) throw new NotFoundException('Запись не найдена');
    if (b.referrerId !== teacherId && b.session.teacherId !== teacherId)
      throw new ForbiddenException();
    if (b.status !== 'BOOKED')
      throw new ConflictException('Эта запись уже закрыта');
    return b;
  }
  async cancel(id: string, dto: ReasonDto, user: SupportActor) {
    if (!dto.reason.trim()) throw new BadRequestException('Укажите причину');
    return this.transaction(async (db) => {
      const t = await this.teacher(db, user);
      await this.managedBooking(db, id, t.id);
      const b = await db.supportBooking.update({
        where: { id },
        data: { status: 'CANCELLED', changeReason: dto.reason.trim() },
      });
      await this.bookingNotice(
        db,
        id,
        `занятие отменено. Причина: ${dto.reason.trim()}`,
      );
      return b;
    });
  }
  async move(id: string, dto: MoveDto, user: SupportActor) {
    if (!dto.reason.trim()) throw new BadRequestException('Укажите причину');
    return this.transaction(async (db) => {
      const t = await this.teacher(db, user);
      const old = await this.managedBooking(db, id, t.id);
      if (
        old.session.teacherId === dto.teacherId &&
        old.session.startAt.getTime() === new Date(dto.startAt).getTime()
      )
        throw new BadRequestException('Выберите другое время');
      const b = await this.createBooking(
        db,
        {
          feedbackId: old.feedbackId,
          teacherId: dto.teacherId,
          startAt: dto.startAt,
          task: old.task,
        },
        t.id,
        id,
      );
      await db.supportBooking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          changeReason: `Перенесено: ${dto.reason.trim()}`,
        },
      });
      await db.supportBooking.update({
        where: { id: b.id },
        data: { changeReason: dto.reason.trim() },
      });
      await this.bookingNotice(
        db,
        id,
        `прежняя запись отменена из-за переноса. Причина: ${dto.reason.trim()}`,
      );
      await this.bookingNotice(
        db,
        b.id,
        `новая запись после переноса подтверждена. Причина: ${dto.reason.trim()}`,
      );
      return b;
    });
  }
  async result(id: string, dto: ResultDto, user: SupportActor) {
    if (!dto.result.trim())
      throw new BadRequestException('Опишите результат занятия');
    return this.transaction(async (db) => {
      const t = await this.teacher(db, user);
      const old = await this.managedBooking(db, id, t.id);
      if (old.session.teacherId !== t.id)
        throw new ForbiddenException(
          'Результат отмечает суппорт, проводивший занятие',
        );
      if (old.session.endAt > new Date())
        throw new BadRequestException(
          'Отметить результат можно после окончания занятия',
        );
      const b = await db.supportBooking.update({
        where: { id },
        data: {
          status: dto.status,
          outcome: dto.status === 'COMPLETED' ? dto.outcome : null,
          result: dto.result.trim(),
        },
      });
      await this.bookingNotice(
        db,
        id,
        dto.status === 'NO_SHOW'
          ? `ученик не пришёл. ${dto.result}`
          : `занятие завершено (${dto.outcome === 'RESOLVED' ? 'тема усвоена' : 'нужна ещё помощь'}). ${dto.result}`,
      );
      return b;
    });
  }
  @Cron('*/1 * * * *')
  async reminders() {
    try {
      await this.transaction(async (db) => {
        const due = await db.supportBooking.findMany({
          where: {
            status: 'BOOKED',
            remindedAt: null,
            session: {
              startAt: {
                gt: new Date(),
                lte: new Date(Date.now() + 60 * MINUTE),
              },
            },
          },
          take: 100,
        });
        for (const b of due) {
          await this.bookingNotice(
            db,
            b.id,
            'дополнительное занятие начнётся в течение часа',
          );
          await db.supportBooking.update({
            where: { id: b.id },
            data: { remindedAt: new Date() },
          });
        }
      });
    } catch (e) {
      this.logger.error('Support reminders failed', e);
    }
  }
  @Cron('*/30 * * * * *')
  async deliverPush() {
    try {
      // Dedicated lock prevents duplicate polling by multiple API workers.
      await this.prisma.$transaction(
        async (db) => {
          await db.$executeRaw`SELECT pg_advisory_xact_lock(73510422)`;
          for (const row of await db.supportPushOutbox.findMany({
            orderBy: { createdAt: 'asc' },
            take: 50,
          })) {
            await this.push.sendToUsers(
              row.userIds,
              'KhanovMath Academy',
              row.message,
              { feature: 'support', screen: 'support' },
            );
            await db.supportPushOutbox.delete({ where: { id: row.id } });
          }
        },
        { timeout: 20000 },
      );
    } catch (e) {
      this.logger.warn(`Support push enqueue will retry: ${String(e)}`);
    }
  }
}
