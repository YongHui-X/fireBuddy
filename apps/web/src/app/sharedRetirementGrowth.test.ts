import { describe, expect, it } from 'vitest';
import { calculateRetirement, validateRetirementPlan, type RetirementPlan } from '@firebuddy/shared';

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

describe('retirement contribution growth', () => {
  it('treats undefined and zero contribution growth as the old calculation', () => {
    const without = calculateRetirement(basePlan, 10000, asOf);
    const explicitZero = calculateRetirement({ ...basePlan, contributionGrowth: 0 }, 10000, asOf);
    // The echoed plan differs only by the explicit field; every calculated figure must match.
    expect({ ...explicitZero, plan: null }).toEqual({ ...without, plan: null });
  });

  it('steps month thirteen contributions up by five percent and raises the projection', () => {
    const result = calculateRetirement({ ...basePlan, contributionGrowth: 0.05 }, 10000, asOf);
    expect(Number(result.monthlyCashFlows?.[12].contribution)).toBeCloseTo(Number(result.monthlyCashFlows?.[0].contribution) * 1.05);
    expect(Number(result.projectedPortfolio)).toBeGreaterThan(Number(calculateRetirement(basePlan, 10000, asOf).projectedPortfolio));
  });

  it('needs a lower contribution with growth and funds the plan when plugged back in', () => {
    const without = calculateRetirement(basePlan, 10000, asOf);
    const withGrowth = calculateRetirement({ ...basePlan, contributionGrowth: 0.05 }, 10000, asOf);
    expect(Number(withGrowth.requiredMonthlyInvestment)).toBeLessThan(Number(without.requiredMonthlyInvestment));
    const funded = calculateRetirement({ ...basePlan, contributionGrowth: 0.05, monthlyContribution: Number(withGrowth.requiredMonthlyInvestment) }, 10000, asOf);
    expect(funded.fundingStatus).toBe('funded');
  });
});

describe('retirement validation', () => {
  it.each([-0.01, 0.31])('rejects contribution growth %s', (contributionGrowth) => {
    expect(validateRetirementPlan({ ...basePlan, contributionGrowth }, asOf)).toContain('yearly increase');
  });

  it('rejects an invalid other income price month', () => {
    expect(validateRetirementPlan({ ...basePlan, otherIncome: [{ label: 'Side income', monthlyAmount: 100, startMonth: '2027-01', endMonth: '2028-01', annualGrowth: 0, priceMonth: '2026-13' }] }, asOf)).toContain('other income');
  });
});

describe('retirement income price month', () => {
  it('inflates income priced today when it starts twelve months later', () => {
    const plan: RetirementPlan = { ...basePlan, retirementMonth: '2027-01', otherIncome: [{ label: 'Side income', monthlyAmount: 100, startMonth: '2027-01', endMonth: '2028-01', annualGrowth: 0, priceMonth: '2026-01' }] };
    const result = calculateRetirement(plan, 100000, asOf);
    expect(Number(result.monthlyCashFlows?.[12].otherIncome)).toBeCloseTo(103);
  });

  it('leaves income without a price month unchanged', () => {
    const plan: RetirementPlan = { ...basePlan, retirementMonth: '2027-01', otherIncome: [{ label: 'Side income', monthlyAmount: 100, startMonth: '2027-01', endMonth: '2028-01', annualGrowth: 0 }] };
    const result = calculateRetirement(plan, 100000, asOf);
    expect(Number(result.monthlyCashFlows?.[12].otherIncome)).toBeCloseTo(100);
  });
});
