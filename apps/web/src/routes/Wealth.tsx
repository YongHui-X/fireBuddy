import { useMemo, useState, type FormEvent } from 'react';
import { Archive, Landmark, Plus, Trash2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { CreateWealthPositionInput, WealthPositionKind, WealthPositionType } from '@firebuddy/shared';

import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import { formatSGD } from '../app/FireBuddyProvider';
import { PageToolbar } from '../components/PageToolbar';

const today = () => new Date().toLocaleDateString('en-CA');

/** Manage balance sheet positions separately from payment accounts and transactions. */
export default function Wealth() {
  const navigate = useNavigate();
  const { positions, snapshots, contributions, addPosition, editPosition, removePosition, addSnapshot, removeSnapshot, addContribution, removeContribution, demoMode } = useFinancialFoundation();
  const [error, setError] = useState<string | null>(null);
  const [positionDraft, setPositionDraft] = useState({ name: '', positionKind: 'asset' as WealthPositionKind, positionType: 'cash' as WealthPositionType, amount: '', includeInFi: true, isEmergencyFund: false });
  const [snapshotDraft, setSnapshotDraft] = useState({ positionId: '', amount: '', valueDate: today() });
  const [contributionDraft, setContributionDraft] = useState({ wealthPositionId: '', amount: '', contributionDate: today(), note: '' });
  const latest = useMemo(() => {
    const map = new Map<string, typeof snapshots[number]>();
    [...snapshots].sort((a, b) => b.valueDate.localeCompare(a.valueDate)).forEach((item) => { if (!map.has(item.wealthPositionId)) map.set(item.wealthPositionId, item); });
    positions.forEach((item) => { if (item.latestSnapshot && !map.has(item.id)) map.set(item.id, item.latestSnapshot); });
    return map;
  }, [positions, snapshots]);
  const contributionPositions = positions.filter((item) => !item.isArchived && item.positionKind === 'asset' && item.includeInFi);

  async function submitPosition(event: FormEvent) {
    event.preventDefault(); setError(null);
    const isLiability = positionDraft.positionKind === 'liability';
    const input: CreateWealthPositionInput = {
      name: positionDraft.name, positionKind: positionDraft.positionKind, positionType: positionDraft.positionType,
      liquidityClass: positionDraft.positionType === 'cpf' ? 'restricted' : positionDraft.positionType === 'cash' ? 'liquid' : 'less_liquid',
      includeInFi: isLiability ? false : positionDraft.includeInFi, isEmergencyFund: isLiability ? false : positionDraft.isEmergencyFund,
      restrictionType: positionDraft.positionType === 'cpf' ? 'cpf' : 'none', currency: 'SGD',
    };
    try {
      await addPosition(input, positionDraft.amount ? { valueDate: today(), amount: Number(positionDraft.amount).toFixed(2) } : undefined);
      setPositionDraft({ name: '', positionKind: 'asset', positionType: 'cash', amount: '', includeInFi: true, isEmergencyFund: false });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to add position.'); }
  }

  async function submitSnapshot(event: FormEvent) {
    event.preventDefault(); setError(null);
    try { await addSnapshot(snapshotDraft.positionId, { valueDate: snapshotDraft.valueDate, amount: Number(snapshotDraft.amount).toFixed(2) }); setSnapshotDraft({ positionId: '', amount: '', valueDate: today() }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to add snapshot.'); }
  }

  async function submitContribution(event: FormEvent) {
    event.preventDefault(); setError(null);
    try { await addContribution({ ...contributionDraft, amount: Number(contributionDraft.amount).toFixed(2), note: contributionDraft.note || null }); setContributionDraft({ wealthPositionId: '', amount: '', contributionDate: today(), note: '' }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to add contribution.'); }
  }

  return <main className="page foundation-management-page">
    <PageToolbar title="Wealth positions" description="Assets and liabilities are dated separately from payment accounts." backAction={() => navigate(-1)} metadata={demoMode ? <span className="demo-data-label">Local demo data</span> : null} />
    {error ? <p className="foundation-error" role="alert">{error}</p> : null}
    <section className="management-grid">
      <article className="white-card management-list-card"><div className="section-title-row"><h3>Balance sheet</h3><span>{positions.filter((item) => !item.isArchived).length} active</span></div>
        <div className="position-list">{positions.filter((item) => !item.isArchived).map((position) => {
          const value = latest.get(position.id);
          return <div className="position-row" key={position.id}><span className="position-icon">{position.positionKind === 'asset' ? <TrendingUp /> : <Landmark />}</span><span><strong>{position.name}</strong><small>{position.positionType} · {position.liquidityClass}{position.includeInFi ? ' · Included in FI' : ''}{position.isEmergencyFund ? ' · Emergency fund' : ''}</small><em>{value ? `Value at ${value.valueDate}` : 'No dated value'}</em></span><strong>{value ? formatSGD(Number(value.amount), 0) : 'Setup needed'}</strong><div className="position-actions">
            {position.positionKind === 'asset' ? <button type="button" onClick={() => void editPosition(position.id, {
              name: position.name, positionKind: position.positionKind, positionType: position.positionType,
              liquidityClass: position.liquidityClass, includeInFi: !position.includeInFi,
              isEmergencyFund: position.isEmergencyFund, restrictionType: position.restrictionType, currency: position.currency,
            })}>{position.includeInFi ? 'Exclude from FI' : 'Include in FI'}</button> : null}
            <button type="button" aria-label={`Archive ${position.name}`} onClick={() => void removePosition(position.id)}><Archive size={16} /></button>
          </div></div>;
        })}</div>
      </article>
      <form className="white-card foundation-form" onSubmit={submitPosition}><h3>Add wealth position</h3><label>Name<input required value={positionDraft.name} onChange={(event) => setPositionDraft({ ...positionDraft, name: event.target.value })} /></label><div className="form-row"><label>Kind<select value={positionDraft.positionKind} onChange={(event) => setPositionDraft({ ...positionDraft, positionKind: event.target.value as WealthPositionKind })}><option value="asset">Asset</option><option value="liability">Liability</option></select></label><label>Type<select value={positionDraft.positionType} onChange={(event) => setPositionDraft({ ...positionDraft, positionType: event.target.value as WealthPositionType })}>{['cash', 'investment', 'property', 'mortgage', 'loan', 'cpf', 'other'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div><label>Current value (SGD)<input required min="0" step="0.01" type="number" value={positionDraft.amount} onChange={(event) => setPositionDraft({ ...positionDraft, amount: event.target.value })} /></label>{positionDraft.positionKind === 'asset' ? <div className="check-stack"><label><input type="checkbox" checked={positionDraft.includeInFi} onChange={(event) => setPositionDraft({ ...positionDraft, includeInFi: event.target.checked })} /> Include in FI assets</label>{positionDraft.positionType === 'cash' ? <label><input type="checkbox" checked={positionDraft.isEmergencyFund} onChange={(event) => setPositionDraft({ ...positionDraft, isEmergencyFund: event.target.checked })} /> Designate as emergency fund</label> : null}</div> : null}<button className="primary-button" type="submit"><Plus size={16} /> Add position and value</button></form>
    </section>
    <section className="management-grid">
      <form className="white-card foundation-form" onSubmit={submitSnapshot}><h3>Record updated value</h3><label>Position<select required value={snapshotDraft.positionId} onChange={(event) => setSnapshotDraft({ ...snapshotDraft, positionId: event.target.value })}><option value="">Select position</option>{positions.filter((item) => !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="form-row"><label>Date<input required max={today()} type="date" value={snapshotDraft.valueDate} onChange={(event) => setSnapshotDraft({ ...snapshotDraft, valueDate: event.target.value })} /></label><label>Amount<input required min="0" step="0.01" type="number" value={snapshotDraft.amount} onChange={(event) => setSnapshotDraft({ ...snapshotDraft, amount: event.target.value })} /></label></div><button className="primary-button" type="submit">Save snapshot</button></form>
      <form className="white-card foundation-form" onSubmit={submitContribution}><h3>Record invested contribution</h3><p className="form-help">Contributions affect the invested total and never count as expenses.</p><label>FI asset<select required value={contributionDraft.wealthPositionId} onChange={(event) => setContributionDraft({ ...contributionDraft, wealthPositionId: event.target.value })}><option value="">Select position</option>{contributionPositions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="form-row"><label>Date<input required max={today()} type="date" value={contributionDraft.contributionDate} onChange={(event) => setContributionDraft({ ...contributionDraft, contributionDate: event.target.value })} /></label><label>Amount<input required min="0.01" step="0.01" type="number" value={contributionDraft.amount} onChange={(event) => setContributionDraft({ ...contributionDraft, amount: event.target.value })} /></label></div><label>Note<input maxLength={240} value={contributionDraft.note} onChange={(event) => setContributionDraft({ ...contributionDraft, note: event.target.value })} /></label><button className="primary-button" type="submit">Save contribution</button></form>
    </section>
    <section className="white-card history-card"><h3>Recent financial history</h3>{[...snapshots].sort((a, b) => b.valueDate.localeCompare(a.valueDate)).slice(0, 8).map((item) => <div className="history-row" key={item.id}><span><strong>{positions.find((position) => position.id === item.wealthPositionId)?.name ?? 'Archived position'}</strong><small>Snapshot · {item.valueDate}</small></span><strong>{formatSGD(Number(item.amount), 0)}</strong><button type="button" aria-label="Delete snapshot" onClick={() => void removeSnapshot(item.wealthPositionId, item.id)}><Trash2 size={15} /></button></div>)}{[...contributions].sort((a, b) => b.contributionDate.localeCompare(a.contributionDate)).slice(0, 5).map((item) => <div className="history-row" key={item.id}><span><strong>{positions.find((position) => position.id === item.wealthPositionId)?.name ?? 'Archived position'}</strong><small>Contribution · {item.contributionDate}</small></span><strong>{formatSGD(Number(item.amount), 0)}</strong><button type="button" aria-label="Delete contribution" onClick={() => void removeContribution(item.id)}><Trash2 size={15} /></button></div>)}</section>
  </main>;
}
