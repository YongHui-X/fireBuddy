import { describe, expect, it } from 'vitest';
import { calculateRetirement, monthIndex, validateRetirementPlan } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';

const asOf = '2026-01-01';
const base = { ...fixtures.base };

describe('retirement lump sums', () => {
  it('counts Basic CPF at the standard level', () => {
    const standard = calculateRetirement(base, 0, asOf);
    const basic = calculateRetirement({ ...base, cpfPlan: 'basic' }, 0, asOf);
    expect(basic.fiTarget).toBe('1080000.00');
    expect(basic.fiTarget).toBe(standard.fiTarget);
    expect(basic.warnings.map(w => w.code)).toContain('cpf_basic_level');
    expect(basic.warnings.map(w => w.code)).not.toContain('cpf_not_included');
  });

  it('omits lumpSum when there are no lump sums', () => {
    const absent = calculateRetirement(base, 0, asOf);
    const empty = calculateRetirement({ ...base, lumpSums: [] }, 0, asOf);
    expect({ ...empty, plan: null }).toEqual({ ...absent, plan: null });
    expect(empty.monthlyCashFlows!.every(row => !Object.prototype.hasOwnProperty.call(row, 'lumpSum'))).toBe(true);
  });

  it('inflates a pre-retirement cost and raises the required investment', () => {
    const plan = { ...base, retirementMonth: '2036-01', beforeReturn: 0.05, afterReturn: 0.05, inflation: 0.02, monthlyContribution: 2000, lumpSums: [{ label: 'Home', month: '2030-06', amount: 50000, direction: 'out' as const, priceMonth: '2026-01' }] };
    const without = calculateRetirement({ ...plan, lumpSums: [] }, 0, asOf);
    const withCost = calculateRetirement(plan, 0, asOf);
    expect(Number(withCost.projectedPortfolio)).toBeLessThan(Number(without.projectedPortfolio));
    expect(Number(withCost.requiredMonthlyInvestment)).toBeGreaterThan(Number(without.requiredMonthlyInvestment));
    const row = withCost.monthlyCashFlows!.find(item => item.month === '2030-06')!;
    const months = monthIndex('2030-06') - monthIndex('2026-01') + 1;
    expect(row.lumpSum).toBe((-50000 * (1.02 ** (1 / 12)) ** months).toFixed(2));
  });

  it('funds the plan at the solved contribution', () => {
    const lumpSums = [{ label: 'Home', month: '2030-06', amount: 50000, direction: 'out' as const, priceMonth: '2026-01' }];
    const plan = { ...base, retirementMonth: '2036-01', beforeReturn: 0.05, afterReturn: 0.05, inflation: 0.02, monthlyContribution: 2000, lumpSums };
    const solved = calculateRetirement(plan, 0, asOf);
    const funded = calculateRetirement({ ...plan, monthlyContribution: Number(solved.requiredMonthlyInvestment) }, 0, asOf);
    expect(funded.fundingStatus).toBe('funded');
    expect(funded.monthlyCashFlows!.filter(row => row.phase === 'retirement').every(row => Number(row.balance) >= -0.01)).toBe(true);
  });

  it('allows a pre-retirement inflow to improve the date', () => {
    const plan = { ...base, retirementMonth: '2036-01', monthlyContribution: 1000 };
    const without = calculateRetirement(plan, 0, asOf);
    const withInflow = calculateRetirement({ ...plan, lumpSums: [{ label: 'Bonus', month: '2030-06', amount: 50000, direction: 'in' as const, priceMonth: '2026-01' }] }, 0, asOf);
    expect(monthIndex(withInflow.earliestRetirementMonth!)).toBeLessThanOrEqual(monthIndex(without.earliestRetirementMonth!));
  });

  it('does not let later retirement income fund an earlier shortfall', () => {
    const result = calculateRetirement({ ...base, retirementMonth: '2036-01', lumpSums: [{ label: 'Later', month: '2046-01', amount: 1000000, direction: 'in' as const, priceMonth: '2026-01' }] }, 0, asOf);
    expect(Number(result.fiTarget)).toBeGreaterThan(0);
  });

  it('does not fail forward verification for supported lump sums', () => {
    expect(() => calculateRetirement({ ...base, retirementMonth: '2036-01', monthlyContribution: 2000, lumpSums: [{ label: 'Home', month: '2030-06', amount: 50000, direction: 'out' as const, priceMonth: '2026-01' }] }, 0, asOf)).not.toThrow('Retirement target failed forward verification');
  });

  it('rejects invalid lump sums', () => {
    const valid = { ...base };
    expect(validateRetirementPlan({ ...valid, lumpSums: [{ label: 'x', month: '2025-12', amount: 1, direction: 'out' as const, priceMonth: '2026-01' }] }, asOf)).toBeTruthy();
    expect(validateRetirementPlan({ ...valid, lumpSums: [{ label: 'x', month: '2120-01', amount: 1, direction: 'out' as const, priceMonth: '2026-01' }] }, asOf)).toBeTruthy();
    expect(validateRetirementPlan({ ...valid, lumpSums: Array.from({ length: 23 }, (_, i) => ({ label: String(i), month: '2026-02', amount: 1, direction: 'out' as const, priceMonth: '2026-01' })) }, asOf)).toBeTruthy();
    expect(validateRetirementPlan({ ...valid, lumpSums: [{ label: 'x', month: '2026-02', amount: -1, direction: 'out' as const, priceMonth: '2026-01' }] }, asOf)).toBeTruthy();
    expect(validateRetirementPlan({ ...valid, lumpSums: [{ label: 'x', month: '2026-02', amount: 1, direction: 'sideways' as never, priceMonth: '2026-01' }] }, asOf)).toBeTruthy();
  });
});
