import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  accountTypeBadges,
  accountTypeLabels,
  createInitialAddExpenseDraft,
  createLocalExpenseRecord,
  expenseAccounts,
  expenseCategories,
  formatExpenseAmountDisplay,
  getAccountById,
  getCategoryById,
  isPositiveAmount,
  type AddExpenseDraft,
  type AddExpenseErrors,
  type AddExpenseFieldName,
  type LocalExpenseRecord,
  validateAddExpenseDraft,
} from '@firebuddy/shared';

import { formatDisplayDate } from '../lib/format';

interface AddExpensePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: LocalExpenseRecord) => void;
}

export function AddExpensePanel({ isOpen, onClose, onSave }: AddExpensePanelProps) {
  const [values, setValues] = useState<AddExpenseDraft>(() => createInitialAddExpenseDraft());
  const [errors, setErrors] = useState<AddExpenseErrors>({});

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setValues(createInitialAddExpenseDraft());
    setErrors({});
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const displayAmount = formatExpenseAmountDisplay(values.amount);
  const canSubmitAmount = isPositiveAmount(values.amount);
  const selectedAccount = getAccountById(values.accountId, expenseAccounts);
  const selectedCategory = getCategoryById(values.categoryId, expenseCategories);

  function handleFieldChange(field: AddExpenseFieldName, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateAddExpenseDraft(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(createLocalExpenseRecord(values));
  }

  return (
    <div
      className="panel-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className="add-expense-panel" aria-modal="true" role="dialog" aria-label="Add expense">
        <header className="panel-header">
          <div>
            <p className="panel-kicker">Expense composer</p>
            <h3 className="panel-title">Add expense</h3>
          </div>

          <button className="panel-close" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <form className="panel-form" onSubmit={handleSubmit} noValidate>
          <div className="panel-scroll">
            <section className="amount-hero">
              <div className="amount-hero-copy">
                <p className="hero-label">Amount spent</p>
                <p className="amount-hero-support">Capture the amount first, then place it in the right bucket.</p>
              </div>
              <label className="hero-input-wrap">
                <span className={`hero-display ${values.amount.trim() ? 'hero-display-filled' : ''}`}>
                  {displayAmount}
                </span>
                <input
                  className="hero-input"
                  type="text"
                  inputMode="decimal"
                  name="amount"
                  value={values.amount}
                  onChange={(event) => handleFieldChange('amount', event.target.value)}
                  placeholder="0"
                  aria-label="Amount"
                />
              </label>
              {errors.amount ? <p className="field-error centered-error">{errors.amount}</p> : null}

              <div className="selection-preview">
                <div className="selection-chip">
                  <span>Date</span>
                  <strong>{values.date ? formatDisplayDate(values.date) : 'Choose date'}</strong>
                </div>
                <div className="selection-chip">
                  <span>Account</span>
                  <strong>{selectedAccount?.name ?? 'Select account'}</strong>
                </div>
                <div className="selection-chip">
                  <span>Category</span>
                  <strong>{selectedCategory?.name ?? 'Select category'}</strong>
                </div>
              </div>
            </section>

            <div className="panel-sections">
              <section className="input-section">
                <label className="section-caption" htmlFor="expense-date">
                  Date
                </label>
                <input
                  id="expense-date"
                  className={`text-field ${errors.date ? 'text-field-error' : ''}`}
                  type="date"
                  value={values.date}
                  onChange={(event) => handleFieldChange('date', event.target.value)}
                />
                {errors.date ? <p className="field-error">{errors.date}</p> : null}
              </section>

              <section className="input-section">
                <p className="section-caption">Account</p>
                <div className="account-grid">
                  {expenseAccounts.map((account) => {
                    const isSelected = values.accountId === account.id;

                    return (
                      <button
                        key={account.id}
                        className={`account-card ${isSelected ? 'account-card-active' : ''}`}
                        type="button"
                        onClick={() => handleFieldChange('accountId', account.id)}
                      >
                        <div
                          className="account-badge"
                          style={{ backgroundColor: `${account.color}22`, color: account.color }}
                        >
                          {accountTypeBadges[account.type]}
                        </div>
                        <div className="account-copy">
                          <span className="account-name">{account.name}</span>
                          <span className="account-meta">
                            {accountTypeLabels[account.type]}
                            {account.lastFour ? ` - ${account.lastFour}` : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.accountId ? <p className="field-error">{errors.accountId}</p> : null}
              </section>

              <section className="input-section">
                <p className="section-caption">Category</p>
                <div className="category-grid">
                  {expenseCategories.map((category) => {
                    const isSelected = values.categoryId === category.id;

                    return (
                      <button
                        key={category.id}
                        className={`category-card ${isSelected ? 'category-card-active' : ''}`}
                        type="button"
                        onClick={() => handleFieldChange('categoryId', category.id)}
                      >
                        <div
                          className="category-emoji"
                          style={{ backgroundColor: `${category.color}1F` }}
                        >
                          {category.emoji}
                        </div>
                        <span className="category-name">{category.name}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.categoryId ? <p className="field-error">{errors.categoryId}</p> : null}
              </section>

              <section className="input-section">
                <label className="section-caption" htmlFor="expense-description">
                  Description <span className="optional-copy">optional</span>
                </label>
                <input
                  id="expense-description"
                  className="text-field"
                  type="text"
                  value={values.description}
                  onChange={(event) => handleFieldChange('description', event.target.value)}
                  placeholder="e.g. Hawker centre lunch"
                />
              </section>
            </div>
          </div>

          <div className="submit-bar">
            <p className="submit-note">
              Saving adds the expense to the current web workspace and updates every view immediately.
            </p>

            <div className="submit-actions">
              <button className="secondary-action" type="button" onClick={onClose}>
                Cancel
              </button>
              <button className="submit-button" type="submit" disabled={!canSubmitAmount}>
                Save expense
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}
