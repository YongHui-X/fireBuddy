import type { FinancialSummary } from '@firebuddy/shared';
import { describe, expect, it } from 'vitest';

import type { Category, Transaction } from '../app/FireBuddyProvider';
import {
  getSpendingLabelLines,
  getSpendingLineEndpoint,
  getSpendingSectorOffset,
  groupSpendingPieData,
} from '../components/SpendingPieChart';
import {
  buildCategoryBudgetData,
  buildFireProgressSummary,
  buildMonthlySpendingData,
  getAdjacentSpendingMonth,
  getFireStatusLabel,
  getMonthlyObservation,
  getSpendingMonthOptions,
} from './Dashboard';

const categories: Category[] = [
  { id: 'food', name: 'Food & Drink', color: '#3C8A61', icon: 'food', monthlyBudget: 600, categoryType: 'expense' },
  { id: 'travel', name: 'Travel', color: '#E5B24A', icon: 'travel', monthlyBudget: 300, categoryType: 'expense' },
  { id: 'salary', name: 'Salary', color: '#67B47C', icon: 'salary', monthlyBudget: 0, categoryType: 'income' },
];

const transactions: Transaction[] = [
  { id: '1', description: 'Groceries', amount: -80, category: 'food', account: 'cash', date: '2026-09-01', transactionType: 'expense' },
  { id: '2', description: 'Travel fund', amount: -120, category: 'travel', account: 'card', date: '2026-09-01', transactionType: 'expense' },
  { id: '3', description: 'August meal', amount: -40, category: 'food', account: 'cash', date: '2026-08-20', transactionType: 'expense' },
  { id: '4', description: 'Future expense', amount: -10, category: 'food', account: 'cash', date: '2026-10-01', transactionType: 'expense' },
  { id: '5', description: 'Salary', amount: 6200, category: 'salary', account: 'bank', date: '2026-09-01', transactionType: 'income' },
];

describe('Dashboard monthly spending breakdown', () => {
  it('shows only the five highest spending budget categories', () => {
    const budgetCategories: Category[] = Array.from({ length: 6 }, (_, index) => ({
      id: `category-${index + 1}`,
      name: `Category ${index + 1}`,
      color: '#3C8A61',
      icon: 'food',
      monthlyBudget: 500,
      categoryType: 'expense',
    }));
    const budgetTransactions: Transaction[] = budgetCategories.map((category, index) => ({
      id: `transaction-${index + 1}`,
      description: category.name,
      amount: -(index + 1) * 10,
      category: category.id,
      account: 'cash',
      date: '2026-09-02',
      transactionType: 'expense',
    }));

    expect(buildCategoryBudgetData(budgetCategories, budgetTransactions, '2026-09').map((item) => item.name))
      .toEqual(['Category 6', 'Category 5', 'Category 4', 'Category 3', 'Category 2']);
  });

  it('defaults the available periods to the latest month and excludes future months', () => {
    expect(getSpendingMonthOptions(transactions, '2026-09')).toEqual(['2026-09', '2026-08']);
  });

  it('moves between header months without crossing the available range', () => {
    const months = ['2026-09', '2026-08'];

    expect(getAdjacentSpendingMonth(months, '2026-09', 'older')).toBe('2026-08');
    expect(getAdjacentSpendingMonth(months, '2026-08', 'newer')).toBe('2026-09');
    expect(getAdjacentSpendingMonth(months, '2026-09', 'newer')).toBe('2026-09');
  });

  it('registers every expense category populated in the selected month', () => {
    const spending = buildMonthlySpendingData(categories, transactions, '2026-09', ['food'], 'light');

    expect(spending.map((item) => item.name)).toEqual(['Food & Drink', 'Travel']);
    expect(spending.reduce((total, item) => total + item.value, 0)).toBe(200);
  });

  it('switches aggregation to a historical month without including income', () => {
    expect(buildMonthlySpendingData(categories, transactions, '2026-08', ['food'], 'light'))
      .toMatchObject([{ name: 'Food & Drink', value: 40, isEssential: true }]);
  });

  it('keeps the four largest categories and combines the remainder as Others', () => {
    const grouped = groupSpendingPieData([
      { name: 'Food', value: 500, color: '#1' },
      { name: 'Transport', value: 300, color: '#2' },
      { name: 'Shopping', value: 200, color: '#3' },
      { name: 'Bills', value: 150, color: '#4' },
      { name: 'Travel', value: 100, color: '#5' },
      { name: 'Entertainment', value: 50, color: '#6' },
    ], 'light');

    expect(grouped.map((item) => item.name)).toEqual(['Food', 'Transport', 'Shopping', 'Bills', 'Others']);
    expect(grouped.at(-1)?.value).toBe(150);
  });

  it('wraps long mobile labels without shortening their category names', () => {
    expect(getSpendingLabelLines('Bills & Utilities', true)).toEqual(['Bills &', 'Utilities']);
    expect(getSpendingLabelLines('Food & Drink', true)).toEqual(['Food &', 'Drink']);
    expect(getSpendingLabelLines('Bills & Utilities', false)).toEqual(['Bills & Utilities']);
  });

  it('creates label spacing by shortening rather than bending the radial line', () => {
    const endpoint = getSpendingLineEndpoint({ x: 0, y: 0 }, { x: 20, y: 0 });

    expect(endpoint).toEqual({ x: 13, y: 0 });
  });

  it('moves only the active pie sector outward along its midpoint', () => {
    expect(getSpendingSectorOffset(0, true).x).toBeCloseTo(7);
    expect(getSpendingSectorOffset(0, true).y).toBeCloseTo(0);
    expect(getSpendingSectorOffset(90, true).x).toBeCloseTo(0);
    expect(getSpendingSectorOffset(90, true).y).toBeCloseTo(-7);
    expect(getSpendingSectorOffset(45, false)).toEqual({ x: 0, y: 0 });
  });

  it('shows a data based observation only when the month has meaningful activity', () => {
    expect(getMonthlyObservation(6200, 3011, 3189, 0.514, 'September')).toEqual({
      title: 'You saved 51.4% of recorded income',
      detail: 'S$3,189 remained after S$3,011 of expenses in September.',
    });
    expect(getMonthlyObservation(null, null, null, null, 'September')).toBeNull();
  });

  it('describes every FIRE projection state in plain language', () => {
    expect(getFireStatusLabel('projected', 2042)).toBe('Estimated FI year 2042');
    expect(getFireStatusLabel('already_reached', null)).toBe('FI target reached');
    expect(getFireStatusLabel('unreachable', null)).toBe('Target not reached with current assumptions');
    expect(getFireStatusLabel('insufficient_data', null)).toBe('Complete your setup to estimate an FI year');
  });
});

