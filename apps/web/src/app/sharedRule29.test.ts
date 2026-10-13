import { describe, expect, it } from 'vitest';
import type { RetirementPlan } from '@firebuddy/shared';
import {
  HOME_PRICES,
  calculateRetirement,
  cpfBalancesFromWealth,
  homePriceIn,
  validateRetirementPlan,
  withCpfProjection,
  withWealthCpfBalances,
} from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';

const asOf = '2026-10-10';
const base = { ...(fixtures.base as RetirementPlan), retirementMonth: '2046-01', cpfEstimate: { sum: 'frs' as const, source: 'balances' as const }, cpfBalances: { oa: 10_000, sa: 20_000, ma: 30_000, month: '2026-10' }, cpfBalancesSource: 'typed' as const };
const position = (id: string, positionType: 'cpf' | 'cash' = 'cpf', extra: Record<string, unknown> = {}) => ({ id, positionType, positionKind: 'asset', isArchived: false, cpfAccount: 'oa', ...extra }) as never;

describe('shared rule 29', () => {
  it('reads only latest active tagged CPF asset positions and counts untagged values', () => {
    const positions = [position('oa'), position('sa', 'cpf', { cpfAccount: 'sa' }), position('ma', 'cpf', { cpfAccount: 'ma' }), position('old', 'cpf', { cpfAccount: 'oa', isArchived: true }), position('cash', 'cash'), position('debt', 'cpf', { positionKind: 'liability' }), position('none', 'cpf', { cpfAccount: null })];
    const latest = new Map([['oa', { amount: '100' }], ['sa', { amount: '200' }], ['ma', { amount: '300' }], ['old', { amount: '999' }], ['cash', { amount: '999' }], ['debt', { amount: '999' }], ['none', { amount: '50' }]]);
    expect(cpfBalancesFromWealth(positions, latest)).toEqual({ oa: 100, sa: 200, ma: 300, untagged: 1, found: true });
    expect(cpfBalancesFromWealth([position('none', 'cpf', { cpfAccount: null })], new Map([['none', { amount: '50' }]])).found).toBe(false);
  });

  it('uses tagged Wealth balances for projection and otherwise preserves the saved plan', () => {
    const tagged = [position('oa')];
    const latest = new Map([['oa', { amount: '100000' }]]);
    const typedPlan = { ...base, cpfBalancesSource: 'typed' as const };
    expect(withWealthCpfBalances(typedPlan, tagged, latest, asOf)).toBe(typedPlan);
    const wealthPlan = { ...base, cpfBalancesSource: 'wealth' as const };
    const projected = withWealthCpfBalances(wealthPlan, tagged, latest, asOf);
    expect(projected.cpfBalances).toEqual({ oa: 100000, sa: 0, ma: 0, month: '2026-10' });
    expect(withWealthCpfBalances(wealthPlan, [position('none', 'cpf', { cpfAccount: null })], new Map([['none', { amount: '10' }]]), asOf)).toBe(wealthPlan);
    const changed = withCpfProjection(projected, asOf);
    const other = withCpfProjection(withWealthCpfBalances(wealthPlan, tagged, new Map([['oa', { amount: '1' }]]), asOf), asOf);
    expect(changed.cpfMonthlyPayout).not.toBe(other.cpfMonthlyPayout);
  });

  it('grows home prices only after 2026 and keeps valid single and couple ranges', () => {
    expect(homePriceIn(100, 2025, 0.1)).toBe(100);
    expect(homePriceIn(100, 2026, 0.1)).toBe(100);
    expect(homePriceIn(100, 2028, 0.1)).toBeCloseTo(121);
    for (const rows of Object.values(HOME_PRICES)) for (const row of rows) expect(row.low).toBeLessThanOrEqual(row.high);
  });

  it('validates CPF source and healthcare parts', () => {
    expect(validateRetirementPlan({ ...base, cpfBalancesSource: 'bank' } as never, asOf)).toBeTruthy();
    expect(validateRetirementPlan({ ...base, healthcare: { monthlyAmount: 300, insurance: -1, medical: 200, growth: 0.05, priceMonth: '2026-10' } }, asOf)).toBeTruthy();
    expect(validateRetirementPlan({ ...base, healthcare: { monthlyAmount: 300, insurance: 100, medical: 200, growth: 0.05, priceMonth: '2026-10' } }, asOf)).toBeNull();
  });

  it('uses monthlyAmount for legacy and split healthcare plans', () => {
    const split = { ...base, healthcare: { monthlyAmount: 300, insurance: 100, medical: 200, growth: 0.05, priceMonth: '2026-10' } };
    const legacy = { ...base, healthcare: { monthlyAmount: 300, growth: 0.05, priceMonth: '2026-10' } };
    expect({ ...calculateRetirement(split, 100_000, asOf), plan: null }).toEqual({ ...calculateRetirement(legacy, 100_000, asOf), plan: null });
  });
});
