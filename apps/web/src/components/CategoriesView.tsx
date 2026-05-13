import { formatCurrency, formatDisplayDate } from '../lib/format';
import type { CategorySummary } from '../types/ui';

interface CategoriesViewProps {
  summaries: CategorySummary[];
  totalSpent: number;
  currentMonthLabel: string;
}

export function CategoriesView({ summaries, totalSpent, currentMonthLabel }: CategoriesViewProps) {
  const orderedSummaries = [...summaries].sort((left, right) => right.totalAmount - left.totalAmount);
  const highlightedSummaries = orderedSummaries.filter((summary) => summary.transactionCount > 0).slice(0, 3);
  const topCategory = highlightedSummaries[0] ?? orderedSummaries[0] ?? null;

  return (
    <div className="content-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{currentMonthLabel}</p>
            <h3 className="section-title">A clearer breakdown of spending by category</h3>
          </div>
          <p className="section-support">
            Counts and totals update whenever the add-expense flow records a new entry.
          </p>
        </div>

        <div className="ledger-stat-grid">
          <article className="ledger-stat-card">
            <span className="metric-label">Tracked categories</span>
            <strong className="ledger-stat-value">
              {summaries.filter((summary) => summary.transactionCount > 0).length}
            </strong>
          </article>
          <article className="ledger-stat-card">
            <span className="metric-label">Top category</span>
            <strong className="ledger-stat-value ledger-stat-value-sm">{topCategory?.name ?? 'None yet'}</strong>
          </article>
          <article className="ledger-stat-card">
            <span className="metric-label">Tracked spend</span>
            <strong className="ledger-stat-value">{formatCurrency(String(totalSpent.toFixed(2)))}</strong>
          </article>
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Top categories</p>
            <h3 className="section-title">The heaviest spend buckets first</h3>
          </div>
        </div>

        <div className="category-summary-grid">
          {(highlightedSummaries.length > 0 ? highlightedSummaries : orderedSummaries.slice(0, 3)).map((summary) => (
            <article key={summary.categoryId} className="category-summary-card">
              <div className="category-summary-top">
                <div className="category-summary-icon" style={{ backgroundColor: `${summary.color}1F` }}>
                  {summary.emoji}
                </div>
                <div>
                  <h4 className="category-summary-title">{summary.name}</h4>
                  <p className="category-summary-meta">
                    {summary.transactionCount} {summary.transactionCount === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
              </div>

              <p className="category-summary-amount">{formatCurrency(String(summary.totalAmount.toFixed(2)))}</p>
              <p className="category-summary-foot">
                {summary.lastTransactionDate
                  ? `Latest: ${formatDisplayDate(summary.lastTransactionDate)}`
                  : 'No local transactions yet'}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Full breakdown</p>
            <h3 className="section-title">All categories, ordered by spend</h3>
          </div>
        </div>

        <div className="category-breakdown-list">
          {orderedSummaries.map((summary) => {
            const share = totalSpent > 0 ? (summary.totalAmount / totalSpent) * 100 : 0;

            return (
              <article key={summary.categoryId} className="category-breakdown-row">
                <div className="category-breakdown-main">
                  <div className="category-summary-icon" style={{ backgroundColor: `${summary.color}1F` }}>
                    {summary.emoji}
                  </div>
                  <div className="category-breakdown-copy">
                    <strong>{summary.name}</strong>
                    <span>
                      {summary.transactionCount} {summary.transactionCount === 1 ? 'transaction' : 'transactions'}
                    </span>
                  </div>
                </div>

                <div className="category-breakdown-progress">
                  <span
                    className="category-breakdown-progress-fill"
                    style={{ width: `${share}%`, backgroundColor: summary.color }}
                  />
                </div>

                <div className="category-breakdown-values">
                  <strong>{formatCurrency(String(summary.totalAmount.toFixed(2)))}</strong>
                  <span>{share > 0 ? `${share.toFixed(0)}% of total` : 'No spend yet'}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
