import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { type TransactionType } from '@firebuddy/shared';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Filter,
  Flag,
  Grid2X2,
  Home,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
  TrendingUp,
  User,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react';
import {
  accountTypeLabel,
  categoryColors,
  colors,
  describeDonutSegment,
  fireData,
  formatDateLabel,
  formatSGD,
  getAccountMeta,
  getCategoryIcon,
  getDeviceDateKey,
  getDeviceMonthKey,
  polarPoint,
  sortTransactionsNewestFirst,
  useFireBuddy,
  type Account,
  type Category,
  type Transaction,
} from '../app/FireBuddyProvider';
import { EmberMark, FireBuddyMark } from '../app/BrandMarks';
import { getDisplayName } from '../app/displayName';
import { AppUtilityActions } from '../components/AppUtilityActions';
import { CategorySheet } from '../components/CategorySheet';
import { EmberFloatingAssistant } from '../components/EmberFloatingAssistant';
import { PageToolbar } from '../components/PageToolbar';
import { useAccessibleDialog } from '../components/useAccessibleDialog';
import Accounts from './Accounts';
import Dashboard from './Dashboard';
import FireSetup from './FireSetup';
import PlaceholderPage from './PlaceholderPage';
import Profile from './Profile';
import Wealth from './Wealth';

const Insights = lazy(() => import('./Insights'));
const Ember = lazy(() => import('./Ember'));
const desktopNavItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/categories', icon: Grid2X2, label: 'Categories' },
  { path: '/plan', icon: ClipboardList, label: 'Plan' },
  { path: '/goals', icon: Flag, label: 'Goals' },
  { path: '/profile', icon: User, label: 'Profile' },
] as const;
const mobileNavItems = desktopNavItems.filter((item) => ['/', '/transactions', '/categories', '/profile'].includes(item.path));
const secondaryNavItems = [
  { path: '/ember', icon: EmberNavIcon, label: 'Ask Ember', indicator: 'AI' },
] as const;

