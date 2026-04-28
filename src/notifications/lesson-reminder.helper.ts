// Парсит `Group.schedule` и находит ближайшие занятия в Asia/Tashkent.
//
// `Group.schedule` — это исторически разнородный JSON (см. также
// `mathcenter-frontend/src/lib/group-schedule.ts`):
//
//   1) Новый: { slots: [{ days: ['MONDAY', ...], time: '09:00', duration: 90 }, ...] }
//   2) Гибрид: { days: [{ day: 'MON', startTime: '09:00', endTime: '10:30' }, ...] }
//   3) Старый: { days: ['MONDAY', ...], time: '09:00', duration: 90 }
//
// `normalizeSchedule` сводит всё к плоскому списку слотов
// `{ days: string[], time: string, duration?: number }`, а
// `findUpcomingLessons` уже работает только с этим единым форматом.

const TZ = 'Asia/Tashkent';

const DAY_INDEX: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const SHORT_TO_LONG: Record<string, string> = {
  MON: 'MONDAY',
  TUE: 'TUESDAY',
  WED: 'WEDNESDAY',
  THU: 'THURSDAY',
  FRI: 'FRIDAY',
  SAT: 'SATURDAY',
  SUN: 'SUNDAY',
};

export interface NormalizedSlot {
  days: string[];
  time: string;
  duration?: number;
}

export interface UpcomingLesson {
  groupId: string;
  groupName: string;
  teacherUserId: string;
  /** Студенты группы (userId), активные. */
  studentUserIds: string[];
  /** "HH:MM" в часовом поясе Asia/Tashkent. */
  startTime: string;
  /** Реальный момент начала урока в UTC — используется как ключ дедупликации. */
  startUtc: Date;
}

interface FlatDayEntry {
  day: string;
  startTime?: string;
  endTime?: string;
}

function isFlatDayEntry(x: unknown): x is FlatDayEntry {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as { day?: unknown }).day === 'string'
  );
}

export function normalizeSchedule(raw: unknown): NormalizedSlot[] {
  if (!raw || typeof raw !== 'object') return [];
  const schedule = raw as {
    slots?: unknown;
    days?: unknown;
    time?: unknown;
    duration?: unknown;
  };

  const out: NormalizedSlot[] = [];

  if (Array.isArray(schedule.slots) && schedule.slots.length > 0) {
    for (const s of schedule.slots) {
      if (!s || typeof s !== 'object') continue;
      const slot = s as { days?: unknown; time?: unknown; duration?: unknown };
      const days = Array.isArray(slot.days)
        ? slot.days
            .filter((d): d is string => typeof d === 'string')
            .map((d) => SHORT_TO_LONG[d] ?? d)
        : [];
      const time = typeof slot.time === 'string' ? slot.time : undefined;
      if (days.length === 0 || !time) continue;
      out.push({
        days,
        time,
        duration: typeof slot.duration === 'number' ? slot.duration : undefined,
      });
    }
    return out;
  }

  const days = schedule.days;
  if (Array.isArray(days) && days.length > 0) {
    if (typeof days[0] === 'string' && typeof schedule.time === 'string') {
      // Format 3 — single slot.
      const longDays = (days as string[]).map((d) => SHORT_TO_LONG[d] ?? d);
      out.push({
        days: longDays,
        time: schedule.time,
        duration:
          typeof schedule.duration === 'number' ? schedule.duration : undefined,
      });
      return out;
    }

    if (isFlatDayEntry(days[0])) {
      // Format 2 — group flat entries by startTime.
      const byTime = new Map<string, string[]>();
      for (const entry of days as FlatDayEntry[]) {
        const long = SHORT_TO_LONG[entry.day] ?? entry.day;
        const key = entry.startTime ?? '';
        if (!key) continue;
        if (!byTime.has(key)) byTime.set(key, []);
        byTime.get(key)!.push(long);
      }
      for (const [time, list] of byTime.entries()) {
        let duration: number | undefined;
        const sample = (days as FlatDayEntry[]).find(
          (d) => (d.startTime ?? '') === time,
        );
        if (sample?.startTime && sample.endTime) {
          const [sh, sm] = sample.startTime.split(':').map(Number);
          const [eh, em] = sample.endTime.split(':').map(Number);
          if (
            Number.isFinite(sh) &&
            Number.isFinite(sm) &&
            Number.isFinite(eh) &&
            Number.isFinite(em)
          ) {
            duration = eh * 60 + em - (sh * 60 + sm);
            if (duration < 0) duration += 24 * 60;
          }
        }
        out.push({
          days: Array.from(new Set(list)),
          time,
          duration,
        });
      }
      return out;
    }
  }

  return out;
}

