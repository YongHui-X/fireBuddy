import { describe, expect, it } from 'vitest';
import { formatMoney, formatSignedMoney } from '@firebuddy/shared';

describe('formatSignedMoney', () => {
  it('formats negative SGD values with a Unicode minus', () => {
    expect(formatSignedMoney(-50, 'SGD')).toBe('−S$50.00');
    expect(formatSignedMoney('-50.5', 'SGD')).toBe('−S$50.50');
  });

  it('matches formatMoney for non-negative values', () => {
    expect(formatSignedMoney(0)).toBe(formatMoney(0));
    expect(formatSignedMoney(50)).toBe(formatMoney(50));
    expect(formatSignedMoney('50')).toBe(formatMoney('50'));
  });

  it('does not show a minus when rounding makes the value zero', () => {
    expect(formatSignedMoney(-0.001, 'SGD', 2)).toBe(formatMoney(0, 'SGD', 2));
  });

  it('supports zero decimal digits', () => {
    expect(formatSignedMoney(-1234.4, 'SGD', 0)).toBe('−S$1,234');
  });

  it('uses the same currency formatting after the minus', () => {
    expect(formatSignedMoney(-50, 'EUR')).toBe(`−${formatMoney(50, 'EUR')}`);
  });

  it('formats invalid values as zero', () => {
    expect(formatSignedMoney(Number.NaN)).toBe(formatMoney(0));
    expect(formatSignedMoney('abc')).toBe(formatMoney(0));
  });
});
