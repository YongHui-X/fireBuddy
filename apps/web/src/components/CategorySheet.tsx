import { useState } from 'react';
import type { TransactionType } from '@firebuddy/shared';
import { Check, Trash2, X } from 'lucide-react';

import {
  categoryColors,
  categoryIconOptions,
  legacyCategoryIconIds,
  type Category,
} from '../app/FireBuddyProvider';
import { useAccessibleDialog } from './useAccessibleDialog';

const categoryBudgetInputPattern = /^\d{0,8}(?:\.\d{0,2})?$/;

type CategorySheetProps = {
  mode: 'add' | 'edit';
  initial: Partial<Category>;
  categoryType: TransactionType;
  onSave: (data: Partial<Category>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
};

/** Collect and validate one custom category before delegating persistence. */
export function CategorySheet({
  mode,
  initial,
  categoryType,
  onSave,
  onDelete,
  onClose,
}: CategorySheetProps) {
  const [name, setName] = useState(initial.name ?? '');
  const [icon, setIcon] = useState(legacyCategoryIconIds[initial.icon ?? ''] ?? initial.icon ?? 'others');
  const [color, setColor] = useState(initial.color ?? categoryColors[0]);
  const [monthlyBudget, setMonthlyBudget] = useState(String(initial.monthlyBudget ?? 0));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const isBusy = isSaving || isDeleting;
  const dialogRef = useAccessibleDialog<HTMLElement>({ onClose, canClose: !isBusy });

  async function save() {
    if (!name.trim() || isBusy) {
      return;
    }

    const normalizedBudget = categoryType === 'income' ? '0' : monthlyBudget.trim();
    if (
      normalizedBudget === '.' ||
      !categoryBudgetInputPattern.test(normalizedBudget) ||
      Number(normalizedBudget || 0) > 99999999.99
    ) {
      setBudgetError('Enter a budget up to 99,999,999.99 with no more than two decimal places.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await onSave({
        name: name.trim(),
        icon,
        color,
        monthlyBudget: Number(normalizedBudget) || 0,
        categoryType,
        isDefault: initial.isDefault,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save category.');
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!onDelete || isBusy) {
      return;
    }

    setIsDeleting(true);
    setFormError(null);

    try {
      await onDelete();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete category.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={isBusy ? undefined : onClose}>
      <aside
        ref={dialogRef}
        className="center-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-sheet-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <h3 id="category-sheet-title">{mode === 'add' ? 'New category' : 'Edit category'}</h3>
          <button className="plain-icon-button" type="button" onClick={onClose} disabled={isBusy} aria-label="Close category editor">
            <X size={18} />
          </button>
        </div>

        <div className="sheet-body">
          <div className="locked-type-row">
            <span>Type</span>
            <strong>{categoryType === 'expense' ? 'Expense' : 'Income'}</strong>
          </div>

          <label className="form-field">
            <span>Category name</span>
            <input data-dialog-initial-focus value={name} onChange={(event) => setName(event.target.value)} placeholder="Dining out" disabled={isBusy} />
          </label>

          <div className="form-field">
            <span>Icon</span>
            <div className="icon-option-grid">
              {categoryIconOptions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={`icon-option ${icon === item.id ? 'icon-option-active' : ''}`}
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    disabled={isBusy}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                  </button>
                );
              })}
            </div>
          </div>

          {categoryType === 'expense' ? (
            <label className="form-field">
              <span>Monthly budget</span>
              <input
                value={monthlyBudget}
                onChange={(event) => {
                  const nextValue = event.target.value.startsWith('.') ? `0${event.target.value}` : event.target.value;
                  if (categoryBudgetInputPattern.test(nextValue)) {
                    setMonthlyBudget(nextValue);
                    setBudgetError(null);
                  } else {
                    setBudgetError('Use numbers only, with up to two decimal places.');
                  }
                }}
                inputMode="decimal"
                aria-invalid={Boolean(budgetError)}
                disabled={isBusy}
              />
            </label>
          ) : null}
          {categoryType === 'expense' && budgetError ? <p className="form-error">{budgetError}</p> : null}

          <div className="swatch-grid">
            {categoryColors.map((item) => (
              <button
                className={`swatch ${item === color ? 'swatch-active' : ''}`}
                key={item}
                style={{ backgroundColor: item }}
                type="button"
                onClick={() => setColor(item)}
                disabled={isBusy}
                aria-label={item}
              >
                {item === color ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
              </button>
            ))}
          </div>

          {showDeleteConfirm ? (
            <div className="delete-confirm">
              <p>Delete this category?</p>
              <button type="button" onClick={confirmDelete} disabled={isBusy}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ) : null}

          {formError ? <p className="form-error">{formError}</p> : null}

          <div className="sheet-actions">
            {onDelete ? (
              <button className="danger-button" type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isBusy}>
                <Trash2 size={15} />
                Delete
              </button>
            ) : null}
            <button className="primary-button" type="button" onClick={save} disabled={isBusy}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
