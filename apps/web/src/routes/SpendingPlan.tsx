import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useFinancialFoundation } from '../app/FinancialFoundationProvider';
import { useFireBuddy } from '../app/FireBuddyProvider';
import { PageToolbar } from '../components/PageToolbar';

/** Keep emergency spending setup alongside everyday category budgets. */
export default function SpendingPlan() {
  const { categories } = useFireBuddy();
  const { essentialCategoryIds, updateEssentialCategories, status, error: loadError, refresh } = useFinancialFoundation();
  const [selection, setSelection] = useState<string[] | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = selection ?? essentialCategoryIds;
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await updateEssentialCategories(selected); setMessage('Essential spending categories saved.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save categories.'); }
    finally { setBusy(false); }
  }
  return <main className="page foundation-management-page"><PageToolbar title="Spending Plan" description="Essential spending and emergency reserves for everyday finances." />
    {loadError && <p role="alert">{loadError}<button onClick={() => void refresh()}>Try again</button></p>}
    <form className="white-card foundation-form" onSubmit={save}><h2>Essential spending categories</h2><p>Choose expenses your emergency reserves need to cover. This updates emergency runway without changing your retirement plan.</p><div className="essential-category-grid">{categories.filter(c => c.categoryType === 'expense').map(c => <label key={c.id}><input disabled={busy || status === 'loading'} type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelection(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} />{c.name}</label>)}</div>{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}<button className="primary-button" disabled={busy || status === 'loading'}>{busy ? 'Saving…' : 'Save essential categories'}</button></form>
    <section className="white-card foundation-form"><h2>Category budgets</h2><p>Your existing category budgets remain available. Overall period limits and rollover are planned for later.</p><Link to="/categories">Manage category budgets</Link></section>
  </main>;
}
