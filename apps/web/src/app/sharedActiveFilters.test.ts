import { describe, expect, it } from 'vitest';
import { describeActiveFilters } from '@firebuddy/shared';

describe('describeActiveFilters', () => {
  it('returns active filters in their documented order with looked-up labels', () => {
    expect(describeActiveFilters({ transactionType: 'income', categoryId: 'c', accountId: 'a', tagId: 't', startDate: '2026-01-01' }, {
      categoryName: () => 'Food',
      accountName: () => 'DBS',
      tagName: () => 'trip',
      rangeLabel: '1 Jan – 7 Jan',
    })).toEqual([
      { key: 'transactionType', label: 'Income' },
      { key: 'categoryId', label: 'Food' },
      { key: 'accountId', label: 'DBS' },
      { key: 'tagId', label: '#trip' },
      { key: 'dates', label: '1 Jan – 7 Jan' },
    ]);
  });

  it('uses generic fallbacks for missing lookups and custom dates', () => {
    expect(describeActiveFilters({ transactionType: 'expense', categoryId: 'c', accountId: 'a', tagId: 't', endDate: '2026-01-07' })).toEqual([
      { key: 'transactionType', label: 'Expense' },
      { key: 'categoryId', label: 'Category' },
      { key: 'accountId', label: 'Account' },
      { key: 'tagId', label: 'Tag' },
      { key: 'dates', label: 'Custom dates' },
    ]);
  });

  it('returns no chips for empty filters', () => {
    expect(describeActiveFilters({})).toEqual([]);
  });
});
