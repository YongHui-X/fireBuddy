import { useMemo, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type PieLabelRenderProps,
} from 'recharts';
import { AlertTriangle, ChevronLeft, ChevronRight, Search, TrendingUp, Umbrella, WalletCards } from 'lucide-react';

import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import {
  colors, formatDateLabel, formatSGD, getCategoryIcon, getDeviceMonthKey, sortTransactionsNewestFirst, useFireBuddy,
} from '../app/FireBuddyProvider';
import { getDisplayName } from '../app/displayName';
import { PageToolbar } from '../components/PageToolbar';

const essentialSpendingPalettes = {
  light: ['#163300', '#2f6f3e', '#287271', '#386d82', '#557a46', '#31658c', '#5b6f52', '#247f63'],
  dark: ['#9fe870', '#75c65b', '#62c2b2', '#7ba7d1', '#a9c89c', '#78aee0', '#b4c9a9', '#64cfa3'],
};
const discretionarySpendingPalettes = {
  light: ['#b77a16', '#a95f52', '#6d647d', '#8a6f43', '#8f5874', '#66758a', '#b45f36', '#7b6f38'],
  dark: ['#e2b85d', '#d28b79', '#aaa0b9', '#d3ad73', '#c78ba8', '#95a7bf', '#e2986d', '#b9aa67'],
};
const spendingChartAnimationDuration = 250;

interface SpendingCategoryTotal {
  name: string;
  value: number;
  isEssential: boolean;
  color: string;
}

function valueOrPrompt(value: string | null, prompt: string, suffix = '') {
  return value === null ? prompt : `${value}${suffix}`;
}

