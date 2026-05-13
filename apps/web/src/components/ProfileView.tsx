import { fireProgressPercent, fireSnapshot } from '../data/fireSnapshot';
import { formatCurrency, formatDisplayDate } from '../lib/format';

interface ProfileViewProps {
  totalTransactions: number;
  activeCategoryCount: number;
  activeAccountCount: number;
  latestExpenseDate: string | null;
  currentMonthSpend: number;
  currentMonthLabel: string;
  availableAccountCount: number;
}

export function ProfileView({
  totalTransactions,
  activeCategoryCount,
  activeAccountCount,
  latestExpenseDate,
  currentMonthSpend,
  currentMonthLabel,
  availableAccountCount,
}: ProfileViewProps) {
  return (
    <div className="content-stack">
      <section className="hero-card profile-hero">
        <div className="hero-copy">
          <p className="hero-kicker">Profile</p>
          <h3 className="hero-title">FireBuddy alpha keeps the interface calm and the data obvious.</h3>
          <p className="hero-body">
            This workspace is tuned for Singapore-first expense tracking, with everyday accounts,
            clean category rollups, and a web-first layout that can later sync to the full stack.
          </p>
        </div>

        <div className="hero-summary-card">
          <div className="hero-summary-row">
            <span className="hero-summary-label">{currentMonthLabel}</span>
            <strong className="hero-summary-value">{formatCurrency(String(currentMonthSpend.toFixed(2)))}</strong>
          </div>
          <div className="hero-summary-row">
            <span className="hero-summary-label">Latest activity</span>
            <strong className="hero-summary-value">
              {latestExpenseDate ? formatDisplayDate(latestExpenseDate) : 'No entries'}
            </strong>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <p className="metric-label">Transactions</p>
          <p className="metric-value">{totalTransactions}</p>
          <p className="metric-detail">The full count of expenses currently saved in this workspace.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Active categories</p>
          <p className="metric-value">{activeCategoryCount}</p>
          <p className="metric-detail">How many category buckets already contain real activity.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Accounts in use</p>
          <p className="metric-value">{activeAccountCount}</p>
          <p className="metric-detail">Accounts touched by the current recorded expenses.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Available accounts</p>
          <p className="metric-value">{availableAccountCount}</p>
          <p className="metric-detail">Cards, banks, cash, and e-wallets already represented in the UI.</p>
        </article>
      </section>

      <section className="profile-grid">
        <article className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">FIRE profile</p>
              <h3 className="section-title">{fireSnapshot.name}'s target snapshot</h3>
            </div>
          </div>

          <div className="profile-list">
            <div className="profile-list-item">
              <strong>{formatCurrency(String(fireSnapshot.currentNetWorth))}</strong>
              <span>Current net worth against a {formatCurrency(String(fireSnapshot.targetNetWorth))} FIRE target.</span>
            </div>
            <div className="profile-list-item">
              <strong>{fireProgressPercent.toFixed(1)}% progress</strong>
              <span>Projection points to {fireSnapshot.projectedFireYear} once analytics are connected.</span>
            </div>
            <div className="profile-list-item">
              <strong>{formatCurrency(String(fireSnapshot.monthlySavings))}</strong>
              <span>Monthly savings assumption used by the current reference screens.</span>
            </div>
          </div>
        </article>

        <article className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Current workspace</p>
              <h3 className="section-title">What this profile already handles well</h3>
            </div>
          </div>

          <div className="profile-list">
            <div className="profile-list-item">
              <strong>Everyday account types</strong>
              <span>Bank accounts, cards, cash, and e-wallets are all represented in the same flow.</span>
            </div>
            <div className="profile-list-item">
              <strong>Consistent spend capture</strong>
              <span>The same amount, date, category, and account rules shape each saved expense.</span>
            </div>
            <div className="profile-list-item">
              <strong>Clear visual rhythm</strong>
              <span>Warm surfaces, thin borders, and restrained hierarchy keep the product readable.</span>
            </div>
          </div>
        </article>

        <article className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Product direction</p>
              <h3 className="section-title">What this interface is preparing for</h3>
            </div>
          </div>

          <div className="profile-list">
            <div className="profile-list-item">
              <strong>Backend-backed history</strong>
              <span>The current layout is already suited to a future authenticated ledger and category sync.</span>
            </div>
            <div className="profile-list-item">
              <strong>AI categorisation</strong>
              <span>The add-expense flow is positioned for description-based suggestions later.</span>
            </div>
            <div className="profile-list-item">
              <strong>Shared product language</strong>
              <span>Web leads the interface now while the same domain rules stay reusable for mobile later.</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