// Возвращает UTC-Date текущего момента в Asia/Tashkent с разбитыми частями.
function tashkentParts(date: Date): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')!.value);
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  const day = Number(parts.find((p) => p.type === 'day')!.value);

  const weekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'long',
  })
    .format(date)
    .toUpperCase();

  return { year, month, day, weekday: DAY_INDEX[weekdayName] ?? 0 };
}

// Находит ближайший момент `dayName HH:MM Asia/Tashkent` строго ≥ now.
// Возвращает Date в UTC.
function nextOccurrence(
  now: Date,
  dayName: string,
  hhmm: string,
): Date | null {
  const targetIdx = DAY_INDEX[dayName];
  if (targetIdx === undefined) return null;
  const [hh, mm] = hhmm.split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  const today = tashkentParts(now);
  let daysAhead = (targetIdx - today.weekday + 7) % 7;

  // Try this week + next week — second iteration covers the case when the
  // matching day is "today" but the lesson time has already passed.
  for (let attempt = 0; attempt < 2; attempt++) {
    const base = new Date(Date.UTC(today.year, today.month - 1, today.day));
    base.setUTCDate(base.getUTCDate() + daysAhead);
    const yyyy = base.getUTCFullYear();
    const mm2 = String(base.getUTCMonth() + 1).padStart(2, '0');
    const dd2 = String(base.getUTCDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm2}-${dd2}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+05:00`;
    const candidate = new Date(iso);
    if (candidate.getTime() >= now.getTime()) return candidate;
    daysAhead += 7;
  }
  return null;
}

export interface ScheduledGroup {
  id: string;
  name: string;
  schedule: unknown;
  teacherUserId: string;
  studentUserIds: string[];
}

// Находит группы, у которых ближайший урок начинается через
// `[targetMinutes - tolerance, targetMinutes + tolerance]` минут от `now`.
// Толерантность по умолчанию ±2.5 мин — половина шага cron */5.
export function findUpcomingLessons(
  groups: ScheduledGroup[],
  now: Date,
  targetMinutes: number,
  toleranceMinutes = 2.5,
): UpcomingLesson[] {
  const out: UpcomingLesson[] = [];
  const minDelta = targetMinutes - toleranceMinutes;
  const maxDelta = targetMinutes + toleranceMinutes;

  for (const g of groups) {
    const slots = normalizeSchedule(g.schedule);
    for (const slot of slots) {
      // De-dup per (group, slot, day): if multiple days collapse to the same
      // datetime (shouldn't, but be defensive), only push once.
      const seen = new Set<number>();
      for (const day of slot.days) {
        const start = nextOccurrence(now, day, slot.time);
        if (!start) continue;
        const delta = (start.getTime() - now.getTime()) / 60000;
        if (delta < minDelta || delta > maxDelta) continue;
        if (seen.has(start.getTime())) continue;
        seen.add(start.getTime());
        out.push({
          groupId: g.id,
          groupName: g.name,
          teacherUserId: g.teacherUserId,
          studentUserIds: g.studentUserIds,
          startTime: slot.time,
          startUtc: start,
        });
      }
    }
  }

  return out;
}
