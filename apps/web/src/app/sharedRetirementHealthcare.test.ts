import { describe, expect, it } from 'vitest';
import type { RetirementPlan } from '@firebuddy/shared';
import { buildSchedule, calculateRetirement, validateRetirementPlan } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';

const asOf = '2026-10-10';
const base = { ...(fixtures.base as RetirementPlan), retirementMonth: '2046-01', healthcare: undefined };

describe('healthcare and validation rules', () => {
  it('does not change results when healthcare is absent or zero', () => {
    const none = calculateRetirement(base, 100000, asOf);
    const zero = calculateRetirement({ ...base, healthcare: { monthlyAmount: 0, growth: 0.05, priceMonth: asOf.slice(0, 7) } }, 100000, asOf);
    expect({ ...none, plan: null }).toEqual({ ...zero, plan: null });
    expect(none.monthlyCashFlows!.every((row) => !('healthcare' in row))).toBe(true);
  });

  it('adds growing healthcare to retirement expenses and raises the target', () => {
    const plan = { ...base, healthcare: { monthlyAmount: 300, growth: 0.05, priceMonth: '2026-10' } };
    const result = calculateRetirement(plan, 100000, asOf);
    const plain = calculateRetirement(base, 100000, asOf);
    expect(Number(result.fiTarget)).toBeGreaterThan(Number(plain.fiTarget));
    const first = result.monthlyCashFlows!.find((row) => row.phase === 'retirement')!;
    const index = buildSchedule(plan, asOf).rows.findIndex((row) => row.month === first.month);
    expect(Number(first.healthcare)).toBeCloseTo(300 * 1.05 ** ((index + 1) / 12), 2);
    expect(Number(first.expenses)).toBeGreaterThan(Number(first.healthcare));
    expect(Number(calculateRetirement({ ...plan, healthcare: { ...plan.healthcare, growth: 0.05 } }, 100000, asOf).fiTarget)).toBeGreaterThan(Number(calculateRetirement({ ...plan, healthcare: { ...plan.healthcare, growth: 0.03 } }, 100000, asOf).fiTarget));
  });

  it('rejects invalid new inputs and accepts a no-property record', () => {
    const invalid = [
      { healthcare: { monthlyAmount: 300, growth: 0.25, priceMonth: '2026-10' } },
      { healthcare: { monthlyAmount: -1, growth: 0.05, priceMonth: '2026-10' } },
      { healthcare: { monthlyAmount: 300, growth: 0.05, priceMonth: 'bad' } },
      { residency: 'martian' }, { prSinceYear: 1900 }, { prSinceYear: 2027 },
      { pay: { grossMonthly: 6000, bonusMonths: 25 } }, { cpfBalances: { oa: -1, sa: 1, ma: 1, month: '2026-10' } },
      { property: { status: 'own', oaMonthly: 1, fromMonth: '2026-10', untilMonth: '2026-10' } },
    ];
    for (const change of invalid) expect(validateRetirementPlan({ ...base, ...change } as never, asOf), JSON.stringify(change)).toBeTruthy();
    expect(validateRetirementPlan({ ...base, property: { status: 'none', oaMonthly: 0, fromMonth: '', untilMonth: '' } }, asOf)).toBeNull();
  });
});
