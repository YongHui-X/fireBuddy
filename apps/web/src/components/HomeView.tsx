import { expenseAccounts, expenseCategories, getAccountById, getCategoryById } from '@firebuddy/shared';
import type { LocalExpenseRecord } from '@firebuddy/shared';

import { fireProgressPercent, fireSnapshot } from '../data/fireSnapshot';
import { formatCurrency, formatDisplayDate } from '../lib/format';
import type { CategorySummary } from '../types/ui';

interface HomeViewProps {
  currentMonthLabel: string;
  currentMonthSpend: number;
  currentMonthTransactionCount: number;
  recentExpenses: LocalExpenseRecord[];
  totalSpent: number;
  totalTransactions: number;
  activeCategoryCount: number;
  latestExpenseDate: string | null;
  topCategory: CategorySummary | null;
  onOpenAddExpense: () => void;
  onOpenTransactions: () => void;
  onOpenCategories: () => void;
}

export function HomeView({
  currentMonthLabel,
  currentMonthSpend,
  currentMonthTransactionCount,
  recentExpenses,
  totalSpent,
  totalTransactions,
  activeCategoryCount,
  latestExpenseDate,
  topCategory,
  onOpenAddExpense,
  onOpenTransactions,
  onOpenCategories,
}: HomeViewProps) {
  return (
    <div className="content-stack">
      <section className="hero-card dashboard-hero">
        <div className="hero-copy">
          <p className="hero-kicker">{currentMonthLabel}</p>
          <h3 className="hero-title">Track spending without losing sight of FIRE.</h3>
          <p className="hero-amount">{formatCurrency(String(currentMonthSpend.toFixed(2)))}</p>
          <p className="hero-body">
            Keep recent purchases visible, spot category drift early, and capture the next expense
            before it disappears into the day.
          </p>
          <div className="hero-action-row">
            <button className="primary-action" type="button" onClick={onOpenAddExpense}>
              Add expense
            </button>
            <button className="secondary-action secondary-action-inline" type="button" onClick={onOpenTransactions}>
              Review ledger
            </button>
          </div>
        </div>

        <div className="hero-summary-card">
          <div className="hero-summary-row">
            <span className="hero-summary-label">Transactions this month</span>
            <strong className="hero-summary-value">{currentMonthTransactionCount}</strong>
          </div>
          <div className="hero-summary-row">
            <span className="hero-summary-label">Active categories</span>
            <strong className="hero-summary-value">{activeCategoryCount}</strong>
          </div>
          <div className="hero-summary-row">
            <span className="hero-summary-label">Top category</span>
            <strong className="hero-summary-value">{topCategory?.name ?? 'None yet'}</strong>
          </div>
          <p className="hero-note">
            {latestExpenseDate
              ? `Latest activity was recorded on ${formatDisplayDate(latestExpenseDate)}.`
              : 'No expenses recorded yet.'}
          </p>
        </div>
      </section>

      <section className="surface-card fire-overview-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">FIRE snapshot</p>
            <h3 className="section-title">Net worth progress toward the long-term target</h3>
          </div>
          <p className="section-support">
            Based on the current demo profile from the Figma reference. Live projection logic comes later.
          </p>
        </div>

        <div className="fire-progress-layout">
          <div className="fire-progress-main">
            <p className="metric-label">Current net worth</p>
            <p className="fire-progress-amount">{formatCurrency(String(fireSnapshot.currentNetWorth))}</p>
            <div className="fire-progress-track" aria-label={`${fireProgressPercent.toFixed(1)}% FIRE progress`}>
              <span className="fire-progress-fill" style={{ width: `${fireProgressPercent}%` }} />
            </div>
            <div className="fire-progress-meta">
              <span>{fireProgressPercent.toFixed(1)}% complete</span>
              <span>Target {formatCurrency(String(fireSnapshot.targetNetWorth))}</span>
            </div>
          </div>

          <div className="fire-stat-grid">
            <article className="fire-stat">
              <span>Invested</span>
              <strong>{formatCurrency(String(fireSnapshot.invested))}</strong>
            </article>
            <article className="fire-stat">
              <span>Cash</span>
              <strong>{formatCurrency(String(fireSnapshot.cash))}</strong>
            </article>
            <article className="fire-stat">
              <span>Emergency fund</span>
              <strong>{fireSnapshot.emergencyMonths.toFixed(1)} months</strong>
            </article>
            <article className="fire-stat">
              <span>Projected FIRE</span>
              <strong>{fireSnapshot.projectedFireYear}</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <p className="metric-label">Total tracked spend</p>
          <p className="metric-value">{formatCurrency(String(totalSpent.toFixed(2)))}</p>
          <p className="metric-detail">All captured expense amounts across the current local dataset.</p>
        </article>

        <article className="metric-card">
          <p className="metric-label">Entries recorded</p>
          <p className="metric-value">{totalTransactions}</p>
          <p className="metric-detail">A clean running ledger of each saved expense.</p>
        </article>

        <article className="metric-card">
          <p className="metric-label">Top category</p>
          <p className="metric-value metric-value-sm">{topCategory?.name ?? 'No entries'}</p>
          <p className="metric-detail">
            {topCategory
              ? `${formatCurrency(String(topCategory.totalAmount.toFixed(2)))} currently sits at the top.`
              : 'Category rollups will appear once the first expense is saved.'}
          </p>
        </article>

        <article className="metric-card">
          <p className="metric-label">Latest activity</p>
          <p className="metric-value metric-value-sm">
            {latestExpenseDate ? formatDisplayDate(latestExpenseDate) : 'No entries'}
          </p>
          <p className="metric-detail">Recent activity stays easy to scan before backend history arrives.</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Recent transactions</p>
              <h3 className="section-title">Newest expenses first</h3>
            </div>
            <button
              className="secondary-action secondary-action-inline"
              type="button"
              onClick={onOpenTransactions}
            >
              View all
            </button>
          </div>

          {recentExpenses.length === 0 ? (
            <p className="empty-copy">No expenses yet. Start with Add expense to build the first activity feed.</p>
          ) : (
            <div className="expense-list">
              {recentExpenses.map((expense) => {
                const account = getAccountById(expense.accountId, expenseAccounts);
                const category = getCategoryById(expense.categoryId, expenseCategories);

                return (
                  <article key={expense.id} className="expense-row">
                    <div className="expense-main">
                      <div className="expense-icon" style={{ backgroundColor: `${category?.color ?? '#DCEBDD'}1F` }}>
                        {category?.emoji ?? '...'}
                      </div>
                      <div className="expense-copy">
                        <h4 className="expense-title">{expense.displayDescription}</h4>
                        <p className="expense-meta">
                          {category?.name ?? 'Category'} · {account?.name ?? 'Account'} ·{' '}
                          {formatDisplayDate(expense.date)}
                        </p>
                      </div>
                    </div>

                    <p className="expense-amount">{formatCurrency(expense.amount)}</p>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <article className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Category spotlight</p>
              <h3 className="section-title">Where the spending is landing</h3>
            </div>
            <button
              className="secondary-action secondary-action-inline"
              type="button"
              onClick={onOpenCategories}
            >
              Open categories
            </button>
          </div>

          {topCategory ? (
            <div className="spotlight-card">
              <div className="spotlight-main">
                <div className="category-summary-icon" style={{ backgroundColor: `${topCategory.color}1F` }}>
                  {topCategory.emoji}
                </div>
                <div>
                  <p className="spotlight-kicker">Highest spend so far</p>
                  <h4 className="spotlight-title">{topCategory.name}</h4>
                </div>
              </div>

              <p className="spotlight-amount">{formatCurrency(String(topCategory.totalAmount.toFixed(2)))}</p>
              <p className="spotlight-copy">
                {topCategory.transactionCount} {topCategory.transactionCount === 1 ? 'transaction' : 'transactions'} in
                the current ledger.
              </p>
            </div>
          ) : (
            <p className="empty-copy">Category insights will appear after the first saved expense.</p>
          )}
        </article>
      </section>
    </div>
  );
}
