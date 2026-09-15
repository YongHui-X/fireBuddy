import { Pencil, X } from 'lucide-react';

import {
  colors,
  formatSGD,
  getAccountMeta,
  getCategoryIcon,
  type Account,
  type Category,
  type Tag,
  type Transaction,
} from '../app/FireBuddyProvider';
import { useAccessibleDialog } from './useAccessibleDialog';

type TransactionDetailsDialogProps = {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  tags: Tag[];
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
};

/** Format a transaction date without relative labels for the details dialog. */
function formatTransactionFullDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Show one transaction in the shared accessible details dialog. */
export function TransactionDetailsDialog({
  transaction,
  category,
  account,
  tags,
  onClose,
  onEdit,
}: TransactionDetailsDialogProps) {
  const dialogRef = useAccessibleDialog<HTMLElement>({ onClose });
  const CategoryIcon = getCategoryIcon(category);
  const transactionTags = (transaction.tagIds ?? [])
    .map((tagId) => tags.find((tag) => tag.id === tagId))
    .filter((tag): tag is Tag => Boolean(tag));
  const isIncome = transaction.transactionType === 'income';

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside
        ref={dialogRef}
        className="transaction-details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-details-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="transaction-details-header">
          <div>
            <span>Transaction details</span>
            <h3 id="transaction-details-title">{transaction.description}</h3>
          </div>
          <button
            data-dialog-initial-focus
            className="plain-icon-button"
            type="button"
            aria-label="Close transaction details"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="transaction-details-amount">
          <span>{isIncome ? 'Income' : 'Expense'}</span>
          <strong className={isIncome ? 'amount-positive' : 'amount-negative'}>
            {isIncome ? '+' : '-'} {formatSGD(transaction.amount)}
          </strong>
        </div>

        <dl className="transaction-details-list">
          <div>
            <dt>Date</dt>
            <dd>{formatTransactionFullDate(transaction.date)}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd className="transaction-details-category">
              <span
                className="category-avatar"
                style={{
                  backgroundColor: `${category?.color ?? colors.primary}22`,
                  color: category?.color,
                }}
              >
                <CategoryIcon size={21} strokeWidth={1.9} />
              </span>
              <span>{category?.name ?? 'Category'}</span>
            </dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{getAccountMeta(account)}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{isIncome ? 'Income' : 'Expense'}</dd>
          </div>
          <div>
            <dt>Tags</dt>
            <dd className="transaction-details-tags">
              {transactionTags.length
                ? transactionTags.map((tag) => <span className="transaction-tag-chip" key={tag.id}>{tag.name}</span>)
                : <span className="field-help">No tags</span>}
            </dd>
          </div>
        </dl>

        <footer className="transaction-details-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          <button className="primary-button" type="button" onClick={() => onEdit(transaction)}>
            <Pencil size={15} />
            Edit transaction
          </button>
        </footer>
      </aside>
    </div>
  );
}
