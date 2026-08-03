import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ChevronLeft, MoreHorizontal, Plus } from 'lucide-react';

import { accountTypeLabel, getDeviceDateKey, useFireBuddy } from '../app/FireBuddyProvider';

function AddExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTransaction, categories, accounts, session, syncStatus } = useFireBuddy();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => getDeviceDateKey());
  const [category, setCategory] = useState(categories[0]?.id ?? '');
  const [account, setAccount] = useState(accounts[0]?.id ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const availableCategories = useMemo(
    () => session
      ? categories.filter((item) => item.isDefault || /^[0-9a-f-]{36}$/i.test(item.id) || /^\d+$/.test(item.id))
      : categories,
    [categories, session],
  );
  const selectedCategory = availableCategories.find((item) => item.id === category);
  const isIncome = selectedCategory?.name.toLowerCase() === 'income';
  const backgroundPath = (location.state as { backgroundPath?: string } | null)?.backgroundPath;

  function closeAddExpense() {
    navigate(backgroundPath ?? '/');
  }

  useEffect(() => {
    if (!category && availableCategories[0]) {
      setCategory(availableCategories[0].id);
      return;
    }

    if (category && !availableCategories.some((item) => item.id === category)) {
      setCategory(availableCategories[0]?.id ?? '');
    }
  }, [availableCategories, category]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0 || !category || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await addTransaction({
        description: description.trim() || 'Unnamed expense',
        amount: isIncome ? Math.abs(numericAmount) : -Math.abs(numericAmount),
        category,
        date,
        account,
      });
      closeAddExpense();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save transaction.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="add-route" onClick={closeAddExpense}>
      <form className="add-panel" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <header className="add-header">
          <button className="plain-icon-button inverse-plain" type="button" onClick={closeAddExpense}>
            <ChevronLeft size={24} />
          </button>
          <h2>Add {isIncome ? 'Income' : 'Expense'}</h2>
          <MoreHorizontal size={24} />
        </header>

        <section className="add-card">
          <label className="form-field add-name-field">
            <span>Name</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Netflix" />
          </label>

          <label className="amount-field add-amount-field">
            <span>Amount</span>
            <div>
              <strong>S$</strong>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <button type="button" onClick={() => setAmount('')}>
                Clear
              </button>
            </div>
          </label>

          <label className="form-field add-date-field">
            <span>Date</span>
            <input value={date} onChange={(event) => setDate(event.target.value)} type="date" />
          </label>

          <label className="form-field add-category-field">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={syncStatus === 'loading'}
            >
              {availableCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field add-account-field">
            <span>Account</span>
            <select value={account} onChange={(event) => setAccount(event.target.value)}>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {accountTypeLabel(item.type)}
                </option>
              ))}
            </select>
          </label>

          <button className="invoice-button" type="button">
            <Plus size={18} />
            Add Invoice
          </button>

          {saveError ? <p className="form-error">{saveError}</p> : null}

          <button className="primary-button full-width" type="submit" disabled={isSaving || syncStatus === 'loading'}>
            {isSaving ? 'Saving...' : 'Save transaction'}
          </button>
        </section>
      </form>
    </main>
  );
}


export default AddExpense;
