import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Landmark, Search } from 'lucide-react';
import type { FinancialSummary } from '@firebuddy/shared';

import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import {
  colors, formatDateLabel, formatSGD, getCategoryIcon, getDeviceMonthKey, sortTransactionsNewestFirst, useFireBuddy,
  type Transaction,
} from '../app/FireBuddyProvider';
import { getDisplayName } from '../app/displayName';
import { useMediaQuery } from '../app/useMediaQuery';
import { mq } from '../app/breakpoints';
import { MoneyPulseBars } from '../components/MoneyPulseBars';
import { PageToolbar } from '../components/PageToolbar';
import { SpendingPieChart, groupSpendingPieData, type SpendingPieDatum } from '../components/SpendingPieChart';

const essentialSpendingPalettes = {
  light: ['#1f4d3a', '#2b6a4f', '#3a8362', '#35678a', '#5e8a5a', '#4d7f96', '#6f8f6a', '#2f7d6b'],
  dark: ['#a9e0bc', '#8fd1a8', '#6fbf93', '#86b9da', '#b5d3a6', '#9cc5de', '#c2d6b7', '#7fcfb4'],
};
const discretionarySpendingPalettes = {
  light: ['#b7791f', '#a95f52', '#6d647d', '#8a6f43', '#8f5874', '#66758a', '#b45f36', '#7b6f38'],
  dark: ['#e6bd5f', '#e2a08f', '#c1b3d4', '#d3ad73', '#c78ba8', '#95a7bf', '#e2986d', '#b9aa67'],
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

interface FireProgressFact {
  label: string;
  value: string;
  detail?: string;
}

export interface FireProgressSummary {
  percentLabel: string;
  progress: number;
  statusLabel: string;
  facts: FireProgressFact[];
}

/** Shape the FI projection into one headline figure and its supporting facts, or null before setup is complete. */
export function buildFireProgressSummary(summary: FinancialSummary | null): FireProgressSummary | null {
  const fire = summary?.fire;
  if (!summary || !fire || fire.fiTarget === null || fire.progressRate === null) return null;
  const progressRate = Number(fire.progressRate);
  const cappedRate = fire.progressRateCapped !== null && fire.progressRateCapped !== undefined ? Number(fire.progressRateCapped) : progressRate;
  const facts: FireProgressFact[] = [
    { label: 'Investable assets', value: formatSGD(Number(fire.currentInvestableAssets ?? 0), 0) },
    { label: 'FI target', value: formatSGD(Number(fire.fiTarget), 0) },
  ];
  if (fire.requiredMonthlyInvestment !== null && fire.requiredMonthlyInvestment !== undefined) {
    facts.push({ label: 'Required monthly', value: formatSGD(Number(fire.requiredMonthlyInvestment), 0) });
  }
  if (summary.emergencyRunwayMonths !== null && summary.emergencyRunwayMonths !== undefined) {
    facts.push({ label: 'Emergency runway', value: `${Number(summary.emergencyRunwayMonths).toFixed(1)} months`, detail: 'of essentials' });
  }
  return {
    percentLabel: `${(progressRate * 100).toFixed(1)}% funded`,
    progress: Math.min(Math.max(cappedRate, 0), 1),
    statusLabel: getFireStatusLabel(fire.status, fire.estimatedFiYear),
    facts,
  };
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

type DashboardProps = {
  onSelectTransaction: (transaction: Transaction) => void;
};

/** Render historical facts and projections with distinct labels and direct setup actions. */
export default function Dashboard({ onSelectTransaction }: DashboardProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  /* Row two hands the breakdown eight of twelve columns from 1280px up. That is the only width where the
     pie can grow without crowding the callout labels that sit outside it. */
  const hasWideSpendingCard = useMediaQuery(mq.wide);
  // Below 480px the callouts collide; the legend beside the chart carries the same figures.
  const isNarrowChart = !useMediaQuery(mq.sm);
  const isTouch = useMediaQuery(mq.coarse);
  const { transactions, categories, session, themeMode, getCategoryById } = useFireBuddy();
  const { summary, status, error, demoMode, essentialCategoryIds, refresh } = useFinancialFoundation();
  const latestMonth = getDeviceMonthKey();
  const monthDate = new Date(`${latestMonth}-01T00:00:00`);
  const monthName = monthDate.toLocaleDateString('en-SG', { month: 'long' });
  const spendingPeriod = monthDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  const recent = sortTransactionsNewestFirst(transactions).slice(0, 6);
  const anomalyMap = new Map(summary?.transactionAnomalies.map((item) => [item.transactionId, item]) ?? []);
  const spendingData = useMemo(
    () => buildMonthlySpendingData(categories, transactions, latestMonth, essentialCategoryIds, themeMode),
    [categories, essentialCategoryIds, latestMonth, themeMode, transactions],
  );
  const groupedSpendingData = useMemo(() => groupSpendingPieData(spendingData, themeMode, 5), [spendingData, themeMode]);
  const spendingTotal = useMemo(() => spendingData.reduce((sum, item) => sum + item.value, 0), [spendingData]);
  const budgetData = useMemo(
    () => buildCategoryBudgetData(categories, transactions, latestMonth),
    [categories, latestMonth, transactions],
  );
  const budgetTotals = useMemo(() => {
    const all = buildCategoryBudgetData(categories, transactions, latestMonth, Number.POSITIVE_INFINITY);
    const spent = all.reduce((sum, item) => sum + item.spent, 0);
    const budget = all.reduce((sum, item) => sum + item.budget, 0);
    return { count: all.length, spent, budget, progress: budget > 0 ? Math.min(spent / budget, 1) : 0 };
  }, [categories, latestMonth, transactions]);
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
  const fireProgress = useMemo(() => buildFireProgressSummary(summary), [summary]);
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

  const netWorthDetail = netWorthChange !== null
    ? (
      <span className={`foundation-summary-change ${netWorthChange >= 0 ? 'foundation-summary-change-positive' : 'foundation-summary-change-negative'}`}>
        {netWorthChange >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
        <span>{netWorthChange >= 0 ? '+' : '-'}{formatSGD(Math.abs(netWorthChange), 0)} in {monthName}</span>
      </span>
    )
    : 'Prior month comparison unavailable';

  return (
    <main className="page page-dashboard foundation-dashboard">
      <PageToolbar
        className="dashboard-toolbar"
        title={`${getGreeting(new Date().getHours())}, ${getDisplayName(session?.user)}`}
        description={`Here’s your financial position for ${monthName}.`}
        metadata={demoMode ? <span className="demo-data-label">Local demo data</span> : null}
        actions={(
          <div className="dashboard-search-context">
            <span className="visually-hidden">Search {monthName}</span>
            <form className="dashboard-search" role="search" aria-label={`Search ${monthName} transactions`} onSubmit={submitSearch}>
              <input aria-label="Search transactions" type="search" placeholder={`Search ${monthName}`} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
              <button type="submit" aria-label="Submit search"><Search size={18} /></button>
            </form>
          </div>
        )}
      />

      <section className="dashboard-content foundation-dashboard-content">
        {error ? (
          <div className="foundation-error dashboard-error" role="alert">
            <span>{error}</span>
            <button className="secondary-button" type="button" onClick={() => void refresh()}>Try again</button>
          </div>
        ) : null}

        <div className="dashboard-workspace-grid foundation-summary-grid">
          {status === 'loading' && !summary
            ? <DashboardSummaryLoading />
            : (
              <SummaryCard
                icon={<Landmark size={20} />}
                label="Net worth"
                value={summary?.netWorth !== null && summary?.netWorth !== undefined ? formatSGD(Number(summary.netWorth), 0) : null}
                detail={netWorthDetail}
                meta={summary?.assetTotal != null && summary?.liabilityTotal != null
                  ? [
                    { label: 'Assets', value: formatSGD(Number(summary.assetTotal), 0) },
                    { label: 'Liabilities', value: formatSGD(Number(summary.liabilityTotal), 0) },
                  ]
                  : undefined}
                prompt="Add wealth values"
                onClick={() => navigate('/wealth')}
              />
            )}

          <article className="white-card money-pulse-card">
            {status === 'loading' && !summary
              ? <><div className="section-title-row"><h3>Money Pulse</h3></div><DashboardCardLoading label="Loading monthly activity" /></>
              : (
                <>
                  <div className="section-title-row">
                    <h3>{pulseMonthName} Money Pulse</h3>
                    {summary?.pulse.completeness === 'limited' ? <span className="data-status data-status-limited">Limited data</span> : null}
                  </div>
                  {summary?.pulse.completeness === 'limited' ? <p className="pulse-completeness-copy">Limited data means this month has few or no recorded transactions. Add income and expenses for a more useful comparison.</p> : null}
                  <MoneyPulseBars income={pulseIncome} expenses={pulseSpending} savings={pulseSavings} savingsRate={pulseSavingsRate} />
                  {summary?.recommendedAction
                    ? (
                      <button className="recommended-action" type="button" onClick={() => navigate(summary.recommendedAction!.destination)}>
                        <span>Recommended next move</span>
                        <strong>{summary.recommendedAction.title}</strong>
                        <small>{summary.recommendedAction.rationale}</small>
                      </button>
                    )
                    : monthlyObservation
                      ? (
                        <aside className="recommended-action monthly-observation">
                          <strong>{monthlyObservation.title}</strong>
                          <small>{monthlyObservation.detail}</small>
                        </aside>
                      )
                      : null}
                </>
              )}
          </article>

          <article className="white-card dashboard-budget-card">
            <div className="section-title-row">
              <div>
                <h3>Category budgets</h3>
                <p className="card-subtitle">{spendingPeriod}</p>
              </div>
              <button className="text-button" type="button" onClick={() => navigate('/categories')}>Manage</button>
            </div>
            {budgetData.length
              ? (
                <>
                  <div className="dashboard-budget-list" role="list" aria-label="Category budgets">
                    {budgetData.map((category) => (
                      <div className="dashboard-budget-row" role="listitem" key={category.id}>
                        <div className="dashboard-budget-heading">
                          <span><i style={{ backgroundColor: category.color }} />{category.name}</span>
                          <strong>{formatSGD(category.spent, 0)} <small>of {formatSGD(category.budget, 0)}</small></strong>
                        </div>
                        <div className="dashboard-budget-track" aria-label={`${category.name}: ${formatSGD(category.spent)} spent of ${formatSGD(category.budget)} budget`} role="img">
                          <span style={{ width: `${category.progress * 100}%`, backgroundColor: category.spent > category.budget ? 'var(--danger)' : category.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dashboard-budget-summary">
                    <div className="dashboard-budget-heading">
                      <span>All {budgetTotals.count} budgets</span>
                      <strong>{formatSGD(budgetTotals.spent, 0)} <small>of {formatSGD(budgetTotals.budget, 0)}</small></strong>
                    </div>
                    <div className="dashboard-budget-track" aria-label={`All budgets: ${formatSGD(budgetTotals.spent)} spent of ${formatSGD(budgetTotals.budget)}`} role="img">
                      <span style={{ width: `${budgetTotals.progress * 100}%`, backgroundColor: budgetTotals.spent > budgetTotals.budget ? 'var(--danger)' : 'var(--forest-600)' }} />
                    </div>
                    <p>{budgetTotals.budget > 0 ? `${Math.round((budgetTotals.spent / budgetTotals.budget) * 100)}% of this month’s budgets used, ${formatSGD(Math.max(budgetTotals.budget - budgetTotals.spent, 0), 0)} left.` : ''}</p>
                  </div>
                </>
              )
              : (
                <div className="dashboard-budget-empty">
                  <p>No category budgets set yet.</p>
                  <button className="secondary-button" type="button" onClick={() => navigate('/categories')}>Set budgets</button>
                </div>
              )}
          </article>

          <article className="white-card foundation-spending-card">
            <div className="section-title-row spending-card-heading">
              <div>
                <h3>Spending breakdown</h3>
                <p className="card-subtitle">{spendingPeriod} expenses by category</p>
              </div>
              <button className="text-button" type="button" aria-label={`View More, ${spendingPeriod} spending details`} onClick={() => navigate(`/insights?month=${latestMonth}#spending-breakdown`)}>View More</button>
            </div>
            {spendingData.length
              ? (
                <div className="spending-chart-layout">
                  <div className="spending-pie-panel" role="img" aria-label={`${spendingPeriod} spending by category. The five largest categories and all remaining spending grouped as Others.`}>
                    <div className="spending-pie">
                      <SpendingPieChart
                        data={groupedSpendingData}
                        height={isNarrowChart ? 230 : 340}
                        outerRadius={hasWideSpendingCard ? '63%' : isNarrowChart ? '74%' : '52%'}
                        labels={isNarrowChart ? 'none' : 'callout'}
                        interaction={isTouch ? 'tap' : 'hover'}
                      />
                    </div>
                  </div>
                  <ul className="spending-legend" aria-label="Spending by category">
                    {groupedSpendingData.map((slice) => (
                      <li key={slice.name}>
                        <i style={{ backgroundColor: slice.color }} aria-hidden="true" />
                        <span>{slice.name}</span>
                        <small>{spendingTotal > 0 ? `${((slice.value / spendingTotal) * 100).toFixed(0)}%` : ''}</small>
                        <strong>{formatSGD(slice.value, 0)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )
              : <EmptyCard title={`No spending in ${spendingPeriod}`} copy="Add and categorise transactions to see the breakdown." action="Add transaction" onClick={() => navigate('/add')} />}
          </article>

          <article className="white-card recent-foundation-card">
            <div className="section-title-row">
              <div>
                <h3>Recent transactions</h3>
                <p className="card-subtitle">Newest six entries</p>
              </div>
              <button className="text-button" type="button" onClick={() => navigate('/transactions')}>View all transactions</button>
            </div>
            {recent.length
              ? (
                <div className="foundation-ledger">
                  <div className="foundation-ledger-header" aria-hidden="true">
                    <span className="foundation-ledger-description">Description</span>
                    <span>Category</span>
                    <span>Date</span>
                    <span className="foundation-ledger-amount">Amount</span>
                  </div>
                  {recent.map((transaction) => {
                    const category = getCategoryById(transaction.category);
                    const Icon = getCategoryIcon(category);
                    const anomaly = anomalyMap.get(transaction.id);
                    return (
                      <button
                        type="button"
                        className="foundation-transaction"
                        key={transaction.id}
                        onClick={() => onSelectTransaction(transaction)}
                      >
                        <span className="category-avatar" style={{ backgroundColor: `${category?.color ?? colors.primary}22`, color: category?.color }}><Icon size={18} /></span>
                        <span className="foundation-transaction-copy">
                          <strong>{transaction.description}</strong>
                          <small className="foundation-transaction-meta">{category?.name ?? 'Uncategorised'}, {formatDateLabel(transaction.date)}</small>
                          {anomaly ? <em title={anomaly.explanation}><AlertTriangle size={13} /> {anomaly.label}</em> : null}
                        </span>
                        <span className="foundation-transaction-category">{category?.name ?? 'Uncategorised'}</span>
                        <span className="foundation-transaction-date">{formatDateLabel(transaction.date)}</span>
                        <strong className={`foundation-transaction-amount ${transaction.transactionType === 'income' ? 'amount-positive' : 'amount-negative'}`}>
                          {transaction.transactionType === 'income' ? '+' : '-'} {formatSGD(transaction.amount)}
                        </strong>
                      </button>
                    );
                  })}
                </div>
              )
              : (
                <div className="dashboard-empty-action">
                  <p className="dashboard-empty-copy">No transactions yet. Add one to build your monthly pulse.</p>
                  <button className="secondary-button" type="button" onClick={() => navigate('/add')}>Add transaction</button>
                </div>
              )}
          </article>

          <article className="white-card fire-progress-card">
            {status === 'loading' && !summary
              ? <><div className="section-title-row"><h3>FI progress</h3></div><DashboardCardLoading label="Loading FI progress" /></>
              : fireProgress
                ? (
                  <>
                    <div className="section-title-row">
                      <div>
                        <h3>FI progress</h3>
                        <p className="card-subtitle">{fireProgress.statusLabel}</p>
                      </div>
                      <button className="text-button" type="button" onClick={() => navigate('/fire')}>Open planner</button>
                    </div>
                    <p className="fire-progress-figure"><strong>{fireProgress.percentLabel}</strong></p>
                    <div className="dashboard-budget-track fire-progress-track" role="img" aria-label={`${fireProgress.percentLabel} of your FI target`}>
                      <span style={{ width: `${fireProgress.progress * 100}%` }} />
                    </div>
                    <dl className="fire-progress-facts">
                      {fireProgress.facts.map((fact) => (
                        <div key={fact.label}>
                          <dt>{fact.label}</dt>
                          <dd>{fact.value}{fact.detail ? <small> {fact.detail}</small> : null}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )
                : (
                  <>
                    <div className="section-title-row"><h3>FI progress</h3></div>
                    <EmptyCard title="Set your FI target" copy="Add investable assets and a monthly contribution to see how far along you are." action="Complete setup" onClick={() => navigate('/fire')} />
                  </>
                )}
          </article>
        </div>
      </section>
    </main>
  );
}

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: string | null;
  detail: ReactNode;
  meta?: { label: string; value: string }[];
  prompt: string;
  onClick: () => void;
}

/** Forest hero for the headline figure, with optional supporting totals beneath it. */
function SummaryCard({ icon, label, value, detail, meta, prompt, onClick }: SummaryCardProps) {
  return (
    <button type="button" className={`foundation-summary-card dashboard-net-worth-card ${value === null ? 'foundation-summary-incomplete' : ''}`} onClick={onClick}>
      <span className="foundation-summary-icon">{icon}</span>
      <span><small>{label}</small><strong>{value ?? prompt}</strong><em>{detail}</em></span>
      {meta?.length ? (
        <span className="foundation-summary-meta" role="list">
          {meta.map((item) => <span role="listitem" key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>)}
        </span>
      ) : null}
      <span className="foundation-summary-link">View wealth</span>
    </button>
  );
}

function DashboardSummaryLoading() {
  return <div className="foundation-summary-card dashboard-net-worth-card dashboard-loading-card" role="status" aria-label="Loading your financial position"><span /><span /><span /></div>;
}

function DashboardCardLoading({ label }: { label: string }) {
  return <div className="dashboard-card-loading" role="status"><span className="dashboard-loading-line" />{label}...</div>;
}

function EmptyCard({ title, copy, action: actionLabel, onClick }: { title: string; copy: string; action: string; onClick: () => void }) {
  return <div className="foundation-empty"><strong>{title}</strong><p>{copy}</p><button className="secondary-button" type="button" onClick={onClick}>{actionLabel}</button></div>;
}
