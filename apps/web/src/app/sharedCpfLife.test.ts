import { describe, expect, it } from 'vitest';
import type { RetirementPlan } from '@firebuddy/shared';
import { cpfRetirementSum, estimateCpfLifePayout, standardCpfLifePayout, withCpfEstimate } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';

describe('CPF LIFE estimates', () => {
  it('estimates standard, sum, and start-age payouts', () => {
    expect(estimateCpfLifePayout({ cpfPlan: 'standard', sum: 'frs', birthMonth: '1971-05', startAge: 65, inflation: 0.03 })).toBe(1780);
    expect(estimateCpfLifePayout({ cpfPlan: 'standard', sum: 'frs', birthMonth: '1971-05', startAge: 70, inflation: 0.03 })).toBe(2380);
    expect(estimateCpfLifePayout({ cpfPlan: 'standard', sum: 'brs', birthMonth: '1971-05', startAge: 65, inflation: 0.03 })).toBe(950);
    expect(estimateCpfLifePayout({ cpfPlan: 'standard', sum: 'ers', birthMonth: '1971-05', startAge: 65, inflation: 0.03 })).toBe(3440);
  });

  it('interpolates a deferred start age', () => {
    const value = estimateCpfLifePayout({ cpfPlan: 'standard', sum: 'frs', birthMonth: '1971-05', startAge: 67, inflation: 0.03 });
    expect(value).toBe(Math.round(1780 * (2380 / 1780) ** (2 / 5)));
    expect(value).toBeGreaterThan(1780);
    expect(value).toBeLessThan(2380);
  });

  it('applies CPF plan factors and treats unknown as standard', () => {
    const input = { sum: 'frs' as const, birthMonth: '1971-05', startAge: 65, inflation: 0.03 };
    const standard = estimateCpfLifePayout({ ...input, cpfPlan: 'standard' })!;
    expect(estimateCpfLifePayout({ ...input, cpfPlan: 'escalating' })).toBe(Math.round(standard * 0.8));
    expect(estimateCpfLifePayout({ ...input, cpfPlan: 'basic' })).toBe(Math.round(standard * 0.9));
    expect(estimateCpfLifePayout({ ...input, cpfPlan: 'unknown' })).toBe(standard);
  });

  it('uses announced and inflation-grown cohort sums', () => {
    expect(estimateCpfLifePayout({ cpfPlan: 'standard', sum: 'frs', birthMonth: '1972-01', startAge: 65, inflation: 0.03 })).toBe(Math.round(1780 * 228200 / 220400));
    expect(cpfRetirementSum('frs', 2030, 0.03)).toBe(228200 * 1.03 ** 3);
    expect(cpfRetirementSum('frs', 2020, 0.03)).toBe(205800);
  });

  it('rejects invalid birth months', () => {
    const input = { cpfPlan: 'standard' as const, sum: 'frs' as const, startAge: 65, inflation: 0.03 };
    expect(estimateCpfLifePayout({ ...input, birthMonth: '' })).toBeNull();
    expect(estimateCpfLifePayout({ ...input, birthMonth: 'abc' })).toBeNull();
  });

  it('interpolates standard payout table balances', () => {
    expect(standardCpfLifePayout(185200, 65)).toBe(1515);
  });

  it('only replaces a saved CPF estimate', () => {
    const withoutEstimate = { ...(fixtures.base as RetirementPlan) };
    expect(withCpfEstimate(withoutEstimate)).toBe(withoutEstimate);
    const plan = { ...(fixtures.base as RetirementPlan), cpfEstimate: { sum: 'frs' as const } };
    expect(withCpfEstimate(plan).cpfMonthlyPayout).toBe(Math.round(1780 * 228200 / 220400)); // born 1976: turns 55 in 2031, 2027's sum at 0% inflation
  });
});
