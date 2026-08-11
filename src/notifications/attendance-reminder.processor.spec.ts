import { AttendanceReminderProcessor } from './attendance-reminder.processor';

describe('AttendanceReminderProcessor', () => {
  const now = new Date('2026-08-12T04:15:00.000Z');
  const session = {
    id: 'session-1',
    groupId: 'group-1',
    scheduledStart: new Date('2026-08-12T04:00:00.000Z'),
    scheduledEnd: new Date('2026-08-12T05:30:00.000Z'),
    expectedStudentIds: ['student-1', 'student-2'],
    nextReminderAt: new Date('2026-08-12T04:15:00.000Z'),
    group: {
      name: 'IELTS Advanced',
      teacher: { userId: 'teacher-user', user: { isActive: true } },
    },
  };

  function setup(markedStudentIds: string[]) {
    const prisma = {
      group: { findMany: jest.fn().mockResolvedValue([]) },
      attendance: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            markedStudentIds.map((studentId) => ({ studentId })),
          ),
      },
      attendanceReminderSession: {
        findMany: jest.fn().mockResolvedValue([session]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue(session),
        upsert: jest.fn(),
      },
    };
    const notifications = { sendAttendanceReminder: jest.fn() };
    const processor = new AttendanceReminderProcessor(
      prisma as never,
      notifications as never,
    );
    return { prisma, notifications, processor };
  }

  it('keeps reminding when only one of all students is marked', async () => {
    const { prisma, notifications, processor } = setup(['student-1']);

    await processor.tick(now);

    expect(notifications.sendAttendanceReminder).toHaveBeenCalledWith(
      'teacher-user',
      'IELTS Advanced',
      'DURING',
      1,
      2,
    );
    expect(prisma.attendanceReminderSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastReminderAt: now,
          nextReminderAt: new Date('2026-08-12T04:30:00.000Z'),
        }),
      }),
    );
  });

  it('closes the reminder only when every expected student is marked', async () => {
    const { prisma, notifications, processor } = setup([
      'student-1',
      'student-2',
    ]);

    await processor.tick(now);

    expect(notifications.sendAttendanceReminder).not.toHaveBeenCalled();
    expect(prisma.attendanceReminderSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', completedAt: null },
      data: { completedAt: now },
    });
  });
});
