import { describe, expect, it } from 'vitest';

import type { Category, Transaction } from '../app/FireBuddyProvider';
import { buildMonthlySpendingData, getAdjacentSpendingMonth, getSpendingMonthOptions } from './Dashboard';

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
});
