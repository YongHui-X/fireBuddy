import { describe, expect, it } from 'vitest';
import {
  MAX_MASKED_CONTEXT_CHARS, MaskingSession, buildPersonalSnapshot,
  createDemoRetirementPlan, createDemoTransactions, createDemoWealth, demoCategories,
} from '@firebuddy/shared';

const todayKey = '2026-10-03';

function demoSnapshot() {
  const wealth = createDemoWealth(todayKey);
  return buildPersonalSnapshot({
    transactions: createDemoTransactions(todayKey), categories: demoCategories,
    ...wealth, retirementPlan: createDemoRetirementPlan(todayKey),
    essentialCategoryIds: demoCategories.filter((category) => category.categoryType === 'expense').map((category) => category.id),
    todayKey,
  });
}

describe('shared personal snapshot', () => {
  it('returns the bounded aggregate key set with formatted money and category totals', () => {
    const { effectiveDate, facts } = demoSnapshot();
    expect(effectiveDate).toBe(todayKey);
    expect(Object.keys(facts)).toEqual([
      'effectiveDate', 'snapshotStatus', 'netWorth', 'liabilityTotal', 'monthlyDebtService',
      'investableAssets', 'emergencyRunwayMonths', 'averageMonthlyEssentialSpending', 'derived',
      'monthlyPulse', 'fire', 'recommendedAction', 'anomalyCounts', 'warningCodes', 'spending',
    ]);
    for (const key of ['netWorth', 'liabilityTotal', 'monthlyDebtService', 'investableAssets', 'averageMonthlyEssentialSpending']) {
      const value = facts[key];
      expect(value === null || /^-?\d+\.\d{2}$/.test(value as string)).toBe(true);
    }
    const spending = facts.spending as { currentMonth: { topCategories: Array<{ category: string; amount: string }> } };
    expect(spending.currentMonth.topCategories.length).toBeLessThanOrEqual(5);
    for (const row of spending.currentMonth.topCategories) {
      expect(Object.keys(row)).toEqual(['category', 'amount']);
      expect(row.amount).toMatch(/^\d+\.\d{2}$/);
    }
    const masked = JSON.stringify(new MaskingSession().maskFacts(facts));
    expect(masked.length).toBeLessThanOrEqual(MAX_MASKED_CONTEXT_CHARS);
    for (const transaction of createDemoTransactions(todayKey)) expect(masked).not.toContain(transaction.description);
  });

  it('handles empty inputs with missing snapshot status and null figures', () => {
    const { facts } = buildPersonalSnapshot({
      transactions: [], categories: [], positions: [], snapshots: [], contributions: [],
      retirementPlan: null, essentialCategoryIds: [], todayKey,
    });
    expect(facts.snapshotStatus).toBe('missing');
    expect(facts.netWorth).toBeNull();
    expect(facts.liabilityTotal).toBeNull();
    expect(facts.averageMonthlyEssentialSpending).toBeNull();
  });
});
