import type { ReactNode } from 'react';

import { formatCurrency } from '../lib/format';
import type { WebNavItem, WebViewId } from '../types/ui';

interface AppShellProps {
  navItems: WebNavItem[];
  activeView: WebViewId;
  onViewChange: (viewId: WebViewId) => void;
  onOpenAddExpense: () => void;
  currentMonthLabel: string;
  currentMonthSpend: number;
  totalTransactions: number;
  children: ReactNode;
}

export function AppShell({
  navItems,
  activeView,
  onViewChange,
  onOpenAddExpense,
  currentMonthLabel,
  currentMonthSpend,
  totalTransactions,
  children,
}: AppShellProps) {
  const currentItem = navItems.find((item) => item.id === activeView) ?? navItems[0];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">FB</div>
          <div className="brand-copy-block">
            <p className="brand-kicker">Singapore-first expense tracking</p>
            <h1 className="brand-title">FireBuddy</h1>
          </div>
          <p className="brand-copy">
            A calm money workspace for cards, cash, and e-wallet spending, shaped first for the
            web experience.
          </p>
        </div>

        <div className="sidebar-summary">
          <p className="metric-label">This month</p>
          <p className="sidebar-summary-value">{formatCurrency(String(currentMonthSpend.toFixed(2)))}</p>
          <p className="sidebar-summary-copy">
            {totalTransactions} transactions currently captured across the local workspace.
          </p>
        </div>

        <button className="primary-action sidebar-action" type="button" onClick={onOpenAddExpense}>
          Add expense
        </button>

        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = item.id === activeView;

            return (
              <button
                key={item.id}
                className={`nav-card ${isActive ? 'nav-card-active' : ''}`}
                type="button"
                aria-pressed={isActive}
                onClick={() => onViewChange(item.id)}
              >
                <span className="nav-eyebrow">{item.eyebrow}</span>
                <span className="nav-label">{item.label}</span>
                <span className="nav-blurb">{item.blurb}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footnote">
          <p className="sidebar-footnote-title">{currentMonthLabel}</p>
          <p className="sidebar-footnote-copy">
            The interface is already shaped around the intended web product. Backend sync comes
            later.
          </p>
        </div>
      </aside>

      <section className="shell-main">
        <header className="topbar">
          <div className="topbar-copy">
            <p className="topbar-kicker">{currentItem.eyebrow}</p>
            <h2 className="topbar-title">{currentItem.label}</h2>
            <p className="topbar-meta">{currentItem.blurb}</p>
          </div>

          <div className="topbar-actions">
            <span className="topbar-chip">{currentMonthLabel}</span>
            <button className="primary-action topbar-action" type="button" onClick={onOpenAddExpense}>
              Add expense
            </button>
          </div>
        </header>

        <div className="view-frame">{children}</div>
      </section>

      <nav className="mobile-nav" aria-label="Sections">
        <div className="mobile-nav-group">
          {navItems.slice(0, 2).map((item) => {
            const isActive = item.id === activeView;

            return (
              <button
                key={item.id}
                className={`mobile-nav-chip ${isActive ? 'mobile-nav-chip-active' : ''}`}
                type="button"
                aria-pressed={isActive}
                onClick={() => onViewChange(item.id)}
              >
                <span className="mobile-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        <button className="mobile-nav-fab" type="button" onClick={onOpenAddExpense} aria-label="Add expense">
          +
        </button>

        <div className="mobile-nav-group">
          {navItems.slice(2).map((item) => {
            const isActive = item.id === activeView;

            return (
              <button
                key={item.id}
                className={`mobile-nav-chip ${isActive ? 'mobile-nav-chip-active' : ''}`}
                type="button"
                aria-pressed={isActive}
                onClick={() => onViewChange(item.id)}
              >
                <span className="mobile-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
