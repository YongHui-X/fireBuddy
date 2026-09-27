import {
  countActiveFilters,
  filterTransactions,
  getCategoryBudgetRows,
  getDeviceMonthKey,
  getMonthSummary,
  getSpendingBreakdown,
  getTransactionMonthOptions,
  groupTransactionsByDate,
  sortTransactionsNewestFirst,
  type LedgerFilters,
} from '@firebuddy/shared';
import { useMemo } from 'react';

import { useFireBuddy } from '@/lib/fire-buddy-store';

/** Memoised wrappers over the shared ledger maths so screens stay presentational. */

export function useCurrentMonth() {
  return useMemo(() => getDeviceMonthKey(), []);
}

export function useMonthSummary(monthKey: string) {
  const { transactions } = useFireBuddy();
  return useMemo(() => getMonthSummary(transactions, monthKey), [transactions, monthKey]);
}

export function useCategoryBudgets(monthKey: string) {
  const { transactions, categories } = useFireBuddy();
  return useMemo(() => getCategoryBudgetRows(transactions, categories, monthKey), [transactions, categories, monthKey]);
}

export function useSpendingBreakdown(monthKey: string) {
  const { transactions, categories } = useFireBuddy();
  return useMemo(() => getSpendingBreakdown(transactions, categories, monthKey), [transactions, categories, monthKey]);
}

export function useRecentTransactions(limit = 5) {
  const { transactions } = useFireBuddy();
  return useMemo(() => sortTransactionsNewestFirst(transactions).slice(0, limit), [transactions, limit]);
}

export function useTransactionMonths() {
  const { transactions } = useFireBuddy();
  const latest = useCurrentMonth();
  return useMemo(() => getTransactionMonthOptions(transactions, latest), [transactions, latest]);
}

export function useFilteredLedger(filters: LedgerFilters) {
  const { transactions, getCategoryById, getAccountById } = useFireBuddy();
  return useMemo(() => {
    const rows = filterTransactions(transactions, filters, {
      categoryName: (id) => getCategoryById(id)?.name,
      accountName: (id) => getAccountById(id)?.name,
    });
    const income = rows.filter((row) => row.transactionType === 'income').reduce((total, row) => total + Math.abs(Number(row.amount)), 0);
    const expenses = rows.filter((row) => row.transactionType === 'expense').reduce((total, row) => total + Math.abs(Number(row.amount)), 0);
    return { rows, sections: groupTransactionsByDate(rows), income, expenses, activeFilterCount: countActiveFilters(filters) };
  }, [transactions, filters, getCategoryById, getAccountById]);
}
