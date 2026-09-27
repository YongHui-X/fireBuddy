import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Archive, Landmark, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { calculateDebtPayoff, type CreateWealthPositionInput, type UpdateWealthPositionInput, type WealthPositionType, type WealthPosition } from '@firebuddy/shared';

import { useFinancialFoundation } from '../app/financialFoundationContext';
import { formatSGD } from '../app/fireBuddyModel';
import { PageToolbar } from '../components/PageToolbar';
import { BottomSheet } from '../components/BottomSheet';

const today = () => new Date().toLocaleDateString('en-CA');

const typeLabels: Record<WealthPositionType, string> = {
  cash: 'Cash', investment: 'Investment', property: 'Property', cpf: 'CPF', mortgage: 'Mortgage', loan: 'Loan', credit_card: 'Credit card', other: 'Other',
};
const assetTypes: WealthPositionType[] = ['cash', 'investment', 'property', 'cpf', 'other'];
const liabilityTypes: WealthPositionType[] = ['mortgage', 'loan', 'credit_card', 'other'];

type AddTab = 'asset' | 'debt' | 'contribution';
const addTabs: { id: AddTab; label: string }[] = [{ id: 'asset', label: 'Asset' }, { id: 'debt', label: 'Debt' }, { id: 'contribution', label: 'Contribution' }];

/** Turn a YYYY-MM key into a short readable month, e.g. "Mar 2031". */
const monthLabel = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
/** Percent text box value for a stored fraction such as '0.0650'. */
const percentText = (rate: string | null) => (rate === null ? '' : String(Number((Number(rate) * 100).toFixed(2))));
/** Stored fraction string for a typed percent, or null when blank. */
const fractionFromPercent = (percent: string) => (percent.trim() === '' ? null : (Number(percent) / 100).toFixed(4));
const moneyOrNull = (value: string) => (value.trim() === '' ? null : Number(value).toFixed(2));
/** Money text box value for a stored amount string, without trailing ".00" noise. */
const moneyText = (value: string | null | undefined) => (value == null ? '' : String(Number(value)));

/** The classification columns implied by a type and the locked checkbox. CPF is always locked. */
function classify(positionType: WealthPositionType, locked: boolean): Pick<CreateWealthPositionInput, 'liquidityClass' | 'restrictionType'> {
  if (positionType === 'cpf') return { liquidityClass: 'restricted', restrictionType: 'cpf' };
  if (locked) return { liquidityClass: 'restricted', restrictionType: 'other_restricted' };
  return { liquidityClass: positionType === 'cash' || positionType === 'credit_card' ? 'liquid' : 'less_liquid', restrictionType: 'none' };
}

const isLocked = (position: WealthPosition) => position.positionType === 'cpf' || position.restrictionType !== 'none' || position.liquidityClass === 'restricted';

/** Plain-language tags for a row, instead of the raw liquidity class. */
function positionMeta(position: WealthPosition) {
  const tags = [typeLabels[position.positionType]];
  if (position.positionKind === 'liability') {
    if (position.interestRate !== null) tags.push(`${percentText(position.interestRate)}% a year`);
    if (position.monthlyPayment !== null) tags.push(`${formatSGD(Number(position.monthlyPayment), 0)}/month`);
    return tags.join(' · ');
  }
  if (isLocked(position)) tags.push(position.positionType === 'cpf' ? 'Locked in CPF' : 'Locked until retirement');
  if (position.includeInFi) tags.push('Counts toward FI');
  if (position.isEmergencyFund) tags.push('Emergency fund');
  return tags.join(' · ');
}

