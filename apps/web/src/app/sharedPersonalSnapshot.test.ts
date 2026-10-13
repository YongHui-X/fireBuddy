import { describe, expect, it } from 'vitest';
import {
  MAX_MASKED_CONTEXT_CHARS, MaskingSession, buildPersonalSnapshot,
  createDemoRetirementPlan, createDemoTransactions, createDemoWealth, demoCategories, withLinkedBalances,
} from '@firebuddy/shared';

const todayKey = '2026-10-05';

type SpendingFacts = {
  currentMonth: { total: string; topCategories: Array<{ category: string; amount: string; share: string }> };
  comparison: {
    thisMonthSoFarVersusLastMonth: { direction: string; difference: string };
    categoryChanges: Array<{ category: string; lastMonthAmount: string; direction: string; difference: string }>;
  };
};

type FireFacts = {
  fiTarget: string;
  gapFromTodayAssets: string;
  progressToday: string;
  projectedShareOfTargetAtRetirement: string;
};

/** Build the dated demo aggregates used by the arithmetic and masking checks. */
function demoSnapshot() {
  const wealth = createDemoWealth(todayKey);
  const transactions = createDemoTransactions(todayKey);
  // The phone values the demo's bank accounts from their transactions, so the test does too.
  const snapshots = [...withLinkedBalances(wealth.positions, wealth.snapshots, transactions, todayKey)];
  return buildPersonalSnapshot({
    transactions, categories: demoCategories,
    ...wealth, snapshots, retirementPlan: createDemoRetirementPlan(todayKey),
    essentialCategoryIds: demoCategories.filter((category) => category.categoryType === 'expense').map((category) => category.id),
    todayKey,
  });
}

describe('shared personal snapshot', () => {
  it('derives total assets from net worth and liabilities', () => {
    const { facts } = demoSnapshot();
    expect(facts.assetTotal).toBe('446200.00');
    expect(facts.assetTotal).toBe((Number(facts.netWorth) + Number(facts.liabilityTotal)).toFixed(2));
  });

  it('derives debt to income as a six decimal ratio', () => {
    const { facts } = demoSnapshot();
    const pulse = facts.monthlyPulse as { income: string };
    expect(facts.debtToIncome).toBe('0.317308');
    expect(facts.debtToIncome).toBe((Number(facts.monthlyDebtService) / Number(pulse.income)).toFixed(6));
  });

  it('derives bounded category shares from current month spending', () => {
    const { facts } = demoSnapshot();
    const { currentMonth } = facts.spending as SpendingFacts;
    expect(currentMonth.topCategories.length).toBeGreaterThan(0);
    for (const row of currentMonth.topCategories) {
      expect(row.share).toBe((Number(row.amount) / Number(currentMonth.total)).toFixed(6));
      expect(Number(row.share)).toBeGreaterThanOrEqual(0);
      expect(Number(row.share)).toBeLessThanOrEqual(1);
    }
  });

  it('compares month to date spending and food spending with last month', () => {
    const { facts } = demoSnapshot();
    const { comparison } = facts.spending as SpendingFacts;
    expect(comparison.thisMonthSoFarVersusLastMonth).toEqual({ direction: 'less', difference: '2641.65' });
    expect(comparison.categoryChanges[0]).toEqual({
      category: 'Food & Drink', lastMonthAmount: '541.30', direction: 'less', difference: '24.45',
    });
  });

  it('distinguishes FIRE progress today from projected retirement progress', () => {
    const { facts } = demoSnapshot();
    const fire = facts.fire as FireFacts;
    expect(fire.gapFromTodayAssets).toBe('3176593.70');
    expect(fire.gapFromTodayAssets).toBe((Number(fire.fiTarget) - Number(facts.investableAssets)).toFixed(2));
    expect(fire.progressToday).toBe((Number(facts.investableAssets) / Number(fire.fiTarget)).toFixed(6));
    expect(fire.projectedShareOfTargetAtRetirement).toBeDefined();
    expect(fire.projectedShareOfTargetAtRetirement).not.toBeNull();
    expect(fire).not.toHaveProperty('progressRate');
  });

  it('masks derived figures as money and percent tokens while retaining directions', () => {
    const { facts } = demoSnapshot();
    const spending = facts.spending as SpendingFacts;
    const fire = facts.fire as FireFacts;
    const masked = new MaskingSession().maskFacts(facts);
    const serialized = JSON.stringify(masked);
    const rawFigures = [
      facts.assetTotal, facts.debtToIncome, fire.fiTarget, fire.gapFromTodayAssets,
      fire.progressToday, fire.projectedShareOfTargetAtRetirement,
      spending.currentMonth.total, spending.comparison.thisMonthSoFarVersusLastMonth.difference,
      ...spending.currentMonth.topCategories.flatMap((row) => [row.amount, row.share]),
      ...spending.comparison.categoryChanges.flatMap((row) => [row.lastMonthAmount, row.difference]),
    ];
    for (const value of rawFigures) {
      expect(typeof value).toBe('string');
      expect(serialized).not.toContain(value as string);
    }
    const percentToken = /^\{\{R\d+\}\} \(range: [^)]*%\)$/;
    expect(masked.debtToIncome).toMatch(percentToken);
    const maskedFire = masked.fire as FireFacts;
    expect(maskedFire.progressToday).toMatch(percentToken);
    expect(maskedFire.projectedShareOfTargetAtRetirement).toMatch(percentToken);
    const maskedSpending = masked.spending as SpendingFacts;
    for (const row of maskedSpending.currentMonth.topCategories) expect(row.share).toMatch(percentToken);
    expect(maskedSpending.comparison.thisMonthSoFarVersusLastMonth.direction).toBe('less');
    expect(maskedSpending.comparison.categoryChanges[0].direction).toBe('less');
  });

  it('returns the bounded aggregate key set with formatted money and category totals', () => {
    const { effectiveDate, facts } = demoSnapshot();
    expect(effectiveDate).toBe(todayKey);
    expect(Object.keys(facts)).toEqual([
      'effectiveDate', 'snapshotStatus', 'netWorth', 'liabilityTotal', 'assetTotal', 'monthlyDebtService',
      'debtToIncome', 'investableAssets', 'emergencyRunwayMonths', 'averageMonthlyEssentialSpending', 'derived',
      'monthlyPulse', 'fire', 'recommendedAction', 'anomalyCounts', 'warningCodes', 'spending',
    ]);
    for (const key of ['netWorth', 'liabilityTotal', 'monthlyDebtService', 'investableAssets', 'averageMonthlyEssentialSpending']) {
      const value = facts[key];
      expect(value === null || /^-?\d+\.\d{2}$/.test(value as string)).toBe(true);
    }
    const spending = facts.spending as SpendingFacts;
    expect(spending.currentMonth.topCategories.length).toBeLessThanOrEqual(5);
    for (const row of spending.currentMonth.topCategories) {
      expect(Object.keys(row)).toEqual(['category', 'amount', 'share']);
      expect(row.amount).toMatch(/^\d+\.\d{2}$/);
      expect(row.share === null || /^\d\.\d{6}$/.test(row.share)).toBe(true);
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
