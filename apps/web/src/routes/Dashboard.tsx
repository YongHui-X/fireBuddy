import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Search, TrendingUp } from 'lucide-react';

import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import {
  colors, formatDateLabel, formatSGD, getCategoryIcon, getDeviceMonthKey, sortTransactionsNewestFirst, useFireBuddy,
} from '../app/FireBuddyProvider';
import { getDisplayName } from '../app/displayName';
import { MoneyPulseBars } from '../components/MoneyPulseBars';
import { PageToolbar } from '../components/PageToolbar';
import { SpendingPieChart, groupSpendingPieData, type SpendingPieDatum } from '../components/SpendingPieChart';

const essentialSpendingPalettes = {
  light: ['#163300', '#2f6f3e', '#287271', '#386d82', '#557a46', '#31658c', '#5b6f52', '#247f63'],
  dark: ['#9fe870', '#75c65b', '#62c2b2', '#7ba7d1', '#a9c89c', '#78aee0', '#b4c9a9', '#64cfa3'],
};
const discretionarySpendingPalettes = {
  light: ['#b77a16', '#a95f52', '#6d647d', '#8a6f43', '#8f5874', '#66758a', '#b45f36', '#7b6f38'],
  dark: ['#e2b85d', '#d28b79', '#aaa0b9', '#d3ad73', '#c78ba8', '#95a7bf', '#e2986d', '#b9aa67'],
};
interface SpendingCategoryTotal extends SpendingPieDatum {
  isEssential: boolean;
}

interface CategoryBudgetProgress {
  id: string;
  name: string;
  color: string;
  spent: number;
  budget: number;
  progress: number;
}

/** Return a time appropriate greeting without storing another user preference. */
function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** List expense months through the current device month, newest first. */
export function getSpendingMonthOptions(transactions: ReturnType<typeof useFireBuddy>['transactions'], latestMonth: string) {
  const months = new Set([latestMonth]);
  transactions.forEach((transaction) => {
    const month = transaction.date.slice(0, 7);
    if (transaction.transactionType === 'expense' && /^\d{4}-\d{2}$/.test(month) && month <= latestMonth) {
      months.add(month);
    }
  });
  return [...months].sort((left, right) => right.localeCompare(left));
}

/** Move between available reporting months without crossing either end. */
export function getAdjacentSpendingMonth(
  months: string[],
  selectedMonth: string,
  direction: 'older' | 'newer',
) {
  const selectedIndex = months.indexOf(selectedMonth);
  if (selectedIndex < 0) return selectedMonth;
  const nextIndex = direction === 'older' ? selectedIndex + 1 : selectedIndex - 1;
  return months[nextIndex] ?? selectedMonth;
}

/** Aggregate expense-only category totals for one selected calendar month. */
export function buildMonthlySpendingData(
  categories: ReturnType<typeof useFireBuddy>['categories'],
  transactions: ReturnType<typeof useFireBuddy>['transactions'],
  month: string,
  essentialCategoryIds: string[],
  themeMode: 'light' | 'dark',
): SpendingCategoryTotal[] {
  const populatedCategories = categories.filter((item) => item.categoryType === 'expense').map((category) => ({
    name: category.name,
    value: transactions.filter((item) => item.transactionType === 'expense' && item.category === category.id && item.date.startsWith(month))
      .reduce((sum, item) => sum + Math.abs(item.amount), 0),
    isEssential: essentialCategoryIds.includes(category.id),
  })).filter((item) => item.value > 0);
  let essentialIndex = 0;
  let discretionaryIndex = 0;

  return populatedCategories.map((item) => {
    const palette = item.isEssential
      ? essentialSpendingPalettes[themeMode]
      : discretionarySpendingPalettes[themeMode];
    const paletteIndex = item.isEssential ? essentialIndex++ : discretionaryIndex++;
    return { ...item, color: palette[paletteIndex % palette.length] };
  });
}

/** Return the five budgeted categories with the most recorded spending for one month. */
export function buildCategoryBudgetData(
  categories: ReturnType<typeof useFireBuddy>['categories'],
  transactions: ReturnType<typeof useFireBuddy>['transactions'],
  month: string,
  limit = 5,
): CategoryBudgetProgress[] {
  return categories
    .filter((category) => category.categoryType === 'expense' && Number(category.monthlyBudget) > 0)
    .map((category) => {
      const spent = transactions
        .filter((transaction) => transaction.transactionType === 'expense' && transaction.category === category.id && transaction.date.startsWith(month))
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
      const budget = Number(category.monthlyBudget);
      return { id: category.id, name: category.name, color: category.color, spent, budget, progress: Math.min(spent / budget, 1) };
    })
    .sort((left, right) => right.spent - left.spent)
    .slice(0, limit);
}