const baseSummary: FinancialSummary = {
  effectiveDate: '2026-09-14', dataMode: 'demo', netWorth: '120000', assetTotal: '130000', liabilityTotal: '10000',
  priorMonthNetWorth: '118000', monthlyNetWorthChange: '2000', investableAssets: '90000', emergencyEligibleAssets: '20000',
  averageMonthlyEssentialSpending: '2500', emergencyRunwayMonths: '8.000000', latestSnapshotDate: '2026-09-01', snapshotStatus: 'current',
  pulse: {
    month: '2026-09', income: '6200', spending: '3011', savingsAmount: '3189', savingsRate: '0.514',
    savingsRateStatus: 'available', investedAmount: '1000', completeness: 'complete',
  },
  fire: {
    status: 'projected', effectiveDate: '2026-09-14', currentInvestableAssets: '90000', fiTarget: '1500000',
    progressRate: '0.06', progressRateCapped: '0.06', estimatedMonths: 240, estimatedFiYear: 2046,
    requiredMonthlyInvestment: '2400', assumptions: null,
    spendingBaseline: { status: 'available', source: 'transactions', startDate: '2026-03-01', endDate: '2026-08-31', completedMonths: 6, expenseTotal: '18000', annualisedSpending: '36000' },
    actualPath: [], projectedPath: [], warnings: [],
  },
  recommendedAction: null, transactionAnomalies: [], warnings: [],
};

describe('Dashboard FI progress card', () => {
  it('returns nothing until the projection has a target and a progress rate', () => {
    expect(buildFireProgressSummary(null)).toBeNull();
    expect(buildFireProgressSummary({
      ...baseSummary,
      fire: { ...baseSummary.fire, status: 'insufficient_data', fiTarget: null, progressRate: null, progressRateCapped: null, estimatedFiYear: null },
    })).toBeNull();
  });

  it('shapes the headline figure, capped track, status line, and facts', () => {
    const progress = buildFireProgressSummary({
      ...baseSummary,
      fire: { ...baseSummary.fire, progressRate: '1.25', progressRateCapped: '1', status: 'already_reached' },
    });

    expect(progress?.percentLabel).toBe('125.0% funded');
    expect(progress?.progress).toBe(1);
    expect(progress?.statusLabel).toBe('FI target reached');
    expect(progress?.facts).toEqual([
      { label: 'Investable assets', value: 'S$90,000' },
      { label: 'FI target', value: 'S$1,500,000' },
      { label: 'Required monthly', value: 'S$2,400' },
      { label: 'Emergency runway', value: '8.0 months', detail: 'of essentials' },
    ]);
  });

  it('drops the optional facts when the runway or required contribution is unknown', () => {
    const progress = buildFireProgressSummary({
      ...baseSummary,
      emergencyRunwayMonths: null,
      fire: { ...baseSummary.fire, requiredMonthlyInvestment: null },
    });

    expect(progress?.percentLabel).toBe('6.0% funded');
    expect(progress?.statusLabel).toBe('Estimated FI year 2046');
    expect(progress?.facts.map((fact) => fact.label)).toEqual(['Investable assets', 'FI target']);
  });
});