/** Return a time appropriate greeting without storing another user preference. */
function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Place a readable category and percentage at the end of each pie connector line. */
function renderSpendingLabel({ name, percent, textAnchor, x, y }: PieLabelRenderProps) {
  return <text className="spending-segment-label" x={x} y={y} textAnchor={textAnchor} dominantBaseline="central">
    {String(name)} {(Number(percent) * 100).toFixed(0)}%
  </text>;
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

/** Render historical facts and projections with distinct labels and direct setup actions. */
export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const reportingPeriodSelectRef = useRef<HTMLSelectElement>(null);
  const { transactions, categories, session, themeMode, getCategoryById } = useFireBuddy();
  const { summary, status, error, demoMode, essentialCategoryIds } = useFinancialFoundation();
  const latestMonth = getDeviceMonthKey();
  const [spendingMonth, setSpendingMonth] = useState(latestMonth);
  const monthDate = new Date(`${latestMonth}-01T00:00:00`);
  const monthName = monthDate.toLocaleDateString('en-SG', { month: 'long' });
  const spendingMonthDate = new Date(`${spendingMonth}-01T00:00:00`);
  const spendingPeriod = spendingMonthDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  const spendingMonthOptions = useMemo(
    () => getSpendingMonthOptions(transactions, latestMonth),
    [latestMonth, transactions],
  );
  const spendingMonthIndex = spendingMonthOptions.indexOf(spendingMonth);
  const recent = sortTransactionsNewestFirst(transactions).slice(0, 5);
  const anomalyMap = new Map(summary?.transactionAnomalies.map((item) => [item.transactionId, item]) ?? []);
  const spendingData = useMemo(
    () => buildMonthlySpendingData(categories, transactions, spendingMonth, essentialCategoryIds, themeMode),
    [categories, essentialCategoryIds, spendingMonth, themeMode, transactions],
  );
  const spendingTotal = useMemo(() => spendingData.reduce((total, item) => total + item.value, 0), [spendingData]);
  const pulseIncome = summary ? Number(summary.pulse.income) : null;
  const pulseSpending = summary ? Number(summary.pulse.spending) : null;
  const pulseSavings = summary ? Number(summary.pulse.savingsAmount) : null;
  const pulseInvested = summary ? Number(summary.pulse.investedAmount) : null;
  const pulseScale = Math.max(
    Math.abs(pulseIncome ?? 0),
    Math.abs(pulseSpending ?? 0),
    Math.abs(pulseSavings ?? 0),
    Math.abs(pulseInvested ?? 0),
    1,
  );
  const pulseSavingsRate = summary?.pulse.savingsRate !== null && summary?.pulse.savingsRate !== undefined
    ? `${(Number(summary.pulse.savingsRate) * 100).toFixed(1)}% savings rate`
    : 'Savings rate unavailable';
  const firePath = useMemo(() => {
    if (!summary) return [];
    return [...summary.fire.actualPath.map((item) => ({ date: item.date.slice(0, 7), actual: Number(item.amount), projected: null })),
      ...summary.fire.projectedPath.map((item) => ({ date: item.date.slice(0, 7), actual: null, projected: Number(item.amount) }))];
  }, [summary]);

  /** Open Transactions with the submitted dashboard search applied. */
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/transactions?search=${encodeURIComponent(query)}` : '/transactions');
  }

  /** Open the native month list when the user clicks the period text or its surrounding box. */
  function openReportingPeriodPicker(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('select')) return;
    reportingPeriodSelectRef.current?.focus();
    reportingPeriodSelectRef.current?.showPicker?.();
  }

  return (
    <main className="page page-dashboard foundation-dashboard">
      <PageToolbar
        className="dashboard-toolbar"
        title={`${getGreeting(new Date().getHours())}, ${getDisplayName(session?.user)}`}
        description={`Here’s your financial position for ${monthName}.`}
        metadata={demoMode ? <span className="demo-data-label">Local demo data</span> : null}
        actions={<>
          <div className="dashboard-period" role="group" aria-label="Reporting period controls" onClick={openReportingPeriodPicker}>
            <button type="button" aria-label="Show previous month" disabled={spendingMonthIndex === spendingMonthOptions.length - 1} onClick={() => setSpendingMonth(getAdjacentSpendingMonth(spendingMonthOptions, spendingMonth, 'older'))}>
              <ChevronLeft size={16} />
            </button>
            <label className="dashboard-period-picker">
              <select ref={reportingPeriodSelectRef} aria-label="Reporting period" value={spendingMonth} onChange={(event) => setSpendingMonth(event.target.value)}>
                {spendingMonthOptions.map((month) => <option key={month} value={month}>{new Date(`${month}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}</option>)}
              </select>
            </label>
            <button type="button" aria-label="Show next month" disabled={spendingMonthIndex <= 0} onClick={() => setSpendingMonth(getAdjacentSpendingMonth(spendingMonthOptions, spendingMonth, 'newer'))}>
              <ChevronRight size={16} />
            </button>
          </div>
          <form className="dashboard-search" role="search" aria-label="Search transactions" onSubmit={submitSearch}>
            <input aria-label="Search transactions" type="search" placeholder="Search transactions" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            <button type="submit" aria-label="Submit search"><Search size={18} /></button>
          </form>
        </>}
      />

      <section className="dashboard-content foundation-dashboard-content">
        {status === 'loading' ? <p className="foundation-status" role="status">Loading your financial position...</p> : null}
        {error ? <p className="foundation-error" role="alert">{error}</p> : null}

        <div className="foundation-summary-grid">
          <SummaryCard icon={<TrendingUp />} label="Net worth" value={summary?.netWorth ? formatSGD(Number(summary.netWorth), 0) : null}
            detail={summary?.monthlyNetWorthChange ? `${Number(summary.monthlyNetWorthChange) >= 0 ? '+' : ''}${formatSGD(Number(summary.monthlyNetWorthChange), 0)} since prior month` : 'Prior month comparison unavailable'}
            prompt="Add wealth values" onClick={() => navigate('/wealth')} />
          <SummaryCard icon={<WalletCards />} label="Savings rate" value={summary?.pulse.savingsRate ? `${(Number(summary.pulse.savingsRate) * 100).toFixed(1)}%` : null}
            detail={summary?.pulse.savingsRateStatus === 'unavailable' ? 'Unavailable because recorded income is zero' : `For ${summary?.pulse.month ?? latestMonth}`}
            prompt="Add income" onClick={() => navigate('/transactions')} />
          <SummaryCard icon={<Umbrella />} label="Emergency fund runway" value={summary?.emergencyRunwayMonths ? `${Number(summary.emergencyRunwayMonths).toFixed(1)} months` : null}
            detail={summary?.averageMonthlyEssentialSpending ? `Based on ${formatSGD(Number(summary.averageMonthlyEssentialSpending), 0)} monthly essentials` : 'Needs emergency assets and essential categories'}
            prompt="Complete runway setup" onClick={() => navigate('/fire')} />
        </div>

        <div className="foundation-chart-grid">
          <article className="white-card foundation-fire-card">
            <div className="section-title-row">
              <div><p className="eyebrow">Projection</p><h3>FIRE Progress</h3></div>
              <button className="text-button" type="button" onClick={() => navigate('/fire')}>View projection</button>
            </div>
            {summary?.fire.fiTarget ? <>
              <p className="fire-progress-copy"><strong>{(Number(summary.fire.progressRate ?? 0) * 100).toFixed(1)}% funded</strong> with a FI target of {formatSGD(Number(summary.fire.fiTarget), 0)}</p>
              <div className="fire-chart" role="img" aria-label={`FIRE progress is ${(Number(summary.fire.progressRate ?? 0) * 100).toFixed(1)} percent. ${summary.fire.status === 'projected' ? `Estimated FI year ${summary.fire.estimatedFiYear}.` : `Status ${summary.fire.status}.`}`}>
                <ResponsiveContainer width="100%" height={220}><LineChart data={firePath} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
                  <XAxis dataKey="date" minTickGap={45} tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} width={55} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatSGD(Number(value), 0)} /><Legend /><ReferenceLine y={Number(summary.fire.fiTarget)} label="FI target" stroke="var(--chart-target)" strokeDasharray="4 4" />
                  <Line name="Historical fact" dataKey="actual" stroke="var(--chart-actual)" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} /><Line name="Projected estimate" dataKey="projected" stroke="var(--chart-projection)" strokeWidth={2} strokeDasharray="7 6" dot={false} connectNulls={false} />
                </LineChart></ResponsiveContainer>
              </div>
              <p className="chart-assumptions">As of {summary.effectiveDate}. Nominal return {(Number(summary.fire.assumptions?.nominalAnnualReturn ?? 0) * 100).toFixed(1)}%, inflation {(Number(summary.fire.assumptions?.inflationRate ?? 0) * 100).toFixed(1)}%, month end contributions, 100 year maximum horizon.</p>
            </> : <EmptyCard title="Set up your FIRE projection" copy="Add dated wealth values and FIRE assumptions. No estimate is shown until the inputs are complete." action="Set assumptions" onClick={() => navigate('/fire')} />}
          </article>

          <article className="white-card foundation-spending-card">
            <div className="section-title-row"><div><p className="eyebrow">{spendingPeriod} spending</p><h3>Monthly spending breakdown</h3></div><button className="text-button" type="button" onClick={() => navigate('/insights')}>View breakdown</button></div>
            {spendingData.length ? <div className="spending-chart-layout">
              <div className="spending-donut" role="img" aria-label={`${spendingPeriod} spending by category. Total ${formatSGD(spendingTotal)}.`}>
                <ResponsiveContainer width="100%" height={290}><PieChart><Pie data={spendingData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3} label={renderSpendingLabel} labelLine={{ stroke: 'var(--spending-label-line)', strokeWidth: 1.2 }} animationDuration={spendingChartAnimationDuration} animationEasing="ease-out">{spendingData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => formatSGD(Number(value))} /></PieChart></ResponsiveContainer>
                <span className="spending-donut-total"><small>Total</small><strong>{formatSGD(spendingTotal, 0)}</strong></span>
              </div>
              <ul className="spending-chart-summary visually-hidden" aria-label="Spending categories">{spendingData.map((item) => <li key={item.name}>{item.name}: {((item.value / spendingTotal) * 100).toFixed(1)}%, {formatSGD(item.value, 0)}, {item.isEssential ? 'essential' : 'discretionary'}</li>)}</ul>
            </div> : <EmptyCard title={`No spending in ${spendingPeriod}`} copy="Add and categorise transactions to see the breakdown." action="Add transaction" onClick={() => navigate('/add')} />}
          </article>
        </div>

        <div className="foundation-lower-grid">
          <article className="white-card money-pulse-card">
            <div className="section-title-row"><div><p className="eyebrow">Recorded activity</p><h3>{monthName} Money Pulse</h3></div><span className={`data-status data-status-${summary?.pulse.completeness ?? 'limited'}`}>{summary?.pulse.completeness === 'complete' ? 'Recorded month' : 'Limited data'}</span></div>
            <div className="pulse-chart" aria-label="Monthly money pulse compared with recorded income">
              <p className="pulse-income"><span>Recorded income</span><strong>{pulseIncome === null ? 'Unavailable' : formatSGD(pulseIncome, 0)}</strong></p>
              <div className="pulse-bars"><PulseBar label="Spent" amount={pulseSpending} comparisonBase={pulseScale} tone="spent" /><PulseBar label="Saved" amount={pulseSavings} comparisonBase={pulseScale} tone="saved" detail={pulseSavingsRate} /><PulseBar label="Invested" amount={pulseInvested} comparisonBase={pulseScale} tone="invested" /></div>
            </div>
            {summary?.recommendedAction ? <button className="recommended-action" type="button" onClick={() => navigate(summary.recommendedAction!.destination)}><span>Recommended next move</span><strong>{summary.recommendedAction.title}</strong><small>{summary.recommendedAction.rationale}</small></button>
              : <div className="recommended-action recommended-action-neutral"><span>Next move</span><strong>No urgent setup action</strong><small>Keep your values and contributions current.</small></div>}
          </article>

          <article className="white-card recent-foundation-card">
            <div className="section-title-row"><h3>Recent transactions</h3><button className="text-button" type="button" onClick={() => navigate('/transactions')}>View all</button></div>
            <div className="foundation-transaction-list">{recent.length ? recent.map((transaction) => {
              const category = getCategoryById(transaction.category); const Icon = getCategoryIcon(category); const anomaly = anomalyMap.get(transaction.id);
              return <button type="button" className="foundation-transaction" key={transaction.id} onClick={() => navigate('/transactions')}><span className="category-avatar" style={{ backgroundColor: `${category?.color ?? colors.primary}22`, color: category?.color }}><Icon size={18} /></span><span><strong>{transaction.description}</strong><small>{category?.name ?? 'Uncategorised'}, {formatDateLabel(transaction.date)}</small>{anomaly ? <em title={anomaly.explanation}><AlertTriangle size={13} /> {anomaly.label}</em> : null}</span><strong className={transaction.transactionType === 'income' ? 'amount-positive' : 'amount-negative'}>{transaction.transactionType === 'income' ? '+' : '-'} {formatSGD(transaction.amount)}</strong></button>;
            }) : <p className="dashboard-empty-copy">No transactions yet. Add one to build your monthly pulse.</p>}</div>
          </article>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value, detail, prompt, onClick }: { icon: ReactNode; label: string; value: string | null; detail: string; prompt: string; onClick: () => void }) {
  return <button type="button" className={`foundation-summary-card ${value ? '' : 'foundation-summary-incomplete'}`} onClick={onClick}><span className="foundation-summary-icon">{icon}</span><span><small>{label}</small><strong>{value ?? prompt}</strong><em>{detail}</em></span></button>;
}

