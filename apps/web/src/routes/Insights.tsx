import { useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Filter } from 'lucide-react';
import type { TransactionExportFilters } from '@firebuddy/shared';

import {
  colors,
  formatDateLabel,
  formatSGD,
  formatTooltipValue,
  getCategoryIcon,
  getDeviceMonthKey,
  getDeviceDateKey,
  useFireBuddy,
  type Account,
  type Category,
  type Transaction,
  type Tag,
} from '../app/FireBuddyProvider';
import { exportTransactions as exportApiTransactions } from '../api';
import { buildTransactionCsv, downloadCsvBlob, getTransactionExportFilename } from '../app/transactionExport';
import { PageToolbar } from '../components/PageToolbar';
import { SpendingPieChart, groupSpendingPieData, type SpendingPieDatum } from '../components/SpendingPieChart';

export type InsightRange = 'Day' | 'Week' | 'Month' | 'Year';

/** Resolve an Insights selection to inclusive local calendar dates, even when it has no rows. */
export function getInsightDateBounds(range: InsightRange, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'Week') start.setDate(start.getDate() - 6);
  if (range === 'Month') start.setDate(1);
  if (range === 'Year') start.setMonth(0, 1);
  return { startDate: getDeviceDateKey(start), endDate: getDeviceDateKey(now) };
}

function CategoryAvatar({ category }: { category?: Category }) {
  const Icon = getCategoryIcon(category);

  return (
    <span className="category-avatar" style={{ backgroundColor: category?.color ?? colors.primarySoft }}>
      <Icon size={18} strokeWidth={1.8} />
    </span>
  );
}

export function filterExpensesForRange(
  transactions: Transaction[],
  range: InsightRange,
  now = new Date(),
) {
  // Keep charts and exports aligned to the selected local calendar range.
  const { startDate, endDate } = getInsightDateBounds(range, now);
  return transactions.filter(
    (transaction) =>
      transaction.transactionType === 'expense' &&
      transaction.date >= startDate &&
      transaction.date <= endDate,
  );
}

/** Filter expenses to an explicit calendar month passed from the dashboard. */
export function filterExpensesForMonth(transactions: Transaction[], month: string) {
  return transactions.filter((transaction) => transaction.transactionType === 'expense' && transaction.date.startsWith(month));
}

