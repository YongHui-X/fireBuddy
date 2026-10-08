import { describe, expect, it } from 'vitest';
import { repaidSoFar } from '@firebuddy/shared';

describe('shared wealth repayment helper', () => {
  it('calculates the amount and share repaid', () => {
    expect(repaidSoFar(500000, 380000)).toEqual({ amount: 120000, share: 0.24 });
    expect(repaidSoFar(1000.10, 999.99)).toEqual({ amount: 0.11, share: 0.11 / 1000.10 });
    expect(repaidSoFar(1000, 0)).toEqual({ amount: 1000, share: 1 });
  });

  it('does not report repayment when the balance exceeds the original', () => {
    expect(repaidSoFar(500000, 520000)).toEqual({ amount: 0, share: 0 });
  });

  it.each([
    [null, 100],
    [0, 100],
    [-1, 100],
    [Number.NaN, 100],
    [100, null],
  ] as const)('returns null for invalid inputs: %s, %s', (original, balance) => {
    expect(repaidSoFar(original, balance)).toBeNull();
  });
});
