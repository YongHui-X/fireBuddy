import { describe, expect, it } from 'vitest';

import type { Account, Category, Tag, Transaction } from './FireBuddyProvider';
import { buildTransactionCsv, filterLocalExportTransactions, getTransactionExportFilename, transactionCsvColumns } from './transactionExport';

const categories: Category[] = [{ id: 'food', name: 'Food, dining', color: '#3C8A61', icon: 'food', monthlyBudget: 0, categoryType: 'expense' }];
const accounts: Account[] = [{ id: 'cash', name: 'Cash', color: '#E5B24A', type: 'cash' }];
const tags: Tag[] = [
  { id: 'tag-z', userId: 'demo', name: 'zeta', usageCount: 1, createdAt: '', updatedAt: '' },
  { id: 'tag-a', userId: 'demo', name: 'Alpha', usageCount: 1, createdAt: '', updatedAt: '' },
];
const transactions: Transaction[] = [
  { id: '2', description: 'Salary', amount: 5200, category: '', account: 'cash', date: '2026-09-02', transactionType: 'income', tagIds: ['tag-z', 'tag-a'], createdAt: 'b', updatedAt: 'c' },
  { id: '1', description: '=SUM(1,2)\nnext', amount: -8.5, category: 'food', account: 'cash', date: '2026-09-01', transactionType: 'expense', tagIds: [] },
];

describe('portable transaction CSV', () => {
  it('matches the stable columns, BOM, CRLF, ordering, signing, escaping, and tag order', () => {
    const csv = buildTransactionCsv(transactions, categories, accounts, tags);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('\r\n');
    expect(csv.slice(1).split('\r\n')[0]).toBe(transactionCsvColumns.join(','));
    expect(csv.indexOf("'=SUM")).toBeLessThan(csv.indexOf('Salary'));
    expect(csv).toContain('-8.50');
    expect(csv).toContain('5200.00');
    expect(csv).toContain('Uncategorised,,Cash,cash,Alpha | zeta,tag-a | tag-z');
    expect(csv).toContain('"\'=SUM(1,2)\nnext"');
  });

  it('applies all demo filters with the same semantics as the backend', () => {
    expect(filterLocalExportTransactions(transactions, categories, accounts, { transactionType: 'expense' }).map((row) => row.id)).toEqual(['1']);
    expect(filterLocalExportTransactions(transactions, categories, accounts, { startDate: '2026-09-02', endDate: '2026-09-02' }).map((row) => row.id)).toEqual(['2']);
    expect(filterLocalExportTransactions(transactions, categories, accounts, { categoryId: 'food', accountId: 'cash', search: 'dining' }).map((row) => row.id)).toEqual(['1']);
    expect(filterLocalExportTransactions(transactions, categories, accounts, { tagId: 'tag-a' }).map((row) => row.id)).toEqual(['2']);
  });

  it('adds an optional date range to a deterministic local filename', () => {
    expect(getTransactionExportFilename({}, new Date(2026, 8, 10))).toBe('firebuddy-transactions-2026-09-10.csv');
    expect(getTransactionExportFilename({ startDate: '2026-01-01', endDate: '2026-06-30' }, new Date(2026, 8, 10)))
      .toBe('firebuddy-transactions-2026-01-01-to-2026-06-30-2026-09-10.csv');
  });
});
