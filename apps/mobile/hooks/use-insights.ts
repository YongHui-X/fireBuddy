import {
  buildExpenseSeries,
  filterExpensesBetween,
  getDeviceDateKey,
  getExpenseMonthOptions,
  getInsightDateBounds,
  getMonthDateBounds,
  summariseSpendingByCategory,
  topExpenses,
  type InsightRange,
} from '@firebuddy/shared';
import { useMemo } from 'react';

import { useFireBuddy } from '@/lib/fire-buddy-store';

export interface InsightSelection {
  range: InsightRange;
  /** A specific YYYY-MM month overrides the range, e.g. when arriving from a Home card. */
  month: string | null;
}

/**
 * Expense-only analytics for one selection: the inclusive date bounds, the matching expenses,
 * the category breakdown, the trend series and the largest entries. Memoised so the screen only
 * renders. Income never enters these figures, matching the web Insights route.
 */
export function useInsights({ range, month }: InsightSelection) {
  const { transactions, categories } = useFireBuddy();
  const today = useMemo(() => getDeviceDateKey(), []);

  return useMemo(() => {
    const bounds = month ? getMonthDateBounds(month) : getInsightDateBounds(range);
    const expenses = filterExpensesBetween(transactions, bounds.startDate, bounds.endDate);
    const breakdown = summariseSpendingByCategory(expenses, categories);
    const total = breakdown.reduce((sum, row) => sum + row.amount, 0);
    const series = buildExpenseSeries(expenses, month ? 'month' : range, bounds);
    const average = series.length ? total / series.length : 0;
    const peak = series.reduce((best, point) => (point.expenses > best.expenses ? point : best), series[0] ?? { period: '', label: '', expenses: 0 });
    return {
      bounds,
      expenses,
      breakdown,
      total,
      series,
      average,
      peak: peak.expenses > 0 ? peak : null,
      top: topExpenses(expenses, 4),
      months: getExpenseMonthOptions(transactions, today.slice(0, 7)),
      transactionCount: expenses.length,
    };
  }, [transactions, categories, range, month, today]);
}