/** One-line payoff outlook for a liability, derived from its latest balance and saved terms. */
function describePayoff(position: WealthPosition, balance: number | null): { text: string; warning: boolean } {
  if (balance === null) return { text: 'Add a dated balance to see payoff', warning: false };
  if (position.interestRate === null || position.monthlyPayment === null) return { text: 'Add rate and payment to see payoff', warning: false };
  const payoff = calculateDebtPayoff(balance, Number(position.interestRate), Number(position.monthlyPayment), today());
  if (payoff.status === 'paid_off') return { text: 'Paid off', warning: false };
  if (payoff.status === 'payment_below_interest') return { text: 'Payment does not cover monthly interest', warning: true };
  if (payoff.status === 'missing_terms') return { text: 'Add rate and payment to see payoff', warning: false };
  return { text: `Paid off by ${monthLabel(payoff.payoffMonth!)} · ${formatSGD(Number(payoff.totalInterest), 0)} interest left`, warning: false };
}

const emptyAssetDraft = () => ({ name: '', positionType: 'cash' as WealthPositionType, amount: '', includeInFi: true, isEmergencyFund: false, locked: false });
const emptyDebtDraft = () => ({ name: '', positionType: 'loan' as WealthPositionType, amount: '', interestRate: '', monthlyPayment: '', nextPaymentDate: '' });
const emptyContributionDraft = () => ({ wealthPositionId: '', amount: '', contributionDate: today(), note: '' });

/** Everything about one position that can be edited, plus a fresh dated value. */
interface EditDraft {
  name: string; positionType: WealthPositionType; amount: string; valueDate: string;
  /** Set once the person touches the value or its date, so renaming alone never writes a new dated value. */
  valueTouched: boolean;
  includeInFi: boolean; isEmergencyFund: boolean; locked: boolean;
  interestRate: string; monthlyPayment: string; nextPaymentDate: string;
}
function editDraftFor(position: WealthPosition, latestAmount: string | null): EditDraft {
  return {
    name: position.name, positionType: position.positionType, amount: moneyText(latestAmount), valueDate: today(), valueTouched: false,
    includeInFi: position.includeInFi, isEmergencyFund: position.isEmergencyFund, locked: position.positionType !== 'cpf' && isLocked(position),
    interestRate: percentText(position.interestRate), monthlyPayment: moneyText(position.monthlyPayment), nextPaymentDate: position.nextPaymentDate ?? '',
  };
}

/** A checkbox row with a one-line explanation under its label. */
const check = (label: string, help: string, checked: boolean, onChange: (checked: boolean) => void) =>
  <label><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}<small>{help}</small></span></label>;

/**
 * Balance sheet positions, separate from payment accounts and transactions. Every value here is a
 * dated snapshot, and FIRE Planner reads the latest one for each asset ticked in setup, so editing a
 * value on this page or in setup step 2 keeps both in step.
 */
