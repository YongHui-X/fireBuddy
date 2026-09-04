import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';

import { AccountSheet, accountTypeOptions } from '../components/AccountSheet';
import { PageToolbar } from '../components/PageToolbar';
import {
  accountTypeLabel,
  categoryColors,
  useFireBuddy,
  type Account,
} from '../app/FireBuddyProvider';

/** Manage payment account metadata without implying stored balances. */
export default function Accounts() {
  const navigate = useNavigate();
  const { accounts, transactions, addAccount, updateAccount, deleteAccount } = useFireBuddy();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <main className="page">
      <PageToolbar
        title="Accounts"
        description="Manage the payment accounts used by your transactions."
        backAction={() => navigate(-1)}
        actions={<button className="primary-button" type="button" onClick={() => setIsAdding(true)}>
          <Plus size={15} /> Add account
        </button>}
      />

      <section className="screen-content">
        <div className="account-list">
          {accounts.map((account) => {
            const usageCount = transactions.filter((transaction) => transaction.account === account.id).length;
            const typeConfig = accountTypeOptions.find((item) => item.id === account.type) ?? accountTypeOptions[0];
            const Icon = typeConfig.icon;

            return (
              <article className="account-card-row" key={account.id}>
                <span className="account-icon" style={{ backgroundColor: `${account.color}22`, color: account.color }}>
                  <Icon size={20} />
                </span>
                <div>
                  <strong>{account.name}</strong>
                  <span>
                    {accountTypeLabel(account.type)}
                    {account.lastFour ? `, ${account.lastFour}` : ''}, {usageCount} transactions
                    {account.isDefault ? ', Default' : ''}
                  </span>
                </div>
                <button className="plain-icon-button muted" type="button" onClick={() => setEditingAccount(account)} aria-label={`Edit ${account.name}`}>
                  <Pencil size={16} />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {isAdding ? (
        <AccountSheet
          mode="add"
          initial={{ color: categoryColors[0], type: 'bank' }}
          onClose={() => setIsAdding(false)}
          onSave={async (account) => {
            await addAccount(account as Omit<Account, 'id'>);
            setIsAdding(false);
          }}
        />
      ) : null}

      {editingAccount ? (
        <AccountSheet
          mode="edit"
          initial={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={async (updates) => {
            await updateAccount(editingAccount.id, updates);
            setEditingAccount(null);
          }}
          onDelete={editingAccount.isDefault ? undefined : async () => {
            await deleteAccount(editingAccount.id);
            setEditingAccount(null);
          }}
        />
      ) : null}
    </main>
  );
}
