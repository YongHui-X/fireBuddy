import { describe, expect, it } from 'vitest';
import { formatMonthLabel, formatShortMonthLabel } from '@firebuddy/shared';

describe('formatShortMonthLabel', () => {
  it('abbreviates September with either ICU spelling', () => {
    expect(formatShortMonthLabel('2026-09')).toMatch(/^Sept? 2026$/);
  });

  it('abbreviates January', () => {
    expect(formatShortMonthLabel('2026-01')).toMatch(/^Jan 2026$/);
  });

  it('is shorter than the full month label for the same key', () => {
    for (const monthKey of ['2026-09', '2026-01']) {
      expect(formatShortMonthLabel(monthKey).length).toBeLessThan(formatMonthLabel(monthKey).length);
    }
  });
});
