import { useEffect, useState, type FormEvent } from 'react';
import { Calculator } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { FireCalculationResult, UpdateFireProfileInput } from '@firebuddy/shared';

import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import { formatSGD, useFireBuddy } from '../app/FireBuddyProvider';
import { PageToolbar } from '../components/PageToolbar';

const defaults: UpdateFireProfileInput = { monthlyContribution: '0', expectedReturnRate: '0.07', inflationRate: '0.02', withdrawalRate: '0.04', retirementSpendingOverride: null, targetFiDate: null, birthYear: null };

/** Configure explainable FIRE assumptions and essential spending evidence. */
export default function FireSetup() {
  const navigate = useNavigate();
  const { categories } = useFireBuddy();
  const { profile, essentialCategoryIds, updateProfile, updateEssentialCategories, runScenario, summary, demoMode } = useFinancialFoundation();
  const [draft, setDraft] = useState<UpdateFireProfileInput>(profile ? stripProfile(profile) : defaults);
  const [selected, setSelected] = useState<string[]>(essentialCategoryIds);
  const [scenarioContribution, setScenarioContribution] = useState('');
  const [scenarioSpending, setScenarioSpending] = useState('');
  const [scenario, setScenario] = useState<FireCalculationResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (profile) setDraft(stripProfile(profile)); }, [profile]);
  useEffect(() => setSelected(essentialCategoryIds), [essentialCategoryIds]);

  async function save(event: FormEvent) {
    event.preventDefault(); setError(null); setMessage(null);
    try { await updateProfile(draft); await updateEssentialCategories(selected); setMessage('FIRE assumptions and essential categories saved.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save FIRE setup.'); }
  }
  async function calculate(event: FormEvent) {
    event.preventDefault(); setError(null);
    try { setScenario(await runScenario({ monthlyContribution: scenarioContribution || undefined, retirementSpending: scenarioSpending || undefined })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to calculate scenario.'); }
  }

  return <main className="page foundation-management-page fire-setup-page"><PageToolbar title="FIRE setup" description="Set assumptions for your financial independence projection." backAction={() => navigate(-1)} metadata={demoMode ? <span className="demo-data-label">Local demo data</span> : null} />
    {error ? <p className="foundation-error" role="alert">{error}</p> : null}{message ? <p className="foundation-success" role="status">{message}</p> : null}
    <form className="management-grid" onSubmit={save}><article className="white-card foundation-form"><h3>Projection assumptions</h3><label>Monthly contribution (SGD)<input required min="0" step="0.01" type="number" value={draft.monthlyContribution} onChange={(e) => setDraft({ ...draft, monthlyContribution: e.target.value })} /></label><div className="form-row"><label>Nominal return<input required min="-20" max="30" step="0.1" type="number" value={Number(draft.expectedReturnRate) * 100} onChange={(e) => setDraft({ ...draft, expectedReturnRate: String(Number(e.target.value) / 100) })} /><small>Percent per year</small></label><label>Inflation<input required min="0" max="20" step="0.1" type="number" value={Number(draft.inflationRate) * 100} onChange={(e) => setDraft({ ...draft, inflationRate: String(Number(e.target.value) / 100) })} /><small>Percent per year</small></label></div><div className="form-row"><label>Withdrawal rate<input required min="1" max="10" step="0.1" type="number" value={Number(draft.withdrawalRate) * 100} onChange={(e) => setDraft({ ...draft, withdrawalRate: String(Number(e.target.value) / 100) })} /><small>Percent</small></label><label>Monthly retirement spending<input min="0.01" step="0.01" type="number" value={draft.retirementSpendingOverride ?? ''} onChange={(e) => setDraft({ ...draft, retirementSpendingOverride: e.target.value || null })} /><small>Optional manual override</small></label></div><div className="form-row"><label>Target FI date<input type="date" value={draft.targetFiDate ?? ''} onChange={(e) => setDraft({ ...draft, targetFiDate: e.target.value || null })} /></label><label>Birth year<input min="1900" max="2200" type="number" value={draft.birthYear ?? ''} onChange={(e) => setDraft({ ...draft, birthYear: e.target.value ? Number(e.target.value) : null })} /></label></div></article>
      <article className="white-card foundation-form"><h3>Essential spending categories</h3><p className="form-help">Only confirmed expense categories are used for emergency fund runway.</p><div className="essential-category-grid">{categories.filter((item) => item.categoryType === 'expense').map((category) => <label key={category.id}><input type="checkbox" checked={selected.includes(category.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} /><span style={{ backgroundColor: category.color }} />{category.name}</label>)}</div><button className="primary-button" type="submit">Save FIRE setup</button></article></form>
    <section className="management-grid"><article className="white-card projection-summary"><h3>Saved baseline</h3><strong>{summary?.fire.status === 'projected' ? `Estimated FI year ${summary.fire.estimatedFiYear}` : summary?.fire.status.replaceAll('_', ' ') ?? 'Setup incomplete'}</strong>{summary?.fire.fiTarget ? <><p>{formatSGD(Number(summary.fire.fiTarget), 0)} FI target</p><p>{(Number(summary.fire.progressRate ?? 0) * 100).toFixed(1)}% funded from included wealth positions.</p><p>Required monthly investment for the saved target date: {formatSGD(Number(summary.fire.requiredMonthlyInvestment ?? 0), 0)}.</p></> : <p>Add a spending baseline, wealth values, and assumptions to calculate a projection.</p>}</article>
      <form className="white-card foundation-form" onSubmit={calculate}><h3><Calculator size={19} /> Temporary scenario</h3><p className="form-help">Change contribution or monthly retirement spending. This does not save records.</p><div className="form-row"><label>Monthly contribution<input min="0" step="0.01" type="number" value={scenarioContribution} onChange={(e) => setScenarioContribution(e.target.value)} /></label><label>Retirement spending<input min="0.01" step="0.01" type="number" value={scenarioSpending} onChange={(e) => setScenarioSpending(e.target.value)} /></label></div><button className="secondary-button" type="submit">Calculate scenario</button>{scenario ? <p className="scenario-result" role="status">{scenario.status === 'projected' ? `Estimated FI year: ${scenario.estimatedFiYear}` : `Result: ${scenario.status.replaceAll('_', ' ')}`}</p> : null}</form></section>
  </main>;
}

function stripProfile(profile: NonNullable<ReturnType<typeof useFinancialFoundation>['profile']>): UpdateFireProfileInput {
  return { monthlyContribution: profile.monthlyContribution, expectedReturnRate: profile.expectedReturnRate, inflationRate: profile.inflationRate, withdrawalRate: profile.withdrawalRate, retirementSpendingOverride: profile.retirementSpendingOverride, targetFiDate: profile.targetFiDate, birthYear: profile.birthYear };
}
