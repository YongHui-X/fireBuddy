import { describe, expect, it } from 'vitest';
import { REMINDER_HOUR, REMINDER_LINES, planReminders } from '@firebuddy/shared';

describe('shared reminder planning', () => {
  it('plans seven consecutive evenings from today when appropriate', () => {
    const slots = planReminders({ todayKey: '2026-10-06', minutesNow: 20 * 60, loggedToday: false });
    expect(slots).toHaveLength(7);
    expect(slots.map((slot) => slot.dateKey)).toEqual([
      '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12',
    ]);
  });

  it.each([
    [{ loggedToday: true, minutesNow: 20 * 60 }, '2026-10-07'],
    [{ loggedToday: false, minutesNow: REMINDER_HOUR * 60 }, '2026-10-07'],
    [{ loggedToday: false, minutesNow: REMINDER_HOUR * 60 + 1 }, '2026-10-07'],
  ] as const)('starts tomorrow when today is skipped: %s', (options, firstDate) => {
    expect(planReminders({ todayKey: '2026-10-06', ...options })[0].dateKey).toBe(firstDate);
  });

  it('crosses month, year and leap-day boundaries', () => {
    expect(planReminders({ todayKey: '2026-12-30', minutesNow: 20 * 60, loggedToday: false, days: 7 }).map((slot) => slot.dateKey)).toEqual([
      '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05',
    ]);
    expect(planReminders({ todayKey: '2028-02-27', minutesNow: 20 * 60, loggedToday: false, days: 4 }).map((slot) => slot.dateKey)).toEqual([
      '2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01',
    ]);
  });

  it('rotates without repeating titles and keeps reminder copy free of digits and dollar signs', () => {
    const slots = planReminders({ todayKey: '2026-10-06', minutesNow: 20 * 60, loggedToday: false, days: REMINDER_LINES.length });
    expect(new Set(slots.map((slot) => slot.title)).size).toBe(slots.length);
    for (const slot of slots) {
      expect(slot.title).not.toMatch(/[$€£¥]|\d[\d,]*\.\d|\d{3,}/);
      expect(slot.title).not.toContain('$');
      expect(slot.body).not.toMatch(/[$€£¥]|\d[\d,]*\.\d|\d{3,}/);
      expect(slot.body).not.toContain('$');
    }
  });

  it('returns no slots for invalid dates and respects the requested number of days', () => {
    expect(planReminders({ todayKey: 'nope', minutesNow: 0, loggedToday: false })).toEqual([]);
    expect(planReminders({ todayKey: '2026-10-06', minutesNow: 0, loggedToday: false, days: 3 })).toHaveLength(3);
  });
});