/** Adapt Ember's custom brand mark to the shared navigation icon contract. */
function EmberNavIcon({ size = 18 }: { size?: number; strokeWidth?: number }) {
  return <EmberMark className="ember-nav-mark" size={size} />;
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signOut, notify } = useFireBuddy();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    function preventBackspaceNavigation(event: KeyboardEvent) {
      if (event.key !== 'Backspace' || event.defaultPrevented) {
        return;
      }

      const target = event.target;
      const isEditable =
        (target instanceof HTMLInputElement && !target.disabled && !target.readOnly) ||
        (target instanceof HTMLTextAreaElement && !target.disabled && !target.readOnly) ||
        (target instanceof HTMLSelectElement && !target.disabled) ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (!isEditable) {
        event.preventDefault();
      }
    }

    window.addEventListener('keydown', preventBackspaceNavigation, true);
    return () => window.removeEventListener('keydown', preventBackspaceNavigation, true);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/ember') {
      setIsSidebarCollapsed(false);
    }
  }, [location.pathname]);

  function openAddTransaction() {
    navigate('/add', {
      state: {
        backgroundPath: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }

  /** Sign out through Supabase while keeping the sidebar action responsive. */
  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      await signOut();
      setShowLogoutDialog(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="figma-app-root">
      <aside id="main-sidebar" className="desktop-sidebar" hidden={isSidebarCollapsed}>
        <div className="sidebar-logo">
          <FireBuddyMark className="sidebar-brand-mark" size={38} />
          <div>
            <h1>FireBuddy</h1>
            <p>SG FIRE Tracker</p>
          </div>
        </div>

        <nav className="desktop-nav" aria-label="Primary">
          {desktopNavItems.map((item) => (
            <SidebarNavItem key={item.path} {...item} />
          ))}
        </nav>

        <nav className="desktop-nav desktop-secondary-nav" aria-label="Assistant">
          {secondaryNavItems.map((item) => (
            <SidebarNavItem key={item.path} {...item} />
          ))}
        </nav>

        <div className="sidebar-actions">
          {session ? (
            <button
              className="sidebar-logout-button"
              type="button"
              onClick={() => setShowLogoutDialog(true)}
              disabled={isSigningOut}
            >
              <LogOut size={16} strokeWidth={1.9} />
              {isSigningOut ? 'Logging out...' : 'Log out'}
            </button>
          ) : null}
          <button className="sidebar-add-button button-press" type="button" onClick={openAddTransaction}>
            <Plus size={16} strokeWidth={2} />
            Add Transaction
          </button>
        </div>
      </aside>

      <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-wrapper">
          <MobileTopbar />
          <div className="scroll-area">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="categories" element={<Categories />} />
              <Route path="profile" element={<Profile onRequestLogout={() => setShowLogoutDialog(true)} />} />
              <Route path="insights" element={<Suspense fallback={<InsightsFallback />}><Insights /></Suspense>} />
              <Route path="analytics" element={<Navigate to="/insights" replace />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="wealth" element={<Wealth />} />
              <Route path="fire" element={<FireSetup />} />
              <Route path="plan" element={<PlaceholderPage kind="plan" />} />
              <Route path="goals" element={<PlaceholderPage kind="goals" />} />
              <Route path="ember" element={(
                <Suspense fallback={<EmberFallback />}>
                  <Ember
                    isMainSidebarOpen={!isSidebarCollapsed}
                    onToggleMainSidebar={() => setIsSidebarCollapsed((current) => !current)}
                    appContextPathname={location.pathname}
                  />
                </Suspense>
              )} />
            </Routes>
          </div>
          <MobileNav />
        </div>
      </div>
      <CrudToast />
      <EmberFloatingAssistant pathname={location.pathname} onOpenFullEmber={() => navigate('/ember')} />
      <LogoutConfirmationDialog
        isOpen={showLogoutDialog}
        isSigningOut={isSigningOut}
        onCancel={() => setShowLogoutDialog(false)}
        onConfirm={() => void handleSignOut()}
      />
    </div>
  );
}

type LogoutConfirmationDialogProps = {
  isOpen: boolean;
  isSigningOut: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Ask for confirmation before ending the current authenticated session. */
function LogoutConfirmationDialog({
  isOpen,
  isSigningOut,
  onCancel,
  onConfirm,
}: LogoutConfirmationDialogProps) {
  const dialogRef = useAccessibleDialog<HTMLElement>({
    isOpen,
    canClose: !isSigningOut,
    onClose: onCancel,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="sheet-backdrop">
      <aside
        ref={dialogRef}
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        tabIndex={-1}
      >
        <h3 id="logout-dialog-title">Log out?</h3>
        <p id="logout-dialog-description">Are you sure you want to log out of FireBuddy?</p>
        <div className="sheet-actions">
          <button data-dialog-initial-focus className="secondary-button" type="button" onClick={onCancel} disabled={isSigningOut}>
            Cancel
          </button>
          <button className="danger-button" type="button" onClick={onConfirm} disabled={isSigningOut}>
            {isSigningOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </aside>
    </div>
  );
}

function CrudToast() {
  const { notification, dismissNotification } = useFireBuddy();

  if (!notification) {
    return null;
  }

  return (
    <div className="crud-toast" role="status" aria-live="polite">
      <span className="crud-toast-icon">
        <Check size={16} strokeWidth={2.4} />
      </span>
      <strong>{notification.message}</strong>
      <button type="button" onClick={dismissNotification} aria-label="Dismiss notification">
        <X size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function SidebarNavItem({
  path,
  icon: Icon,
  label,
  indicator,
}: {
  path: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  indicator?: string;
}) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) => `desktop-nav-link ${isActive ? 'desktop-nav-link-active' : ''}`}
      end={path === '/'}
    >
      <Icon size={18} strokeWidth={1.7} />
      <span>{label}</span>
      {indicator ? <span className="nav-ai-indicator" aria-hidden="true">{indicator}</span> : null}
    </NavLink>
  );
}

function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  function openAddTransaction() {
    navigate('/add', {
      state: {
        backgroundPath: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }

  return (
    <nav className="mobile-nav" aria-label="Primary mobile">
      <div className="mobile-nav-group">
        {mobileNavItems.slice(0, 2).map((item) => (
          <MobileTabItem key={item.path} {...item} />
        ))}
      </div>
      <div className="mobile-fab-spacer" />
      <div className="mobile-nav-group">
        {mobileNavItems.slice(2).map((item) => (
          <MobileTabItem key={item.path} {...item} />
        ))}
      </div>
      <button className="mobile-fab button-press fab-pulse" type="button" onClick={openAddTransaction} aria-label="Add transaction">
        <Plus size={20} strokeWidth={2.4} />
        <span>Add</span>
      </button>
    </nav>
  );
}

function MobileTopbar() {
  return (
    <header className="mobile-topbar">
      <NavLink className="mobile-brand" to="/" aria-label="FireBuddy home">
        <FireBuddyMark size={30} />
        <span>FireBuddy</span>
      </NavLink>
      <div className="mobile-topbar-actions">
        <AppUtilityActions className="app-utility-actions-mobile" />
        <details className="mobile-more-menu">
          <summary><Menu size={18} /><span>More</span></summary>
          <nav aria-label="More FireBuddy pages">
            <NavLink className="mobile-ember-link" to="/ember" title="AI-powered financial assistant">
              <EmberMark className="ember-nav-mark" size={20} />
              <span>Ask Ember</span>
              <span className="nav-ai-indicator" aria-hidden="true">AI</span>
            </NavLink>
            <NavLink to="/insights">Insights</NavLink>
            <NavLink to="/accounts">Accounts</NavLink>
            <NavLink to="/wealth">Wealth</NavLink>
            <NavLink to="/fire">FIRE setup</NavLink>
            <NavLink to="/plan">Plan</NavLink>
            <NavLink to="/goals">Goals</NavLink>
          </nav>
        </details>
      </div>
    </header>
  );
}

function MobileTabItem({
  path,
  icon: Icon,
  label,
}: {
  path: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
}) {
  const location = useLocation();
  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <NavLink to={path} className={`mobile-tab ${isActive ? 'mobile-tab-active' : ''}`} end={path === '/'}>
      <Icon size={19} strokeWidth={isActive ? 2.2 : 1.6} />
      <span>{label}</span>
    </NavLink>
  );
}

function LegacyDashboardReference() {
  const navigate = useNavigate();
  const {
    transactions,
    accounts,
    categories,
    session,
    syncStatus,
    updateTransaction,
    deleteTransaction,
    getCategoryById,
    getAccountById,
    themeMode,
    toggleTheme,
  } = useFireBuddy();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const currentMonthKey = getDeviceMonthKey();
  const sortedTransactions = sortTransactionsNewestFirst(transactions);
  const monthTransactions = sortedTransactions.filter((transaction) => transaction.date.startsWith(currentMonthKey));
  const totalExpenses = monthTransactions
    .filter((transaction) => transaction.transactionType === 'expense')
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
  const totalIncome = monthTransactions
    .filter((transaction) => transaction.transactionType === 'income')
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
  const displayName = getDisplayName(session?.user);
  const firePercent = (fireData.currentNetWorth / fireData.targetNetWorth) * 100;
  const recent = sortedTransactions.slice(0, 5);
  const activeEditingTransaction = editingTransaction
    ? transactions.find((transaction) => transaction.id === editingTransaction.id) ?? editingTransaction
    : null;

  return (
    <main className="page page-dashboard">
      <section className="curved-header dashboard-header">
        <div className="header-row">
          <div>
            <p className="header-greeting">Good afternoon,</p>
            <h2>{displayName}</h2>
          </div>
          <div className="header-actions">
            <button
              className="icon-button translucent"
              type="button"
              aria-label={themeMode === 'dark' ? 'Disable dark mode' : 'Enable dark mode'}
              aria-pressed={themeMode === 'dark'}
              onClick={toggleTheme}
              title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {themeMode === 'dark' ? <Sun size={20} strokeWidth={1.8} /> : <Moon size={20} strokeWidth={1.8} />}
            </button>
            <button className="icon-button translucent" type="button" aria-label="Profile" onClick={() => navigate('/profile')}>
              <User size={21} strokeWidth={1.7} />
            </button>
          </div>
        </div>
        <HeaderCurve />
      </section>

      <section className="dashboard-content">
        <article className="balance-card card-hover-subtle">
          <div className="balance-top">
            <div>
              <p className="card-label">This month's tracked spending</p>
              <h1>{formatSGD(totalExpenses, 0)}</h1>
            </div>
            <button className="text-button" type="button" onClick={() => navigate('/insights')}>
              View insights
            </button>
          </div>

          <div className="balance-stats">
            <div className="balance-stat">
              <span className="round-icon income-icon">
                <Banknote size={18} />
              </span>
              <div>
                <p>Income</p>
                <strong className="amount-positive">+ {formatSGD(totalIncome)}</strong>
              </div>
            </div>
            <div className="balance-stat">
              <span className="round-icon">
                <ArrowUpRight size={18} />
              </span>
              <div className="balance-expenses">
                <p>Expenses</p>
                <strong>- {formatSGD(totalExpenses)}</strong>
              </div>
            </div>
          </div>
        </article>

        <div className="dashboard-top-grid dashboard-widget-grid">
          <article className="white-card spending-breakdown-card">
            <div className="section-title-row">
              <h3>Spending breakdown</h3>
              <button className="text-button" type="button" onClick={() => navigate('/categories')}>
                Open
              </button>
            </div>
            <MiniCategoryChart />
          </article>

          <article className="white-card fire-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Illustrative FIRE progress</p>
                <h3>Illustrative snapshot</h3>
              </div>
              <strong>{firePercent.toFixed(1)}%</strong>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${firePercent}%` }} />
            </div>
            <div className="stat-grid compact">
              <StatPill label="Invested" value={formatSGD(fireData.invested, 0)} />
              <StatPill label="Cash" value={formatSGD(fireData.cash, 0)} />
              <StatPill label="Emergency" value={`${fireData.emergencyMonths} mo`} />
              <StatPill label="FIRE year" value={String(fireData.projectedFireYear)} />
            </div>
          </article>

          <article className="white-card account-summary-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Accounts</p>
                <h3>Your payment accounts</h3>
              </div>
              <button className="text-button" type="button" onClick={() => navigate('/accounts')}>
                Manage
              </button>
            </div>
            {accounts.length > 0 ? (
              <ul className="dashboard-account-list">
                {accounts.slice(0, 3).map((account) => (
                  <li key={account.id}>
                    <span className="dashboard-account-icon" style={{ backgroundColor: account.color }}>
                      <WalletCards size={16} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{account.name}</strong>
                      <small>{accountTypeLabel(account.type)}{account.lastFour ? ` · ${account.lastFour}` : ''}</small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dashboard-empty-copy">Add an account to organise where transactions are paid from.</p>
            )}
          </article>

          <article className="ember-home-card">
            <span className="ember-home-icon"><EmberMark size={28} /></span>
            <div>
              <p className="eyebrow">Meet Ember</p>
              <h3>Ask about CPF, CPFIS, Singapore Savings Bonds, IRAS reliefs, and FIRE planning</h3>
            </div>
            <button className="secondary-button" type="button" onClick={() => navigate('/ember')}>
              Open Ember
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </article>
        </div>

        <section className="content-section transactions-history-section">
          <div className="section-title-row">
            <h3>Recent transactions</h3>
            <button className="text-button" type="button" onClick={() => navigate('/transactions')}>
              See all
            </button>
          </div>
          <div className="transaction-list">
            {recent.map((transaction) => {
              const category = getCategoryById(transaction.category);
              const account = transaction.account ? getAccountById(transaction.account) : undefined;
              return (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  category={category}
                  account={account}
                  variant="compact"
                  onClick={() => navigate('/transactions')}
                  onEdit={() => setEditingTransaction(transaction)}
                />
              );
            })}
          </div>
        </section>
      </section>

      {activeEditingTransaction ? (
        <TransactionSheet
          key={activeEditingTransaction.id}
          transaction={activeEditingTransaction}
          accounts={accounts}
          categories={categories}
          session={session}
          syncStatus={syncStatus}
          onClose={() => setEditingTransaction(null)}
          onSave={async (updates) => {
            await updateTransaction(activeEditingTransaction.id, updates);
            setEditingTransaction(null);
          }}
          onDelete={async () => {
            await deleteTransaction(activeEditingTransaction.id);
            setEditingTransaction(null);
          }}
        />
      ) : null}
    </main>
  );
}

function HeaderCurve() {
  return (
    <svg className="header-curve" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,0 Q600,120 1200,0 L1200,120 L0,120 Z" style={{ fill: 'var(--background)' }} />
    </svg>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type CategoryAvatarVariant = 'default' | 'category-card';

function CategoryAvatar({
  category,
  variant = 'default',
}: {
  category?: Category;
  variant?: CategoryAvatarVariant;
}) {
  const Icon = getCategoryIcon(category);
  const iconSize = variant === 'category-card' ? 30 : 21;

  return (
    <span
      className={['category-avatar', variant === 'category-card' ? 'category-avatar-category-card' : '']
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: `${category?.color ?? colors.primary}22`,
        color: category?.color,
      }}
    >
      <Icon size={iconSize} strokeWidth={1.9} />
    </span>
  );
}

function TransactionRow({
  transaction,
  category,
  account,
  variant = 'card',
  onClick,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  variant?: 'compact' | 'card';
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isIncome = transaction.transactionType === 'income';
  const amountClass = isIncome ? 'amount-positive' : 'amount-negative';
  const className = [
    variant === 'compact' ? 'transaction-item' : 'transaction-card',
    isIncome ? 'transaction-income' : 'transaction-expense',
  ].join(' ');
  const content = (
    <>
      <CategoryAvatar category={category} />
      <div className="transaction-copy">
        <strong>{transaction.description}</strong>
        <div className="transaction-meta-row">
          <span className={`transaction-type-badge ${isIncome ? 'transaction-type-income' : 'transaction-type-expense'}`}>
            {isIncome ? 'Income' : 'Expense'}
          </span>
          <span>
            {formatDateLabel(transaction.date)} {'\u00B7'} {category?.name ?? 'Category'} {'\u00B7'} {getAccountMeta(account)}
          </span>
        </div>
      </div>
      <div className="transaction-amount-actions">
        <strong className={amountClass}>
          {isIncome ? '+' : '-'} {formatSGD(transaction.amount)}
        </strong>
        {onEdit ? (
          <button
            className="transaction-edit-button"
            type="button"
            aria-label={`Edit ${transaction.description}`}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil size={15} strokeWidth={1.9} />
          </button>
        ) : null}
        {onDelete ? (
          <button
            className="transaction-delete-button"
            type="button"
            aria-label={`Delete ${transaction.description}`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={15} strokeWidth={1.9} />
          </button>
        ) : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <article
        className={className}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }}
      >
        {content}
      </article>
    );
  }

  return <article className={className}>{content}</article>;
}

function MiniCategoryChart() {
  const { transactions, categories } = useFireBuddy();
  const chartData = categories
    .filter((category) => category.categoryType === 'expense')
    .map((category) => ({
      name: category.name,
      value: transactions
        .filter((transaction) => transaction.category === category.id && transaction.transactionType === 'expense')
        .reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
      color: category.color,
    }));
  const activeChartData = chartData.filter((entry) => entry.value > 0);
  const centerX = 220;
  const centerY = 150;
  const innerRadius = 42;
  const outerRadius = 78;
  const sliceAngle = 360 / Math.max(activeChartData.length, 1);
  const gapAngle = activeChartData.length > 1 ? 3 : 0;

  return (
    <div className="spending-breakdown">
      <div className="mini-chart">
        {activeChartData.length > 0 ? (
          <svg className="labeled-donut-chart" viewBox="0 0 440 300" role="img" aria-label="Equal category spending breakdown">
            {activeChartData.map((entry, index) => {
              const startAngle = index * sliceAngle + gapAngle / 2;
              const endAngle = (index + 1) * sliceAngle - gapAngle / 2;
              const midAngle = startAngle + (endAngle - startAngle) / 2;
              const lineStart = polarPoint(centerX, centerY, outerRadius + 5, midAngle);
              const lineBend = polarPoint(centerX, centerY, 106, midAngle);
              const isRightSide = lineBend.x >= centerX;
              const lineEnd = {
                x: isRightSide ? Math.min(lineBend.x + 34, 320) : Math.max(lineBend.x - 34, 120),
                y: lineBend.y,
              };
              const labelX = isRightSide ? lineEnd.x + 7 : lineEnd.x - 7;

              return (
                <g className="donut-category" key={entry.name}>
                  <path
                    className="donut-segment"
                    d={describeDonutSegment(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle)}
                    fill={entry.color}
                  />
                  <polyline
                    className="donut-label-line"
                    points={`${lineStart.x},${lineStart.y} ${lineBend.x},${lineBend.y} ${lineEnd.x},${lineEnd.y}`}
                  />
                  <circle className="donut-label-dot" cx={lineStart.x} cy={lineStart.y} r="2.7" />
                  <text
                    className="donut-label"
                    x={labelX}
                    y={lineEnd.y - 4}
                    textAnchor={isRightSide ? 'start' : 'end'}
                  >
                    {entry.name}
                  </text>
                  <text
                    className="donut-label-detail"
                    x={labelX}
                    y={lineEnd.y + 12}
                    textAnchor={isRightSide ? 'start' : 'end'}
                  >
                    {formatSGD(entry.value, 0)}
                  </text>
                </g>
              );
            })}
            <circle className="donut-hole" cx={centerX} cy={centerY} r={innerRadius - 1} />
          </svg>
        ) : (
          <div className="empty-chart">No spending yet</div>
        )}
      </div>
    </div>
  );
}

function Transactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    transactions,
    accounts,
    categories,
    session,
    syncStatus,
    updateTransaction,
    deleteTransaction,
    getCategoryById,
    getAccountById,
  } = useFireBuddy();
  const initialSearchQuery = new URLSearchParams(location.search).get('search') ?? '';
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  const [transactionDeleteError, setTransactionDeleteError] = useState<string | null>(null);
  const transactionDeleteDialogRef = useAccessibleDialog<HTMLElement>({
    isOpen: Boolean(deletingTransaction),
    canClose: !isDeletingTransaction,
    onClose: () => setDeletingTransaction(null),
  });

  const filteredTransactions = useMemo(() => {
    const currentMonthKey = getDeviceMonthKey();
    const weekAgo = new Date(`${getDeviceDateKey()}T00:00:00`);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return sortTransactionsNewestFirst(transactions).filter((transaction) => {
      const category = getCategoryById(transaction.category);
      const account = transaction.account ? getAccountById(transaction.account) : undefined;
      const normalizedQuery = searchQuery.toLowerCase();
      const matchesSearch =
        !normalizedQuery ||
        transaction.description.toLowerCase().includes(normalizedQuery) ||
        category?.name.toLowerCase().includes(normalizedQuery) ||
        account?.name.toLowerCase().includes(normalizedQuery);
      const matchesCategory = !selectedCategory || transaction.category === selectedCategory;
      const matchesAccount = !selectedAccount || transaction.account === selectedAccount;
      const transactionDate = new Date(`${transaction.date}T00:00:00`);
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === 'month' && transaction.date.startsWith(currentMonthKey)) ||
        (dateFilter === 'week' && transactionDate >= weekAgo);

      return matchesSearch && matchesCategory && matchesAccount && matchesDate;
    });
  }, [dateFilter, getAccountById, getCategoryById, searchQuery, selectedAccount, selectedCategory, transactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    filteredTransactions.forEach((transaction) => {
      groups.set(transaction.date, [...(groups.get(transaction.date) ?? []), transaction]);
    });
    return Array.from(groups.entries()).sort((left, right) => right[0].localeCompare(left[0]));
  }, [filteredTransactions]);

  const monthTotal = filteredTransactions
    .filter((transaction) => transaction.transactionType === 'expense')
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
  const incomeTotal = filteredTransactions
    .filter((transaction) => transaction.transactionType === 'income')
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
  const activeEditingTransaction = editingTransaction
    ? transactions.find((transaction) => transaction.id === editingTransaction.id) ?? editingTransaction
    : null;
  const activeDeletingTransaction = deletingTransaction
    ? transactions.find((transaction) => transaction.id === deletingTransaction.id) ?? deletingTransaction
    : null;

  async function confirmTransactionDelete() {
    if (!activeDeletingTransaction || isDeletingTransaction) {
      return;
    }

    setIsDeletingTransaction(true);
    setTransactionDeleteError(null);

    try {
      await deleteTransaction(activeDeletingTransaction.id);
      setDeletingTransaction(null);
    } catch (error) {
      setTransactionDeleteError(error instanceof Error ? error.message : 'Unable to delete transaction.');
    } finally {
      setIsDeletingTransaction(false);
    }
  }

  /** Reset every transaction filter so the complete history is visible again. */
  function clearTransactionFilters() {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedAccount(null);
    setDateFilter('all');
  }

  return (
    <main className="page page-transactions">
      <PageToolbar
        title="Transactions"
        description="Review income and expenses across your accounts."
        actions={<>
          <button className="secondary-button" type="button" onClick={() => navigate('/accounts')}>
            <Wallet size={15} /> Accounts
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => navigate('/add', { state: { backgroundPath: `${location.pathname}${location.search}${location.hash}` } })}
          >
            <Plus size={15} /> Add transaction
          </button>
        </>}
      />

      <section className="screen-content">
        <div className="page-filter-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search transactions..."
            type="search"
          />
          {searchQuery ? (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          ) : null}
        </label>

        <div className="filter-row">
          {(['all', 'month', 'week'] as const).map((filter) => (
            <button
              className={`filter-chip ${dateFilter === filter ? 'filter-chip-active' : ''}`}
              key={filter}
              type="button"
              onClick={() => setDateFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        </div>
        <article className="summary-strip">
          <div className="summary-expense">
            <span>Filtered expenses</span>
            <strong className="amount-negative">- {formatSGD(monthTotal)}</strong>
          </div>
          <div className="summary-income">
            <span>Filtered income</span>
            <strong className="amount-positive">+ {formatSGD(incomeTotal)}</strong>
          </div>
        </article>

        <div className="select-filter-grid">
          <label>
            <span>Category</span>
            <select value={selectedCategory ?? ''} onChange={(event) => setSelectedCategory(event.target.value || null)}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Account</span>
            <select value={selectedAccount ?? ''} onChange={(event) => setSelectedAccount(event.target.value || null)}>
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {accountTypeLabel(account.type)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grouped-list">
          {groupedTransactions.length ? groupedTransactions.map(([date, dateTransactions]) => (
            <section key={date}>
              <p className="date-label">{formatDateLabel(date)}</p>
              <div className="transaction-list card-list">
                {dateTransactions.map((transaction) => {
                  const category = getCategoryById(transaction.category);
                  const account = transaction.account ? getAccountById(transaction.account) : undefined;

                  return (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      category={category}
                      account={account}
                      onEdit={() => setEditingTransaction(transaction)}
                      onDelete={() => {
                        setTransactionDeleteError(null);
                        setDeletingTransaction(transaction);
                      }}
                    />
                  );
                })}
              </div>
            </section>
          )) : (
            <div className="transactions-empty" role="status">
              <strong>{transactions.length ? 'No transactions match these filters' : 'No transactions yet'}</strong>
              <p>
                {transactions.length
                  ? 'Clear the filters to return to your complete transaction history.'
                  : 'Add your first income or expense to start building your history.'}
              </p>
              <button
                className="secondary-button"
                type="button"
                onClick={transactions.length
                  ? clearTransactionFilters
                  : () => navigate('/add', { state: { backgroundPath: `${location.pathname}${location.search}${location.hash}` } })}
              >
                {transactions.length ? 'Clear filters' : 'Add transaction'}
              </button>
            </div>
          )}
        </div>
      </section>

      {activeEditingTransaction ? (
        <TransactionSheet
          key={activeEditingTransaction.id}
          transaction={activeEditingTransaction}
          accounts={accounts}
          categories={categories}
          session={session}
          syncStatus={syncStatus}
          onClose={() => setEditingTransaction(null)}
          onSave={async (updates) => {
            await updateTransaction(activeEditingTransaction.id, updates);
            setEditingTransaction(null);
          }}
          onDelete={async () => {
            await deleteTransaction(activeEditingTransaction.id);
            setEditingTransaction(null);
          }}
        />
      ) : null}

      {activeDeletingTransaction ? (
        <div
          className="sheet-backdrop"
          onClick={isDeletingTransaction ? undefined : () => setDeletingTransaction(null)}
        >
          <aside
            ref={transactionDeleteDialogRef}
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-transaction-title"
            aria-describedby="delete-transaction-description"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="delete-transaction-title">Delete transaction?</h3>
            <p id="delete-transaction-description">
              Delete <strong>{activeDeletingTransaction.description}</strong>? This action cannot be undone.
            </p>
            {transactionDeleteError ? <p className="form-error">{transactionDeleteError}</p> : null}
            <div className="sheet-actions">
              <button
                data-dialog-initial-focus
                className="secondary-button"
                type="button"
                onClick={() => setDeletingTransaction(null)}
                disabled={isDeletingTransaction}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={confirmTransactionDelete}
                disabled={isDeletingTransaction}
              >
                <Trash2 size={15} />
                {isDeletingTransaction ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

function TransactionSheet({
  transaction,
  accounts,
  categories,
  session,
  syncStatus,
  onSave,
  onDelete,
  onClose,
}: {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  session: Session | null;
  syncStatus: 'idle' | 'loading' | 'ready' | 'error';
  onSave: (updates: Partial<Transaction>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(String(Math.abs(transaction.amount)));
  const [date, setDate] = useState(transaction.date);
  const [category, setCategory] = useState(transaction.category);
  const [account, setAccount] = useState(transaction.account ?? accounts[0]?.id ?? '');
  const [transactionType, setTransactionType] = useState<TransactionType>(transaction.transactionType);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const availableCategories = useMemo(
    () => (
      session
        ? categories.filter((item) => item.isDefault || /^[0-9a-f-]{36}$/i.test(item.id) || /^\d+$/.test(item.id))
        : categories
    ).filter((item) => item.categoryType === transactionType),
    [categories, session, transactionType],
  );
  const isBusy = isSaving || isDeleting;
  const dialogRef = useAccessibleDialog<HTMLElement>({ onClose, canClose: !isBusy });

  useEffect(() => {
    if (!category && availableCategories[0]) {
      setCategory(availableCategories[0].id);
      return;
    }

    if (category && !availableCategories.some((item) => item.id === category)) {
      setCategory(availableCategories[0]?.id ?? '');
    }
  }, [availableCategories, category]);

  useEffect(() => {
    if (!account && accounts[0]) {
      setAccount(accounts[0].id);
      return;
    }

    if (account && !accounts.some((item) => item.id === account)) {
      setAccount(accounts[0]?.id ?? '');
    }
  }, [account, accounts]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0 || !category || !account || isBusy) {
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await onSave({
        description: description.trim() || `Unnamed ${transactionType}`,
        amount: transactionType === 'income' ? Math.abs(numericAmount) : -Math.abs(numericAmount),
        category,
        date,
        account,
        transactionType,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update transaction.');
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (isBusy) {
      return;
    }

    setIsDeleting(true);
    setFormError(null);

    try {
      await onDelete();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete transaction.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={isBusy ? undefined : onClose}>
      <aside
        ref={dialogRef}
        className="center-sheet transaction-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-sheet-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <h3 id="transaction-sheet-title">Edit transaction</h3>
          <button className="plain-icon-button" type="button" onClick={onClose} disabled={isBusy} aria-label="Close transaction editor">
            <X size={18} />
          </button>
        </div>

        <form className="sheet-body" onSubmit={save}>
          <div className="transaction-type-toggle" role="group" aria-label="Transaction type">
            {(['expense', 'income'] as const).map((type) => (
              <button
                className={transactionType === type ? 'active' : ''}
                key={type}
                type="button"
                onClick={() => setTransactionType(type)}
                aria-pressed={transactionType === type}
                disabled={isBusy}
              >
                {type === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <label className="form-field">
            <span>Description</span>
            <input
              data-dialog-initial-focus
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Netflix"
              disabled={isBusy}
            />
          </label>

          <label className="form-field">
            <span>Amount</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              disabled={isBusy}
            />
          </label>

          <label className="form-field">
            <span>Date</span>
            <input value={date} onChange={(event) => setDate(event.target.value)} type="date" disabled={isBusy} />
          </label>

          <label className="form-field">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={isBusy || syncStatus === 'loading'}
            >
              {availableCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Account</span>
            <select value={account} onChange={(event) => setAccount(event.target.value)} disabled={isBusy}>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {accountTypeLabel(item.type)}
                </option>
              ))}
            </select>
          </label>

          {showDeleteConfirm ? (
            <div className="delete-confirm">
              <p>Delete this transaction?</p>
              <button type="button" onClick={confirmDelete} disabled={isBusy}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ) : null}

          {formError ? <p className="form-error">{formError}</p> : null}

          <div className="sheet-actions">
            <button
              className="danger-button"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isBusy}
            >
              <Trash2 size={15} />
              Delete
            </button>
            <button className="primary-button" type="submit" disabled={isBusy || syncStatus === 'loading' || !account}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Categories() {
  const { categories, transactions, addCategory, updateCategory, deleteCategory, getMonthlySpend } = useFireBuddy();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [categoryType, setCategoryType] = useState<TransactionType>('expense');
  const visibleCategories = categories.filter((category) => category.categoryType === categoryType);
  const totalSpend = transactions
    .filter((transaction) => transaction.transactionType === 'expense')
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);

  return (
    <main className="page">
      <PageToolbar
        title="Categories"
        description={categoryType === 'expense'
          ? 'Manage your spend categories and monthly budgets.'
          : 'Manage the sources used to classify income.'}
        actions={<button className="primary-button" type="button" onClick={() => setIsAdding(true)}>
          <Plus size={15} /> Add category
        </button>}
      />

      <section className="screen-content">
        <div className="transaction-type-toggle category-type-tabs" role="tablist" aria-label="Category type">
          {(['expense', 'income'] as const).map((type) => (
            <button
              className={categoryType === type ? 'active' : ''}
              key={type}
              type="button"
              role="tab"
              aria-selected={categoryType === type}
              onClick={() => setCategoryType(type)}
            >
              {type === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        <div className="category-grid">
          {visibleCategories.map((category) => {
            const spend = getMonthlySpend(category.id);
            const percent = category.monthlyBudget > 0 ? Math.min((spend / category.monthlyBudget) * 100, 100) : 0;

            return (
              <article className="category-card" key={category.id}>
                <div className="category-top-row">
                  <CategoryAvatar category={category} variant="category-card" />
                  {category.isDefault ? (
                    <span aria-label="Default category" />
                  ) : (
                    <button
                      className="plain-icon-button muted"
                      type="button"
                      onClick={() => setEditingCategory(category)}
                      aria-label={`Edit ${category.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
                <h3>{category.name}</h3>
                {category.categoryType === 'expense' ? (
                  <>
                    <p>{formatSGD(spend, 0)} this month</p>
                    <div className="progress-bar light">
                      <span style={{ width: `${percent}%`, backgroundColor: category.color }} />
                    </div>
                    <span className="category-budget">
                      {category.monthlyBudget > 0 ? `${percent.toFixed(0)}% of ${formatSGD(category.monthlyBudget, 0)}` : 'No budget'}
                    </span>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>

        {categoryType === 'expense' ? <section className="content-section">
          <div className="section-title-row">
            <h3>Full breakdown</h3>
            <Filter size={18} color={colors.textMuted} />
          </div>
          <div className="category-breakdown">
            {visibleCategories.map((category) => {
              const spend = getMonthlySpend(category.id);
              const share = totalSpend > 0 ? (spend / totalSpend) * 100 : 0;
              return (
                <div className="breakdown-row" key={category.id}>
                  <CategoryAvatar category={category} />
                  <div className="breakdown-copy">
                    <strong>{category.name}</strong>
                    <span>{share.toFixed(0)}% of tracked spend</span>
                  </div>
                  <strong>{formatSGD(spend, 0)}</strong>
                </div>
              );
            })}
          </div>
        </section> : null}
      </section>

      {isAdding ? (
        <CategorySheet
          mode="add"
          initial={{ icon: categoryType === 'income' ? 'income' : 'shapes', color: categoryColors[0], monthlyBudget: 0, categoryType }}
          categoryType={categoryType}
          onClose={() => setIsAdding(false)}
          onSave={async (category) => {
            await addCategory(category as Omit<Category, 'id'>);
            setIsAdding(false);
          }}
        />
      ) : null}

      {editingCategory ? (
        <CategorySheet
          mode="edit"
          initial={editingCategory}
          categoryType={editingCategory.categoryType}
          onClose={() => setEditingCategory(null)}
          onSave={async (updates) => {
            await updateCategory(editingCategory.id, updates);
            setEditingCategory(null);
          }}
          onDelete={async () => {
            await deleteCategory(editingCategory.id);
            setEditingCategory(null);
          }}
        />
      ) : null}
    </main>
  );
}

function InsightsFallback() {
  return <main className="page" />;
}

function EmberFallback() {
  return <main className="page ember-page" aria-label="Loading Ember" />;
}

export default Layout;
