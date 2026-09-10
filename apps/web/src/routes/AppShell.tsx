import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { type TransactionExportFilters, type TransactionType } from '@firebuddy/shared';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  CircleHelp,
  ClipboardList,
  Copy,
  Download,
  Ellipsis,
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
  Tags as TagsIcon,
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
  getDeviceMonthKey,
  getDeviceDateKey,
  polarPoint,
  sortTransactionsNewestFirst,
  useFireBuddy,
  type Account,
  type Category,
  type Transaction,
  type Tag,
} from '../app/FireBuddyProvider';
import { exportTransactions as exportApiTransactions } from '../api';
import { buildTransactionCsv, downloadCsvBlob, filterLocalExportTransactions, getTransactionExportFilename } from '../app/transactionExport';
import { EmberMark, FireBuddyMark } from '../app/BrandMarks';
import { getDisplayName } from '../app/displayName';
import { AppUtilityActions } from '../components/AppUtilityActions';
import { CategorySheet } from '../components/CategorySheet';
import { EmberFloatingAssistant } from '../components/EmberFloatingAssistant';
import { PageToolbar } from '../components/PageToolbar';
import { TagManagerDialog } from '../components/TagManagerDialog';
import { TransactionExportDialog, type TransactionExportScope } from '../components/TransactionExportDialog';
import { TransactionTagSelector } from '../components/TransactionTagSelector';
import { useAccessibleDialog } from '../components/useAccessibleDialog';
import Accounts from './Accounts';
import Dashboard from './Dashboard';
import FireSetup from './FireSetup';
import FirePlanner from './FirePlanner';
import SpendingPlan from './SpendingPlan';
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
  { path: '/fire', icon: TrendingUp, label: 'FIRE Planner' },
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
              <Route path="fire" element={<FirePlanner />} />
              <Route path="fire/setup" element={<FireSetup />} />
              <Route path="plan" element={<SpendingPlan />} />
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
            <NavLink to="/fire">FIRE Planner</NavLink>
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
    tags,
    session,
    syncStatus,
    updateTransaction,
    deleteTransaction,
    addTag,
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
          tags={tags}
          session={session}
          syncStatus={syncStatus}
          onClose={() => setEditingTransaction(null)}
          onCreateTag={addTag}
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

type TransactionSortKey = 'date' | 'description' | 'category' | 'account' | 'type' | 'amount';
type SortDirection = 'asc' | 'desc';

type TransactionSort = {
  key: TransactionSortKey;
  direction: SortDirection;
};

type TransactionActionMenuState = {
  transaction: Transaction;
  top: number;
  left: number;
};

const transactionSortLabels: Record<TransactionSortKey, string> = {
  date: 'Date',
  description: 'Description',
  category: 'Category',
  account: 'Account',
  type: 'Type',
  amount: 'Amount',
};

/** List every transaction month plus the current device month, newest first. */
function getTransactionMonthOptions(transactions: Transaction[], latestMonth: string) {
  const months = new Set([latestMonth]);
  transactions.forEach((transaction) => {
    const month = transaction.date.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month)) {
      months.add(month);
    }
  });
  return [...months].sort((left, right) => right.localeCompare(left));
}

/** Move between available transaction months without crossing the list ends. */
function getAdjacentTransactionMonth(
  months: string[],
  selectedMonth: string,
  direction: 'older' | 'newer',
) {
  const selectedIndex = months.indexOf(selectedMonth);
  if (selectedIndex < 0) return selectedMonth;
  const nextIndex = direction === 'older' ? selectedIndex + 1 : selectedIndex - 1;
  return months[nextIndex] ?? selectedMonth;
}

/** Match a transaction against the selected month or inclusive custom date range. */
function matchesTransactionDateRange(
  transaction: Transaction,
  selectedMonth: string,
  startDate: string,
  endDate: string,
) {
  if (!startDate && !endDate) {
    return transaction.date.startsWith(selectedMonth);
  }

  return (!startDate || transaction.date >= startDate) && (!endDate || transaction.date <= endDate);
}

