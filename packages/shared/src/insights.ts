import { getDeviceDateKey, getDeviceMonthKey } from './format';
import { transactionMagnitude } from './ledger';
import type { Transaction } from './types';

/** The four Insights ranges. Day, Week and Month end today; Year is the calendar year to date. */
export type InsightRange = 'day' | 'week' | 'month' | 'year';

export const insightRanges: readonly InsightRange[] = ['day', 'week', 'month', 'year'];

export const insightRangeLabels: Record<InsightRange, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
};

/** Inclusive local calendar bounds for a range, matching the web Insights route. */
export function getInsightDateBounds(range: InsightRange, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'week') start.setDate(start.getDate() - 6);
  if (range === 'month') start.setDate(1);
  if (range === 'year') start.setMonth(0, 1);
  return { startDate: getDeviceDateKey(start), endDate: getDeviceDateKey(now) };
}

/** Inclusive bounds for one YYYY-MM month, capped at today when the month is the current one. */
export function getMonthDateBounds(monthKey: string, now = new Date()) {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0);
  const todayKey = getDeviceDateKey(now);
  const endDate = getDeviceDateKey(lastDay);
  return { startDate: `${monthKey}-01`, endDate: endDate > todayKey && monthKey === getDeviceMonthKey(todayKey) ? todayKey : endDate };
}

/** Expense rows whose date falls inside the inclusive bounds. */
export function filterExpensesBetween(items: readonly Transaction[], startDate: string, endDate: string) {
  return items.filter((transaction) => transaction.transactionType === 'expense' && transaction.date >= startDate && transaction.date <= endDate);
}

export interface ExpenseSeriesPoint {
  /** YYYY-MM-DD for daily buckets, YYYY-MM for the yearly view. */
  period: string;
  label: string;
  expenses: number;
}

/**
 * Daily (or monthly, for a year) expense totals across the whole range, including zero days, so a
 * bar chart keeps its calendar shape even when nothing was spent on some days.
 */
export function buildExpenseSeries(items: readonly Transaction[], range: InsightRange, bounds: { startDate: string; endDate: string }): ExpenseSeriesPoint[] {
  const monthly = range === 'year';
  const totals = new Map<string, number>();
  for (const transaction of items) {
    if (transaction.transactionType !== 'expense') continue;
    const key = monthly ? transaction.date.slice(0, 7) : transaction.date;
    totals.set(key, (totals.get(key) ?? 0) + transactionMagnitude(transaction));
  }

  const points: ExpenseSeriesPoint[] = [];
  const [startYear, startMonth, startDay] = bounds.startDate.split('-').map(Number);
  const cursor = new Date(startYear, startMonth - 1, monthly ? 1 : startDay);
  const endKey = monthly ? bounds.endDate.slice(0, 7) : bounds.endDate;
  // A hard ceiling keeps a malformed range from looping forever.
  for (let guard = 0; guard < 400; guard += 1) {
    const dateKey = getDeviceDateKey(cursor);
    const key = monthly ? dateKey.slice(0, 7) : dateKey;
    if (key > endKey) break;
    points.push({
      period: key,
      label: monthly
        ? cursor.toLocaleDateString('en-SG', { month: 'short' })
        : range === 'week'
          ? cursor.toLocaleDateString('en-SG', { weekday: 'short' })
          : String(cursor.getDate()),
      expenses: totals.get(key) ?? 0,
    });
    if (monthly) cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

/** Largest expenses first, for the "Top spending" list. */
export function topExpenses(items: readonly Transaction[], limit = 4) {
  return [...items]
    .filter((transaction) => transaction.transactionType === 'expense')
    .sort((left, right) => transactionMagnitude(right) - transactionMagnitude(left))
    .slice(0, limit);
}

/** Months that carry at least one expense, plus the current month, newest first. */
export function getExpenseMonthOptions(items: readonly Transaction[], latestMonth = getDeviceMonthKey()) {
  const months = new Set([latestMonth]);
  for (const transaction of items) {
    const month = transaction.date.slice(0, 7);
    if (transaction.transactionType === 'expense' && /^\d{4}-\d{2}$/.test(month) && month <= latestMonth) months.add(month);
  }
  return [...months].sort((left, right) => right.localeCompare(left));
}
