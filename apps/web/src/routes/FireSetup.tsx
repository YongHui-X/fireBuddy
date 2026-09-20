import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Check } from 'lucide-react';
import { monthIndex, validateRetirementPlan, type RetirementPlan } from '@firebuddy/shared';
import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import { formatSGD, useFireBuddy } from '../app/FireBuddyProvider';
import { eligibleRetirementAsset, initialRetirementPlan, legacyProfileValues, retirementAssetNote, retirementAtAge } from '../app/retirementSetup';
import { PageToolbar } from '../components/PageToolbar';
import { mq } from '../app/breakpoints';
import { useMediaQuery } from '../app/useMediaQuery';

const steps = [{ title: 'Your timeline' }, { title: 'Spending and savings' }, { title: 'Retirement assets' }, { title: 'Retirement income' }, { title: 'Assumptions and review' }];
const monthLabel = (month: string) => /^\d{4}-\d{2}$/.test(month) ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }) : '';
const pct = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;
/** Whole years and months between two calendar months, for plain-language feedback. */
const span = (from: string, to: string) => { const months = monthIndex(to) - monthIndex(from); return months <= 0 ? 'now' : `${Math.floor(months / 12)} years${months % 12 ? ` ${months % 12} months` : ''}`; };

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
  // The URL remembers the current step so a refresh, remount or tab switch does not jump back to the saved draft step.
  const [params, setParams] = useSearchParams();
  const isWideSetup = useMediaQuery(mq.setupWide);
  const prefersReducedMotion = useMediaQuery(mq.reducedMotion);
  const stepsRef = useRef<HTMLElement | null>(null);
  const [step, setStep] = useState(() => { const fromUrl = Number(params.get('step')); return fromUrl >= 1 && fromUrl <= 5 ? fromUrl - 1 : Math.min(4, Math.max(0, profile?.draftPlan?.step ?? 0)); });
  useEffect(() => { if (params.get('step') !== String(step + 1)) setParams({ step: String(step + 1) }, { replace: true }); }, [params, setParams, step]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const baseline = summary!.fire.spendingBaseline;
  const asOf = summary!.effectiveDate;
  const today = asOf.slice(0, 7);
  const history = transactions.filter(t => baseline.startDate && baseline.endDate && t.date >= baseline.startDate && t.date <= baseline.endDate);
  const average = (kind: 'income' | 'expense') => baseline.completedMonths ? history.filter(t => t.transactionType === kind).reduce((sum, t) => sum + Math.abs(t.amount), 0) / baseline.completedMonths : null;
  const recordedIncome = average('income'), recordedExpenses = average('expense');
  // Planner-only overrides of the recorded averages. They never touch transactions and are not saved with the plan.
  const [incomeOverride, setIncomeOverride] = useState<number | null>(null);
  const [expensesOverride, setExpensesOverride] = useState<number | null>(null);
  const [savingsOverride, setSavingsOverride] = useState<number | null>(null);
  const whole = (value: number | null) => value === null ? null : Math.ceil(value);
  const income = incomeOverride ?? whole(recordedIncome), expenses = expensesOverride ?? whole(recordedExpenses);
  const savings = savingsOverride ?? (income === null || expenses === null ? null : income - expenses);
  const overridden = incomeOverride !== null || expensesOverride !== null || savingsOverride !== null;
  const parse = (value: string) => value === '' ? null : Math.ceil(Number(value));
  const grey = (value: number | null) => value === null ? 'No recorded history' : `Recorded: ${Math.ceil(value)}`;
  const invested = baseline.completedMonths ? contributions.filter(c => c.contributionDate >= baseline.startDate! && c.contributionDate <= baseline.endDate!).reduce((sum, c) => sum + Number(c.amount), 0) / baseline.completedMonths : null;
  const shown = (value: number | null) => value === null ? 'Unavailable' : formatSGD(value, 0);
  const latest = (id: string) => snapshots.filter(s => s.wealthPositionId === id && s.valueDate <= asOf).sort((a, b) => b.valueDate.localeCompare(a.valueDate))[0];
  const validBirth = /^\d{4}-\d{2}$/.test(plan.birthMonth) && monthIndex(plan.birthMonth) < monthIndex(today);
  const ageNow = validBirth ? Math.floor((monthIndex(today) - monthIndex(plan.birthMonth)) / 12) : null;
  const retirementAge = validBirth && plan.retirementMonth ? Math.floor((monthIndex(plan.retirementMonth) - monthIndex(plan.birthMonth)) / 12) : null;
  // Planner-only per-asset amounts. Typing one turns the plan into a dated typed total, so the engine uses your numbers.
  const [assetAmounts, setAssetAmounts] = useState<Record<string, number>>({});
  const assetValue = (id: string) => assetAmounts[id] ?? Math.ceil(Number(latest(id)?.amount ?? 0));
  const selectedAssets = plan.portfolioOverride ? plan.portfolioOverride.amount : plan.assetIds.reduce((sum, id) => sum + assetValue(id), 0);
  const cpfIncluded = ['standard', 'escalating'].includes(plan.cpfPlan);
  const done = (index: number) => {
    if (index === 0) return validBirth && !!plan.retirementMonth && monthIndex(plan.retirementMonth) >= monthIndex(today);
    if (index === 1) return plan.monthlySpending > 0;
    if (index === 2) return plan.portfolioOverride !== null || plan.assetIds.length > 0;
    if (index === 3) return plan.cpfPlan !== 'unknown' || plan.otherIncome.length > 0;
    return false;
  };

  /** Record provenance for planning overrides without modifying source records. */
  function change<K extends keyof RetirementPlan>(key: K, value: RetirementPlan[K]) {
    setPlan(current => ({ ...current, [key]: value, ...(key === 'monthlySpending' ? { spendingMonth: today } : {}), provenance: { ...current.provenance, [key]: 'user-entered' } })); setConfirmed(false);
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
    const edited = !plan.portfolioOverride && Object.keys(assetAmounts).length > 0;
    const toSave: RetirementPlan = edited ? { ...plan, portfolioOverride: { amount: selectedAssets, date: asOf }, provenance: { ...plan.provenance, portfolioOverride: 'user-entered' } } : plan;
    setBusy(true);
    try {
      await updateProfile({ ...legacyProfileValues(profile), ...(activate ? { activePlan: toSave, draftPlan: null } : { draftPlan: { step: next, inputs: toSave } }) });
      if (edited) { setPlan(toSave); setAssetAmounts({}); }
      if (activate) navigate('/fire'); else { setStep(next); setMessage('Draft saved. Your active plan has not changed.'); window.scrollTo({ top: 0 }); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save. Your active plan is unchanged.'); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void save(step === 4, step < 4); }

  // The step strip scrolls sideways on a phone, so the active step has to be brought into view
  // or the person loses their place in the wizard.
  useEffect(() => {
    const active = stepsRef.current?.querySelector<HTMLElement>('[aria-current="step"]');
    active?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [step, prefersReducedMotion]);

  return <main className="page foundation-management-page fire-setup-page">
    <PageToolbar title="Set up your FIRE plan" description="Five short steps. Your answers are saved as a draft until you activate the plan." backAction={() => navigate('/fire')} />
    <div className="retirement-setup-layout">
      <nav className="retirement-steps" aria-label="Retirement setup steps" ref={stepsRef}>{steps.map((item, index) => <button type="button" key={item.title} disabled={busy} aria-current={step === index ? 'step' : undefined} className={done(index) ? 'retirement-step-done' : undefined} onClick={() => { setStep(index); setMessage(''); setError(null); }}><span className="retirement-step-index" aria-hidden="true">{done(index) && step !== index ? <Check size={14} /> : index + 1}</span><span>{item.title}</span></button>)}</nav>

      <form className="white-card foundation-form retirement-setup-form" onSubmit={submit}>
        <div className="retirement-setup-heading"><span>Step {step + 1} of 5</span><h2>{steps[step].title}</h2></div>
        {error && <p className="foundation-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}

        {step === 0 && <>
                    <div className="form-row">
            <label>Birth month and year<input required type="month" max={today} value={plan.birthMonth} onChange={e => { change('birthMonth', e.target.value); if (retirementAge !== null && e.target.value) change('retirementMonth', retirementAtAge(e.target.value, retirementAge)); }} /></label>
            <label>Intended retirement age<input type="number" min="18" max="119" step="1" required value={retirementAge ?? ''} disabled={!validBirth} onChange={e => change('retirementMonth', retirementAtAge(plan.birthMonth, Number(e.target.value)))} /></label>
            <label>Plan through age<input required type="number" min="50" max="120" value={plan.endAge} onChange={e => change('endAge', Number(e.target.value))} /></label>
          </div>
        </>}

        {step === 1 && <>
          <p>Your recorded monthly averages are filled in below. Edit them if they do not reflect your situation; changes stay in the planner and never alter your transactions.</p>
          <div className="form-row">
            <label>Your monthly income (SGD)<input type="number" min="0" step="1" value={incomeOverride ?? ''} placeholder={grey(recordedIncome)} onChange={e => setIncomeOverride(parse(e.target.value))} /></label>
            <label>Your monthly expenses (SGD)<input type="number" min="0" step="1" value={expensesOverride ?? ''} placeholder={grey(recordedExpenses)} onChange={e => setExpensesOverride(parse(e.target.value))} /></label>
            <label>Your monthly savings (SGD)<input type="number" step="1" value={savingsOverride ?? ''} placeholder={income === null || expenses === null ? 'Enter income and expenses' : `Calculated: ${income - expenses}`} onChange={e => setSavingsOverride(parse(e.target.value))} /></label>
          </div>
          {overridden && <div className="retirement-actions"><button type="button" className="text-button" onClick={() => { setIncomeOverride(null); setExpensesOverride(null); setSavingsOverride(null); }}>Reset to recorded averages</button></div>}
          <label>How much will you spend during retirement? (per month, today’s SGD)<input type="number" required min="0" step="1" value={plan.monthlySpending} onChange={e => change('monthlySpending', Math.ceil(Number(e.target.value)))} /></label>
          {expenses !== null && <div className="retirement-actions"><button type="button" className="secondary-button" onClick={() => change('monthlySpending', Math.ceil(expenses))}>Use recorded {formatSGD(expenses, 0)}</button>{expenses > 0 && <button type="button" className="secondary-button" onClick={() => change('monthlySpending', Math.ceil(expenses * 0.8))}>Use 80% of recorded</button>}</div>}
        </>}

        {step === 2 && <>
          <p>Tick the assets you plan to live on in retirement. Their latest recorded values add up to your starting portfolio. Update values in <Link to="/wealth">Wealth</Link> if one looks out of date.</p>
          <div className="retirement-asset-list">{positions.filter(p => !p.isArchived).map(p => { const snapshot = latest(p.id), eligible = eligibleRetirementAsset(p), selected = eligible && plan.assetIds.includes(p.id); return <div key={p.id} className={selected ? 'retirement-asset-selected' : undefined}><label><input type="checkbox" disabled={!eligible || plan.portfolioOverride !== null} checked={selected} onChange={e => change('assetIds', e.target.checked ? [...plan.assetIds, p.id] : plan.assetIds.filter(id => id !== p.id))} /><span>{p.name}<em>{retirementAssetNote(p)} · {snapshot ? `${formatSGD(Number(snapshot.amount), 0)} recorded ${snapshot.valueDate}` : 'No dated value'}</em></span></label><input type="number" min="0" step="1" aria-label={`${p.name} value for this plan (SGD)`} disabled={!eligible || plan.portfolioOverride !== null} value={assetAmounts[p.id] ?? ''} placeholder={snapshot ? `Recorded: ${Math.ceil(Number(snapshot.amount))}` : 'Enter value'} onChange={e => { const raw = e.target.value; setAssetAmounts(current => { const next = { ...current }; if (raw === '') delete next[p.id]; else next[p.id] = Math.ceil(Number(raw)); return next; }); setConfirmed(false); }} /></div>; })}</div>
          {Object.keys(assetAmounts).length > 0 && <p role="status">You changed {Object.keys(assetAmounts).length} value{Object.keys(assetAmounts).length === 1 ? '' : 's'}. Your numbers will be saved as a typed total dated today; your Wealth records stay unchanged. <button type="button" className="text-button" onClick={() => setAssetAmounts({})}>Use recorded values</button></p>}
          <label className="checkbox-label"><input type="checkbox" checked={plan.portfolioOverride !== null} onChange={e => change('portfolioOverride', e.target.checked ? { amount: 0, date: asOf } : null)} />Skip the list and type my total myself</label>
          {plan.portfolioOverride && <div className="form-row"><label>My total investments today (SGD)<input required type="number" min="0" step="1" value={plan.portfolioOverride.amount} onChange={e => change('portfolioOverride', { ...plan.portfolioOverride!, amount: Math.ceil(Number(e.target.value)) })} /></label><label>As of which date?<input required type="date" max={asOf} value={plan.portfolioOverride.date} onChange={e => change('portfolioOverride', { ...plan.portfolioOverride!, date: e.target.value })} /></label></div>}
          <div className="retirement-insight" role="status"><strong>Starting portfolio: {formatSGD(selectedAssets, 0)}</strong><span>{plan.portfolioOverride ? `The total you typed, as of ${plan.portfolioOverride.date}. This is used instead of the list above.` : plan.assetIds.length ? `The ${plan.assetIds.length} asset${plan.assetIds.length === 1 ? '' : 's'} you ticked, added up. The plan grows this amount from today.` : 'Nothing ticked yet, so the plan starts from zero.'}</span></div>
          <label>Confirmed monthly investment (SGD)<input required type="number" min="0" step="1" value={plan.monthlyContribution} onChange={e => change('monthlyContribution', Math.ceil(Number(e.target.value)))} /></label>
          {savings !== null && plan.monthlyContribution > savings && <p role="status">Contribution exceeds your monthly savings of {formatSGD(savings, 0)}. Review affordability and incomplete records.</p>}
        </>}

        {step === 3 && <>
          <p>Retirement income reduces the capital your portfolio must supply. Enter estimates in the dollars of the year they start; nothing here is inflated before commencement.</p>
          <div className="form-row"><label>CPF LIFE plan<select value={plan.cpfPlan} onChange={e => change('cpfPlan', e.target.value as RetirementPlan['cpfPlan'])}><option value="unknown">I don’t know yet</option><option value="standard">Standard</option><option value="escalating">Escalating</option><option value="basic">Basic (not modelled)</option></select></label>
            {cpfIncluded ? <><label>Payout per month (SGD)<input required type="number" min="0" step="1" value={plan.cpfMonthlyPayout} onChange={e => change('cpfMonthlyPayout', Math.ceil(Number(e.target.value)))} /></label><label>Payout start age<input required type="number" min="65" max="70" step="1" value={plan.cpfStartAge} onChange={e => change('cpfStartAge', Number(e.target.value))} /></label></> : null}
          </div>
          {!cpfIncluded && <p role="status">CPF income not included{plan.cpfPlan === 'basic' ? ': Basic declining payouts are not approximated as constant.' : ': no payout is assumed. You can add it later.'}</p>}
          <h3>Other net retirement income (optional)</h3>
          {plan.otherIncome.map((item, index) => <fieldset className="retirement-income" key={index}><legend>Income {index + 1}</legend><div className="form-row">{(['label', 'monthlyAmount', 'startMonth', 'endMonth', 'annualGrowth'] as const).map(key => <label key={key}>{{ label: 'Description', monthlyAmount: 'Monthly net SGD at start', startMonth: 'Start month', endMonth: 'End month (exclusive)', annualGrowth: 'Annual growth (%)' }[key]}<input required type={key === 'label' ? 'text' : key.includes('Month') ? 'month' : 'number'} step={key === 'annualGrowth' ? '0.1' : 'any'} value={key === 'annualGrowth' ? Number((item.annualGrowth * 100).toFixed(4)) : item[key]} onChange={e => change('otherIncome', plan.otherIncome.map((value, i) => i === index ? { ...value, [key]: key === 'monthlyAmount' ? Math.ceil(Number(e.target.value)) : key === 'annualGrowth' ? Number(e.target.value) / 100 : e.target.value } : value))} /></label>)}</div><button type="button" className="text-button" onClick={() => change('otherIncome', plan.otherIncome.filter((_, i) => i !== index))}>Remove income</button></fieldset>)}
          <div className="retirement-actions"><button className="secondary-button" type="button" disabled={plan.otherIncome.length >= 20} onClick={() => change('otherIncome', [...plan.otherIncome, { label: '', monthlyAmount: 0, startMonth: plan.retirementMonth, endMonth: retirementAtAge(plan.birthMonth, plan.endAge), annualGrowth: 0 }])}>Add other income</button></div>
        </>}

        {step === 4 && <>
          <p>These are editable product assumptions, not forecasts. Confirm them, then activate the plan.</p>
          <div className="form-row">{(['beforeReturn', 'afterReturn', 'inflation'] as const).map(key => <label key={key}>{{ beforeReturn: 'Return before retirement (%)', afterReturn: 'Return after retirement (%)', inflation: 'Inflation (%)' }[key]}<input required type="number" min={key === 'inflation' ? 0 : -20} max={key === 'inflation' ? 20 : 30} step="0.1" value={Number((plan[key] * 100).toFixed(4))} onChange={e => change(key, Number(e.target.value) / 100)} /></label>)}</div>
          <dl className="retirement-facts retirement-facts-compact">
            <div><dt>Timeline</dt><dd>Retire {monthLabel(plan.retirementMonth) || 'Missing'}{retirementAge !== null ? ` at ${retirementAge}` : ''}, plan through {plan.endAge}</dd></div>
            <div><dt>Spending</dt><dd>{formatSGD(plan.monthlySpending, 0)} / month today</dd></div>
            <div><dt>Investment</dt><dd>{formatSGD(plan.monthlyContribution, 0)} / month</dd></div>
            <div><dt>Portfolio</dt><dd>{formatSGD(selectedAssets, 0)}{plan.portfolioOverride ? `, dated ${plan.portfolioOverride.date}` : ` from ${plan.assetIds.length} assets`}</dd></div>
            <div><dt>CPF LIFE</dt><dd>{cpfIncluded ? `${formatSGD(plan.cpfMonthlyPayout, 0)} from ${plan.cpfStartAge}, ${plan.cpfPlan}` : 'Not included'}</dd></div>
            <div><dt>Other income</dt><dd>{plan.otherIncome.length ? `${plan.otherIncome.length} source${plan.otherIncome.length === 1 ? '' : 's'}` : 'None'}</dd></div>
          </dl>
          <label className="checkbox-label"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I confirm my timeline, spending review, eligible assets, income estimates and assumptions.</label>
        </>}

        <div className="retirement-actions retirement-setup-actions">{step > 0 && <button className="secondary-button" type="button" disabled={busy} onClick={() => { setStep(step - 1); setMessage(''); setError(null); }}>Back</button>}<button className="secondary-button" type="button" disabled={busy} onClick={() => void save()}>Save draft</button><button className="primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : step === 4 ? 'Confirm and activate plan' : 'Confirm step and continue'}</button></div>
      </form>

      {isWideSetup ? (
        <aside className="white-card retirement-summary" aria-label="Your plan so far">
          <h3>Your plan so far</h3>
          <dl>
            <div><dt>Age now</dt><dd>{ageNow ?? '—'}</dd></div>
            <div><dt>Retire</dt><dd>{plan.retirementMonth && validBirth ? `${monthLabel(plan.retirementMonth)} · ${retirementAge}` : '—'}</dd></div>
            <div><dt>Plan through</dt><dd>Age {plan.endAge}</dd></div>
            <div><dt>Spending</dt><dd>{plan.monthlySpending > 0 ? `${formatSGD(plan.monthlySpending, 0)} / month` : '—'}</dd></div>
            <div><dt>Investing</dt><dd>{formatSGD(plan.monthlyContribution, 0)} / month</dd></div>
            <div><dt>Portfolio</dt><dd>{done(2) ? formatSGD(selectedAssets, 0) : '—'}</dd></div>
            <div><dt>CPF LIFE</dt><dd>{cpfIncluded ? `${formatSGD(plan.cpfMonthlyPayout, 0)} from ${plan.cpfStartAge}` : 'Not included'}</dd></div>
            <div><dt>Returns</dt><dd>{pct(plan.beforeReturn)} → {pct(plan.afterReturn)}, {pct(plan.inflation)} inflation</dd></div>
          </dl>
          <p>{profile?.activePlan ? 'Your active plan keeps running until you activate this one.' : 'Nothing is projected until you activate the plan in step 5.'}</p>
        </aside>
      ) : (
        /* Below the three-column layout the summary would be a long block between the form and the
           actions, so it collapses instead and the person opens it when they want it. */
        <details className="white-card retirement-summary setup-summary-disclosure">
          <summary>Your plan so far</summary>
          <dl>
            <div><dt>Age now</dt><dd>{ageNow ?? '—'}</dd></div>
            <div><dt>Retire</dt><dd>{plan.retirementMonth && validBirth ? `${monthLabel(plan.retirementMonth)} · ${retirementAge}` : '—'}</dd></div>
            <div><dt>Plan through</dt><dd>Age {plan.endAge}</dd></div>
            <div><dt>Spending</dt><dd>{plan.monthlySpending > 0 ? `${formatSGD(plan.monthlySpending, 0)} / month` : '—'}</dd></div>
            <div><dt>Investing</dt><dd>{formatSGD(plan.monthlyContribution, 0)} / month</dd></div>
            <div><dt>Portfolio</dt><dd>{done(2) ? formatSGD(selectedAssets, 0) : '—'}</dd></div>
            <div><dt>CPF LIFE</dt><dd>{cpfIncluded ? `${formatSGD(plan.cpfMonthlyPayout, 0)} from ${plan.cpfStartAge}` : 'Not included'}</dd></div>
            <div><dt>Returns</dt><dd>{pct(plan.beforeReturn)} → {pct(plan.afterReturn)}, {pct(plan.inflation)} inflation</dd></div>
          </dl>
          <p>{profile?.activePlan ? 'Your active plan keeps running until you activate this one.' : 'Nothing is projected until you activate the plan in step 5.'}</p>
        </details>
      )}
    </div>
  </main>;
}