/** Sort table rows by the selected display column using resolved category and account labels. */
function sortTransactionTableRows(
  rows: Array<{ transaction: Transaction; category?: Category; account?: Account }>,
  sort: TransactionSort,
) {
  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    let comparison = 0;

    if (sort.key === 'amount') {
      comparison = Math.abs(left.transaction.amount) - Math.abs(right.transaction.amount);
    } else {
      const leftValue = getTransactionSortValue(left, sort.key);
      const rightValue = getTransactionSortValue(right, sort.key);
      comparison = leftValue.localeCompare(rightValue, 'en-SG', { sensitivity: 'base', numeric: true });
    }

    if (comparison === 0) {
      comparison = right.transaction.date.localeCompare(left.transaction.date);
    }

    return comparison * direction;
  });
}

function getTransactionSortValue(
  row: { transaction: Transaction; category?: Category; account?: Account },
  key: Exclude<TransactionSortKey, 'amount'>,
) {
  if (key === 'date') return row.transaction.date;
  if (key === 'description') return row.transaction.description;
  if (key === 'category') return row.category?.name ?? 'Category';
  if (key === 'account') return row.account ? accountTypeLabel(row.account.type) : 'Account';
  return row.transaction.transactionType;
}

function formatMonthOptionLabel(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
}

