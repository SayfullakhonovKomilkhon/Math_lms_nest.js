import {
  AttendanceStatus,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService notification matrix', () => {
  const prisma = {
    notification: {
      create: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    student: { findUnique: jest.fn(), findMany: jest.fn() },
    group: { findUnique: jest.fn() },
    grade: { findUnique: jest.fn() },
    teacher: { findUnique: jest.fn() },
    payment: { findUnique: jest.fn() },
    homework: { findUnique: jest.fn() },
  };
  const telegram = { sendMessage: jest.fn().mockResolvedValue(undefined) };
  const expoPush = {
    sendToUser: jest.fn().mockResolvedValue(undefined),
    sendToUsers: jest.fn().mockResolvedValue(undefined),
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.notification.create.mockResolvedValue({});
    prisma.notification.createMany.mockResolvedValue({ count: 1 });
    telegram.sendMessage.mockResolvedValue(undefined);
    expoPush.sendToUser.mockResolvedValue(undefined);
    expoPush.sendToUsers.mockResolvedValue(undefined);
    service = new NotificationsService(
      prisma as never,
      telegram as never,
      expoPush as never,
    );
  });

  it('stores one announcement, pushes it, and does not duplicate it for Telegram', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 'student-user', telegramChatId: 'chat-1' },
    ]);

    await service.sendToMany(['student-user'], {
      type: NotificationType.ANNOUNCEMENT,
      message: 'Новое объявление',
      data: { screen: 'announcements' },
    });
    await service.sendToMany(['student-user'], {
      type: NotificationType.ANNOUNCEMENT,
      message: '<b>Полный текст</b>',
      channel: NotificationChannel.TELEGRAM,
    });

    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    expect(expoPush.sendToUsers).toHaveBeenCalledWith(
      ['student-user'],
      'KhanovMath Academy',
      'Новое объявление',
      { screen: 'announcements' },
    );
    expect(telegram.sendMessage).toHaveBeenCalledWith(
      'chat-1',
      '<b>Полный текст</b>',
    );
  });

  it('delivers payment reminders to student and parent mobile', async () => {
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      userId: 'student-user',
      fullName: 'Ученик Один',
      groups: [{ monthlyFee: 500000 }],
      parents: [{ parent: { userId: 'parent-user', user: {} } }],
    });

    await service.sendPaymentReminder('student-1', 3);

    expectPushFor('student-user', NotificationType.PAYMENT, 'payment');
    expectPushFor('parent-user', NotificationType.PAYMENT, 'payment');
  });

  it.each([
    AttendanceStatus.PRESENT,
    AttendanceStatus.LATE,
    AttendanceStatus.ABSENT,
  ])('delivers attendance %s to the parent', async (status) => {
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      userId: 'student-user',
      fullName: 'Ученик Один',
      parents: [{ parent: { userId: 'parent-user', user: {} } }],
    });
    prisma.group.findUnique.mockResolvedValue({ name: 'SAT 1' });

    await service.sendAttendanceToParents(
      'student-1',
      'group-1',
      status,
      '2026-08-20',
    );

    expectPushFor('parent-user', NotificationType.ATTENDANCE, 'attendance');
    if (status === AttendanceStatus.PRESENT) {
      expect(expoPush.sendToUser).not.toHaveBeenCalledWith(
        'student-user',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    } else {
      expectPushFor('student-user', NotificationType.ATTENDANCE, 'attendance');
    }
  });

  it('delivers a grade to student and parent with navigation data', async () => {
    prisma.grade.findUnique.mockResolvedValue({
      id: 'grade-1',
      score: 18,
      maxScore: 20,
      lessonType: 'LESSON',
      studentId: 'student-1',
      group: { name: 'SAT 1' },
      student: {
        userId: 'student-user',
        fullName: 'Ученик Один',
        parents: [{ parent: { userId: 'parent-user', user: {} } }],
      },
    });

    await service.sendGradeNotification('grade-1');

    expectPushFor('student-user', NotificationType.GRADE, 'grades');
    expectPushFor('parent-user', NotificationType.GRADE, 'grades');
  });

  it('delivers homework to every student and linked parent', async () => {
    prisma.homework.findUnique.mockResolvedValue({
      teacher: { fullName: 'Асрор' },
      group: { name: 'SAT 1' },
      dueDate: new Date('2026-08-22T10:00:00Z'),
    });
    prisma.student.findMany.mockResolvedValue([
      {
        id: 'student-1',
        userId: 'student-user',
        fullName: 'Ученик Один',
        parents: [{ parent: { userId: 'parent-user' } }],
      },
    ]);

    await service.sendHomeworkNotification('group-1', 'homework-1');

    expectPushFor('student-user', NotificationType.HOMEWORK, 'homework');
    expectPushFor('parent-user', NotificationType.HOMEWORK, 'homework');
  });

  it('delivers achievements to student and parent', async () => {
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      userId: 'student-user',
      fullName: 'Ученик Один',
      parents: [{ parent: { userId: 'parent-user', user: {} } }],
    });

    await service.sendAchievementNotification('student-1', {
      title: 'Первый шаг',
      icon: '🌱',
    });

    expectPushFor('student-user', NotificationType.ACHIEVEMENT, 'achievements');
    expectPushFor('parent-user', NotificationType.ACHIEVEMENT, 'achievements');
  });

  it.each(['CONFIRMED', 'REJECTED'] as const)(
    'delivers payment receipt status %s to student and parent',
    async (status) => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        studentId: 'student-1',
        student: {
          userId: 'student-user',
          parents: [{ parent: { userId: 'parent-user', user: {} } }],
        },
      });

      await service.sendReceiptStatusNotification(
        'payment-1',
        status,
        status === 'REJECTED' ? 'Нечёткое фото' : undefined,
      );

      expectPushFor('student-user', NotificationType.PAYMENT, 'payment');
      expectPushFor('parent-user', NotificationType.PAYMENT, 'payment');
    },
  );

  it('delivers lesson reminders to all unique recipients', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await service.sendLessonReminder(
      ['student-user', 'student-user', 'teacher-user'],
      'SAT 1',
      '15:00',
      15,
    );

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          type: NotificationType.LESSON_REMINDER,
          data: { screen: 'schedule' },
        }),
      ]),
    });
    expect(expoPush.sendToUsers).toHaveBeenCalledWith(
      ['student-user', 'teacher-user'],
      'Скоро занятие',
      expect.any(String),
      { screen: 'schedule' },
    );
  });

  it('delivers salary updates without coupling push to Telegram', async () => {
    prisma.teacher.findUnique.mockResolvedValue({
      userId: 'teacher-user',
      fullName: 'Учитель',
    });
    prisma.user.findUnique.mockResolvedValue({ telegramChatId: 'chat-1' });
    telegram.sendMessage.mockRejectedValue(new Error('Telegram unavailable'));

    await service.sendSalaryNotification('teacher-1', 100, 150);

    expectPushFor('teacher-user', NotificationType.SALARY, 'salary');
  });

  function expectPushFor(
    userId: string,
    type: NotificationType,
    screen: string,
  ) {
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        type,
        data: expect.objectContaining({ screen }),
        isRead: false,
      }),
    });
    expect(expoPush.sendToUser).toHaveBeenCalledWith(
      userId,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ screen }),
    );
  }
});
