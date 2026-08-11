import {
  attendanceReminderPhase,
  lessonOccurrencesForTashkentDay,
  nextAttendanceReminderAt,
  tashkentDayBounds,
} from './attendance-reminder.helper';

describe('attendance reminder helper', () => {
  it('creates a Tashkent lesson occurrence with its duration', () => {
    const schedule = {
      days: ['WEDNESDAY'],
      time: '09:00',
      duration: 90,
    };
    const lessons = lessonOccurrencesForTashkentDay(
      schedule,
      new Date('2026-08-12T03:00:00.000Z'),
    );

    expect(lessons).toHaveLength(1);
    expect(lessons[0].start.toISOString()).toBe('2026-08-12T04:00:00.000Z');
    expect(lessons[0].end.toISOString()).toBe('2026-08-12T05:30:00.000Z');
  });

  it('uses the complete Tashkent calendar day for attendance matching', () => {
    const bounds = tashkentDayBounds(new Date('2026-08-12T04:00:00.000Z'));
    expect(bounds.start.toISOString()).toBe('2026-08-11T19:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-08-12T19:00:00.000Z');
  });

  it('schedules every 15 minutes during a lesson', () => {
    const start = new Date('2026-08-12T04:00:00.000Z');
    const end = new Date('2026-08-12T05:30:00.000Z');
    const now = new Date('2026-08-12T04:16:00.000Z');

    expect(attendanceReminderPhase(now, start, end)).toBe('DURING');
    expect(nextAttendanceReminderAt(now, start, end).toISOString()).toBe(
      '2026-08-12T04:30:00.000Z',
    );
  });

  it('schedules every hour after a lesson', () => {
    const start = new Date('2026-08-12T04:00:00.000Z');
    const end = new Date('2026-08-12T05:30:00.000Z');
    const now = new Date('2026-08-12T06:31:00.000Z');

    expect(attendanceReminderPhase(now, start, end)).toBe('AFTER');
    expect(nextAttendanceReminderAt(now, start, end).toISOString()).toBe(
      '2026-08-12T07:30:00.000Z',
    );
  });
});