/** Format a transaction date without relative labels for the details dialog. */
function formatTransactionFullDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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
    tags,
    session,
    syncStatus,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addTag,
    updateTag,
    deleteTag,
    getCategoryById,
    getAccountById,
    notify,
  } = useFireBuddy();
  const initialParams = new URLSearchParams(location.search);
  const initialSearchQuery = initialParams.get('search') ?? '';
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const latestMonth = getDeviceMonthKey();
  const requestedMonth = initialParams.get('month');
  const [selectedMonth, setSelectedMonth] = useState(requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : latestMonth);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sort, setSort] = useState<TransactionSort>({ key: 'date', direction: 'desc' });
  const [openTransactionMenu, setOpenTransactionMenu] = useState<TransactionActionMenuState | null>(null);
  const [duplicatingTransactionId, setDuplicatingTransactionId] = useState<string | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const dismissedRequestedTransactionId = useRef<string | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  const [transactionDeleteError, setTransactionDeleteError] = useState<string | null>(null);
  const transactionDeleteDialogRef = useAccessibleDialog<HTMLElement>({
    isOpen: Boolean(deletingTransaction),
    canClose: !isDeletingTransaction,
    onClose: () => setDeletingTransaction(null),
  });
  const transactionDetailsDialogRef = useAccessibleDialog<HTMLElement>({
    isOpen: Boolean(viewingTransaction),
    onClose: closeTransactionDetails,
  });
  const transactionMonthOptions = useMemo(
    () => getTransactionMonthOptions(transactions, latestMonth),
    [latestMonth, transactions],
  );
  const selectedMonthIndex = transactionMonthOptions.indexOf(selectedMonth);
  const isCustomRangeMode = Boolean(customStartDate || customEndDate);
  const requestedTransactionId = new URLSearchParams(location.search).get('transactionId');

  /** Close transaction details and keep the remaining transaction filters in the URL. */
  function closeTransactionDetails() {
    dismissedRequestedTransactionId.current = requestedTransactionId;
    setViewingTransaction(null);
    const params = new URLSearchParams(location.search);
    params.delete('transactionId');
    navigate({ pathname: location.pathname, search: params.size ? `?${params.toString()}` : '' }, { replace: true });
  }

  useEffect(() => {
    if ((syncStatus === 'ready' || !session) && !transactionMonthOptions.includes(selectedMonth)) {
      setSelectedMonth(transactionMonthOptions[0] ?? latestMonth);
    }
  }, [latestMonth, selectedMonth, session, syncStatus, transactionMonthOptions]);

  useEffect(() => {
    if (!requestedTransactionId) {
      dismissedRequestedTransactionId.current = null;
      return;
    }
    if (dismissedRequestedTransactionId.current === requestedTransactionId) return;
    const requestedTransaction = transactions.find((transaction) => transaction.id === requestedTransactionId);
    if (requestedTransaction) {
      setSelectedMonth(requestedTransaction.date.slice(0, 7));
      setViewingTransaction((current) => current?.id === requestedTransaction.id ? current : requestedTransaction);
      return;
    }
    if (syncStatus === 'ready' || !session) {
      notify('That transaction is no longer available.');
      const params = new URLSearchParams(location.search);
      params.delete('transactionId');
      navigate({ pathname: location.pathname, search: params.size ? `?${params.toString()}` : '' }, { replace: true });
    }
  }, [location.pathname, location.search, navigate, notify, requestedTransactionId, session, syncStatus, transactions]);

  useEffect(() => {
    if (!openTransactionMenu) {
      return undefined;
    }

    const menuId = `transaction-action-menu-${openTransactionMenu.transaction.id}`;
    const triggerId = `transaction-action-trigger-${openTransactionMenu.transaction.id}`;

    function closeMenuOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      const menu = document.getElementById(menuId);
      const trigger = document.getElementById(triggerId);
      if (target instanceof Node && (menu?.contains(target) || trigger?.contains(target))) {
        return;
      }
      setOpenTransactionMenu(null);
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      setOpenTransactionMenu(null);
      document.getElementById(triggerId)?.focus();
    }

    function closeMenuOnViewportChange() {
      setOpenTransactionMenu(null);
    }

    document.addEventListener('pointerdown', closeMenuOnOutsidePointer);
    document.addEventListener('keydown', closeMenuOnEscape);
    window.addEventListener('resize', closeMenuOnViewportChange);
    window.addEventListener('scroll', closeMenuOnViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', closeMenuOnOutsidePointer);
      document.removeEventListener('keydown', closeMenuOnEscape);
      window.removeEventListener('resize', closeMenuOnViewportChange);
      window.removeEventListener('scroll', closeMenuOnViewportChange, true);
    };
  }, [openTransactionMenu]);

  const filteredTransactionRows = useMemo(() => {
    const rows = transactions
      .map((transaction) => ({
        transaction,
        category: getCategoryById(transaction.category),
        account: transaction.account ? getAccountById(transaction.account) : undefined,
      }))
      .filter((row) => {
        const { transaction, category, account } = row;
        const normalizedQuery = searchQuery.toLowerCase();
        const matchesSearch =
          !normalizedQuery ||
          transaction.description.toLowerCase().includes(normalizedQuery) ||
          category?.name.toLowerCase().includes(normalizedQuery) ||
          account?.name.toLowerCase().includes(normalizedQuery);
        const matchesCategory = !selectedCategory || transaction.category === selectedCategory;
        const matchesAccount = !selectedAccount || transaction.account === selectedAccount;
        const matchesType = !selectedType || transaction.transactionType === selectedType;
        const matchesTag = !selectedTag || (transaction.tagIds ?? []).includes(selectedTag);
        const matchesDate = matchesTransactionDateRange(transaction, selectedMonth, customStartDate, customEndDate);

        return matchesSearch && matchesCategory && matchesAccount && matchesType && matchesTag && matchesDate;
      });

    return sortTransactionTableRows(rows, sort);
  }, [customEndDate, customStartDate, getAccountById, getCategoryById, searchQuery, selectedAccount, selectedCategory, selectedMonth, selectedTag, selectedType, sort, transactions]);

  const tagUsageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    transactions.forEach((transaction) => (transaction.tagIds ?? []).forEach((tagId) => counts.set(tagId, (counts.get(tagId) ?? 0) + 1)));
    return counts;
  }, [transactions]);

  const expenseTotal = filteredTransactionRows
    .filter((row) => row.transaction.transactionType === 'expense')
    .reduce((total, row) => total + Math.abs(row.transaction.amount), 0);
  const incomeTotal = filteredTransactionRows
    .filter((row) => row.transaction.transactionType === 'income')
    .reduce((total, row) => total + Math.abs(row.transaction.amount), 0);
  const activeEditingTransaction = editingTransaction
    ? transactions.find((transaction) => transaction.id === editingTransaction.id) ?? editingTransaction
    : null;
  const activeDeletingTransaction = deletingTransaction
    ? transactions.find((transaction) => transaction.id === deletingTransaction.id) ?? deletingTransaction
    : null;
  const activeViewingTransaction = viewingTransaction
    ? transactions.find((transaction) => transaction.id === viewingTransaction.id) ?? viewingTransaction
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
    setSelectedType(null);
    setSelectedTag(null);
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedMonth(latestMonth);
    setSort({ key: 'date', direction: 'desc' });
  }

  /** Export from the server when signed in and use an identical local CSV in demo mode. */
  async function exportTransactionHistory(scope: TransactionExportScope) {
    const filteredDates = isCustomRangeMode
      ? { ...(customStartDate ? { startDate: customStartDate } : {}), ...(customEndDate ? { endDate: customEndDate } : {}) }
      : {
          startDate: `${selectedMonth}-01`,
          endDate: getDeviceDateKey(new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0)),
        };
    const filters: TransactionExportFilters = scope === 'filtered' ? {
      ...filteredDates,
      ...(selectedType ? { transactionType: selectedType } : {}),
      ...(selectedCategory ? { categoryId: selectedCategory } : {}),
      ...(selectedAccount ? { accountId: selectedAccount } : {}),
      ...(selectedTag ? { tagId: selectedTag } : {}),
      ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
    } : {};
    if (session) {
      const result = await exportApiTransactions(session.access_token, filters);
      downloadCsvBlob(result.blob, result.filename);
    } else {
      const selectedTransactions = filterLocalExportTransactions(transactions, categories, accounts, filters);
      downloadCsvBlob(new Blob([buildTransactionCsv(selectedTransactions, categories, accounts, tags)], { type: 'text/csv;charset=utf-8' }), getTransactionExportFilename(filters));
    }
  }

  function changeSort(nextKey: TransactionSortKey) {
    setSort((current) => ({
      key: nextKey,
      direction: current.key === nextKey && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  /** Position the row action menu in the viewport so table overflow cannot clip it. */
  function toggleTransactionActionMenu(event: ReactMouseEvent<HTMLButtonElement>, transaction: Transaction) {
    if (openTransactionMenu?.transaction.id === transaction.id) {
      setOpenTransactionMenu(null);
      return;
    }

    const menuWidth = 184;
    const menuHeight = 132;
    const viewportGap = 8;
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const top = window.innerHeight - triggerRect.bottom >= menuHeight + viewportGap
      ? triggerRect.bottom + 6
      : Math.max(viewportGap, triggerRect.top - menuHeight - 6);
    const left = Math.min(
      Math.max(viewportGap, triggerRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportGap,
    );

    setOpenTransactionMenu({ transaction, top, left });
    window.setTimeout(() => {
      document.getElementById(`transaction-action-menu-${transaction.id}`)
        ?.querySelector<HTMLElement>('[role="menuitem"]')
        ?.focus();
    }, 0);
  }

  /** Keep arrow-key movement contained within the open transaction action menu. */
  function handleTransactionMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
    if (!items.length) {
      return;
    }

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
    if (event.key === 'ArrowUp') nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    items[nextIndex]?.focus();
  }

  /** Create an independent transaction using the selected row's current values. */
  async function duplicateTransaction(transaction: Transaction) {
    if (duplicatingTransactionId) {
      return;
    }

    setDuplicatingTransactionId(transaction.id);
    try {
      await addTransaction({
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date,
        account: transaction.account,
        transactionType: transaction.transactionType,
        tagIds: transaction.tagIds ?? [],
      });
      setOpenTransactionMenu(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to duplicate transaction.');
    } finally {
      setDuplicatingTransactionId(null);
    }
  }

  return (
    <main className="page page-transactions">
      <PageToolbar
        title="Transactions"
        description="Review income and expenses across your accounts."
        actions={<>
          <button className="secondary-button" type="button" onClick={() => setShowTagManager(true)}>
            <TagsIcon size={15} /> Manage tags
          </button>
          <button className="secondary-button" type="button" onClick={() => setShowExportDialog(true)}>
            <Download size={15} /> Export CSV
          </button>
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
        <div className="transactions-period-panel">
          <div>
            <span>Reporting period</span>
            <strong>{isCustomRangeMode ? 'Custom range' : formatMonthOptionLabel(selectedMonth)}</strong>
          </div>
          <div className="dashboard-period transactions-period" role="group" aria-label="Transaction reporting period controls">
            <button
              type="button"
              aria-label="Show previous month"
              disabled={selectedMonthIndex === transactionMonthOptions.length - 1}
              onClick={() => setSelectedMonth(getAdjacentTransactionMonth(transactionMonthOptions, selectedMonth, 'older'))}
            >
              <ChevronLeft size={16} />
            </button>
            <label className="dashboard-period-picker">
              <select
                aria-label="Transaction reporting period"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              >
                {transactionMonthOptions.map((month) => (
                  <option key={month} value={month}>{formatMonthOptionLabel(month)}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-label="Show next month"
              disabled={selectedMonthIndex <= 0}
              onClick={() => setSelectedMonth(getAdjacentTransactionMonth(transactionMonthOptions, selectedMonth, 'newer'))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

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

          <div className="transaction-date-range" aria-label="Custom date range">
            <label>
              <span>Start date</span>
              <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
            </label>
            <label>
              <span>End date</span>
              <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
            </label>
            {isCustomRangeMode ? (
              <button className="secondary-button" type="button" onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
              }}>
                Clear dates
              </button>
            ) : null}
          </div>
        </div>
        <article className="summary-strip">
          <div className="summary-expense">
            <span>Filtered expenses</span>
            <strong className="amount-negative">- {formatSGD(expenseTotal)}</strong>
          </div>
          <div className="summary-income">
            <span>Filtered income</span>
            <strong className="amount-positive">+ {formatSGD(incomeTotal)}</strong>
          </div>
        </article>

        <div className="select-filter-grid">
          <label>
            <span>Type</span>
            <select value={selectedType ?? ''} onChange={(event) => setSelectedType((event.target.value || null) as TransactionType | null)}>
              <option value="">All types</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </label>
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
          <label>
            <span>Tag</span>
            <select value={selectedTag ?? ''} onChange={(event) => setSelectedTag(event.target.value || null)}>
              <option value="">All tags</option>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </label>
        </div>

        <div className="transactions-table-shell">
          {filteredTransactionRows.length ? (
            <table className="transactions-table">
              <caption>Transactions for {isCustomRangeMode ? 'the selected date range' : formatMonthOptionLabel(selectedMonth)}</caption>
              <colgroup>
                <col className="transaction-column-date" />
                <col className="transaction-column-description" />
                <col className="transaction-column-category" />
                <col className="transaction-column-account" />
                <col className="transaction-column-type" />
                <col className="transaction-column-amount" />
                <col className="transaction-column-actions" />
              </colgroup>
              <thead>
                <tr>
                  {(['date', 'description', 'category', 'account', 'type', 'amount'] as const).map((key) => (
                    <th key={key} scope="col" aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button
                        className="transaction-sort-button"
                        type="button"
                        onClick={() => changeSort(key)}
                        aria-label={`Sort by ${transactionSortLabels[key].toLowerCase()} ${sort.key === key && sort.direction === 'asc' ? 'descending' : 'ascending'}`}
                      >
                        <span className="transaction-sort-label">{transactionSortLabels[key]}</span>
                        {sort.key === key ? (
                          <ChevronUp className={sort.direction === 'desc' ? 'sort-icon-desc' : ''} size={14} />
                        ) : (
                          <ChevronsUpDown size={14} />
                        )}
                      </button>
                    </th>
                  ))}
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactionRows.map(({ transaction, category, account }) => {
                  const isIncome = transaction.transactionType === 'income';

                  return (
                    <tr
                      key={transaction.id}
                      className="transaction-row-interactive"
                      tabIndex={0}
                      aria-label={`View details for ${transaction.description}`}
                      onClick={(event) => {
                        event.currentTarget.focus();
                        setViewingTransaction(transaction);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) {
                          return;
                        }
                        event.preventDefault();
                        setViewingTransaction(transaction);
                      }}
                    >
                      <td className="transaction-table-date" data-label="Date">
                        {formatDateLabel(transaction.date)}
                      </td>
                      <td data-label="Description">
                        <strong className="transaction-table-cell-text" title={transaction.description}>
                          {transaction.description}
                        </strong>
                        {(transaction.tagIds ?? []).length ? <span className="transaction-row-tags">
                          {(transaction.tagIds ?? []).slice(0, 2).map((tagId) => {
                            const tag = tags.find((item) => item.id === tagId);
                            return tag ? <span className="transaction-tag-chip" key={tag.id}>{tag.name}</span> : null;
                          })}
                          {(transaction.tagIds ?? []).length > 2 ? <span className="transaction-tag-more">+{(transaction.tagIds ?? []).length - 2}</span> : null}
                        </span> : null}
                      </td>
                      <td data-label="Category">
                        <span className="transaction-table-category">
                          <CategoryAvatar category={category} />
                          <span className="transaction-table-cell-text" title={category?.name ?? 'Category'}>
                            {category?.name ?? 'Category'}
                          </span>
                        </span>
                      </td>
                      <td data-label="Account">
                        <span
                          className="transaction-table-cell-text"
                          title={account ? accountTypeLabel(account.type) : 'Account'}
                        >
                          {account ? accountTypeLabel(account.type) : 'Account'}
                        </span>
                      </td>
                      <td data-label="Type">
                        <span className={`transaction-type-badge ${isIncome ? 'transaction-type-income' : 'transaction-type-expense'}`}>
                          {isIncome ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td data-label="Amount">
                        <strong className={isIncome ? 'amount-positive' : 'amount-negative'}>
                          {isIncome ? '+' : '-'} {formatSGD(transaction.amount)}
                        </strong>
                      </td>
                      <td data-label="Actions">
                        <div className="transaction-table-actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            id={`transaction-action-trigger-${transaction.id}`}
                            className="transaction-action-trigger"
                            type="button"
                            aria-label={`Actions for ${transaction.description}`}
                            aria-haspopup="menu"
                            aria-expanded={openTransactionMenu?.transaction.id === transaction.id}
                            aria-controls={openTransactionMenu?.transaction.id === transaction.id
                              ? `transaction-action-menu-${transaction.id}`
                              : undefined}
                            onClick={(event) => toggleTransactionActionMenu(event, transaction)}
                          >
                            <Ellipsis size={18} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
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

      {openTransactionMenu ? createPortal(
        <div
          id={`transaction-action-menu-${openTransactionMenu.transaction.id}`}
          className="transaction-action-menu"
          role="menu"
          aria-label={`Actions for ${openTransactionMenu.transaction.description}`}
          style={{ top: openTransactionMenu.top, left: openTransactionMenu.left }}
          onKeyDown={handleTransactionMenuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenTransactionMenu(null);
              setEditingTransaction(openTransactionMenu.transaction);
            }}
          >
            <Pencil size={15} />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={duplicatingTransactionId === openTransactionMenu.transaction.id}
            onClick={() => void duplicateTransaction(openTransactionMenu.transaction)}
          >
            <Copy size={15} />
            {duplicatingTransactionId === openTransactionMenu.transaction.id ? 'Duplicating...' : 'Duplicate'}
          </button>
          <button
            className="transaction-action-menu-danger"
            type="button"
            role="menuitem"
            onClick={() => {
              setOpenTransactionMenu(null);
              setTransactionDeleteError(null);
              setDeletingTransaction(openTransactionMenu.transaction);
            }}
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>,
        document.body,
      ) : null}

      {activeViewingTransaction ? (
        <div className="sheet-backdrop" onClick={closeTransactionDetails}>
          <aside
            ref={transactionDetailsDialogRef}
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
                <h3 id="transaction-details-title">{activeViewingTransaction.description}</h3>
              </div>
              <button
                data-dialog-initial-focus
                className="plain-icon-button"
                type="button"
                aria-label="Close transaction details"
                onClick={closeTransactionDetails}
              >
                <X size={18} />
              </button>
            </header>

            <div className="transaction-details-amount">
              <span>{activeViewingTransaction.transactionType === 'income' ? 'Income' : 'Expense'}</span>
              <strong className={activeViewingTransaction.transactionType === 'income' ? 'amount-positive' : 'amount-negative'}>
                {activeViewingTransaction.transactionType === 'income' ? '+' : '-'} {formatSGD(activeViewingTransaction.amount)}
              </strong>
            </div>

            <dl className="transaction-details-list">
              <div>
                <dt>Date</dt>
                <dd>{formatTransactionFullDate(activeViewingTransaction.date)}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd className="transaction-details-category">
                  <CategoryAvatar category={getCategoryById(activeViewingTransaction.category)} />
                  <span>{getCategoryById(activeViewingTransaction.category)?.name ?? 'Category'}</span>
                </dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>{getAccountMeta(activeViewingTransaction.account ? getAccountById(activeViewingTransaction.account) : undefined)}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{activeViewingTransaction.transactionType === 'income' ? 'Income' : 'Expense'}</dd>
              </div>
              <div>
                <dt>Tags</dt>
                <dd className="transaction-details-tags">
                  {(activeViewingTransaction.tagIds ?? []).length
                    ? (activeViewingTransaction.tagIds ?? []).map((tagId) => tags.find((tag) => tag.id === tagId)).filter((tag): tag is Tag => Boolean(tag)).map((tag) => <span className="transaction-tag-chip" key={tag.id}>{tag.name}</span>)
                    : <span className="field-help">No tags</span>}
                </dd>
              </div>
            </dl>

            <footer className="transaction-details-actions">
              <button className="secondary-button" type="button" onClick={closeTransactionDetails}>
                Close
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  closeTransactionDetails();
                  setEditingTransaction(activeViewingTransaction);
                }}
              >
                <Pencil size={15} />
                Edit transaction
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      {activeEditingTransaction ? (
        <TransactionSheet
          key={activeEditingTransaction.id}
          transaction={activeEditingTransaction}
          accounts={accounts}
          categories={categories}
          tags={tags}
          session={session}
          syncStatus={syncStatus}
          onClose={() => setEditingTransaction(null)}
          onCreateTag={addTag}
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
      {showTagManager ? <TagManagerDialog tags={tags} usageCounts={tagUsageCounts} onCreate={addTag} onRename={updateTag} onDelete={deleteTag} onClose={() => setShowTagManager(false)} /> : null}
      {showExportDialog ? <TransactionExportDialog onExport={exportTransactionHistory} onClose={() => setShowExportDialog(false)} /> : null}
    </main>
  );
}

function TransactionSheet({
  transaction,
  accounts,
  categories,
  tags,
  session,
  syncStatus,
  onSave,
  onDelete,
  onClose,
  onCreateTag,
}: {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
  session: Session | null;
  syncStatus: 'idle' | 'loading' | 'ready' | 'error';
  onSave: (updates: Partial<Transaction>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  onCreateTag: (name: string) => Promise<Tag>;
}) {
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(String(Math.abs(transaction.amount)));
  const [date, setDate] = useState(transaction.date);
  const [category, setCategory] = useState(transaction.category);
  const [account, setAccount] = useState(transaction.account ?? accounts[0]?.id ?? '');
  const [transactionType, setTransactionType] = useState<TransactionType>(transaction.transactionType);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(transaction.tagIds ?? []);
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
        tagIds: selectedTagIds,
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

          <TransactionTagSelector
            tags={tags}
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
            onCreate={onCreateTag}
            disabled={isBusy}
          />

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
