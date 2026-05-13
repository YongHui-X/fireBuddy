import { useMemo, useState } from 'react';
import { expenseAccounts, expenseCategories, getAccountById, getCategoryById } from '@firebuddy/shared';
import type { LocalExpenseRecord } from '@firebuddy/shared';

import { formatCurrency, formatDisplayDate } from '../lib/format';

interface TransactionsViewProps {
  expenses: LocalExpenseRecord[];
  currentMonthLabel: string;
  currentMonthSpend: number;
  currentMonthTransactionCount: number;
  averageExpenseAmount: number;
}

export function TransactionsView({
  expenses,
  currentMonthLabel,
  currentMonthSpend,
  currentMonthTransactionCount,
  averageExpenseAmount,
}: TransactionsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return expenses.filter((expense) => {
      const account = getAccountById(expense.accountId, expenseAccounts);
      const category = getCategoryById(expense.categoryId, expenseCategories);
      const matchesSearch =
        normalizedQuery.length === 0 ||
        expense.displayDescription.toLowerCase().includes(normalizedQuery) ||
        account?.name.toLowerCase().includes(normalizedQuery) ||
        category?.name.toLowerCase().includes(normalizedQuery);
      const matchesCategory = selectedCategoryId === 'all' || expense.categoryId === selectedCategoryId;
      const matchesAccount = selectedAccountId === 'all' || expense.accountId === selectedAccountId;

      return matchesSearch && matchesCategory && matchesAccount;
    });
  }, [expenses, searchQuery, selectedAccountId, selectedCategoryId]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategoryId !== 'all' || selectedAccountId !== 'all';

  function resetFilters() {
    setSearchQuery('');
    setSelectedCategoryId('all');
    setSelectedAccountId('all');
  }

  return (
    <div className="content-stack">
      <section className="surface-card ledger-overview">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{currentMonthLabel}</p>
            <h3 className="section-title">A clean ledger of every saved expense</h3>
          </div>
          <p className="section-support">Amounts, category tags, and account context stay visible at a glance.</p>
        </div>

        <div className="ledger-stat-grid">
          <article className="ledger-stat-card">
            <span className="metric-label">Month spend</span>
            <strong className="ledger-stat-value">{formatCurrency(String(currentMonthSpend.toFixed(2)))}</strong>
          </article>
          <article className="ledger-stat-card">
            <span className="metric-label">Transactions</span>
            <strong className="ledger-stat-value">{currentMonthTransactionCount}</strong>
          </article>
          <article className="ledger-stat-card">
            <span className="metric-label">Average ticket</span>
            <strong className="ledger-stat-value">{formatCurrency(String(averageExpenseAmount.toFixed(2)))}</strong>
          </article>
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Transactions</p>
            <h3 className="section-title">Newest entries first</h3>
          </div>
          <p className="section-support">
            {filteredExpenses.length} of {expenses.length} entries shown after local filters.
          </p>
        </div>

        <div className="transaction-filter-bar" aria-label="Transaction filters">
          <label className="filter-field">
            <span>Search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search merchant, account, or category"
            />
          </label>

          <label className="filter-field">
            <span>Category</span>
            <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
              <option value="all">All categories</option>
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Account</span>
            <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
              <option value="all">All accounts</option>
              {expenseAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <button
            className="secondary-action secondary-action-inline"
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            Reset
          </button>
        </div>

        {expenses.length === 0 ? (
          <p className="empty-copy">No transactions yet. Save an expense to populate this ledger.</p>
        ) : filteredExpenses.length === 0 ? (
          <p className="empty-copy">No transactions match those filters.</p>
        ) : (
          <div className="transaction-table">
            <div className="transaction-table-head">
              <span>Description</span>
              <span>Category</span>
              <span>Account</span>
              <span>Date</span>
              <span>Amount</span>
            </div>

            {filteredExpenses.map((expense) => {
              const account = getAccountById(expense.accountId, expenseAccounts);
              const category = getCategoryById(expense.categoryId, expenseCategories);

              return (
                <article key={expense.id} className="transaction-row">
                  <div className="transaction-cell transaction-cell-title">
                    <strong>{expense.displayDescription}</strong>
                    <div className="transaction-pill-row">
                      <span className="transaction-pill" style={{ color: category?.color ?? '#6B8577' }}>
                        {category?.name ?? 'Category'}
                      </span>
                      <span className="transaction-pill transaction-pill-muted">{account?.name ?? 'Account'}</span>
                    </div>
                  </div>
                  <div className="transaction-cell">
                    <span>{category?.name ?? 'Category'}</span>
                  </div>
                  <div className="transaction-cell">
                    <span>{account?.name ?? 'Account'}</span>
                  </div>
                  <div className="transaction-cell">
                    <span>{formatDisplayDate(expense.date)}</span>
                  </div>
                  <div className="transaction-cell transaction-amount-cell">
                    <strong>{formatCurrency(expense.amount)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
