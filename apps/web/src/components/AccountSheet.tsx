import { useState, type ComponentType } from 'react';
import { Banknote, Building2, Check, CreditCard, Smartphone, Trash2, WalletCards, X } from 'lucide-react';

import { categoryColors, type Account, type AccountType } from '../app/FireBuddyProvider';
import { useAccessibleDialog } from './useAccessibleDialog';

export const accountTypeOptions: {
  id: AccountType;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}[] = [
  { id: 'bank', label: 'Bank', icon: Building2 },
  { id: 'credit_card', label: 'Credit card', icon: CreditCard },
  { id: 'debit_card', label: 'Debit card', icon: WalletCards },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'ewallet', label: 'E-wallet', icon: Smartphone },
];

type AccountSheetProps = {
  mode: 'add' | 'edit';
  initial: Partial<Account>;
  onSave: (data: Partial<Account>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
};

/** Collect and validate one payment account before delegating persistence. */
export function AccountSheet({ mode, initial, onSave, onDelete, onClose }: AccountSheetProps) {
  const [name, setName] = useState(initial.name ?? '');
  const [type, setType] = useState<AccountType>(initial.type ?? 'bank');
  const [color, setColor] = useState(initial.color ?? categoryColors[0]);
  const [lastFour, setLastFour] = useState(initial.lastFour ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isBusy = isSaving || isDeleting;
  const dialogRef = useAccessibleDialog<HTMLElement>({ onClose, canClose: !isBusy });

  async function save() {
    if (!name.trim() || isBusy) {
      return;
    }

    if (lastFour && !/^\d{4}$/.test(lastFour)) {
      setFormError('Last four digits must contain exactly four numbers.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await onSave({
        name: name.trim(),
        type,
        color,
        lastFour: lastFour.trim() || undefined,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save account.');
    } finally {
      setIsSaving(false);
    }
  }

  async function removeAccount() {
    if (!onDelete || isBusy) {
      return;
    }

    setIsDeleting(true);
    setFormError(null);
    try {
      await onDelete();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete account.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={isBusy ? undefined : onClose}>
      <aside
        ref={dialogRef}
        className="center-sheet account-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-sheet-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3 id="account-sheet-title">{mode === 'add' ? 'New account' : 'Edit account'}</h3>
          <button className="plain-icon-button" type="button" onClick={onClose} disabled={isBusy} aria-label="Close account editor">
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="type-chip-grid">
            {accountTypeOptions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={`type-chip ${type === item.id ? 'type-chip-active' : ''}`}
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                  disabled={isBusy}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>
          <label className="form-field">
            <span>Account name</span>
            <input data-dialog-initial-focus value={name} onChange={(event) => setName(event.target.value)} placeholder="DBS Savings" disabled={isBusy} />
          </label>
          <label className="form-field">
            <span>Last four digits</span>
            <input
              value={lastFour}
              onChange={(event) => setLastFour(event.target.value.replace(/\D/g, ''))}
              maxLength={4}
              placeholder="4521"
              disabled={isBusy}
            />
          </label>
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
          {initial.isDefault ? <p className="field-help">The default account can be edited but not deleted.</p> : null}
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="sheet-actions">
            {onDelete ? (
              <button className="danger-button" type="button" onClick={removeAccount} disabled={isBusy}>
                <Trash2 size={15} />
                {isDeleting ? 'Deleting...' : 'Delete'}
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
