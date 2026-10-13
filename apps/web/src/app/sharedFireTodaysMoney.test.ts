import { describe, expect, it } from 'vitest';
import { calculateRetirement, fireTodaysMoney, type RetirementPlan } from '@firebuddy/shared';

const effectiveDate = '2026-01-01';
const basePlan: RetirementPlan = {
  version: 2,
  spendingMonth: '2026-01',
  birthMonth: '1986-01',
  retirementMonth: '2027-01',
  endAge: 90,
  monthlySpending: 3000,
  monthlyContribution: 1000,
  assetIds: [],
  portfolioOverride: null,
  cpfPlan: 'unknown',
  cpfStartAge: 65,
  cpfMonthlyPayout: 0,
  otherIncome: [],
  beforeReturn: 0.05,
  afterReturn: 0.03,
  inflation: 0.03,
  provenance: {},
  fireType: 'regular',
};

describe('fireTodaysMoney', () => {
  it.each([0.03, 0.05])('converts first retirement spending back to today at %s inflation', (inflation) => {
    const plan = { ...basePlan, inflation };
    const fire = calculateRetirement(plan, 100_000, effectiveDate);
    const firstRetirement = fire.monthlyCashFlows!.find((row) => row.month === plan.retirementMonth)!;
    const toToday = fireTodaysMoney(fire);

    expect(toToday(firstRetirement.expenses, firstRetirement.month)).toBeCloseTo(plan.monthlySpending, 2);
  });

  it('divides a later amount by monthly compounded inflation from the month before today', () => {
    const fire = calculateRetirement(basePlan, 100_000, effectiveDate);
    const toToday = fireTodaysMoney(fire);
    // The base is the end of the month before today (2025-12), so 2027-01 is 13 months on.
    const monthsLater = 13;
    const amount = 1030;
    const expected = amount / (1.03 ** (monthsLater / 12));

    expect(toToday(amount, '2027-01')).toBeCloseTo(expected, 2);
  });

  it('converts a calculated other-income amount from a later month', () => {
    const plan: RetirementPlan = {
      ...basePlan,
      otherIncome: [{ label: 'Other income', monthlyAmount: 100, startMonth: '2027-01', endMonth: '2028-01', annualGrowth: 0 }],
    };
    const fire = calculateRetirement(plan, 100_000, effectiveDate);
    const row = fire.monthlyCashFlows!.find((item) => item.month === '2027-01')!;

    expect(fireTodaysMoney(fire)(row.otherIncome, row.month)).toBeCloseTo(100 / 1.03 ** (13 / 12), 2);
  });

  it('returns null for null and undefined values', () => {
    const toToday = fireTodaysMoney(calculateRetirement(basePlan, 100_000, effectiveDate));

    expect(toToday(null, '2027-01')).toBeNull();
    expect(toToday(undefined, '2027-01')).toBeNull();
  });

  it('accepts a string amount', () => {
    const toToday = fireTodaysMoney(calculateRetirement(basePlan, 100_000, effectiveDate));

    expect(toToday('103', '2026-12')).toBeCloseTo(100, 2);
  });

  it('leaves amounts unchanged when inflation is zero', () => {
    const plan = { ...basePlan, inflation: 0 };
    const toToday = fireTodaysMoney(calculateRetirement(plan, 100_000, effectiveDate));

    expect(toToday('103', '2030-01')).toBe(103);
  });
});
