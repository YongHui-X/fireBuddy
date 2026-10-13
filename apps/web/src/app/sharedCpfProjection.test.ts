import { describe, expect, it } from 'vitest';
import type { RetirementPlan } from '@firebuddy/shared';
import { calculateRetirement, cpfRetirementSum, employeeCpfNow, projectCpf, withCpfProjection, CPF_WITHDRAWAL_LABEL } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';

const asOf = '2026-10-10';
const base = { ...(fixtures.base as RetirementPlan), birthMonth: '1991-01', retirementMonth: '2046-01', endAge: 95, monthlySpending: 3000, monthlyContribution: 1500, portfolioOverride: { amount: 100000, date: '2026-10-01' }, cpfPlan: 'standard' as const, cpfStartAge: 65, beforeReturn: 0.05, afterReturn: 0.05, inflation: 0.03, residency: 'citizen' as const, pay: { grossMonthly: 6000, bonusMonths: 1 }, cpfBalances: { oa: 60000, sa: 30000, ma: 25000, month: '2026-10' }, cpfEstimate: { sum: 'frs' as const, source: 'balances' as const } };

describe('CPF projection rules 22 to 24', () => {
  it('returns null without CPF eligibility, balances, or after payout age', () => {
    expect(projectCpf({ ...base, residency: 'foreigner' }, asOf, 'frs')).toBeNull();
    expect(projectCpf({ ...base, cpfBalances: undefined }, asOf, 'frs')).toBeNull();
    expect(projectCpf({ ...base, birthMonth: '1950-01', cpfStartAge: 65 }, asOf, 'frs')).toBeNull();
  });

  it('keeps RA at 55 within the selected sum and orders BRS, FRS, ERS', () => {
    const frs = cpfRetirementSum('frs', 2046, 0.03);
    const brs = projectCpf({ ...base, cpfEstimate: { sum: 'brs', source: 'balances' } }, asOf, 'brs')!;
    const standard = projectCpf(base, asOf, 'frs')!;
    const ers = projectCpf({ ...base, cpfEstimate: { sum: 'ers', source: 'balances' } }, asOf, 'ers')!;
    expect(standard.raAt55).toBeLessThanOrEqual(frs);
    expect(brs.raAt55).toBeLessThanOrEqual(standard.raAt55);
    expect(brs.monthlyPayout).toBeLessThanOrEqual(standard.monthlyPayout);
    expect(ers.raAt55).toBeGreaterThanOrEqual(standard.raAt55);
    expect(ers.monthlyPayout).toBeGreaterThanOrEqual(standard.monthlyPayout);
  });

  it('caps ordinary pay at S$8,000 and higher pay does not reduce payout', () => {
    const low = projectCpf({ ...base, pay: { grossMonthly: 8000, bonusMonths: 0 } }, asOf, 'frs')!;
    const high = projectCpf({ ...base, pay: { grossMonthly: 12000, bonusMonths: 0 } }, asOf, 'frs')!;
    expect(high.monthlyPayout).toBeGreaterThanOrEqual(low.monthlyPayout);
    expect(employeeCpfNow({ ...base, pay: { grossMonthly: 12000, bonusMonths: 0 } }, asOf)).toBe(1600);
    expect(employeeCpfNow({ ...base, residency: 'foreigner' }, asOf)).toBe(0);
    expect(employeeCpfNow({ ...base, residency: 'pr', prSinceYear: 2026 }, asOf)).toBe(300);
  });

  it('reduces OA through home-loan use and first-year PR rates', () => {
    const home = projectCpf({ ...base, property: { status: 'own', oaMonthly: 1500, fromMonth: '2026-10', untilMonth: '2046-10' } }, asOf, 'frs')!;
    const plain = projectCpf(base, asOf, 'frs')!;
    const pr = projectCpf({ ...base, residency: 'pr', prSinceYear: 2026 }, asOf, 'frs')!;
    expect(home.withdrawableAt55).toBeLessThan(plain.withdrawableAt55);
    expect(home.oaAtPayout).toBeLessThan(plain.oaAtPayout);
    expect(pr.withdrawableAt55).toBeLessThan(plain.withdrawableAt55);
  });

  it('advances older balances and does not change future balances', () => {
    const older = projectCpf({ ...base, cpfBalances: { ...base.cpfBalances, month: '2025-10' } }, asOf, 'frs')!;
    const current = projectCpf(base, asOf, 'frs')!;
    const future = projectCpf({ ...base, cpfBalances: { ...base.cpfBalances, month: '2027-10' } }, asOf, 'frs')!;
    expect(older.raAt55 > current.raAt55 || older.withdrawableAt55 > current.withdrawableAt55).toBe(true);
    expect(future).toEqual(current);
  });

  it('handles estimated, withdrawn, and foreigner plans', () => {
    expect(withCpfProjection({ ...base, residency: 'foreigner' }, asOf)).toMatchObject({ cpfPlan: 'unknown', cpfMonthlyPayout: 0 });
    const estimated = withCpfProjection({ ...base, cpfEstimate: { sum: 'frs', source: 'sum' }, cpfBalances: undefined }, asOf);
    expect(estimated.cpfMonthlyPayout).toBeGreaterThan(0);
    const withdrawn = withCpfProjection({ ...base, cpfWithdrawAt55: true }, asOf);
    expect(withdrawn.lumpSums?.find((l) => l.label === CPF_WITHDRAWAL_LABEL)).toMatchObject({ direction: 'in', month: '2046-01' });
    expect(Number(calculateRetirement(withdrawn, 100000, asOf).fiTarget)).toBeLessThan(Number(calculateRetirement(withCpfProjection(base, asOf), 100000, asOf).fiTarget));
  });

  it('replaces the generated CPF withdrawal on repeated projection', () => {
    const plan = { ...base, cpfWithdrawAt55: true };
    const once = withCpfProjection(plan, asOf);
    const twice = withCpfProjection(once, asOf);
    expect(twice.lumpSums?.filter((lump) => lump.label === CPF_WITHDRAWAL_LABEL)).toHaveLength(1);
    expect(calculateRetirement(twice, 100000, asOf).fiTarget).toBe(calculateRetirement(once, 100000, asOf).fiTarget);
  });

  it('preserves legacy calculation output when new fields are absent', () => {
    const { residency, pay, cpfBalances, cpfEstimate, property, cpfWithdrawAt55, healthcare, ...legacy } = base;
    const modern = calculateRetirement(base, 100000, asOf);
    const old = calculateRetirement(legacy, 100000, asOf);
    expect({ ...modern, plan: null }).toEqual({ ...old, plan: null });
  });
});
