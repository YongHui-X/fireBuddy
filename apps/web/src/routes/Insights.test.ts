import { describe, expect, it } from 'vitest';

import { buildExpenseCsv, buildExpenseSeries, filterExpensesForRange } from './Insights';
import type { Account, Category, Transaction } from '../app/FireBuddyProvider';


const transactions: Transaction[] = [
  { id: '1', description: 'Lunch', amount: -12, category: 'food', account: 'cash', date: '2026-08-14', transactionType: 'expense' },
  { id: '2', description: 'Train', amount: -2, category: 'transport', account: 'cash', date: '2026-08-10', transactionType: 'expense' },
  { id: '3', description: 'Old bill', amount: -30, category: 'bills', account: 'bank', date: '2026-07-31', transactionType: 'expense' },
  { id: '4', description: 'Salary', amount: 5200, category: 'salary', account: 'bank', date: '2026-08-14', transactionType: 'income' },
];

describe('Insights expense aggregation', () => {
  it('filters and aggregates the selected date range', () => {
    const filtered = filterExpensesForRange(transactions, 'Week', new Date('2026-08-14T12:00:00'));
    const series = buildExpenseSeries(filtered, 'Week');

    expect(filtered.map((transaction) => transaction.id)).toEqual(['1', '2']);
    expect(series.reduce((total, point) => total + point.expenses, 0)).toBe(14);
  });

  it('exports only the supplied filtered expenses with account and category names', () => {
    const categories: Category[] = [
      { id: 'food', name: 'Food & Drink', color: '#3C8A61', icon: 'food', monthlyBudget: 600, categoryType: 'expense' },
    ];
    const accounts: Account[] = [
      { id: 'cash', name: 'Cash', type: 'cash', color: '#E5B24A' },
    ];

    const csv = buildExpenseCsv([transactions[0]], categories, accounts);

    expect(csv).toContain('Lunch,12.00,Food & Drink,Cash');
    expect(csv).not.toContain('Train');
  });
});