interface MonthlyObservation {
  title: string;
  detail: string;
}

/** Describe the projection outcome without exposing backend status codes. */
export function getFireStatusLabel(status: string, estimatedFiYear: number | null) {
  if (status === 'already_reached') return 'FI target reached';
  if (status === 'projected' && estimatedFiYear) return `Estimated FI year ${estimatedFiYear}`;
  if (status === 'unreachable') return 'Target not reached with current assumptions';
  return 'Complete your setup to estimate an FI year';
}

/** Derive a concise observation only when the recorded month supports one. */
export function getMonthlyObservation(
  income: number | null,
  spending: number | null,
  savings: number | null,
  savingsRate: number | null,
  month: string,
  largestCategory?: SpendingCategoryTotal,
): MonthlyObservation | null {
  if (income !== null && income > 0 && savings !== null && savings < 0) {
    return {
      title: `Expenses exceeded income by ${formatSGD(Math.abs(savings), 0)}`,
      detail: largestCategory
        ? `${largestCategory.name} was the largest recorded category in ${month}.`
        : `Review the largest expenses recorded in ${month}.`,
    };
  }

  if (income !== null && income > 0 && savings !== null && savingsRate !== null) {
    return {
      title: `You saved ${(savingsRate * 100).toFixed(1)}% of recorded income`,
      detail: `${formatSGD(savings, 0)} remained after ${formatSGD(spending ?? 0, 0)} of expenses in ${month}.`,
    };
  }

  if (largestCategory && spending !== null && spending > 0) {
    return {
      title: `${largestCategory.name} was your largest expense category`,
      detail: `${formatSGD(largestCategory.value, 0)} accounted for ${((largestCategory.value / spending) * 100).toFixed(1)}% of ${month} spending.`,
    };
  }

  return null;
}

