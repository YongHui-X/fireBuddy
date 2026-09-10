import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { monthIndex, validateRetirementPlan, type RetirementPlan } from '@firebuddy/shared';
import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import { formatSGD, useFireBuddy } from '../app/FireBuddyProvider';
import { eligibleRetirementAsset, initialRetirementPlan, legacyProfileValues, retirementAtAge } from '../app/retirementSetup';
import { PageToolbar } from '../components/PageToolbar';

const steps = ['Your timeline', 'Spending and savings', 'Retirement assets', 'Retirement income', 'Assumptions and review'];

/** Initialize the resumable draft only after owner-scoped data is available. */
export default function FireSetup() {
  const { summary, status, error, refresh } = useFinancialFoundation();
  if (!summary) return <main className="page foundation-management-page"><p role="status">{status === 'error' ? error : 'Loading retirement setup…'}</p>{status === 'error' && <button onClick={() => void refresh()}>Try again</button>}</main>;
  return <GuidedSetup />;
}

/** Keep draft saves separate from explicit final activation. */
function GuidedSetup() {
  const navigate = useNavigate();
  const { transactions } = useFireBuddy();
  const { profile, positions, snapshots, contributions, summary, updateProfile } = useFinancialFoundation();
  const [plan, setPlan] = useState(() => initialRetirementPlan(profile, positions));
  const [step, setStep] = useState(profile?.draftPlan?.step ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const baseline = summary!.fire.spendingBaseline;
  const asOf = summary!.effectiveDate;
  const history = transactions.filter(t => baseline.startDate && baseline.endDate && t.date >= baseline.startDate && t.date <= baseline.endDate);
  const average = (kind: 'income' | 'expense') => baseline.completedMonths ? history.filter(t => t.transactionType === kind).reduce((sum, t) => sum + Math.abs(t.amount), 0) / baseline.completedMonths : null;
  const income = average('income'), expenses = average('expense');
  const invested = baseline.completedMonths ? contributions.filter(c => c.contributionDate >= baseline.startDate! && c.contributionDate <= baseline.endDate!).reduce((sum, c) => sum + Number(c.amount), 0) / baseline.completedMonths : null;
  const shown = (value: number | null) => value === null ? 'Unavailable' : formatSGD(value);
  const latest = (id: string) => snapshots.filter(s => s.wealthPositionId === id && s.valueDate <= asOf).sort((a, b) => b.valueDate.localeCompare(a.valueDate))[0];

  /** Record provenance for planning overrides without modifying source records. */
  function change<K extends keyof RetirementPlan>(key: K, value: RetirementPlan[K]) {
    setPlan(current => ({ ...current, [key]: value, ...(key === 'monthlySpending' ? { spendingMonth: asOf.slice(0, 7) } : {}), provenance: { ...current.provenance, [key]: 'user-entered' } })); setConfirmed(false);
  }
  /** Validate all confirmed inputs before replacing the active plan. */
  async function save(activate = false, advance = false) {
    setError(null); setMessage('');
    if (activate) {
      const invalid = validateRetirementPlan(plan, asOf);
      if (invalid) { setError(invalid); return; }
      if (!confirmed) { setError('Confirm the completed plan before activation.'); return; }
      if (!plan.portfolioOverride && plan.assetIds.some(id => !positions.some(p => p.id === id && eligibleRetirementAsset(p)) || !latest(id))) { setError('Review selected assets and add missing dated snapshots.'); return; }
    }
    const next = advance ? Math.min(4, step + 1) : step;
    setBusy(true);
    try {
      await updateProfile({ ...legacyProfileValues(profile), ...(activate ? { activePlan: plan, draftPlan: null } : { draftPlan: { step: next, inputs: plan } }) });
      if (activate) navigate('/fire'); else { setStep(next); setMessage('Draft saved. Your active plan has not changed.'); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save. Your active plan is unchanged.'); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void save(step === 4, step < 4); }

  return <main className="page foundation-management-page fire-setup-page">
    <PageToolbar title="Set up your FIRE plan" description="Five steps. Review your records and return whenever you need." backAction={() => navigate('/fire')} />
    <nav className="retirement-steps" aria-label="Retirement setup steps">{steps.map((label, index) => <button type="button" key={label} disabled={busy} aria-current={step === index ? 'step' : undefined} onClick={() => { setStep(index); setMessage(''); }}>{index + 1}. {label}</button>)}</nav>
    {error && <p className="foundation-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <form className="white-card foundation-form retirement-setup-form" onSubmit={submit}>
      <h2>{steps[step]}</h2>
      {step === 0 && <><p>Confirm your birth month and timeline. A reused birth year starts with an assumed January until corrected.</p><div className="form-row"><label>Birth month and year<input required type="month" value={plan.birthMonth} onChange={e => change('birthMonth', e.target.value)} /></label><label>Intended retirement age<input type="number" min="18" max="119" step="1" required value={plan.birthMonth && plan.retirementMonth ? Math.floor((monthIndex(plan.retirementMonth) - monthIndex(plan.birthMonth)) / 12) : ''} onChange={e => change('retirementMonth', retirementAtAge(plan.birthMonth, Number(e.target.value)))} /></label></div><div className="form-row"><label>Retirement month<input required type="month" min={asOf.slice(0, 7)} value={plan.retirementMonth} onChange={e => change('retirementMonth', e.target.value)} /></label><label>Plan through age<input required type="number" min="50" max="120" value={plan.endAge} onChange={e => change('endAge', Number(e.target.value))} /><small>Cash flows end before this birthday month.</small></label></div></>}
      {step === 1 && <><p>Recorded averages: {baseline.startDate ?? 'No completed history'} to {baseline.endDate ?? 'today'} ({baseline.completedMonths} completed months).</p><dl className="retirement-facts"><div><dt>Recorded income</dt><dd>{shown(income)}</dd></div><div><dt>Recorded expenses</dt><dd>{shown(expenses)}</dd></div><div><dt>Recorded savings</dt><dd>{shown(income === null || expenses === null ? null : income - expenses)}</dd></div></dl><p>{baseline.completedMonths < 12 ? 'Shorter history. ' : ''}Missing records do not prove zero spending.</p><label>Retirement spending per month in today’s SGD<input type="number" required min="0" step="0.01" value={plan.monthlySpending} onChange={e => change('monthlySpending', Number(e.target.value))} /><small>User-entered planning amount in {plan.spendingMonth} SGD. Review housing, insurance, healthcare and dependants.</small></label><p>Planning overrides never create or change transactions. Emergency expense categories live in <Link to="/plan">Spending Plan</Link>.</p></>}
      {step === 2 && <><p>Review <Link to="/wealth">wealth positions and snapshots</Link>. CPF, SRS, property and emergency reserves are excluded regardless of legacy FI flags.</p><div className="retirement-asset-list">{positions.filter(p => !p.isArchived).map(p => { const snapshot = latest(p.id), eligible = eligibleRetirementAsset(p); return <label key={p.id}><input type="checkbox" disabled={!eligible || plan.portfolioOverride !== null} checked={eligible && plan.assetIds.includes(p.id)} onChange={e => change('assetIds', e.target.checked ? [...plan.assetIds, p.id] : plan.assetIds.filter(id => id !== p.id))} /><span>{p.name}<small>{eligible ? 'Unrestricted' : 'Excluded'} · {snapshot ? `${formatSGD(Number(snapshot.amount))} recorded ${snapshot.valueDate}` : 'No dated value'}{snapshot && (Date.parse(asOf) - Date.parse(snapshot.valueDate)) / 86400000 > 35 ? ' · Stale snapshot' : ''}</small></span></label>; })}</div><label className="checkbox-label"><input type="checkbox" checked={plan.portfolioOverride !== null} onChange={e => change('portfolioOverride', e.target.checked ? { amount: 0, date: asOf } : null)} />Use a dated planning-only portfolio total instead</label>{plan.portfolioOverride && <div className="form-row"><label>Spendable portfolio total<input required type="number" min="0" step="0.01" value={plan.portfolioOverride.amount} onChange={e => change('portfolioOverride', { ...plan.portfolioOverride!, amount: Number(e.target.value) })} /></label><label>Value date<input required type="date" max={asOf} value={plan.portfolioOverride.date} onChange={e => change('portfolioOverride', { ...plan.portfolioOverride!, date: e.target.value })} /></label></div>}<p>The planning total replaces linked assets. Exclude restricted resources and emergency reserves yourself. Older totals are not automatically grown to today.</p><label>Confirmed monthly investment (SGD)<input required type="number" min="0" step="0.01" value={plan.monthlyContribution} onChange={e => change('monthlyContribution', Number(e.target.value))} /><small>Fixed nominal contribution until retirement. Recorded investment average: {shown(invested)}, a suggestion only. Savings are not automatically invested.</small></label>{income !== null && expenses !== null && plan.monthlyContribution > income - expenses && <p role="status">Contribution exceeds recorded average savings. Review affordability and incomplete records.</p>}</>}
      {step === 3 && <><label>CPF LIFE plan<select value={plan.cpfPlan} onChange={e => change('cpfPlan', e.target.value as RetirementPlan['cpfPlan'])}><option value="unknown">I don’t know yet</option><option value="standard">Standard</option><option value="escalating">Escalating</option><option value="basic">Basic (not modelled)</option></select></label>{['unknown', 'basic'].includes(plan.cpfPlan) ? <p role="status">CPF income not included{plan.cpfPlan === 'basic' ? ': Basic declining payouts are not approximated as constant.' : ': no payout is assumed.'}</p> : <div className="form-row"><label>Monthly payout at commencement (SGD)<input required type="number" min="0" step="0.01" value={plan.cpfMonthlyPayout} onChange={e => change('cpfMonthlyPayout', Number(e.target.value))} /><small>No inflation is added before commencement.</small></label><label>Payout start age<input required type="number" min="65" max="70" step="1" value={plan.cpfStartAge} onChange={e => change('cpfStartAge', Number(e.target.value))} /></label></div>}<p>Standard stays steady. Escalating increases 2% on payout anniversaries. CPF principal is excluded. Optional help: <a href="https://www.cpf.gov.sg/member/tools-and-services/planners/cpf-planner-retirement-income" target="_blank" rel="noreferrer">CPF Board Retirement Payout Planner</a>.</p><h3>Other net retirement income (optional)</h3><p>Do not add CPF LIFE again here. Enter only additional net income available during retirement.</p>{plan.otherIncome.map((item, index) => <fieldset className="retirement-income" key={index}><legend>Income {index + 1}</legend>{(['label', 'monthlyAmount', 'startMonth', 'endMonth', 'annualGrowth'] as const).map(key => <label key={key}>{{ label: 'Description', monthlyAmount: 'Monthly net SGD at start', startMonth: 'Start month', endMonth: 'End month (exclusive)', annualGrowth: 'Annual growth (decimal, 0.02 = 2%)' }[key]}<input required type={key === 'label' ? 'text' : key.includes('Month') ? 'month' : 'number'} step="any" value={item[key]} onChange={e => change('otherIncome', plan.otherIncome.map((value, i) => i === index ? { ...value, [key]: ['monthlyAmount', 'annualGrowth'].includes(key) ? Number(e.target.value) : e.target.value } : value))} /></label>)}<button type="button" className="text-button" onClick={() => change('otherIncome', plan.otherIncome.filter((_, i) => i !== index))}>Remove income</button></fieldset>)}<button className="secondary-button" type="button" disabled={plan.otherIncome.length >= 20} onClick={() => change('otherIncome', [...plan.otherIncome, { label: '', monthlyAmount: 0, startMonth: plan.retirementMonth, endMonth: retirementAtAge(plan.birthMonth, plan.endAge), annualGrowth: 0 }])}>Add other income</button></>}
      {step === 4 && <><p>Editable product assumptions requiring confirmation. Existing return and inflation values are preserved for review.</p><div className="form-row">{(['beforeReturn', 'afterReturn', 'inflation'] as const).map(key => <label key={key}>{{ beforeReturn: 'Return before retirement (%)', afterReturn: 'Return after retirement (%)', inflation: 'Inflation (%)' }[key]}<input required type="number" min={key === 'inflation' ? 0 : -20} max={key === 'inflation' ? 20 : 30} step="0.1" value={Number((plan[key] * 100).toFixed(4))} onChange={e => change(key, Number(e.target.value) / 100)} /><small>{plan.provenance[key] ?? 'assumed'}</small></label>)}</div><dl className="retirement-facts"><div><dt>Timeline, user confirmed</dt><dd>{plan.retirementMonth || 'Missing'} through age {plan.endAge}</dd></div><div><dt>Spending, user entered</dt><dd>{formatSGD(plan.monthlySpending)} / month today</dd></div><div><dt>Investment, user entered</dt><dd>{formatSGD(plan.monthlyContribution)} / month</dd></div><div><dt>Portfolio source</dt><dd>{plan.portfolioOverride ? `User-entered total dated ${plan.portfolioOverride.date}` : `${plan.assetIds.length} selected recorded assets`}</dd></div><div><dt>CPF income</dt><dd>{['unknown', 'basic'].includes(plan.cpfPlan) ? 'CPF income not included' : `${formatSGD(plan.cpfMonthlyPayout)} from ${plan.cpfStartAge}, ${plan.cpfPlan}`}</dd></div></dl><p>Individual planning only. No automatic CPF release at 55, property sale, SRS tax optimisation or household modelling. Smooth returns do not capture market sequence risk or guarantee funding beyond age {plan.endAge}.</p><label className="checkbox-label"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I confirm my timeline, spending review, eligible assets, income estimates and assumptions.</label></>}
      <div className="retirement-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => void save()}>Save draft</button>{step > 0 && <button className="secondary-button" type="button" disabled={busy} onClick={() => setStep(step - 1)}>Back</button>}<button className="primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : step === 4 ? 'Confirm and activate plan' : 'Confirm step and continue'}</button></div>
    </form>
  </main>;
}
