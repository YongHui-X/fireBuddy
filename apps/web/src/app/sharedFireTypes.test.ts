import { describe, expect, it } from 'vitest';
import {
  FIRE_TYPES,
  calculateRetirement,
  coastNumber,
  monthIndex,
  presetSpending,
  validateRetirementPlan,
  type RetirementPlan,
} from '@firebuddy/shared';

const asOf = '2026-01-01';

const basePlan: RetirementPlan = {
  version: 2,
  spendingMonth: '2025-12',
  birthMonth: '1986-01',
  retirementMonth: '2050-01',
  endAge: 90,
  monthlySpending: 2000,
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

describe('shared FIRE types and helpers', () => {
  it('defines the expected FIRE type presets', () => {
    expect(FIRE_TYPES.map((item) => item.key)).toEqual(['lean', 'regular', 'fat', 'coast', 'barista', 'custom']);
  });

  it('calculates Lean, Regular and Fat spending from recorded averages', () => {
    expect(presetSpending('lean', 2000, 0, 'custom')).toBe(1200);
    expect(presetSpending('regular', 2000, 0, 'custom')).toBe(2000);
    expect(presetSpending('fat', 2000, 0, 'custom')).toBe(3000);
    expect(presetSpending('coast', 2000, 0, 'custom')).toBeNull();
    expect(presetSpending('barista', 2000, 0, 'custom')).toBeNull();
    expect(presetSpending('custom', 2000, 0, 'custom')).toBeNull();
  });

  it('round-trips spending presets without a recorded average', () => {
    expect(presetSpending('regular', null, 1200, 'lean')).toBe(2000);
    expect(presetSpending('fat', null, 1200, 'lean')).toBe(3000);
    expect(presetSpending('lean', null, 2000, 'regular')).toBe(1200);
    expect(presetSpending('regular', null, 0, 'custom')).toBeNull();
    expect(presetSpending('regular', null, Number.NaN, 'custom')).toBeNull();
  });

  it('calculates a coast number and rejects invalid inputs', () => {
    const target = 100000;
    expect(coastNumber(target, 0, 0.05)).toBe(target);
    expect(coastNumber(target, 12, 0.05)).toBeCloseTo(Math.ceil(target / 1.05), 0);
    expect(coastNumber(-1, 12, 0.05)).toBeNull();
    expect(coastNumber(target, Number.NaN, 0.05)).toBeNull();
    expect(coastNumber(target, 12, -1)).toBeNull();
  });

  it('matches the retirement projection when starting at the coast number', () => {
    const plan = { ...basePlan, monthlyContribution: 0, fireType: 'coast' as const };
    const effectiveDate = asOf;
    const baseline = calculateRetirement(plan, 0, effectiveDate);
    const monthsToRetirement = monthIndex(plan.retirementMonth) - monthIndex(effectiveDate);
    const coast = coastNumber(Number(baseline.fiTarget), monthsToRetirement, plan.beforeReturn)!;
    const atCoast = calculateRetirement(plan, coast, effectiveDate);
    const belowCoast = calculateRetirement(plan, coast * 0.99, effectiveDate);

    expect(Math.abs(Number(atCoast.projectedPortfolio) - Number(atCoast.fiTarget))).toBeLessThanOrEqual(1);
    expect(belowCoast.fundingStatus).toBe('shortfall');
  });

  it.each([
    [{ birthMonth: '' }, 'Enter your birth year and month.'],
    [{ birthMonth: '2026-13' }, 'Enter your birth year and month.'],
    [{ endAge: 49 }, 'Plan through an age between 50 and 120.'],
    [{ endAge: 121 }, 'Plan through an age between 50 and 120.'],
  ] as const)('validates invalid plan input %s', (changes, message) => {
    expect(validateRetirementPlan({ ...basePlan, ...changes }, asOf)).toBe(message);
  });

  it('reports past retirement and retirement at or after the plan horizon', () => {
    expect(validateRetirementPlan({ ...basePlan, retirementMonth: '2025-12' }, asOf)).toContain('already passed');
    expect(validateRetirementPlan({ ...basePlan, retirementMonth: '2076-01' }, asOf)).toBe('Retire before the age you plan through.');
  });

  it('accepts a valid plan', () => {
    expect(validateRetirementPlan(basePlan, asOf)).toBeNull();
  });

  it('accepts Barista FIRE income and lowers the target', () => {
    const withBarista: RetirementPlan = {
      ...basePlan,
      fireType: 'barista',
      otherIncome: [{ source: 'barista', label: 'Part-time work', monthlyAmount: 800, startMonth: '2050-01', endMonth: '2055-01', annualGrowth: 0 }],
    };
    expect(validateRetirementPlan(withBarista, asOf)).toBeNull();
    const withoutIncome = calculateRetirement(basePlan, 100000, asOf);
    const withIncome = calculateRetirement(withBarista, 100000, asOf);
    expect(Number(withIncome.fiTarget)).toBeLessThan(Number(withoutIncome.fiTarget));
  });
});
