import { getDeviceDateKey, shiftMonthKey } from './format';
import { transactionMagnitude } from './ledger';
import type { Transaction } from './types';

export interface EssentialSpendingSummary {
  /** Completed calendar months considered, oldest first as YYYY-MM. */
  months: string[];
  /** Essential expenses per completed month, aligned with `months`. */
  essentialByMonth: number[];
  /** All expenses per completed month, aligned with `months`. */
  totalByMonth: number[];
  /** Mean essential spend across the completed months, or null without essential categories or without any recorded month. */
  averageEssential: number | null;
  /** Mean total spend across the completed months. */
  averageTotal: number;
  /** averageEssential / averageTotal, or null when either is unavailable. */
  essentialShare: number | null;
}

/**
 * Essential versus total spending over the last completed months. The current month is excluded
 * because it is still being recorded, which is the same rule the financial summary applies to
 * emergency runway. Missing records count as zero, so the caller should say how many months exist.
 */
export function summariseEssentialSpending(
  items: readonly Transaction[],
  essentialCategoryIds: readonly string[],
  todayKey = getDeviceDateKey(),
  monthCount = 3,
): EssentialSpendingSummary {
  const currentMonth = todayKey.slice(0, 7);
  const months = Array.from({ length: monthCount }, (_, index) => shiftMonthKey(currentMonth, -(monthCount - index)));
  const essential = new Set(essentialCategoryIds);
  const essentialByMonth = months.map(() => 0);
  const totalByMonth = months.map(() => 0);

  for (const transaction of items) {
    if (transaction.transactionType !== 'expense') continue;
    const index = months.indexOf(transaction.date.slice(0, 7));
    if (index === -1) continue;
    const magnitude = transactionMagnitude(transaction);
    totalByMonth[index] += magnitude;
    if (transaction.categoryId && essential.has(transaction.categoryId)) essentialByMonth[index] += magnitude;
  }

  const averageTotal = totalByMonth.reduce((sum, value) => sum + value, 0) / monthCount;
  // Without any recorded completed month there is nothing to average; zero would read as a real figure.
  const hasRecords = totalByMonth.some((value) => value > 0);
  const averageEssential = essential.size && hasRecords ? essentialByMonth.reduce((sum, value) => sum + value, 0) / monthCount : null;
  return {
    months,
    essentialByMonth,
    totalByMonth,
    averageEssential,
    averageTotal,
    essentialShare: averageEssential !== null && averageTotal > 0 ? averageEssential / averageTotal : null,
  };
}
