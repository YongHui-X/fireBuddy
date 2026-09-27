import { describe, expect, it } from 'vitest';
import type { RetirementPlan } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';
import { describeAssets, describeIncome, describeTimeline, provenanceLabel } from './retirementReview';

const base = fixtures.base as RetirementPlan;

describe('retirement review facts', () => {
  it('labels a group by its strongest provenance', () => {
    const plan = { ...base, provenance: { birthMonth: 'assumed', retirementMonth: 'recorded', monthlySpending: 'user-entered' } } as RetirementPlan;
    expect(provenanceLabel(plan, ['birthMonth'])).toBe('Default');
    expect(provenanceLabel(plan, ['birthMonth', 'retirementMonth'])).toBe('Recorded');
    expect(provenanceLabel(plan, ['retirementMonth', 'monthlySpending'])).toBe('Typed by you');
    expect(provenanceLabel(plan, ['endAge'])).toBe('Default');
  });

  it('describes the timeline with age and distance', () => {
    const fact = describeTimeline({ ...base, retirementMonth: '2036-01' }, '2026-01');
    expect(fact.headline).toBe('Retire January 2036 at 60');
    expect(fact.detail).toBe('Plan through age 95 · 10 years away');
    expect(describeTimeline({ ...base, retirementMonth: '' }, '2026-01').headline).toBe('Retirement month missing');
  });

  it('describes assets from a typed total or the selected list', () => {
    expect(describeAssets({ ...base, portfolioOverride: { amount: 5000, date: '2026-01-01' } }, 5000)).toMatchObject({ detail: 'Typed total, dated 2026-01-01', provenanceKeys: ['portfolioOverride'] });
    expect(describeAssets({ ...base, assetIds: ['a', 'b'] }, 1200).detail).toBe('From 2 selected assets');
    expect(describeAssets(base, 0).detail).toMatch(/starts from zero/);
  });

  it('describes CPF LIFE and other income', () => {
    expect(describeIncome(base).headline).toMatch(/^CPF LIFE Standard/);
    expect(describeIncome({ ...base, cpfPlan: 'unknown' }).headline).toBe('CPF LIFE not included');
    const other = describeIncome({ ...base, otherIncome: [{ label: 'Rent', monthlyAmount: 900, startMonth: '2030-01', endMonth: '2040-01', annualGrowth: 0 }] });
    expect(other.detail).toMatch(/1 other source · .*900 \/ month at start/);
  });
});
