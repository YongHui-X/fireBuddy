import type { Category, Transaction, TransactionType } from './types';

/** Positive for income, negative for expenses. */
export function signedAmount(transaction: Pick<Transaction, 'amount' | 'transactionType'>) {
  const magnitude = Math.abs(Number(transaction.amount)) || 0;
  return transaction.transactionType === 'income' ? magnitude : -magnitude;
}

export function transactionMagnitude(transaction: Pick<Transaction, 'amount'>) {
  return Math.abs(Number(transaction.amount)) || 0;
}

export function sortTransactionsNewestFirst<T extends Pick<Transaction, 'date' | 'id'>>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date);
    return dateOrder !== 0 ? dateOrder : right.id.localeCompare(left.id);
  });
}

export function isInMonth(transaction: Pick<Transaction, 'date'>, monthKey: string) {
  return transaction.date.startsWith(monthKey);
}

export interface MonthSummary {
  income: number;
  expenses: number;
  savings: number;
  /** Fraction of income kept, or null when there is no recorded income. */
  savingsRate: number | null;
  transactionCount: number;
}

/** Income, spending and savings for one YYYY-MM month, following the web Money Pulse formula. */
export function getMonthSummary(items: readonly Transaction[], monthKey: string): MonthSummary {
  let income = 0;
  let expenses = 0;
  let transactionCount = 0;

  for (const transaction of items) {
    if (!isInMonth(transaction, monthKey)) continue;
    transactionCount += 1;
    const magnitude = transactionMagnitude(transaction);
    if (transaction.transactionType === 'income') {
      income += magnitude;
    } else {
      expenses += magnitude;
    }
  }

  const savings = income - expenses;
  return {
    income,
    expenses,
    savings,
    savingsRate: income > 0 ? savings / income : null,
    transactionCount,
  };
}

/** Total expense spend for one category in one month. */
export function getMonthlySpend(items: readonly Transaction[], categoryId: string, monthKey: string) {
  return items.reduce((total, transaction) => {
    if (transaction.transactionType !== 'expense' || transaction.categoryId !== categoryId || !isInMonth(transaction, monthKey)) {
      return total;
    }
    return total + transactionMagnitude(transaction);
  }, 0);
}

export interface CategoryBudgetRow {
  category: Category;
  spent: number;
  budget: number;
  /** spent / budget, uncapped; 0 when there is no budget. */
  ratio: number;
}

/** Expense categories that carry a monthly budget, with the month's spend against each. */
export function getCategoryBudgetRows(items: readonly Transaction[], categories: readonly Category[], monthKey: string): CategoryBudgetRow[] {
  return categories
    .filter((category) => category.categoryType === 'expense' && Number(category.monthlyBudget) > 0)
    .map((category) => {
      const budget = Number(category.monthlyBudget);
      const spent = getMonthlySpend(items, category.id, monthKey);
      return { category, spent, budget, ratio: budget > 0 ? spent / budget : 0 };
    });
}

export interface SpendingBreakdownRow {
  category: Category | null;
  name: string;
  color: string;
  amount: number;
  /** Fraction of the month's total expenses. */
  share: number;
}

/** Expenses per category across the given rows, largest first. Uncategorised spend lands in a synthetic row. */
export function summariseSpendingByCategory(
  items: readonly Transaction[],
  categories: readonly Category[],
  fallbackColor = '#7A869A',
): SpendingBreakdownRow[] {
  const totals = new Map<string, number>();
  let total = 0;

  for (const transaction of items) {
    if (transaction.transactionType !== 'expense') continue;
    const key = transaction.categoryId ?? '';
    const magnitude = transactionMagnitude(transaction);
    totals.set(key, (totals.get(key) ?? 0) + magnitude);
    total += magnitude;
  }

  return [...totals.entries()]
    .map(([categoryId, amount]) => {
      const category = categories.find((item) => item.id === categoryId) ?? null;
      return {
        category,
        name: category?.name ?? 'Uncategorised',
        color: category?.color ?? fallbackColor,
        amount,
        share: total > 0 ? amount / total : 0,
      };
    })
    .sort((left, right) => right.amount - left.amount);
}

/** Expenses per category for one YYYY-MM month, largest first. */
export function getSpendingBreakdown(
  items: readonly Transaction[],
  categories: readonly Category[],
  monthKey: string,
  fallbackColor = '#7A869A',
): SpendingBreakdownRow[] {
  return summariseSpendingByCategory(items.filter((transaction) => isInMonth(transaction, monthKey)), categories, fallbackColor);
}

export interface LedgerFilters {
  search?: string;
  transactionType?: TransactionType | null;
  categoryId?: string | null;
  accountId?: string | null;
  tagId?: string | null;
  /** Inclusive YYYY-MM-DD bounds. When neither is set, `monthKey` applies. */
  startDate?: string | null;
  endDate?: string | null;
  monthKey?: string | null;
}

interface LedgerLookups {
  categoryName?: (categoryId: string | null) => string | undefined;
  accountName?: (accountId: string) => string | undefined;
}

/** Apply search, type, category, account, tag and date filters, newest first. */
export function filterTransactions(items: readonly Transaction[], filters: LedgerFilters, lookups: LedgerLookups = {}): Transaction[] {
  const query = filters.search?.trim().toLowerCase() ?? '';
  const useCustomRange = Boolean(filters.startDate || filters.endDate);

  const matches = items.filter((transaction) => {
    if (filters.transactionType && transaction.transactionType !== filters.transactionType) return false;
    if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;
    if (filters.accountId && transaction.accountId !== filters.accountId) return false;
    if (filters.tagId && !transaction.tagIds.includes(filters.tagId)) return false;

    if (useCustomRange) {
      if (filters.startDate && transaction.date < filters.startDate) return false;
      if (filters.endDate && transaction.date > filters.endDate) return false;
    } else if (filters.monthKey && !isInMonth(transaction, filters.monthKey)) {
      return false;
    }

    if (query) {
      const haystack = [
        transaction.description,
        lookups.categoryName?.(transaction.categoryId) ?? '',
        lookups.accountName?.(transaction.accountId) ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  return sortTransactionsNewestFirst(matches);
}

/** Number of non-date filters plus one when a custom date range is active. */
export function countActiveFilters(filters: LedgerFilters) {
  return (
    [filters.transactionType, filters.categoryId, filters.accountId, filters.tagId].filter(Boolean).length
    + (filters.startDate || filters.endDate ? 1 : 0)
  );
}

export interface LedgerSection<T> {
  dateKey: string;
  data: T[];
}

/** Group an already-sorted ledger into per-day sections for a SectionList. */
export function groupTransactionsByDate<T extends Pick<Transaction, 'date'>>(items: readonly T[]): LedgerSection<T>[] {
  const sections: LedgerSection<T>[] = [];
  for (const item of items) {
    const current = sections[sections.length - 1];
    if (current && current.dateKey === item.date) {
      current.data.push(item);
    } else {
      sections.push({ dateKey: item.date, data: [item] });
    }
  }
  return sections;
}

/** Every month that has a transaction plus the current month, newest first. */
export function getTransactionMonthOptions(items: readonly Pick<Transaction, 'date'>[], latestMonth: string) {
  const months = new Set([latestMonth]);
  for (const item of items) {
    const month = item.date.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month)) months.add(month);
  }
  return [...months].sort((left, right) => right.localeCompare(left));
}