/** Render one comparable pulse measure as a horizontal bar while retaining its exact value. */
function PulseBar({ label, amount, comparisonBase, tone, detail }: { label: string; amount: number | null; comparisonBase: number; tone: 'spent' | 'saved' | 'invested'; detail?: string }) {
  const percentage = amount === null ? 0 : Math.min(100, (Math.abs(amount) / comparisonBase) * 100);
  const value = amount === null ? 'Unavailable' : `${amount < 0 ? '-' : ''}${formatSGD(amount, 0)}`;
  const accessibleValue = detail ? `${value}, ${detail}` : value;

  return <div className={`pulse-bar pulse-bar-${tone} ${amount !== null && amount < 0 ? 'pulse-bar-negative' : ''}`}>
    <div className="pulse-bar-heading"><span>{label}</span><span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</span></div>
    <div className="pulse-bar-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={comparisonBase} aria-valuenow={Math.abs(amount ?? 0)} aria-valuetext={accessibleValue}>
      <span className="pulse-bar-fill" style={{ width: `${percentage}%` }} />
    </div>
  </div>;
}

function EmptyCard({ title, copy, action: actionLabel, onClick }: { title: string; copy: string; action: string; onClick: () => void }) {
  return <div className="foundation-empty"><strong>{title}</strong><p>{copy}</p><button className="secondary-button" type="button" onClick={onClick}>{actionLabel}</button></div>;
}
