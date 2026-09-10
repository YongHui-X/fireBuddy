import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calendarMonth, monthIndex, type FireCalculationResult, type FireScenarioRequest } from '@firebuddy/shared';
import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import { formatSGD } from '../app/FireBuddyProvider';
import { PageToolbar } from '../components/PageToolbar';

const amount = (value: string | null | undefined) => value == null ? 'Unavailable' : formatSGD(Number(value), 0);

/** Render the authoritative saved model, including accumulation, income gaps and withdrawals. */
export default function FirePlanner() {
  const { summary, profile, status, error, refresh, demoMode } = useFinancialFoundation();
  const fire = summary?.fire, plan = fire?.plan;
  const rows = fire?.monthlyCashFlows ?? [];
  const chart = [...(fire?.actualPath ?? []).map(row => ({ date: row.date.slice(0, 7), actual: Number(row.amount), accumulation: null as number | null, retirement: null as number | null })), ...rows.filter((row, i) => i % 12 === 0 || row.month === plan?.retirementMonth || i === rows.length - 1).map(row => ({ date: row.month, accumulation: row.phase === 'accumulation' ? Number(row.balance) : null, retirement: row.phase === 'retirement' ? Number(row.balance) : null }))];
  const years = [...new Set(rows.map(row => row.month.slice(0, 4)))].map(year => {
    const items = rows.filter(row => row.month.startsWith(year));
    const total = (key: 'contribution' | 'expenses' | 'cpf' | 'otherIncome') => items.reduce((sum, row) => sum + Number(row[key]), 0);
    return { year, contribution: total('contribution'), expenses: total('expenses'), income: total('cpf') + total('otherIncome'), balance: Number(items.at(-1)!.balance) };
  });
  const cpfMonth = plan ? calendarMonth(monthIndex(plan.birthMonth) + plan.cpfStartAge * 12) : '';
  const firstRetirement = rows.find(row => row.phase === 'retirement');
  const firstCpf = rows.find(row => row.phase === 'retirement' && row.month >= cpfMonth);
  return <main className="page foundation-management-page retirement-page">
    <PageToolbar title="FIRE Planner" description="Your retirement timeline, from investing to drawing down." metadata={demoMode ? <span className="demo-data-label">Local demo data</span> : null} actions={<div className="retirement-actions"><Link className="secondary-button" to="/wealth">Review assets</Link><Link className="primary-button" to="/fire/setup">{profile?.draftPlan ? 'Resume setup' : plan ? 'Review plan' : 'Start setup'}</Link></div>} />
    {error && <div className="foundation-error" role="alert">{error}<button onClick={() => void refresh()}>Try again</button></div>}
    {!summary && status === 'loading' ? <p role="status">Loading your retirement plan…</p> : fire?.fundingStatus === 'review_required' || !plan ? <section className="white-card foundation-form"><h2>Review required</h2><p>Confirm your timeline, retirement spending, spendable assets, income and assumptions. Existing information is available for review; it does not activate a projection.</p><Link to="/fire/setup">{profile?.draftPlan ? 'Resume your draft' : 'Begin the five steps'}</Link>{fire?.warnings.map(w => <p key={w.code}>{w.message}</p>)}</section> : <>
      {profile?.draftPlan && <p role="status">You have an unfinished draft. These results still use your active plan.</p>}
      <div className="retirement-headlines">{[
        ['Required at retirement', amount(fire?.fiTarget), `${amount(fire?.targetToday)} in today’s money`],
        ['Projected at retirement', amount(fire?.projectedPortfolio), `${amount(fire?.portfolioToday)} in today’s money`],
        ['Funding gap', amount(fire?.fundingGap), fire?.fundingStatus === 'funded' ? 'Funded through the selected end age under these assumptions' : 'Additional retirement capital needed'],
        ['Required monthly investment', amount(fire?.requiredMonthlyInvestment), 'Fixed nominal SGD until retirement'],
      ].map(([label, value, detail]) => <article className="white-card" key={label}><h2>{label}</h2><strong>{value}</strong><p>{detail}</p></article>)}</div>
      <section className="white-card foundation-form"><div className="section-title-row"><h2>FIRE progress</h2><strong>{(Number(fire?.progressRate ?? 0) * 100).toFixed(1)}% funded</strong></div><p>Projected portfolio ÷ required portfolio at retirement in {plan.retirementMonth}. Chart values are nominal SGD.</p>
        <div className="fire-chart" role="img" aria-label="Projected accumulation and retirement portfolio drawdown in nominal SGD"><ResponsiveContainer width="100%" height={300}><LineChart data={chart} margin={{ top: 15, right: 15, bottom: 8, left: 10 }}><XAxis dataKey="date" minTickGap={45} /><YAxis width={65} tickFormatter={v => `$${Math.round(Number(v) / 1000)}k`} /><Tooltip formatter={v => formatSGD(Number(v), 0)} /><Legend /><ReferenceLine y={0} stroke="var(--chart-target)" /><ReferenceLine x={plan.retirementMonth} label="Retire" strokeDasharray="4 4" /><Line name="Recorded eligible assets" dataKey="actual" stroke="var(--chart-actual)" strokeWidth={3} dot={{ r: 3 }} /><Line name="Accumulation" dataKey="accumulation" stroke="var(--chart-actual)" strokeWidth={3} dot={false} /><Line name="Retirement drawdown" dataKey="retirement" stroke="var(--chart-projection)" strokeWidth={2} strokeDasharray="7 6" dot={false} /></LineChart></ResponsiveContainer></div>
        <p>Estimated earliest funded retirement month: <strong>{fire?.earliestRetirementMonth ?? 'Not found before the planning end age'}</strong>. Each candidate month uses its own remaining cash flows.</p>
        <p>{fire?.fundingStatus === 'shortfall' ? 'Review the contribution shortfall or compare a later retirement date below.' : 'Review assumptions and refresh asset values regularly.'} <Link to="/wealth">Manage wealth separately</Link>.</p>
      </section>
      <section className="white-card foundation-form"><h2>Spending and retirement income</h2>{['unknown', 'basic'].includes(plan.cpfPlan) && <p role="status">CPF income not included{plan.cpfPlan === 'basic' ? ': Basic declining payouts are not modelled.' : ': payout is not yet known.'}</p>}<div className="retirement-facts">{[firstRetirement, firstCpf].map((row, i) => <div key={i}><h3>{i === 0 ? 'At retirement' : 'At or after CPF commencement age'}</h3>{row ? <><p>{row.month}, nominal SGD per month</p><p>Expenses {amount(row.expenses)}</p><p>CPF LIFE {amount(row.cpf)} · Other net income {amount(row.otherIncome)}</p><p>Portfolio funding needed {formatSGD(Math.max(0, Number(row.expenses) - Number(row.cpf) - Number(row.otherIncome)), 0)}</p></> : <p>Outside this planning horizon.</p>}</div>)}</div></section>
      <details className="white-card foundation-form"><summary>Yearly cash flows in nominal SGD</summary><div className="retirement-table" tabIndex={0} role="region" aria-label="Yearly cash flows"><table><thead><tr><th>Year</th><th>Invested</th><th>Income</th><th>Expenses</th><th>Closing portfolio</th></tr></thead><tbody>{years.map(row => <tr key={row.year}><th>{row.year}</th><td>{formatSGD(row.contribution, 0)}</td><td>{formatSGD(row.income, 0)}</td><td>{formatSGD(row.expenses, 0)}</td><td>{formatSGD(row.balance, 0)}</td></tr>)}</tbody></table></div></details>
      <details className="white-card foundation-form"><summary>Assumptions, sources and data quality</summary><p>Calculation {fire?.calculationVersion}, effective {fire?.effectiveDate}. Spending values are based in {plan.spendingMonth} SGD. Monthly growth precedes month end contributions or withdrawals. Spending is inflated once; CPF estimates are in commencement dollars.</p><p>Return before retirement {plan.beforeReturn * 100}%, after retirement {plan.afterReturn * 100}%, inflation {plan.inflation * 100}%. Individual plan through age {plan.endAge}. These are editable assumptions, not official forecasts or safe rates.</p><p>Recorded spending period: {fire?.spendingBaseline.startDate ?? 'Unavailable'} to {fire?.spendingBaseline.endDate ?? 'Unavailable'}. Missing records do not prove zero spending.</p><ul>{fire?.warnings.map(w => <li key={w.code}>{w.message}</li>)}</ul><dl>{Object.entries(plan.provenance).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{value}</dd></div>)}</dl><p>Policy reference reviewed 7 September 2026: <a href="https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life" target="_blank" rel="noreferrer">CPF Board CPF LIFE</a>. Spending review: <a href="https://www.moneysense.gov.sg/legacy-planning/planning-for-retirement/" target="_blank" rel="noreferrer">MoneySense retirement planning</a>. Older policy figures are not calculation constants.</p></details>
      <Scenario key={JSON.stringify(plan)} baseline={fire!} />
    </>}
  </main>;
}

