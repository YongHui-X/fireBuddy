import { getDeviceDateKey } from './format';
import type { Account, Category, Tag, Transaction } from './types';

/**
 * Local demo dataset used when no Supabase session exists. Mirrors the web demo records so the
 * two apps show the same Singapore saver, using the canonical shared types (string amounts,
 * categoryId / accountId keys).
 */
export const demoUserId = 'demo';

const demoTimestamp = '2026-01-01T00:00:00.000Z';

export const demoCategoryIds = {
  food: '00000000-0000-4000-8000-000000000001',
  transport: '00000000-0000-4000-8000-000000000002',
  shopping: '00000000-0000-4000-8000-000000000003',
  utilities: '00000000-0000-4000-8000-000000000004',
  health: '00000000-0000-4000-8000-000000000005',
  entertainment: '00000000-0000-4000-8000-000000000006',
  travel: '00000000-0000-4000-8000-000000000007',
  others: '00000000-0000-4000-8000-000000000008',
  salary: '00000000-0000-4000-8000-000000000009',
  bonus: '00000000-0000-4000-8000-000000000010',
  dividends: '00000000-0000-4000-8000-000000000011',
  interest: '00000000-0000-4000-8000-000000000012',
  otherIncome: '00000000-0000-4000-8000-000000000013',
} as const;

function demoCategory(
  id: string,
  name: string,
  color: string,
  icon: string,
  monthlyBudget: number,
  categoryType: Category['categoryType'],
): Category {
  return {
    id,
    userId: null,
    name,
    icon,
    color,
    monthlyBudget: monthlyBudget.toFixed(2),
    categoryType,
    isDefault: true,
    createdAt: demoTimestamp,
  };
}

export const demoCategories: readonly Category[] = [
  demoCategory(demoCategoryIds.food, 'Food & Drink', '#3C8A61', 'food', 600, 'expense'),
  demoCategory(demoCategoryIds.transport, 'Transport', '#67B47C', 'transport', 250, 'expense'),
  demoCategory(demoCategoryIds.shopping, 'Shopping', '#E5B24A', 'shopping', 300, 'expense'),
  demoCategory(demoCategoryIds.utilities, 'Bills & Utilities', '#7BAA90', 'utilities', 150, 'expense'),
  demoCategory(demoCategoryIds.health, 'Healthcare', '#2E9B57', 'health', 150, 'expense'),
  demoCategory(demoCategoryIds.entertainment, 'Entertainment', '#8BB89D', 'entertainment', 200, 'expense'),
  demoCategory(demoCategoryIds.travel, 'Travel', '#25543D', 'travel', 400, 'expense'),
  demoCategory(demoCategoryIds.others, 'Others', '#A8D3B7', 'shapes', 200, 'expense'),
  demoCategory(demoCategoryIds.salary, 'Salary', '#3C8A61', 'salary', 0, 'income'),
  demoCategory(demoCategoryIds.bonus, 'Bonus', '#E5B24A', 'bonus', 0, 'income'),
  demoCategory(demoCategoryIds.dividends, 'Dividends', '#67B47C', 'dividends', 0, 'income'),
  demoCategory(demoCategoryIds.interest, 'Interest', '#7BAA90', 'interest', 0, 'income'),
  demoCategory(demoCategoryIds.otherIncome, 'Other income', '#A8D3B7', 'income', 0, 'income'),
];

function demoAccount(id: string, name: string, type: Account['type'], color: string, lastFour: string | null, isDefault = false): Account {
  return { id, userId: demoUserId, name, type, color, lastFour, isDefault, createdAt: demoTimestamp, updatedAt: demoTimestamp };
}