/** Render historical facts and projections with distinct labels and direct setup actions. */
export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { transactions, categories, session, themeMode, getCategoryById } = useFireBuddy();
  const { summary, status, error, demoMode, essentialCategoryIds, refresh } = useFinancialFoundation();
  const latestMonth = getDeviceMonthKey();
  const monthDate = new Date(`${latestMonth}-01T00:00:00`);
  const monthName = monthDate.toLocaleDateString('en-SG', { month: 'long' });
  const spendingPeriod = monthDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  const recent = sortTransactionsNewestFirst(transactions).slice(0, 5);
  const anomalyMap = new Map(summary?.transactionAnomalies.map((item) => [item.transactionId, item]) ?? []);
  const spendingData = useMemo(
    () => buildMonthlySpendingData(categories, transactions, latestMonth, essentialCategoryIds, themeMode),
    [categories, essentialCategoryIds, latestMonth, themeMode, transactions],
  );
  const groupedSpendingData = useMemo(() => groupSpendingPieData(spendingData, themeMode), [spendingData, themeMode]);
  const budgetData = useMemo(
    () => buildCategoryBudgetData(categories, transactions, latestMonth),
    [categories, latestMonth, transactions],
  );
  const pulseMonth = summary?.pulse.month ?? latestMonth;
  const pulseMonthName = new Date(`${pulseMonth}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'long' });
  const pulseCategoryData = useMemo(
    () => buildMonthlySpendingData(categories, transactions, pulseMonth, essentialCategoryIds, themeMode),
    [categories, essentialCategoryIds, pulseMonth, themeMode, transactions],
  );
  const largestPulseCategory = useMemo(
    () => [...pulseCategoryData].sort((left, right) => right.value - left.value)[0],
    [pulseCategoryData],
  );
  const pulseIncome = summary ? Number(summary.pulse.income) : null;
  const pulseSpending = summary ? Number(summary.pulse.spending) : null;
  const pulseSavings = summary ? Number(summary.pulse.savingsAmount) : null;
  const pulseSavingsRate = summary?.pulse.savingsRate !== null && summary?.pulse.savingsRate !== undefined ? Number(summary.pulse.savingsRate) : null;
  const netWorthChange = summary?.monthlyNetWorthChange !== null && summary?.monthlyNetWorthChange !== undefined
    ? Number(summary.monthlyNetWorthChange)
    : null;
  const monthlyObservation = getMonthlyObservation(
    pulseIncome,
    pulseSpending,
    pulseSavings,
    pulseSavingsRate,
    pulseMonthName,
    largestPulseCategory,
  );
  /** Open Transactions with the submitted dashboard search applied. */
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    const params = new URLSearchParams({ month: latestMonth });
    if (query) params.set('search', query);
    navigate(`/transactions?${params.toString()}`);
  }

  return (
    <main className="page page-dashboard foundation-dashboard">
      <PageToolbar
        className="dashboard-toolbar"
        title={`${getGreeting(new Date().getHours())}, ${getDisplayName(session?.user)}`}
        description={`Here’s your financial position for ${monthName}.`}
        metadata={demoMode ? <span className="demo-data-label">Local demo data</span> : null}
        actions={<div className="dashboard-search-context">
          <span>Search {monthName}</span>
          <form className="dashboard-search" role="search" aria-label={`Search ${monthName} transactions`} onSubmit={submitSearch}>
            <input aria-label="Search transactions" type="search" placeholder="Search transactions" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            <button type="submit" aria-label="Submit search"><Search size={18} /></button>
          </form>
        </div>}
      />

      <section className="dashboard-content foundation-dashboard-content">
        {error ? <div className="foundation-error dashboard-error" role="alert"><span>{error}</span><button className="secondary-button" type="button" onClick={() => void refresh()}>Try again</button></div> : null}

        <div className="foundation-overview-grid foundation-summary-grid foundation-summary-grid-single">
          {status === 'loading' && !summary ? <DashboardSummaryLoading /> : <SummaryCard icon={<TrendingUp />} label="Net worth" value={summary?.netWorth !== null && summary?.netWorth !== undefined ? formatSGD(Number(summary.netWorth), 0) : null}
            detail={netWorthChange !== null ? <span className={`foundation-summary-change ${netWorthChange >= 0 ? 'foundation-summary-change-positive' : 'foundation-summary-change-negative'}`}>{netWorthChange >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}<span>{netWorthChange >= 0 ? '+' : '-'}{formatSGD(netWorthChange, 0)} in {monthName}</span></span> : 'Prior month comparison unavailable'}
            prompt="Add wealth values" onClick={() => navigate('/wealth')} />}
          <article className="white-card money-pulse-card">
            {status === 'loading' && !summary ? <><div className="section-title-row"><h3>Money Pulse</h3></div><DashboardCardLoading label="Loading monthly activity" /></> : <>
              <div className="section-title-row"><div><p className="eyebrow">Recorded activity</p><h3>{pulseMonthName} Money Pulse</h3></div>{summary?.pulse.completeness === 'limited' ? <span className="data-status data-status-limited">Limited data</span> : null}</div>
              {summary?.pulse.completeness === 'limited' ? <p className="pulse-completeness-copy">Limited data means this month has few or no recorded transactions. Add income and expenses for a more useful comparison.</p> : null}
              <MoneyPulseBars income={pulseIncome} expenses={pulseSpending} savings={pulseSavings} savingsRate={pulseSavingsRate} />
              {summary?.recommendedAction ? <button className="recommended-action" type="button" onClick={() => navigate(summary.recommendedAction!.destination)}><span>Recommended next move</span><strong>{summary.recommendedAction.title}</strong><small>{summary.recommendedAction.rationale}</small></button>
                : monthlyObservation ? <aside className="recommended-action monthly-observation"><span>Monthly observation</span><strong>{monthlyObservation.title}</strong><small>{monthlyObservation.detail}</small></aside> : null}
            </>}
          </article>

        </div>

        <div className="foundation-analysis-grid">
          <article className="white-card foundation-spending-card">
            <div className="section-title-row spending-card-heading"><div><p className="eyebrow">{spendingPeriod} spending</p><h3>Spending breakdown</h3></div><button className="text-button" type="button" aria-label={`View More, ${spendingPeriod} spending details`} onClick={() => navigate(`/insights?month=${latestMonth}#spending-breakdown`)}>View More</button></div>
            {spendingData.length ? <div className="spending-chart-layout">
              <div className="spending-pie-panel" role="img" aria-label={`${spendingPeriod} spending by category. The four largest categories and all remaining spending grouped as Others.`}>
                <div className="spending-pie">
                  <SpendingPieChart data={groupedSpendingData} height={340} outerRadius="37%" />
                </div>
              </div>
            </div> : <EmptyCard title={`No spending in ${spendingPeriod}`} copy="Add and categorise transactions to see the breakdown." action="Add transaction" onClick={() => navigate('/add')} />}
          </article>
          <article className="white-card dashboard-budget-card">
            <div className="section-title-row"><div><p className="eyebrow">{spendingPeriod}</p><h3>Category budgets</h3></div><button className="text-button" type="button" onClick={() => navigate('/categories')}>Manage</button></div>
            {budgetData.length ? <div className="dashboard-budget-list" role="list" aria-label="Category budgets">{budgetData.map((category) => <div className="dashboard-budget-row" role="listitem" key={category.id}>
              <div className="dashboard-budget-heading"><span><i style={{ backgroundColor: category.color }} />{category.name}</span><strong>{formatSGD(category.spent, 0)} <small>of {formatSGD(category.budget, 0)}</small></strong></div>
              <div className="dashboard-budget-track" aria-label={`${category.name}: ${formatSGD(category.spent)} spent of ${formatSGD(category.budget)} budget`} role="img"><span style={{ width: `${category.progress * 100}%`, backgroundColor: category.spent > category.budget ? 'var(--danger)' : category.color }} /></div>
            </div>)}</div> : <div className="dashboard-budget-empty"><p>No category budgets set yet.</p><button className="secondary-button" type="button" onClick={() => navigate('/categories')}>Set budgets</button></div>}
          </article>
        </div>

        <div className="foundation-recent-grid">
          <article className="white-card recent-foundation-card">
            <div className="section-title-row"><h3>Recent transactions</h3><button className="text-button" type="button" onClick={() => navigate('/transactions')}>View all transactions</button></div>
            <div className="foundation-transaction-list">{recent.length ? recent.map((transaction) => {
              const category = getCategoryById(transaction.category); const Icon = getCategoryIcon(category); const anomaly = anomalyMap.get(transaction.id);
              return <button type="button" className="foundation-transaction" key={transaction.id} onClick={() => navigate(`/transactions?month=${transaction.date.slice(0, 7)}&transactionId=${encodeURIComponent(transaction.id)}`)}><span className="category-avatar" style={{ backgroundColor: `${category?.color ?? colors.primary}22`, color: category?.color }}><Icon size={18} /></span><span><strong>{transaction.description}</strong><small>{category?.name ?? 'Uncategorised'}, {formatDateLabel(transaction.date)}</small>{anomaly ? <em title={anomaly.explanation}><AlertTriangle size={13} /> {anomaly.label}</em> : null}</span><strong className={transaction.transactionType === 'income' ? 'amount-positive' : 'amount-negative'}>{transaction.transactionType === 'income' ? '+' : '-'} {formatSGD(transaction.amount)}</strong></button>;
            }) : <div className="dashboard-empty-action"><p className="dashboard-empty-copy">No transactions yet. Add one to build your monthly pulse.</p><button className="secondary-button" type="button" onClick={() => navigate('/add')}>Add transaction</button></div>}</div>
          </article>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value, detail, prompt, onClick }: { icon: ReactNode; label: string; value: string | null; detail: ReactNode; prompt: string; onClick: () => void }) {
  return <button type="button" className={`foundation-summary-card ${value === null ? 'foundation-summary-incomplete' : ''}`} onClick={onClick}><span className="foundation-summary-icon">{icon}</span><span><small>{label}</small><strong>{value ?? prompt}</strong><em>{detail}</em></span></button>;
}

function DashboardSummaryLoading() {
  return <div className="foundation-summary-card dashboard-loading-card" role="status" aria-label="Loading your financial position"><span /><span /><span /></div>;
}

function DashboardCardLoading({ label }: { label: string }) {
  return <div className="dashboard-card-loading" role="status"><span className="dashboard-loading-line" />{label}...</div>;
}

function EmptyCard({ title, copy, action: actionLabel, onClick }: { title: string; copy: string; action: string; onClick: () => void }) {
  return <div className="foundation-empty"><strong>{title}</strong><p>{copy}</p><button className="secondary-button" type="button" onClick={onClick}>{actionLabel}</button></div>;
}
