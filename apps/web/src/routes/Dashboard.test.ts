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
