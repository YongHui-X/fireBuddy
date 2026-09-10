import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Plus, Sparkles, X } from 'lucide-react';
import type { TransactionType } from '@firebuddy/shared';

import {
  accountTypeLabel,
  categoryColors,
  getDeviceDateKey,
  useFireBuddy,
  type Account,
  type Category,
} from '../app/FireBuddyProvider';
import { suggestExpenseCategory } from '../api';
import { AccountSheet } from '../components/AccountSheet';
import { CategorySheet } from '../components/CategorySheet';
import { useAccessibleDialog } from '../components/useAccessibleDialog';
import { TransactionTagSelector } from '../components/TransactionTagSelector';

function AddExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTransaction, addCategory, addAccount, addTag, categories, accounts, tags, session, syncStatus } = useFireBuddy();
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => getDeviceDateKey());
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState(accounts[0]?.id ?? '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const availableCategories = useMemo(
    () => categories.filter((item) => item.categoryType === transactionType),
    [categories, transactionType],
  );
  const backgroundPath = (location.state as { backgroundPath?: string } | null)?.backgroundPath;

  /** Close the transaction modal and restore its background route. */
  function closeAddTransaction() {
    navigate(backgroundPath ?? '/');
  }

  const dialogRef = useAccessibleDialog<HTMLFormElement>({
    isOpen: !isAddingCategory && !isAddingAccount,
    onClose: closeAddTransaction,
    canClose: !isSaving,
  });

  useEffect(() => {
    if (!category || !availableCategories.some((item) => item.id === category)) {
      setCategory(availableCategories[0]?.id ?? '');
    }
  }, [availableCategories, category]);

  useEffect(() => {
    if (!account && accounts[0]) {
      setAccount(accounts[0].id);
      return;
    }

    if (account && !accounts.some((item) => item.id === account)) {
      setAccount(accounts[0]?.id ?? '');
    }
  }, [account, accounts]);

  /** Request an expense-only category suggestion without auto-saving it. */
  async function requestSuggestion() {
    const token = session?.access_token;
    const cleanDescription = description.trim();
    if (transactionType !== 'expense' || !token || !cleanDescription || isSuggesting) {
      return;
    }

    setIsSuggesting(true);
    setSuggestionMessage(null);

    try {
      const result = await suggestExpenseCategory(token, { description: cleanDescription });
      if (result.categoryId && availableCategories.some((item) => item.id === result.categoryId)) {
        setCategory(result.categoryId);
      } else {
        setSuggestionMessage('Unable to determine category. Choose one manually.');
      }
    } catch {
      setSuggestionMessage('Unable to determine category. Choose one manually.');
    } finally {
      setIsSuggesting(false);
    }
  }

  /** Validate and persist the current typed transaction draft. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);

    if (isSaving) {
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setSaveError('Enter an amount greater than zero.');
      return;
    }

    if (!category) {
      setSaveError('Choose a category before saving.');
      return;
    }

    if (!account) {
      setSaveError('Choose or create an account before saving.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await addTransaction({
        description: description.trim() || `Unnamed ${transactionType}`,
        amount: transactionType === 'income' ? Math.abs(numericAmount) : -Math.abs(numericAmount),
        category,
        date,
        account,
        transactionType,
        tagIds: selectedTagIds,
      });
      closeAddTransaction();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save transaction.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="add-route" onClick={closeAddTransaction}>
      <form
        ref={dialogRef}
        className="add-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-transaction-title"
        tabIndex={-1}
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="add-header">
          <span aria-hidden="true" />
          <h2 id="add-transaction-title">Add transaction</h2>
          <button
            className="plain-icon-button inverse-plain"
            type="button"
            onClick={closeAddTransaction}
            aria-label="Close add transaction"
          >
            <X size={22} />
          </button>
        </header>

        <section className="add-card">
          <div className="transaction-type-toggle add-type-toggle" role="group" aria-label="Transaction type">
            {(['expense', 'income'] as const).map((type) => (
              <button
                className={transactionType === type ? 'active' : ''}
                key={type}
                type="button"
                onClick={() => {
                  setTransactionType(type);
                  setSuggestionMessage(null);
                }}
                aria-pressed={transactionType === type}
              >
                {type === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <label className="form-field add-name-field">
            <span>Description</span>
            <input data-dialog-initial-focus value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Netflix" />
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

          <div className="add-paired-row">
            <label className="form-field add-date-field">
              <span>Date</span>
              <input value={date} onChange={(event) => setDate(event.target.value)} type="date" />
            </label>

            <div className="form-field add-category-field">
              <div className="field-label-actions">
                <label htmlFor="transaction-category">Category</label>
                <span className="compact-field-actions">
                  {transactionType === 'expense' ? (
                    <button
                      className="category-suggestion-button"
                      type="button"
                      onClick={requestSuggestion}
                      disabled={!session || !description.trim() || isSuggesting}
                    >
                      <Sparkles size={13} />
                      {isSuggesting ? 'Detecting...' : 'Autodetect category'}
                    </button>
                  ) : null}
                  <button className="compact-add-button" type="button" onClick={() => setIsAddingCategory(true)}>
                    <Plus size={13} /> Add category
                  </button>
                </span>
              </div>
              <select
                id="transaction-category"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setSuggestionMessage(null);
                }}
                disabled={syncStatus === 'loading'}
              >
                {availableCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {transactionType === 'expense' && !session ? (
            <span className="field-help add-suggestion-status">Sign in to use category autodetection.</span>
          ) : null}
          {suggestionMessage ? (
            <p className="form-error add-suggestion-status" role="status">{suggestionMessage}</p>
          ) : null}

          <div className="form-field add-account-field">
            <div className="field-label-actions">
              <label htmlFor="transaction-account">Account</label>
              <button className="compact-add-button" type="button" onClick={() => setIsAddingAccount(true)}>
                <Plus size={13} /> Add account
              </button>
            </div>
            <select
              id="transaction-account"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              disabled={syncStatus === 'loading'}
            >
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {accountTypeLabel(item.type)}
                </option>
              ))}
            </select>
          </div>

          <TransactionTagSelector
            tags={tags}
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
            onCreate={addTag}
            disabled={isSaving}
          />

          {saveError ? <p className="form-error add-form-status">{saveError}</p> : null}

          <button className="primary-button full-width add-save-button" type="submit" disabled={isSaving || syncStatus === 'loading'}>
            {isSaving ? 'Saving...' : 'Save transaction'}
          </button>
        </section>

        {isAddingCategory ? (
          <div className="nested-sheet-layer" onClick={(event) => event.stopPropagation()}>
            <CategorySheet
              mode="add"
              initial={{
                icon: transactionType === 'income' ? 'income' : 'shapes',
                color: categoryColors[0],
                monthlyBudget: 0,
                categoryType: transactionType,
              }}
              categoryType={transactionType}
              onClose={() => setIsAddingCategory(false)}
              onSave={async (values) => {
                const created = await addCategory(values as Omit<Category, 'id'>);
                setCategory(created.id);
                setIsAddingCategory(false);
              }}
            />
          </div>
        ) : null}

        {isAddingAccount ? (
          <div className="nested-sheet-layer" onClick={(event) => event.stopPropagation()}>
            <AccountSheet
              mode="add"
              initial={{ color: categoryColors[0], type: 'bank' }}
              onClose={() => setIsAddingAccount(false)}
              onSave={async (values) => {
                const created = await addAccount(values as Omit<Account, 'id'>);
                setAccount(created.id);
                setIsAddingAccount(false);
              }}
            />
          </div>
        ) : null}
      </form>
    </main>
  );
}

export default AddExpense;
