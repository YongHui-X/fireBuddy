import { describe, expect, it } from 'vitest';
import {
  DAILY_TIPS,
  LOG_TODAY_TIP,
  NICKNAME_MAX_LENGTH,
  TOUR_STEPS,
  formatGreeting,
  normaliseNickname,
  pickDailyTip,
} from '@firebuddy/shared';

describe('onboarding helpers', () => {
  it.each([null, undefined, '', '   '])('normaliseNickname(%j) returns null', (value) => {
    expect(normaliseNickname(value)).toBeNull();
  });

  it('normalises whitespace and caps nicknames without splitting emoji', () => {
    expect(normaliseNickname('  Jo   Tan ')).toBe('Jo Tan');
    expect(normaliseNickname('a'.repeat(NICKNAME_MAX_LENGTH + 5))).toHaveLength(NICKNAME_MAX_LENGTH);
    expect(normaliseNickname('😀'.repeat(30))).toBe('😀'.repeat(24));
    expect(normaliseNickname('Jo 😀')).toBe('Jo 😀');
  });

  it.each([
    [0, 'Good morning, Jo!'],
    [11, 'Good morning, Jo!'],
    [12, 'Good afternoon, Jo!'],
    [17, 'Good afternoon, Jo!'],
    [18, 'Good evening, Jo!'],
    [23, 'Good evening, Jo!'],
  ])('formats a greeting at hour %s', (hour, expected) => {
    expect(formatGreeting('  Jo   ', hour)).toBe(expected);
  });

  it('omits the comma when the name is empty', () => {
    expect(formatGreeting(null, 9)).toBe('Good morning!');
    expect(formatGreeting('  ', 9)).toBe('Good morning!');
  });

  it('uses the logging nudge until a transaction is logged today', () => {
    expect(pickDailyTip({ dateKey: '2026-10-05', loggedToday: false })).toEqual(LOG_TODAY_TIP);
  });

  it('keeps the same tip for the same date', () => {
    const input = { dateKey: '2026-10-05', loggedToday: true };
    expect(pickDailyTip(input)).toEqual(pickDailyTip(input));
  });

  it('covers every general tip across one full rotation of days', () => {
    const tips = Array.from({ length: DAILY_TIPS.length }, (_, index) => {
      const date = new Date(Date.UTC(2026, 0, 1 + index));
      const dateKey = date.toISOString().slice(0, 10);
      return pickDailyTip({ dateKey, loggedToday: true }).id;
    });
    expect(new Set(tips)).toEqual(new Set(DAILY_TIPS.map((tip) => tip.id)));
  });

  it('does not throw for an invalid date key', () => {
    expect(() => pickDailyTip({ dateKey: 'not-a-date', loggedToday: true })).not.toThrow();
  });

  it('keeps tip copy neutral and free of amounts', () => {
    for (const tip of [LOG_TODAY_TIP, ...DAILY_TIPS]) {
      expect(tip.text).not.toMatch(/S\$|\d|overspend|too much|bad|waste/i);
    }
  });

  it('defines the six spotlight steps and their registered targets', () => {
    expect(TOUR_STEPS).toHaveLength(8);
    expect(new Set(TOUR_STEPS.map((step) => step.id)).size).toBe(8);
    expect(new Set(TOUR_STEPS.map((step) => step.targetId)).size).toBe(8);
    expect(TOUR_STEPS.map((step) => step.targetId)).toEqual(['add', 'wealth', 'planner', 'insights', 'doudou', 'transactions', 'categories', 'profile']);
    for (const step of TOUR_STEPS) {
      expect(step.title.trim()).not.toBe('');
      expect(step.body.trim()).not.toBe('');
      expect(step.pose).toBe('point');
    }
  });
});
