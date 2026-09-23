import { clashesWithSchedule, localDate } from './support-time';
describe('support timetable conflicts', () => {
  const start = new Date('2026-09-22T10:00:00+05:00');
  const end = new Date('2026-09-22T11:00:00+05:00');
  it('uses the Tashkent date around UTC midnight', () => {
    expect(localDate(new Date('2026-09-21T20:00:00Z'))).toBe('2026-09-22');
  });
  it('allows adjacent lessons', () => {
    expect(
      clashesWithSchedule(
        { slots: [{ days: ['TUESDAY'], time: '09:00', duration: 60 }] },
        start,
        end,
      ),
    ).toBe(false);
  });
  it('handles raw arrays and overnight lessons', () => {
    expect(
      clashesWithSchedule(
        [{ days: ['TUE'], time: '10:30', duration: 60 }],
        start,
        end,
      ),
    ).toBe(true);
    expect(
      clashesWithSchedule(
        { days: [{ day: 'MON', startTime: '23:30', endTime: '11:00' }] },
        start,
        end,
      ),
    ).toBe(true);
  });
  it('keeps distinct durations for flat entries with the same start', () => {
    expect(
      clashesWithSchedule(
        {
          days: [
            { day: 'MON', startTime: '09:00', endTime: '10:00' },
            { day: 'TUE', startTime: '09:00', endTime: '11:00' },
          ],
        },
        start,
        end,
      ),
    ).toBe(true);
  });
});
