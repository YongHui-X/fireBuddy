import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Filter } from 'lucide-react';

import {
  colors,
  formatDateLabel,
  formatSGD,
  formatTooltipValue,
  getCategoryIcon,
  getDeviceDateKey,
  useFireBuddy,
  type Account,
  type Category,
  type Transaction,
} from '../app/FireBuddyProvider';
import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import { PageToolbar } from '../components/PageToolbar';

export type InsightRange = 'Day' | 'Week' | 'Month' | 'Year';

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
  const endDate = getDeviceDateKey(now);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === 'Week') {
    start.setDate(start.getDate() - 6);
  } else if (range === 'Month') {
    start.setDate(1);
  } else if (range === 'Year') {
    start.setMonth(0, 1);
  }

  const startDate = getDeviceDateKey(start);
  return transactions.filter(
    (transaction) =>
      transaction.transactionType === 'expense' &&
      transaction.date >= startDate &&
      transaction.date <= endDate,
  );
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

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildExpenseCsv(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
) {
  // Resolve identifiers to readable labels for the currently filtered export.
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.description,
    Math.abs(transaction.amount).toFixed(2),
    categoryNames.get(transaction.category) ?? 'Uncategorised',
    accountNames.get(transaction.account) ?? 'Unknown account',
  ]);

  return [
    ['Date', 'Description', 'Amount (SGD)', 'Category', 'Account'],
    ...rows,
  ].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

function Insights() {
  const { transactions, categories, accounts } = useFireBuddy();
  const { summary } = useFinancialFoundation();
  const navigate = useNavigate();
  const [range, setRange] = useState<InsightRange>('Month');
  const filteredExpenses = useMemo(
    () => filterExpensesForRange(transactions, range),
    [range, transactions],
  );
  const expenseSeries = useMemo(
    () => buildExpenseSeries(filteredExpenses, range),
    [filteredExpenses, range],
  );
  const categoryData = categories
    .map((category) => ({
      name: category.name,
      value: filteredExpenses
        .filter((transaction) => transaction.category === category.id)
        .reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
      color: category.color,
    }))
    .filter((entry) => entry.value > 0);
  const topSpending = [...filteredExpenses]
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))
    .slice(0, 4);

  function downloadCsv() {
    const csv = buildExpenseCsv(filteredExpenses, categories, accounts);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `firebuddy-expenses-${range.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page">
      <PageToolbar
        title="Insights"
        description="Explore expense-only trends and your saved FIRE projection."
        backAction={() => navigate(-1)}
        actions={<button className="secondary-button" type="button" onClick={downloadCsv}>
          <Download size={15} /> Export CSV
        </button>}
      />

      <section className="analytics-content">
        <div className="range-tabs">
          {(['Day', 'Week', 'Month', 'Year'] as const).map((item) => (
            <button
              className={range === item ? 'range-tab-active' : ''}
              key={item}
              type="button"
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <article className="chart-card transparent">
          {expenseSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={expenseSeries}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={formatTooltipValue} />
                <Area dataKey="expenses" stroke={colors.primary} strokeWidth={2.2} fill={colors.primarySoft} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">No expenses in this range</div>
          )}
        </article>

        <article className="white-card">
          <div className="section-title-row">
            <div>
              <h3>FIRE progress</h3>
            </div>
            <strong>{summary?.fire.progressRate ? `${(Number(summary.fire.progressRate) * 100).toFixed(1)}%` : 'Setup needed'}</strong>
          </div>
          {summary?.fire.fiTarget ? <div className="insights-fire-facts"><p>Included FI assets <strong>{formatSGD(Number(summary.fire.currentInvestableAssets), 0)}</strong></p><p>FI target <strong>{formatSGD(Number(summary.fire.fiTarget), 0)}</strong></p><p>{summary.fire.status === 'projected' ? `Estimated year ${summary.fire.estimatedFiYear}` : summary.fire.status.replaceAll('_', ' ')}</p><small>As of {summary.effectiveDate}. Projection uses the assumptions saved in FIRE setup.</small></div> : <div className="empty-chart">Add wealth values and FIRE assumptions to calculate progress.</div>}
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

        <article className="white-card">
          <div className="section-title-row">
            <h3>Category share</h3>
          </div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" innerRadius={54} outerRadius={82} paddingAngle={4}>
                  {categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={formatTooltipValue} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">No category spending in this range</div>
          )}
        </article>
      </section>
    </main>
  );
}

export default Insights;
