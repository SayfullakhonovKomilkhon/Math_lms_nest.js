import { normalizeSchedule } from './lesson-reminder.helper';

export const TASHKENT_TIME_ZONE = 'Asia/Tashkent';
export const DEFAULT_LESSON_DURATION_MINUTES = 90;

export type AttendanceReminderPhase = 'BEFORE' | 'DURING' | 'AFTER';

export interface LessonOccurrence {
  start: Date;
  end: Date;
}

function tashkentDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TASHKENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')!.value;
  const month = parts.find((part) => part.type === 'month')!.value;
  const day = parts.find((part) => part.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}

function tashkentWeekday(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TASHKENT_TIME_ZONE,
    weekday: 'long',
  })
    .format(date)
    .toUpperCase();
}

export function tashkentDayBounds(date: Date): { start: Date; end: Date } {
  const key = tashkentDateKey(date);
  const start = new Date(`${key}T00:00:00+05:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function lessonOccurrencesForTashkentDay(
  schedule: unknown,
  date: Date,
): LessonOccurrence[] {
  const dateKey = tashkentDateKey(date);
  const weekday = tashkentWeekday(date);
  const seen = new Set<number>();
  const occurrences: LessonOccurrence[] = [];

  for (const slot of normalizeSchedule(schedule)) {
    if (!slot.days.includes(weekday)) continue;

    const start = new Date(`${dateKey}T${slot.time}:00+05:00`);
    if (Number.isNaN(start.getTime()) || seen.has(start.getTime())) continue;
    seen.add(start.getTime());

    const duration =
      slot.duration && slot.duration > 0
        ? slot.duration
        : DEFAULT_LESSON_DURATION_MINUTES;
    occurrences.push({
      start,
      end: new Date(start.getTime() + duration * 60 * 1000),
    });
  }

  return occurrences;
}

export function attendanceReminderPhase(
  now: Date,
  lessonStart: Date,
  lessonEnd: Date,
): AttendanceReminderPhase {
  if (now.getTime() < lessonStart.getTime()) return 'BEFORE';
  if (now.getTime() < lessonEnd.getTime()) return 'DURING';
  return 'AFTER';
}

export function nextAttendanceReminderAt(
  now: Date,
  lessonStart: Date,
  lessonEnd: Date,
): Date {
  const phase = attendanceReminderPhase(now, lessonStart, lessonEnd);
  if (phase === 'BEFORE') return lessonStart;

  if (phase === 'DURING') {
    const elapsed = Math.max(0, now.getTime() - lessonStart.getTime());
    const interval = 15 * 60 * 1000;
    const next = new Date(
      lessonStart.getTime() + (Math.floor(elapsed / interval) + 1) * interval,
    );
    return next.getTime() > lessonEnd.getTime() ? lessonEnd : next;
  }

  const elapsedAfterLesson = Math.max(0, now.getTime() - lessonEnd.getTime());
  const hourly = 60 * 60 * 1000;
  return new Date(
    lessonEnd.getTime() +
      (Math.floor(elapsedAfterLesson / hourly) + 1) * hourly,
  );
}
