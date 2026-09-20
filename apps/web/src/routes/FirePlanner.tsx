import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Landmark } from 'lucide-react';
import { AscentMark } from '../app/BrandMarks';
import { Legend, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calendarMonth, monthIndex, type FireCalculationResult, type FireScenarioRequest, type RetirementPlan } from '@firebuddy/shared';
import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import { formatSGD } from '../app/FireBuddyProvider';
import { PageToolbar } from '../components/PageToolbar';
import { mq } from '../app/breakpoints';
import { useMediaQuery } from '../app/useMediaQuery';

const amount = (value: string | null | undefined) => value == null ? 'Unavailable' : formatSGD(Number(value), 0);
/** Print a decimal rate as a percentage without binary float noise such as 7.000000000000001. */
const pct = (rate: number, digits = 2) => `${Number((rate * 100).toFixed(digits))}%`;
/** Turn a YYYY-MM calendar month into a readable Singapore month name. */
const monthLabel = (month: string | null | undefined) => month ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }) : '';
/** Completed age in the given calendar month. */
const ageAt = (plan: RetirementPlan, month: string) => Math.floor((monthIndex(month) - monthIndex(plan.birthMonth)) / 12);
const compact = (value: number) => Math.abs(value) >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : `$${Math.round(value / 1000)}k`;
const signed = (value: number, formatter: (n: number) => string) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatter(Math.abs(value))}`;

/** Read the headline facts a person needs from the authoritative monthly rows without recalculating anything. */
function describe(fire: FireCalculationResult) {
  const plan = fire.plan!, rows = fire.monthlyCashFlows ?? [];
  const depletion = rows.find(row => row.phase === 'retirement' && Number(row.balance) < 0)?.month ?? null;
  const required = fire.requiredMonthlyInvestment == null ? null : Number(fire.requiredMonthlyInvestment);
  return {
    plan, rows, depletion,
    retirementAge: ageAt(plan, plan.retirementMonth),
    earliestAge: fire.earliestRetirementMonth ? ageAt(plan, fire.earliestRetirementMonth) : null,
    progress: Number(fire.progressRate ?? 0),
    contributionDelta: required === null ? null : required - plan.monthlyContribution,
    peak: rows.reduce((max, row) => Math.max(max, Number(row.balance)), 0),
  };
}

/** Render the authoritative saved model, including accumulation, income gaps and withdrawals. */
export default function FirePlanner() {
  const { summary, profile, status, error, refresh, demoMode } = useFinancialFoundation();
  const navigate = useNavigate();
  const fire = summary?.fire, plan = fire?.plan;
  const ready = !!fire && !!plan && fire.fundingStatus !== 'review_required';
  return <main className="page foundation-management-page retirement-page">
    <PageToolbar
      title="FIRE Planner"
      description="Your retirement timeline, from investing to drawing down."
      metadata={demoMode ? <span className="demo-data-label">Local demo data</span> : null}
      actions={<div className="retirement-actions"><Link className="secondary-button" to="/wealth">Review assets</Link><Link className="primary-button" to="/fire/setup">{profile?.draftPlan ? 'Resume setup' : plan ? 'Review plan' : 'Start setup'}</Link></div>}
      /* On a phone the setup call to action is the one thing worth a toolbar slot; Review assets
         moves behind the overflow button rather than competing with it. */
      overflowActions={[
        { label: profile?.draftPlan ? 'Resume setup' : plan ? 'Review plan' : 'Start setup', icon: AscentMark, onSelect: () => navigate('/fire/setup') },
        { label: 'Review assets', icon: Landmark, onSelect: () => navigate('/wealth') },
      ]}
    />
    {error && <div className="foundation-error" role="alert">{error}<button onClick={() => void refresh()}>Try again</button></div>}
    {!summary && status === 'loading' ? <p role="status">Loading your retirement plan…</p> : !ready ? <section className="white-card foundation-form"><h2>Review required</h2><p>Confirm your timeline, retirement spending, spendable assets, income and assumptions. Existing information is available for review; it does not activate a projection.</p><Link className="primary-button" to="/fire/setup">{profile?.draftPlan ? 'Resume your draft' : 'Begin the five steps'}</Link>{fire?.warnings.map(w => <p key={w.code}>{w.message}</p>)}</section> : <>
      {profile?.draftPlan && <p role="status">You have an unfinished draft. These results still use your active plan.</p>}
      <Results fire={fire} />
      <Scenario key={JSON.stringify(plan)} baseline={fire} />
    </>}
  </main>;
}

/** Headline cards, progress, chart, spending and evidence for one activated plan. */
function Results({ fire }: { fire: FireCalculationResult }) {
  const { plan, rows, depletion, retirementAge, earliestAge, progress, contributionDelta, peak } = describe(fire);
  // A 320px chart with a wrapping legend leaves no room for the figures it is meant to explain.
  const isCompactChart = !useMediaQuery(mq.md);
  const isNarrowChart = !useMediaQuery(mq.sm);
  const isTouch = useMediaQuery(mq.coarse);
  const funded = fire.fundingStatus === 'funded';
  const sampled = rows.filter((row, i) => i % 12 === 0 || row.month === plan.retirementMonth || i === rows.length - 1);
  const chart = [
    ...(fire.actualPath ?? []).map(row => ({ date: row.date.slice(0, 7), actual: Number(row.amount), accumulation: null as number | null, retirement: null as number | null })),
    ...sampled.map(row => ({ date: row.month, accumulation: row.phase === 'accumulation' ? Number(row.balance) : null, retirement: row.phase === 'retirement' ? Number(row.balance) : null })),
  ];
  // Negative balances are real unfunded cash flows, but letting them run to the end age flattens the accumulation curve; clip the axis and mark the depletion month instead.
  const ceiling = Math.max(peak, Number(fire.fiTarget ?? 0), 1) * 1.08, floor = -ceiling * 0.3;
  const depletionTick = depletion ? sampled.find(row => row.month >= depletion)?.month : undefined;
  const years = [...new Set(rows.map(row => row.month.slice(0, 4)))].map(year => {
    const items = rows.filter(row => row.month.startsWith(year));
    const total = (key: 'contribution' | 'expenses' | 'cpf' | 'otherIncome') => items.reduce((sum, row) => sum + Number(row[key]), 0);
    return { year, contribution: total('contribution'), expenses: total('expenses'), income: total('cpf') + total('otherIncome'), balance: Number(items.at(-1)!.balance) };
  });
  const cpfMonth = calendarMonth(monthIndex(plan.birthMonth) + plan.cpfStartAge * 12);
  const firstRetirement = rows.find(row => row.phase === 'retirement');
  const firstCpf = rows.find(row => row.phase === 'retirement' && row.month >= cpfMonth);
  const cpfIncluded = ['standard', 'escalating'].includes(plan.cpfPlan);
  const monthsToRetirement = monthIndex(plan.retirementMonth) - monthIndex(fire.effectiveDate);
  const monthly = (annual: number) => (1 + annual) ** (1 / 12) - 1;
  return <>
    <div className="retirement-headlines">{[
      ['Required at retirement', amount(fire.fiTarget), `${amount(fire.targetToday)} in today’s money · ${monthLabel(plan.retirementMonth)}, age ${retirementAge}`],
      ['Projected at retirement', amount(fire.projectedPortfolio), `${amount(fire.portfolioToday)} in today’s money · from ${amount(fire.currentInvestableAssets)} today`],
      ['Funding gap', funded ? 'None' : amount(fire.fundingGap), funded ? `Funded through age ${plan.endAge} under these assumptions` : 'Additional capital needed at retirement'],
      ['Required monthly investment', amount(fire.requiredMonthlyInvestment), fire.requiredMonthlyInvestment == null ? 'No monthly amount can close the gap by this retirement month' : contributionDelta! > 0.005 ? `${formatSGD(contributionDelta!, 0)} more than your ${formatSGD(plan.monthlyContribution, 0)} plan` : `Your ${formatSGD(plan.monthlyContribution, 0)} plan covers it`],
    ].map(([label, value, detail]) => <article className={`white-card${label === 'Funding gap' && !funded ? ' retirement-headline-alert' : ''}`} key={label}><h2>{label}</h2><strong>{value}</strong><p>{detail}</p></article>)}</div>

    <section className="white-card foundation-form retirement-progress-card">
      <div className="section-title-row"><div><h2>FIRE progress</h2><p className="card-subtitle">Projected portfolio ÷ required portfolio at retirement in {monthLabel(plan.retirementMonth)}.</p></div><strong className="retirement-progress-figure">{(progress * 100).toFixed(1)}% funded</strong></div>
      <div className="dashboard-budget-track fire-progress-track" role="img" aria-label={`${(progress * 100).toFixed(1)}% of the required retirement portfolio`}><span style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} /></div>
      <dl className="fire-progress-facts retirement-progress-facts">
        <div><dt>Earliest funded retirement</dt><dd>{fire.earliestRetirementMonth ? monthLabel(fire.earliestRetirementMonth) : 'Not found'}<small> {fire.earliestRetirementMonth ? `age ${earliestAge}` : `before age ${plan.endAge}`}</small></dd></div>
        <div><dt>Selected retirement</dt><dd>{monthLabel(plan.retirementMonth)}<small> age {retirementAge}, {monthsToRetirement === 0 ? 'this month' : `${Math.floor(monthsToRetirement / 12)}y ${monthsToRetirement % 12}m away`}</small></dd></div>
        <div><dt>Portfolio lasts</dt><dd>{depletion ? monthLabel(depletion) : `Through age ${plan.endAge}`}<small> {depletion ? `depleted at age ${ageAt(plan, depletion)}` : 'no unfunded months'}</small></dd></div>
        <div><dt>Peak portfolio</dt><dd>{formatSGD(peak, 0)}<small> nominal SGD</small></dd></div>
      </dl>
      <div className="fire-chart" role="img" aria-label="Projected accumulation and retirement portfolio drawdown in nominal SGD">
        <ResponsiveContainer width="100%" height={isNarrowChart ? 200 : isCompactChart ? 230 : 320}><LineChart data={chart} margin={isCompactChart ? { top: 12, right: 8, bottom: 0, left: 0 } : { top: 24, right: 24, bottom: 4, left: 8 }}>
          <XAxis dataKey="date" minTickGap={isCompactChart ? 28 : 40} interval="preserveStartEnd" tickMargin={6} tickFormatter={v => String(v).slice(0, 4)} tick={{ fontSize: 12 }} />
          <YAxis width={isCompactChart ? 44 : 62} domain={[floor, ceiling]} ticks={[floor, 0, ceiling * 0.25, ceiling * 0.5, ceiling * 0.75, ceiling]} allowDataOverflow tickFormatter={v => compact(Number(v))} tick={{ fontSize: 12 }} />
          <Tooltip trigger={isTouch ? 'click' : 'hover'} formatter={(v, name) => [formatSGD(Number(v), 0), name]} labelFormatter={label => monthLabel(String(label))} />
          {/* Recharts' own legend wraps badly at phone widths and reads poorly in TalkBack; the
              static key list below the chart replaces it. */}
          {isCompactChart ? null : <Legend />}
          <ReferenceLine y={0} stroke="var(--line-strong)" />
          <ReferenceLine x={plan.retirementMonth} stroke="var(--ink-3)" strokeDasharray="4 4" label={{ value: `Retire ${plan.retirementMonth.slice(0, 4)}`, position: 'insideBottomLeft', fill: 'var(--ink-2)', fontSize: 12 }} />
          {depletionTick && <ReferenceLine x={depletionTick} stroke="var(--expense)" strokeDasharray="4 4" label={{ value: `Depleted ${depletion!.slice(0, 4)}`, position: 'insideTopRight', fill: 'var(--expense)', fontSize: 12 }} />}
          {fire.fiTarget && <ReferenceDot x={plan.retirementMonth} y={Number(fire.fiTarget)} r={5} fill="var(--chart-target)" stroke="var(--surface)" strokeWidth={2} label={{ value: `Required ${compact(Number(fire.fiTarget))}`, position: 'top', fill: 'var(--chart-target)', fontSize: 12 }} />}
          <Line name="Recorded eligible assets" dataKey="actual" stroke="var(--chart-actual)" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
          <Line name="Accumulation" dataKey="accumulation" stroke="var(--chart-actual)" strokeWidth={3} dot={false} isAnimationActive={false} />
          <Line name="Retirement drawdown" dataKey="retirement" stroke="var(--chart-projection)" strokeWidth={2} strokeDasharray="7 6" dot={false} isAnimationActive={false} />
        </LineChart></ResponsiveContainer>
        {isCompactChart ? (
          <ul className="chart-key">
            <li><span style={{ background: 'var(--chart-actual)' }} aria-hidden="true" />Recorded and accumulation</li>
            <li><span style={{ background: 'var(--chart-projection)' }} aria-hidden="true" />Retirement drawdown</li>
            <li><span style={{ background: 'var(--chart-target)' }} aria-hidden="true" />Required at retirement</li>
          </ul>
        ) : null}
      </div>
      <p>Nominal SGD, smooth returns. The gold dot is the capital required in {monthLabel(plan.retirementMonth)}; balances below zero are unfunded months, not borrowing. {depletion ? 'Compare a later retirement date or a higher contribution below.' : 'Review assumptions and refresh asset values regularly.'} <Link to="/wealth">Manage wealth separately</Link>.</p>
    </section>

    <section className="white-card foundation-form"><h2>Spending and retirement income</h2>{!cpfIncluded && <p role="status">CPF income not included{plan.cpfPlan === 'basic' ? ': Basic declining payouts are not modelled.' : ': payout is not yet known.'}</p>}<div className="retirement-facts">{[firstRetirement, firstCpf].map((row, i) => <div key={i}><h3>{i === 0 ? 'At retirement' : `From CPF LIFE payout age ${plan.cpfStartAge}`}</h3>{row ? <><p>{monthLabel(row.month)}, nominal SGD per month</p><dl><div><dt>Expenses</dt><dd>{amount(row.expenses)}</dd></div><div><dt>CPF LIFE</dt><dd>{amount(row.cpf)}</dd></div><div><dt>Other net income</dt><dd>{amount(row.otherIncome)}</dd></div><div><dt>Drawn from portfolio</dt><dd>{formatSGD(Math.max(0, Number(row.expenses) - Number(row.cpf) - Number(row.otherIncome)), 0)}</dd></div></dl></> : <p>Outside this planning horizon.</p>}</div>)}</div></section>

    <details className="white-card foundation-form"><summary>Yearly cash flows in nominal SGD</summary><div className="retirement-table" tabIndex={0} role="region" aria-label="Yearly cash flows"><table><thead><tr><th>Year</th><th>Age</th><th>Invested</th><th>Income</th><th>Expenses</th><th>Closing portfolio</th></tr></thead><tbody>{years.map(row => <tr key={row.year} className={row.balance < 0 ? 'retirement-row-negative' : undefined}><th>{row.year}</th><td>{ageAt(plan, `${row.year}-12`)}</td><td>{formatSGD(row.contribution, 0)}</td><td>{formatSGD(row.income, 0)}</td><td>{formatSGD(row.expenses, 0)}</td><td>{formatSGD(row.balance, 0)}</td></tr>)}</tbody></table></div></details>

    <details className="white-card foundation-form"><summary>How the numbers are calculated</summary>
      <p>Calculation {fire.calculationVersion}, effective {fire.effectiveDate}. Monthly growth is applied first; contributions or withdrawals follow at month end. Spending is inflated once from {monthLabel(plan.spendingMonth)}; CPF estimates are in commencement dollars.</p>
      <dl className="retirement-formulas">
        <div><dt>Monthly growth before retirement</dt><dd>(1 + {pct(plan.beforeReturn)})^(1/12) − 1 = {pct(monthly(plan.beforeReturn), 3)}</dd></div>
        <div><dt>Monthly growth after retirement</dt><dd>(1 + {pct(plan.afterReturn)})^(1/12) − 1 = {pct(monthly(plan.afterReturn), 3)}</dd></div>
        {firstRetirement && <div><dt>Spending at retirement</dt><dd>{formatSGD(plan.monthlySpending, 0)} × (1 + {pct(plan.inflation)})^({monthIndex(firstRetirement.month) - monthIndex(plan.spendingMonth) + 1}/12) = {amount(firstRetirement.expenses)} per month</dd></div>}
        <div><dt>Required at retirement</dt><dd>Capital that funds every retirement month through age {plan.endAge} after CPF and other income, worked backwards at {pct(plan.afterReturn)} = {amount(fire.fiTarget)}</dd></div>
        <div><dt>Projected at retirement</dt><dd>{amount(fire.currentInvestableAssets)} grown for {monthsToRetirement} months plus {formatSGD(plan.monthlyContribution, 0)} monthly = {amount(fire.projectedPortfolio)}</dd></div>
        <div><dt>Progress</dt><dd>{amount(fire.projectedPortfolio)} ÷ {amount(fire.fiTarget)} = {(progress * 100).toFixed(1)}%</dd></div>
        <div><dt>Today’s money</dt><dd>Retirement-date amounts ÷ (1 + {pct(plan.inflation)})^({monthsToRetirement}/12)</dd></div>
      </dl>
    </details>

    <details className="white-card foundation-form"><summary>Assumptions, sources and data quality</summary>
      <p>Return before retirement {pct(plan.beforeReturn)}, after retirement {pct(plan.afterReturn)}, inflation {pct(plan.inflation)}. Individual plan through age {plan.endAge}. These are editable assumptions, not official forecasts or safe rates.</p>
      <p>Recorded spending period: {fire.spendingBaseline.startDate ?? 'Unavailable'} to {fire.spendingBaseline.endDate ?? 'Unavailable'} ({fire.spendingBaseline.completedMonths} completed months). Missing records do not prove zero spending.</p>
      <ul>{fire.warnings.map(w => <li key={w.code}>{w.message}</li>)}</ul>
      <dl>{Object.entries(plan.provenance).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{value}</dd></div>)}</dl>
      <p>Policy reference reviewed 7 September 2026: <a href="https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life" target="_blank" rel="noreferrer">CPF Board CPF LIFE</a>. Spending review: <a href="https://www.moneysense.gov.sg/legacy-planning/planning-for-retirement/" target="_blank" rel="noreferrer">MoneySense retirement planning</a>. Older policy figures are not calculation constants.</p>
    </details>
  </>;
}

const scenarioLabels = { retirementMonth: 'Retirement month', monthlyContribution: 'Monthly investment (SGD)', monthlySpending: 'Monthly spending today (SGD)', beforeReturn: 'Return before retirement (%)', afterReturn: 'Return after retirement (%)', inflation: 'Inflation (%)' } as const;
type Overrides = NonNullable<FireScenarioRequest['planOverrides']>;
const isRate = (key: keyof Overrides) => key === 'beforeReturn' || key === 'afterReturn' || key === 'inflation';

/** Compare a single unsaved scenario against the authoritative baseline. */
function Scenario({ baseline }: { baseline: FireCalculationResult }) {
  const { runScenario } = useFinancialFoundation();
  const plan = baseline.plan!;
  const initial: Overrides = { retirementMonth: plan.retirementMonth, monthlyContribution: plan.monthlyContribution, monthlySpending: plan.monthlySpending, beforeReturn: plan.beforeReturn, afterReturn: plan.afterReturn, inflation: plan.inflation };
  const [overrides, setOverrides] = useState<Overrides>(initial);
  const [result, setResult] = useState<FireCalculationResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const changed = (Object.keys(scenarioLabels) as (keyof Overrides)[]).filter(key => overrides[key] !== initial[key]);
  async function calculate(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true); setResult(null);
    try { setResult(await runScenario({ planOverrides: overrides })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to calculate scenario.'); }
    finally { setBusy(false); }
  }
  const months = (value: string | null | undefined) => value ? monthIndex(value) : null;
  const earliestDelta = result && months(result.earliestRetirementMonth) !== null && months(baseline.earliestRetirementMonth) !== null ? months(result.earliestRetirementMonth)! - months(baseline.earliestRetirementMonth)! : null;
  const money = (value: string | null | undefined) => value == null ? null : Number(value);
  const compare = (key: 'fiTarget' | 'projectedPortfolio' | 'fundingGap' | 'requiredMonthlyInvestment', label: string) => {
    const a = money(baseline[key]), b = money(result?.[key]);
    // Lower required capital, gap or contribution is good; higher projected capital is good.
    const better = a !== null && b !== null && b !== a ? (key === 'projectedPortfolio' ? b > a : b < a) : null;
    return <tr key={key}><th>{label}</th><td>{amount(baseline[key])}</td><td>{amount(result?.[key])}</td><td className={better === null ? undefined : better ? 'amount-positive' : 'amount-negative'}>{a === null || b === null ? 'Unavailable' : b === a ? 'No change' : signed(b - a, n => formatSGD(n, 0))}</td></tr>;
  };
  return <form className="white-card foundation-form retirement-scenario" onSubmit={calculate}>
    <div className="section-title-row"><div><h2>Temporary scenario</h2><p className="card-subtitle">Compare one change set. Your saved plan and transactions remain unchanged.</p></div>{changed.length > 0 && <button type="button" className="text-button" onClick={() => { setOverrides(initial); setResult(null); setError(''); }}>Reset to saved plan</button>}</div>
    <div className="retirement-scenario-fields">{(Object.keys(scenarioLabels) as (keyof Overrides)[]).map(key => <div key={key} className={changed.includes(key) ? 'retirement-field-changed' : undefined}><label>{scenarioLabels[key]}<input required type={key === 'retirementMonth' ? 'month' : 'number'} step={isRate(key) ? '0.1' : '1'} min={key === 'retirementMonth' ? baseline.effectiveDate.slice(0, 7) : isRate(key) ? (key === 'inflation' ? 0 : -20) : 0} max={isRate(key) ? (key === 'inflation' ? 20 : 30) : undefined} value={isRate(key) ? Number((Number(overrides[key]) * 100).toFixed(4)) : overrides[key]} onChange={e => { setResult(null); setOverrides({ ...overrides, [key]: key === 'retirementMonth' ? e.target.value : isRate(key) ? Number(e.target.value) / 100 : Math.ceil(Number(e.target.value)) }); }} /></label><small>Saved: {key === 'retirementMonth' ? monthLabel(plan.retirementMonth) : isRate(key) ? pct(plan[key]) : formatSGD(plan[key], 0)}</small></div>)}</div>
    <div className="retirement-actions"><button className="secondary-button" disabled={busy}>{busy ? 'Calculating…' : 'Compare scenario'}</button></div>
    {error && <p role="alert">{error}</p>}
    {result && <div role="status" className="retirement-scenario-result">{result.fundingStatus === 'review_required' ? <p>{result.warnings.map(w => w.message).join(' ')}</p> : <>
      <p><strong>{result.fundingStatus === 'funded' ? 'Funded' : 'Shortfall'}</strong> through age {plan.endAge} under this scenario{changed.length ? ` (changed: ${changed.map(key => scenarioLabels[key].replace(/ \(.*\)/, '').toLowerCase()).join(', ')})` : ''}.</p>
      <div className="retirement-table"><table><thead><tr><th>Nominal SGD</th><th>Saved plan</th><th>Scenario</th><th>Difference</th></tr></thead><tbody>
        {compare('fiTarget', 'Required capital')}{compare('projectedPortfolio', 'Projected capital')}{compare('fundingGap', 'Funding gap')}{compare('requiredMonthlyInvestment', 'Monthly investment needed')}
        <tr><th>Progress</th><td>{(Number(baseline.progressRate ?? 0) * 100).toFixed(1)}%</td><td>{(Number(result.progressRate ?? 0) * 100).toFixed(1)}%</td><td>{signed((Number(result.progressRate ?? 0) - Number(baseline.progressRate ?? 0)) * 100, n => `${n.toFixed(1)} pts`)}</td></tr>
        <tr><th>Earliest funded month</th><td>{baseline.earliestRetirementMonth ? monthLabel(baseline.earliestRetirementMonth) : 'Not found'}</td><td>{result.earliestRetirementMonth ? monthLabel(result.earliestRetirementMonth) : 'Not found'}</td><td>{earliestDelta === null ? 'Unavailable' : earliestDelta === 0 ? 'No change' : `${Math.abs(earliestDelta)} months ${earliestDelta < 0 ? 'earlier' : 'later'}`}</td></tr>
      </tbody></table></div>
    </>}</div>}
  </form>;
}