export default function Wealth() {
  const navigate = useNavigate();
  const { positions, snapshots, contributions, addPosition, editPosition, removePosition, addSnapshot, removeSnapshot, addContribution, removeContribution, demoMode, loadSnapshotHistory, error: loadError } = useFinancialFoundation();
  useEffect(() => { loadSnapshotHistory(); }, [loadSnapshotHistory]);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>('asset');
  const [assetDraft, setAssetDraft] = useState(emptyAssetDraft);
  const [debtDraft, setDebtDraft] = useState(emptyDebtDraft);
  const [contributionDraft, setContributionDraft] = useState(emptyContributionDraft);
  const [editing, setEditing] = useState<WealthPosition | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const latest = useMemo(() => {
    const map = new Map<string, typeof snapshots[number]>();
    [...snapshots].sort((a, b) => b.valueDate.localeCompare(a.valueDate)).forEach((item) => { if (!map.has(item.wealthPositionId)) map.set(item.wealthPositionId, item); });
    positions.forEach((item) => { if (item.latestSnapshot && !map.has(item.id)) map.set(item.id, item.latestSnapshot); });
    return map;
  }, [positions, snapshots]);
  const active = positions.filter((item) => !item.isArchived);
  const assets = active.filter((item) => item.positionKind === 'asset');
  const liabilities = active.filter((item) => item.positionKind === 'liability');
  const subtotal = (items: WealthPosition[]) => items.reduce((sum, item) => sum + Number(latest.get(item.id)?.amount ?? 0), 0);
  const assetTotal = subtotal(assets), liabilityTotal = subtotal(liabilities);
  const missingValues = active.filter((item) => !latest.has(item.id)).length;
  const contributionPositions = assets.filter((item) => item.includeInFi);

  function openAdd(tab: AddTab) { setError(null); setAddTab(tab); setAddOpen(true); }
  function openEdit(position: WealthPosition) { setError(null); setEditDraft(editDraftFor(position, latest.get(position.id)?.amount ?? null)); setEditing(position); }
  function closeEdit() { setEditing(null); setEditDraft(null); }

  /** Run one save, reporting failures inline and closing the sheet only on success. */
  async function attempt(work: () => Promise<void>, onDone: () => void, fallback: string) {
    setError(null); setBusy(true);
    try { await work(); onDone(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : fallback); }
    finally { setBusy(false); }
  }

  function submitAsset(event: FormEvent) {
    event.preventDefault();
    const input: CreateWealthPositionInput = {
      name: assetDraft.name, positionKind: 'asset', positionType: assetDraft.positionType, ...classify(assetDraft.positionType, assetDraft.locked),
      includeInFi: assetDraft.includeInFi, isEmergencyFund: assetDraft.positionType === 'cash' && !assetDraft.locked ? assetDraft.isEmergencyFund : false, currency: 'SGD',
    };
    void attempt(() => addPosition(input, { valueDate: today(), amount: Number(assetDraft.amount).toFixed(2) }), () => { setAssetDraft(emptyAssetDraft()); setAddOpen(false); }, 'Unable to add asset.');
  }

  function submitDebt(event: FormEvent) {
    event.preventDefault();
    const input: CreateWealthPositionInput = {
      name: debtDraft.name, positionKind: 'liability', positionType: debtDraft.positionType, ...classify(debtDraft.positionType, false),
      includeInFi: false, isEmergencyFund: false, currency: 'SGD',
      interestRate: fractionFromPercent(debtDraft.interestRate), monthlyPayment: moneyOrNull(debtDraft.monthlyPayment), nextPaymentDate: debtDraft.nextPaymentDate || null,
      // The first recorded balance doubles as the original principal so repayment progress can be shown.
      originalPrincipal: Number(debtDraft.amount).toFixed(2),
    };
    void attempt(() => addPosition(input, { valueDate: today(), amount: Number(debtDraft.amount).toFixed(2) }), () => { setDebtDraft(emptyDebtDraft()); setAddOpen(false); }, 'Unable to add debt.');
  }

  function submitContribution(event: FormEvent) {
    event.preventDefault();
    void attempt(() => addContribution({ ...contributionDraft, amount: Number(contributionDraft.amount).toFixed(2), note: contributionDraft.note || null }), () => { setContributionDraft(emptyContributionDraft()); setAddOpen(false); }, 'Unable to add contribution.');
  }

  /** Save only what changed: position details through the position API, a new value as a dated snapshot. */
  function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editDraft) return;
    const position = editing, draft = editDraft;
    const isLiability = position.positionKind === 'liability';
    const full: UpdateWealthPositionInput = isLiability ? {
      name: draft.name, positionType: draft.positionType, ...classify(draft.positionType, false),
      interestRate: fractionFromPercent(draft.interestRate), monthlyPayment: moneyOrNull(draft.monthlyPayment), nextPaymentDate: draft.nextPaymentDate || null,
    } : {
      name: draft.name, positionType: draft.positionType, ...classify(draft.positionType, draft.locked),
      includeInFi: draft.includeInFi, isEmergencyFund: draft.positionType === 'cash' && !draft.locked ? draft.isEmergencyFund : false,
    };
    const changes = Object.fromEntries(Object.entries(full).filter(([key, value]) => position[key as keyof WealthPosition] !== value)) as UpdateWealthPositionInput;
    const current = latest.get(position.id);
    const amount = draft.amount.trim() === '' ? null : Number(draft.amount).toFixed(2);
    const valueChanged = draft.valueTouched && amount !== null && (!current || current.amount !== amount || current.valueDate !== draft.valueDate);
    void attempt(async () => {
      if (Object.keys(changes).length) await editPosition(position.id, changes);
      if (valueChanged) await addSnapshot(position.id, { valueDate: draft.valueDate, amount: amount! });
    }, closeEdit, 'Unable to save changes.');
  }

  function archive(position: WealthPosition) {
    void attempt(() => removePosition(position.id), closeEdit, 'Unable to archive position.');
  }

  const assetForm = (
    <form className="foundation-form" onSubmit={submitAsset} aria-label="Add asset">
      <label>Name<input required maxLength={80} value={assetDraft.name} onChange={(event) => setAssetDraft({ ...assetDraft, name: event.target.value })} /></label>
      <div className="form-row">
        <label>Type<select value={assetDraft.positionType} onChange={(event) => setAssetDraft({ ...assetDraft, positionType: event.target.value as WealthPositionType, isEmergencyFund: false })}>{assetTypes.map((item) => <option key={item} value={item}>{typeLabels[item]}</option>)}</select></label>
        <label>Current value (SGD)<input required min="0" step="0.01" type="number" value={assetDraft.amount} onChange={(event) => setAssetDraft({ ...assetDraft, amount: event.target.value })} /></label>
      </div>
      <div className="check-stack">
        {check('Counts toward FI', 'Investable money you could spend in retirement. Pre-ticks this asset in FIRE setup.', assetDraft.includeInFi, (checked) => setAssetDraft({ ...assetDraft, includeInFi: checked }))}
        {assetDraft.positionType !== 'cpf' ? check('Locked until retirement', 'SRS and similar schemes you cannot draw on early. Shown as Restricted in FIRE setup so you can decide whether to count it.', assetDraft.locked, (checked) => setAssetDraft({ ...assetDraft, locked: checked, isEmergencyFund: false })) : null}
        {assetDraft.positionType === 'cash' && !assetDraft.locked ? check('Emergency fund', 'Counted in your emergency runway on Home.', assetDraft.isEmergencyFund, (checked) => setAssetDraft({ ...assetDraft, isEmergencyFund: checked })) : null}
      </div>
      <button className="primary-button" type="submit" disabled={busy}><Plus size={16} /> Add asset</button>
    </form>
  );

  const debtForm = (
    <form className="foundation-form" onSubmit={submitDebt} aria-label="Add debt">
      <label>Name<input required maxLength={80} value={debtDraft.name} onChange={(event) => setDebtDraft({ ...debtDraft, name: event.target.value })} /></label>
      <div className="form-row">
        <label>Type<select value={debtDraft.positionType} onChange={(event) => setDebtDraft({ ...debtDraft, positionType: event.target.value as WealthPositionType })}>{liabilityTypes.map((item) => <option key={item} value={item}>{typeLabels[item]}</option>)}</select></label>
        <label>Amount owed today (SGD)<input required min="0" step="0.01" type="number" value={debtDraft.amount} onChange={(event) => setDebtDraft({ ...debtDraft, amount: event.target.value })} /></label>
      </div>
      <p className="form-help-inline">Optional. Rate and payment let FireBuddy project when this debt is paid off. Balances stay separate from your transactions.</p>
      <div className="form-row">
        <label>Interest rate (% per year)<input min="0" max="100" step="0.01" type="number" value={debtDraft.interestRate} onChange={(event) => setDebtDraft({ ...debtDraft, interestRate: event.target.value })} /></label>
        <label>Monthly payment (SGD)<input min="0" step="0.01" type="number" value={debtDraft.monthlyPayment} onChange={(event) => setDebtDraft({ ...debtDraft, monthlyPayment: event.target.value })} /></label>
        <label>Next payment date<input type="date" value={debtDraft.nextPaymentDate} onChange={(event) => setDebtDraft({ ...debtDraft, nextPaymentDate: event.target.value })} /></label>
      </div>
      <button className="primary-button" type="submit" disabled={busy}><Plus size={16} /> Add debt</button>
    </form>
  );

  const contributionForm = (
    <form className="foundation-form" onSubmit={submitContribution} aria-label="Record contribution">
      <p className="form-help">Money you moved into an investment. Contributions never count as expenses. To change what the asset is worth now, edit the asset instead.</p>
      <label>FI asset<select required value={contributionDraft.wealthPositionId} onChange={(event) => setContributionDraft({ ...contributionDraft, wealthPositionId: event.target.value })}><option value="">Select position</option>{contributionPositions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="form-row">
        <label>Date<input required max={today()} type="date" value={contributionDraft.contributionDate} onChange={(event) => setContributionDraft({ ...contributionDraft, contributionDate: event.target.value })} /></label>
        <label>Amount (SGD)<input required min="0.01" step="0.01" type="number" value={contributionDraft.amount} onChange={(event) => setContributionDraft({ ...contributionDraft, amount: event.target.value })} /></label>
      </div>
      <label>Note<input maxLength={240} value={contributionDraft.note} onChange={(event) => setContributionDraft({ ...contributionDraft, note: event.target.value })} /></label>
      <button className="primary-button" type="submit" disabled={busy || contributionPositions.length === 0}>Save contribution</button>
    </form>
  );

  const editForm = editing && editDraft ? (() => {
    const isLiability = editing.positionKind === 'liability';
    const current = latest.get(editing.id);
    return <form className="foundation-form" onSubmit={submitEdit} aria-label={`Edit ${editing.name}`}>
      <label>Name<input required maxLength={80} value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} /></label>
      <label>Type<select value={editDraft.positionType} onChange={(event) => setEditDraft({ ...editDraft, positionType: event.target.value as WealthPositionType })}>{(isLiability ? liabilityTypes : assetTypes).map((item) => <option key={item} value={item}>{typeLabels[item]}</option>)}</select></label>
      <fieldset className="wealth-value-fieldset">
        <legend>{isLiability ? 'Balance owed' : 'Current value'}</legend>
        <p className="form-help">{current ? `Last recorded ${formatSGD(Number(current.amount), 0)} on ${current.valueDate}. ` : 'No dated value yet. '}Change the value, or just the date to confirm it is still current, and it is saved as a new dated entry that FIRE Planner uses straight away.</p>
        <div className="form-row">
          <label>{isLiability ? 'Amount owed (SGD)' : 'Value (SGD)'}<input min="0" step="0.01" type="number" value={editDraft.amount} onChange={(event) => setEditDraft({ ...editDraft, amount: event.target.value, valueTouched: true })} /></label>
          <label>As of<input required max={today()} type="date" value={editDraft.valueDate} onChange={(event) => setEditDraft({ ...editDraft, valueDate: event.target.value, valueTouched: true })} /></label>
        </div>
      </fieldset>
      {isLiability ? <>
        <h3>Debt terms</h3>
        <div className="form-row">
          <label>Interest rate (% per year)<input min="0" max="100" step="0.01" type="number" value={editDraft.interestRate} onChange={(event) => setEditDraft({ ...editDraft, interestRate: event.target.value })} /></label>
          <label>Monthly payment (SGD)<input min="0" step="0.01" type="number" value={editDraft.monthlyPayment} onChange={(event) => setEditDraft({ ...editDraft, monthlyPayment: event.target.value })} /></label>
          <label>Next payment date<input type="date" value={editDraft.nextPaymentDate} onChange={(event) => setEditDraft({ ...editDraft, nextPaymentDate: event.target.value })} /></label>
        </div>
      </> : <div className="check-stack">
        {check('Counts toward FI', 'Investable money you could spend in retirement.', editDraft.includeInFi, (checked) => setEditDraft({ ...editDraft, includeInFi: checked }))}
        {editDraft.positionType !== 'cpf' ? check('Locked until retirement', 'SRS and similar schemes you cannot draw on early. Shown as Restricted in FIRE setup.', editDraft.locked, (checked) => setEditDraft({ ...editDraft, locked: checked, isEmergencyFund: false })) : null}
        {editDraft.positionType === 'cash' && !editDraft.locked ? check('Emergency fund', 'Counted in your emergency runway on Home.', editDraft.isEmergencyFund, (checked) => setEditDraft({ ...editDraft, isEmergencyFund: checked })) : null}
      </div>}
      <div className="wealth-edit-actions">
        <button className="primary-button" type="submit" disabled={busy}>Save changes</button>
        <button className="secondary-button" type="button" disabled={busy} onClick={() => archive(editing)}><Archive size={16} /> Archive</button>
      </div>
    </form>;
  })() : null;

  const row = (position: WealthPosition) => {
    const value = latest.get(position.id);
    const isLiability = position.positionKind === 'liability';
    const balance = value ? Number(value.amount) : null;
    const payoff = isLiability ? describePayoff(position, balance) : null;
    const principal = isLiability && position.originalPrincipal ? Number(position.originalPrincipal) : null;
    const repaid = principal && balance !== null && principal > 0 ? Math.min(Math.max(1 - balance / principal, 0), 1) : null;
    return <div className="position-row" key={position.id}>
      <span className="position-icon">{isLiability ? <Landmark /> : <TrendingUp />}</span>
      <span>
        <strong>{position.name}</strong>
        <small>{positionMeta(position)}</small>
        {payoff ? <em className={payoff.warning ? 'payoff-warning' : 'payoff-line'}>{payoff.text}</em> : null}
        {repaid !== null ? <span className="position-progress" aria-label={`${Math.round(repaid * 100)}% repaid`}><span style={{ width: `${repaid * 100}%` }} /></span> : null}
        <em>{value ? `${isLiability ? 'Balance' : 'Value'} at ${value.valueDate}` : 'No dated value'}</em>
      </span>
      <strong className={isLiability ? 'amount-negative' : undefined}>{value ? `${isLiability ? '−' : ''}${formatSGD(Number(value.amount), 0)}` : 'Setup needed'}</strong>
      <div className="position-actions">
        <button type="button" onClick={() => openEdit(position)} aria-label={`Edit ${position.name}`}><Pencil size={14} /> Edit</button>
      </div>
    </div>;
  };

  const history = [
    ...snapshots.map((item) => ({ id: item.id, date: item.valueDate, kind: 'Value' as const, positionId: item.wealthPositionId, amount: item.amount, remove: () => removeSnapshot(item.wealthPositionId, item.id) })),
    ...contributions.map((item) => ({ id: item.id, date: item.contributionDate, kind: 'Contribution' as const, positionId: item.wealthPositionId, amount: item.amount, remove: () => removeContribution(item.id) })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const sheetOpen = addOpen || editing !== null;
  const errorLine = error ? <p className="foundation-error" role="alert">{error}</p> : null;

  return <main className="page foundation-management-page">
    <PageToolbar
      title="Wealth"
      description="What you own and what you owe, valued on dates you choose."
      backAction={() => navigate(-1)}
      metadata={demoMode ? <span className="demo-data-label">Local demo data</span> : null}
      actions={<button className="primary-button" type="button" onClick={() => openAdd('asset')}><Plus size={16} /> Add</button>}
      overflowActions={[
        { label: 'Add asset', icon: TrendingUp, onSelect: () => openAdd('asset') },
        { label: 'Add debt', icon: Landmark, onSelect: () => openAdd('debt') },
        { label: 'Record contribution', icon: Plus, onSelect: () => openAdd('contribution') },
      ]}
    />
    {sheetOpen ? null : errorLine}
    {loadError ? <p className="foundation-error" role="alert">{loadError}</p> : null}
    <div className="retirement-headlines wealth-headlines">
      <article className="white-card"><h2>Net worth</h2><strong>{active.length ? formatSGD(assetTotal - liabilityTotal, 0) : '—'}</strong><p>{!active.length ? 'Add your first asset or debt to begin.' : missingValues ? `${missingValues} position${missingValues === 1 ? ' has' : 's have'} no value yet.` : 'Assets less debts, at their latest recorded values.'}</p></article>
      <article className="white-card"><h2>Assets</h2><strong>{formatSGD(assetTotal, 0)}</strong><p>{assets.length} position{assets.length === 1 ? '' : 's'}</p></article>
      <article className="white-card"><h2>Debts</h2><strong className={liabilities.length ? 'amount-negative' : undefined}>{liabilities.length ? `−${formatSGD(liabilityTotal, 0)}` : 'None'}</strong><p>{liabilities.length ? `${liabilities.length} liabilit${liabilities.length === 1 ? 'y' : 'ies'}` : 'No debt recorded'}</p></article>
    </div>
    <p className="wealth-intro">Tap <strong>Edit</strong> on any row to change its details or record a new value. <Link to="/fire">FIRE Planner</Link> adds up the assets you ticked in setup using the latest value recorded here, so an edit on either page updates both.</p>
    <section className="management-grid wealth-grid">
      <article className="white-card management-list-card" aria-labelledby="wealth-assets-heading">
        <div className="section-title-row"><h3 id="wealth-assets-heading">Assets</h3><span className="section-subtotal">{assets.length ? formatSGD(assetTotal, 0) : '0 active'}</span></div>
        <div className="position-list">{assets.length === 0 ? <p className="form-help">No assets yet. <button type="button" className="text-button" onClick={() => openAdd('asset')}>Add cash, investments, property or CPF</button>.</p> : assets.map(row)}</div>
      </article>
      <article className="white-card management-list-card" aria-labelledby="wealth-liabilities-heading">
        <div className="section-title-row"><h3 id="wealth-liabilities-heading">Liabilities</h3><span className="section-subtotal amount-negative">{liabilities.length ? `−${formatSGD(liabilityTotal, 0)}` : 'No debt recorded'}</span></div>
        <div className="position-list">{liabilities.length === 0 ? <p className="form-help">No debts recorded. <button type="button" className="text-button" onClick={() => openAdd('debt')}>Add a mortgage, loan or credit card</button> to track its balance and payoff.</p> : liabilities.map(row)}</div>
      </article>
    </section>
    <section className="white-card history-card">
      <h3>Recent history</h3>
      {history.length === 0 ? <p className="form-help">Dated values and contributions will appear here.</p> : history.map((item) => <div className="history-row" key={`${item.kind}-${item.id}`}><span><strong>{positions.find((position) => position.id === item.positionId)?.name ?? 'Archived position'}</strong><small>{item.kind} · {item.date}</small></span><strong>{formatSGD(Number(item.amount), 0)}</strong><button type="button" aria-label={`Delete ${item.kind.toLowerCase()}`} onClick={() => void item.remove()}><Trash2 size={15} /></button></div>)}
    </section>

    <BottomSheet isOpen={addOpen} title="Add to your wealth" onClose={() => setAddOpen(false)} className="wealth-form-sheet">
      <div className="transaction-type-toggle wealth-add-tabs" role="tablist" aria-label="What to add">
        {addTabs.map((tab) => <button key={tab.id} type="button" role="tab" id={`wealth-add-tab-${tab.id}`} aria-selected={addTab === tab.id} aria-controls={`wealth-add-panel-${tab.id}`} className={addTab === tab.id ? 'active' : ''} onClick={() => setAddTab(tab.id)}>{tab.label}</button>)}
      </div>
      <div role="tabpanel" id={`wealth-add-panel-${addTab}`} aria-labelledby={`wealth-add-tab-${addTab}`}>
        {errorLine}
        {addTab === 'asset' ? assetForm : addTab === 'debt' ? debtForm : contributionForm}
      </div>
    </BottomSheet>
    <BottomSheet isOpen={editing !== null} title={editing ? `Edit ${editing.name}` : 'Edit position'} onClose={closeEdit} className="wealth-form-sheet">
      {errorLine}
      {editForm}
    </BottomSheet>
  </main>;
}
