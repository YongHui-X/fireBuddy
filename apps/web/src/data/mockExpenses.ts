import type { LocalExpenseRecord } from '@firebuddy/shared';

export const mockExpenses: LocalExpenseRecord[] = [
  {
    id: 'local-expense-seed-2026-05-02-01',
    amount: '6.40',
    date: '2026-05-02',
    accountId: 'grabpay',
    categoryId: 'food_drink',
    description: 'Kopi and kaya toast before work',
    displayDescription: 'Kopi and kaya toast before work',
  },
  {
    id: 'local-expense-seed-2026-05-01-02',
    amount: '18.90',
    date: '2026-05-01',
    accountId: 'dbs_altitude',
    categoryId: 'transport',
    description: 'Grab ride home after late dinner',
    displayDescription: 'Grab ride home after late dinner',
  },
  {
    id: 'local-expense-seed-2026-04-30-03',
    amount: '42.00',
    date: '2026-04-30',
    accountId: 'dbs_savings',
    categoryId: 'bills_utilities',
    description: 'Broadband bill',
    displayDescription: 'Broadband bill',
  },
  {
    id: 'local-expense-seed-2026-04-29-04',
    amount: '24.50',
    date: '2026-04-29',
    accountId: 'ocbc_360',
    categoryId: 'shopping',
    description: 'Household refill pack',
    displayDescription: 'Household refill pack',
  },
];