export function buildExpenseSeries(transactions: Transaction[], range: InsightRange) {
  // Aggregate positive chart values while preserving the expense-only display model.
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    const key = range === 'Year' ? transaction.date.slice(0, 7) : transaction.date;
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(transaction.amount));
  });

  return Array.from(totals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, expenses]) => ({
      period,
      label: range === 'Year'
        ? new Date(`${period}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'short' })
        : new Date(`${period}T00:00:00`).toLocaleDateString('en-SG', {
            day: 'numeric',
            month: range === 'Day' ? 'short' : undefined,
            weekday: range === 'Week' ? 'short' : undefined,
          }),
      expenses,
    }));
}

/** Aggregate the selected expense transactions into readable category totals. */
export function buildCategorySpendingData(
  transactions: Transaction[],
  categories: Category[],
): SpendingPieDatum[] {
  const categoryNames = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (transaction.transactionType !== 'expense') return;
    const categoryId = transaction.category;
    totals.set(categoryId, (totals.get(categoryId) ?? 0) + Math.abs(transaction.amount));
  });

  return Array.from(totals.entries()).map(([categoryId, value]) => {
    const category = categoryNames.get(categoryId);
    return {
      name: category?.name ?? 'Uncategorised',
      value,
      color: category?.color ?? colors.muted,
    };
  }).sort((left, right) => right.value - left.value);
}

export function buildExpenseCsv(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  tags: Tag[] = [],
) {
  return buildTransactionCsv(transactions, categories, accounts, tags);
}

function Insights() {
  const { transactions, categories, accounts, tags, themeMode, session, notify } = useFireBuddy();
  const navigate = useNavigate();
  const location = useLocation();
  const [range, setRange] = useState<InsightRange>('Month');
  const [isExporting, setIsExporting] = useState(false);
  const requestedMonth = new URLSearchParams(location.search).get('month');
  const selectedMonth = requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : null;
  const latestMonth = getDeviceMonthKey();
  const availableMonths = useMemo(() => {
    const months = new Set([latestMonth]);
    transactions.forEach((transaction) => {
      const month = transaction.date.slice(0, 7);
      if (transaction.transactionType === 'expense' && /^\d{4}-\d{2}$/.test(month) && month <= latestMonth) months.add(month);
    });
    return [...months].sort((left, right) => right.localeCompare(left));
  }, [latestMonth, transactions]);
  const selectedMonthLabel = selectedMonth
    ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
    : null;
  const filteredExpenses = useMemo(
    () => selectedMonth ? filterExpensesForMonth(transactions, selectedMonth) : filterExpensesForRange(transactions, range),
    [range, selectedMonth, transactions],
  );
  const expenseSeries = useMemo(
    () => buildExpenseSeries(filteredExpenses, range),
    [filteredExpenses, range],
  );
  const categoryData = useMemo(
    () => buildCategorySpendingData(filteredExpenses, categories),
    [categories, filteredExpenses],
  );
  const groupedCategoryData = useMemo(
    () => groupSpendingPieData(categoryData, themeMode),
    [categoryData, themeMode],
  );
  const categoryTotal = useMemo(
    () => categoryData.reduce((total, category) => total + category.value, 0),
    [categoryData],
  );
  const topSpending = [...filteredExpenses]
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))
    .slice(0, 4);

  /** Route the expense-only Insights action through the consolidated exporter. */
  async function downloadCsv() {
    if (isExporting) return;
    setIsExporting(true);
    const rangeDates = getInsightDateBounds(range);
    const filters: TransactionExportFilters = {
      transactionType: 'expense',
      ...(selectedMonth ? {
        startDate: `${selectedMonth}-01`,
        endDate: getDeviceDateKey(new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0)),
      } : rangeDates),
    };
    try {
      if (session) {
        const result = await exportApiTransactions(session.access_token, filters);
        downloadCsvBlob(result.blob, result.filename);
      } else {
        downloadCsvBlob(new Blob([buildExpenseCsv(filteredExpenses, categories, accounts, tags)], { type: 'text/csv;charset=utf-8' }), getTransactionExportFilename(filters));
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to export transactions.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="page">
      <PageToolbar
        title="Insights"
        description="Explore your expense trends and spending breakdown."
        backAction={() => navigate(-1)}
        actions={<button className="secondary-button" type="button" onClick={() => void downloadCsv()} disabled={isExporting}>
          <Download size={15} /> {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>}
      />

      <section className="analytics-content">
        <div className="range-tabs">
          {(['Day', 'Week', 'Month', 'Year'] as const).map((item) => (
            <button
              className={range === item ? 'range-tab-active' : ''}
              key={item}
              type="button"
              onClick={() => {
                setRange(item);
                if (selectedMonth) navigate('/insights#spending-breakdown', { replace: true });
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <article className="white-card insights-spending-breakdown" id="spending-breakdown">
          <div className="insights-spending-heading">
            <div>
              <p className="eyebrow">{selectedMonthLabel ?? `${range} view`}</p>
              <h3>Spending breakdown</h3>
            </div>
            <div className="insights-spending-actions">
              <label className="insights-month-picker">
                <span>Month</span>
                <select aria-label="Spending month" value={selectedMonth ?? latestMonth} onChange={(event) => navigate(`/insights?month=${event.target.value}#spending-breakdown`)}>
                  {availableMonths.map((month) => <option key={month} value={month}>{new Date(`${month}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}</option>)}
                </select>
              </label>
              <div className="insights-spending-total">
              <span>Total expenses</span>
              <strong>{formatSGD(categoryTotal, 0)}</strong>
              </div>
            </div>
          </div>
          {groupedCategoryData.length > 0 ? <>
            <div className="insights-spending-chart" role="img" aria-label={`Spending by category for the selected ${range.toLowerCase()} range`}>
              <SpendingPieChart data={groupedCategoryData} height={320} />
            </div>
            <div className="spending-detail-list" role="list" aria-label="Spending breakdown by category">
              {categoryData.map((category) => {
                const percentage = categoryTotal > 0 ? (category.value / categoryTotal) * 100 : 0;
                return <div className="spending-detail-row" role="listitem" key={category.name}>
                  <span className="spending-percentage-badge" style={{ '--spending-color': category.color } as CSSProperties}>{percentage.toFixed(0)}%</span>
                  <span className="spending-detail-category"><i style={{ backgroundColor: category.color }} />{category.name}</span>
                  <strong>{formatSGD(category.value)}</strong>
                </div>;
              })}
            </div>
          </> : <div className="empty-chart">No category spending in this range</div>}
        </article>

        <article className="chart-card transparent">
          {expenseSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={expenseSeries}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={formatTooltipValue} />
                <Area dataKey="expenses" stroke="var(--chart-projection)" strokeWidth={2.2} fill="var(--primary-soft)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">No expenses in this range</div>
          )}
        </article>

        <article className="white-card">
          <div className="section-title-row">
            <h3>Top spending</h3>
            <Filter size={18} />
          </div>
          <div className="transaction-list card-list">
            {topSpending.map((transaction) => {
              const category = categories.find((item) => item.id === transaction.category);
              return (
                <article className="transaction-card" key={transaction.id}>
                  <CategoryAvatar category={category} />
                  <div className="transaction-copy">
                    <strong>{transaction.description}</strong>
                    <span>{formatDateLabel(transaction.date)}</span>
                  </div>
                  <strong className="amount-negative">- {formatSGD(transaction.amount)}</strong>
                </article>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}

export default Insights;
