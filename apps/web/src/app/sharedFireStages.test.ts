import { describe, expect, it } from 'vitest';
import { calculateRetirement, coastNumber, coastStartMonth, fireStages, monthIndex, type RetirementPlan } from '@firebuddy/shared';

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
  fireType: 'custom',
};

describe('coastStartMonth', () => {
  it('returns this month when current assets already exceed the coast number', () => {
    const fire = calculateRetirement({ ...basePlan, fireType: 'coast' }, 1_000_000, asOf);
    const target = Number(fire.fiTarget);
    const months = 24 * 12;
    const coast = coastNumber(target, months, basePlan.beforeReturn);
    expect(1_000_000).toBeGreaterThanOrEqual(coast ?? Infinity);
    expect(coastStartMonth(fire)).toBe(asOf.slice(0, 7));
  });

  it('returns null when tiny assets and zero contributions never reach coast', () => {
    const fire = calculateRetirement({ ...basePlan, fireType: 'coast', monthlyContribution: 0 }, 1, asOf);
    expect(coastStartMonth(fire)).toBeNull();
  });

  it('returns the first accumulation month whose balance can coast to retirement', () => {
    // Needs a plan that is funded by retirement, or coasting is never possible.
    const fire = calculateRetirement({ ...basePlan, fireType: 'coast', monthlyContribution: 6000 }, 0, asOf);
    const start = coastStartMonth(fire);
    expect(start).not.toBeNull();
    const index = fire.monthlyCashFlows!.findIndex((row) => row.month === start);
    expect(index).toBeGreaterThan(0);
    const target = Number(fire.fiTarget);
    const monthly = (1 + basePlan.beforeReturn) ** (1 / 12);
    const row = fire.monthlyCashFlows![index];
    const previous = fire.monthlyCashFlows![index - 1];
    const remaining = monthIndex(basePlan.retirementMonth) - monthIndex(row.month) - 1;
    const previousRemaining = monthIndex(basePlan.retirementMonth) - monthIndex(previous.month) - 1;
    expect(Number(row.balance) * monthly ** remaining).toBeGreaterThanOrEqual(target);
    expect(Number(previous.balance) * monthly ** previousRemaining).toBeLessThan(target);
  });

  it('returns null for a plan-less result', () => {
    expect(coastStartMonth(calculateRetirement(null, 1000, asOf))).toBeNull();
  });
});

describe('fireStages', () => {
  it.each([
    ['lean'],
    ['regular'],
    ['fat'],
    ['custom'],
    [undefined],
  ] as const)('returns one stop-working stage for %s FIRE', (fireType) => {
    const plan = { ...basePlan, fireType } as RetirementPlan;
    const stages = fireStages(calculateRetirement(plan, 100_000, asOf));
    expect(stages).toEqual([{ key: 'fire', title: 'Retire', action: 'Stop working', month: plan.retirementMonth, primary: true }]);
  });

  it('returns coast then full retirement stages', () => {
    const plan = { ...basePlan, fireType: 'coast' as const };
    const fire = calculateRetirement(plan, 0, asOf);
    expect(fireStages(fire)).toEqual([
      { key: 'coast', title: 'Coast age', action: 'Stop investing', month: coastStartMonth(fire), primary: false },
      { key: 'full', title: 'Retire', action: 'Stop working', month: plan.retirementMonth, primary: true },
    ]);
  });

  it('returns barista then full retirement when part-time income ends early', () => {
    const plan: RetirementPlan = {
      ...basePlan,
      fireType: 'barista',
      otherIncome: [{ label: 'Part time', monthlyAmount: 500, startMonth: '2050-01', endMonth: '2060-01', annualGrowth: 0, source: 'barista' }],
    };
    expect(fireStages(calculateRetirement(plan, 100_000, asOf))).toEqual([
      { key: 'barista', title: 'Barista FIRE', action: 'Go part-time', month: plan.retirementMonth, primary: true },
      { key: 'full', title: 'Stop part-time work', action: 'Stop working', month: '2060-01', primary: false },
    ]);
  });

  it('does not add a full-retirement month when barista income is missing or runs to plan end', () => {
    const missing = fireStages(calculateRetirement({ ...basePlan, fireType: 'barista' }, 100_000, asOf));
    expect(missing[1].month).toBeNull();
    expect(missing[1].primary).toBe(false);
    const atEnd = fireStages(calculateRetirement({ ...basePlan, fireType: 'barista', otherIncome: [{ label: 'Part time', monthlyAmount: 500, startMonth: '2050-01', endMonth: '2076-01', annualGrowth: 0, source: 'barista' }] }, 100_000, asOf));
    expect(atEnd[1].month).toBeNull();
    expect(atEnd[1].primary).toBe(false);
  });

  it.each(['lean', 'regular', 'fat', 'custom', 'coast', 'barista'] as const)('has exactly one primary stage for %s FIRE', (fireType) => {
    const plan: RetirementPlan = fireType === 'barista'
      ? { ...basePlan, fireType, otherIncome: [{ label: 'Part time', monthlyAmount: 500, startMonth: '2050-01', endMonth: '2060-01', annualGrowth: 0, source: 'barista' }] }
      : { ...basePlan, fireType };
    const stages = fireStages(calculateRetirement(plan, 100_000, asOf));
    expect(stages.filter((stage) => stage.primary)).toHaveLength(1);
    expect(stages.find((stage) => stage.primary)?.month).toBe(plan.retirementMonth);
  });
});