export const demoAccounts: readonly Account[] = [
  demoAccount('dbs_savings', 'DBS Savings', 'bank', '#3C8A61', '4521', true),
  demoAccount('ocbc_360', 'OCBC 360', 'bank', '#67B47C', '8834'),
  demoAccount('dbs_altitude', 'DBS Altitude', 'credit_card', '#7BAA90', '1234'),
  demoAccount('grabpay', 'GrabPay', 'ewallet', '#2E9B57', null),
  demoAccount('cash_wallet', 'Cash', 'cash', '#E5B24A', null),
];

export const demoTags: readonly Tag[] = [];

export const demoProfile = {
  name: 'Jen Tan',
  email: 'jen@demo.com',
} as const;

/** Static headline figures the demo dashboard shows until wealth positions exist on mobile. */
export const demoFoundation = {
  netWorth: 493640,
  assets: 910140,
  liabilities: 416500,
  monthlyChange: 9990,
  fiTarget: 1806313,
  projectedFireYear: 2051,
  projectedFireAge: 55,
} as const;

/** Date a demo record relative to today so the current month is always populated. */
function daysAgo(todayKey: string, days: number) {
  const date = new Date(`${todayKey}T00:00:00`);
  date.setDate(date.getDate() - days);
  return getDeviceDateKey(date);
}

interface DemoTransactionSeed {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  daysAgo: number;
  accountId: string;
  transactionType: Transaction['transactionType'];
}

const demoTransactionSeeds: readonly DemoTransactionSeed[] = [
  { id: '00000000-0000-4000-9000-000000001000', description: 'Monthly salary', amount: 5200, categoryId: demoCategoryIds.salary, daysAgo: 1, accountId: 'dbs_savings', transactionType: 'income' },
  { id: '00000000-0000-4000-9000-000000001001', description: 'Hawker Centre lunch', amount: 8.5, categoryId: demoCategoryIds.food, daysAgo: 2, accountId: 'grabpay', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001002', description: 'MRT Bishan to City Hall', amount: 1.82, categoryId: demoCategoryIds.transport, daysAgo: 2, accountId: 'dbs_savings', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001004', description: 'Cold Storage groceries', amount: 67.4, categoryId: demoCategoryIds.food, daysAgo: 3, accountId: 'dbs_altitude', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001005', description: 'Grab ride home', amount: 12.5, categoryId: demoCategoryIds.transport, daysAgo: 3, accountId: 'grabpay', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001006', description: 'Netflix subscription', amount: 10.98, categoryId: demoCategoryIds.entertainment, daysAgo: 4, accountId: 'dbs_altitude', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001007', description: 'Watsons pharmacy', amount: 22.9, categoryId: demoCategoryIds.health, daysAgo: 5, accountId: 'dbs_altitude', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001008', description: 'Uniqlo Orchard', amount: 79, categoryId: demoCategoryIds.shopping, daysAgo: 6, accountId: 'dbs_altitude', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001009', description: 'SP utilities bill', amount: 98.4, categoryId: demoCategoryIds.utilities, daysAgo: 7, accountId: 'ocbc_360', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001010', description: 'Scoot to Bangkok', amount: 186, categoryId: demoCategoryIds.travel, daysAgo: 9, accountId: 'dbs_altitude', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001011', description: 'Ya Kun kaya toast', amount: 6.2, categoryId: demoCategoryIds.food, daysAgo: 11, accountId: 'cash_wallet', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001012', description: 'Quarterly dividends', amount: 148.3, categoryId: demoCategoryIds.dividends, daysAgo: 13, accountId: 'dbs_savings', transactionType: 'income' },
];

/** Build the demo ledger dated relative to the given day (defaults to today). */
export function createDemoTransactions(todayKey = getDeviceDateKey()): Transaction[] {
  return demoTransactionSeeds.map((seed) => ({
    id: seed.id,
    userId: demoUserId,
    categoryId: seed.categoryId,
    accountId: seed.accountId,
    description: seed.description,
    amount: seed.amount.toFixed(2),
    date: daysAgo(todayKey, seed.daysAgo),
    transactionType: seed.transactionType,
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
    tagIds: [],
  }));
}
