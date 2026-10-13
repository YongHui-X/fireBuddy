import { describe, expect, it } from 'vitest';

import { calculateDebtPayoff, requiredPaymentForTarget } from '@firebuddy/shared';
import { describeDebtGoal } from '@firebuddy/shared';

describe('requiredPaymentForTarget', () => {
  it('finds the minimal cent payment that reaches the target month', () => {
    const result = requiredPaymentForTarget(340000, 0.026, '2026-10-07', '2040-12');
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(calculateDebtPayoff(340000, 0.026, result.monthlyPayment, '2026-10-07').payoffMonth! <= '2040-12').toBe(true);
    expect(calculateDebtPayoff(340000, 0.026, result.monthlyPayment - 0.01, '2026-10-07').payoffMonth! > '2040-12').toBe(true);
  });

  it('uses exact arithmetic for a zero-rate target', () => {
    expect(requiredPaymentForTarget(1200, 0, '2026-10-07', '2027-10')).toEqual({ status: 'ok', monthlyPayment: 100, months: 12 });
  });

  it('rejects unavailable goals and handles a paid balance', () => {
    expect(requiredPaymentForTarget(100, 0.02, '2026-10-07', '2026-10')).toEqual({ status: 'past' });
    expect(requiredPaymentForTarget(100, 0.02, '2026-10-07', 'nope')).toEqual({ status: 'past' });
    expect(requiredPaymentForTarget(100, null, '2026-10-07', '2027-10')).toEqual({ status: 'missing_rate' });
    expect(requiredPaymentForTarget(0, 0.02, '2026-10-07', '2027-10')).toEqual({ status: 'paid_off' });
    expect(requiredPaymentForTarget(100, 0.02, '2026-10-07', '2076-11')).toEqual({ status: 'past' });
  });
});

describe('describeDebtGoal', () => {
  const base = { payoffTargetMonth: '2027-10', interestRate: '0', monthlyPayment: '100' };

  it('describes missing, on-track, and below-target payments', () => {
    expect(describeDebtGoal({ ...base, payoffTargetMonth: null }, 1200, '2026-10-07')).toBeNull();
    expect(describeDebtGoal(base, 1200, '2026-10-07')?.text.startsWith('On track')).toBe(true);
    expect(describeDebtGoal({ ...base, monthlyPayment: '50' }, 1200, '2026-10-07')?.text).toContain('more than now');
    expect(describeDebtGoal({ ...base, monthlyPayment: null }, 1200, '2026-10-07')?.text).not.toContain('more than now');
    expect(describeDebtGoal({ ...base, interestRate: null }, 1200, '2026-10-07')?.text).toContain('interest rate');
  });

  it('uses the supplied amount formatter', () => {
    const result = describeDebtGoal({ ...base, monthlyPayment: '50' }, 1200, '2026-10-07', (value) => `RM${value}`);
    expect(result?.text).toContain('RM100');
  });
});
