import { normalizeSchedule } from '../notifications/lesson-reminder.helper';
export const DAY = 86_400_000;
export const MINUTE = 60_000;
export function localDate(date: Date) {
  return new Date(date.getTime() + 5 * 60 * MINUTE).toISOString().slice(0, 10);
}
export function overlaps(a: Date, b: Date, c: Date, d: Date) {
  return a < d && c < b;
}
export function midnight(date: Date) {
  return new Date(`${localDate(date)}T00:00:00+05:00`);
}
const DAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];
export function clashesWithSchedule(schedule: unknown, start: Date, end: Date) {
  const rawSlots: unknown[] = Array.isArray(schedule) ? schedule : [schedule];
  const slots = rawSlots.flatMap((raw) => {
    const entries =
      raw && typeof raw === 'object'
        ? (raw as { days?: unknown }).days
        : undefined;
    return Array.isArray(entries) &&
      entries.some((e) => e && typeof e === 'object')
      ? entries.flatMap((entry) => normalizeSchedule({ days: [entry] }))
      : normalizeSchedule(raw);
  });
  // Check the preceding day as well, for lessons spanning midnight.
  for (
    let day = midnight(start).getTime() - DAY;
    day < end.getTime();
    day += DAY
  ) {
    const weekday = new Date(day + 5 * 60 * MINUTE).getUTCDay();
    for (const slot of slots) {
      if (!slot.days.includes(DAYS[weekday])) continue;
      const [h, m] = slot.time.split(':').map(Number);
      const from = new Date(day + (h * 60 + m) * MINUTE);
      const to = new Date(from.getTime() + (slot.duration ?? 90) * MINUTE);
      if (overlaps(start, end, from, to)) return true;
    }
  }
  return false;
}