/** Compare a single unsaved scenario against the authoritative baseline. */
function Scenario({ baseline }: { baseline: FireCalculationResult }) {
  const { runScenario } = useFinancialFoundation();
  const plan = baseline.plan!;
  const [overrides, setOverrides] = useState<NonNullable<FireScenarioRequest['planOverrides']>>({ retirementMonth: plan.retirementMonth, monthlyContribution: plan.monthlyContribution, monthlySpending: plan.monthlySpending, beforeReturn: plan.beforeReturn, afterReturn: plan.afterReturn, inflation: plan.inflation });
  const [result, setResult] = useState<FireCalculationResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function calculate(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true); setResult(null);
    try { setResult(await runScenario({ planOverrides: overrides })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to calculate scenario.'); }
    finally { setBusy(false); }
  }
  return <form className="white-card foundation-form" onSubmit={calculate}><h2>Temporary scenario</h2><p>Compare one change set. Your saved plan and transactions remain unchanged.</p><div className="retirement-scenario-fields">{(Object.keys(overrides) as (keyof typeof overrides)[]).map(key => <label key={key}>{{ retirementMonth: 'Retirement month', monthlyContribution: 'Monthly investment (SGD)', monthlySpending: 'Monthly spending today (SGD)', beforeReturn: 'Return before retirement (%)', afterReturn: 'Return after retirement (%)', inflation: 'Inflation (%)' }[key]}<input required type={key === 'retirementMonth' ? 'month' : 'number'} step="any" value={key.includes('Return') || key === 'inflation' ? Number(overrides[key]) * 100 : overrides[key]} onChange={e => { setResult(null); setOverrides({ ...overrides, [key]: key === 'retirementMonth' ? e.target.value : Number(e.target.value) / (key.includes('Return') || key === 'inflation' ? 100 : 1) }); }} /></label>)}</div><button className="secondary-button" disabled={busy}>{busy ? 'Calculating…' : 'Compare scenario'}</button>{error && <p role="alert">{error}</p>}{result && <div role="status">{result.fundingStatus === 'review_required' ? <p>{result.warnings.map(w => w.message).join(' ')}</p> : <><p>{result.fundingStatus === 'funded' ? 'Funded' : 'Shortfall'} through the selected end age under this scenario.</p><div className="retirement-table"><table><thead><tr><th>Nominal SGD</th><th>Saved baseline</th><th>Scenario</th><th>Difference</th></tr></thead><tbody>{(['fiTarget', 'projectedPortfolio', 'fundingGap', 'requiredMonthlyInvestment'] as const).map(key => <tr key={key}><th>{{ fiTarget: 'Required capital', projectedPortfolio: 'Projected capital', fundingGap: 'Funding gap', requiredMonthlyInvestment: 'Monthly investment needed' }[key]}</th><td>{amount(baseline[key])}</td><td>{amount(result[key])}</td><td>{baseline[key] == null || result[key] == null ? 'Unavailable' : formatSGD(Number(result[key]) - Number(baseline[key]), 0)}</td></tr>)}</tbody></table></div><p>Earliest funded month: {result.earliestRetirementMonth ?? 'Not found'} (baseline {baseline.earliestRetirementMonth ?? 'not found'}).</p></>}</div>}</form>;
}
