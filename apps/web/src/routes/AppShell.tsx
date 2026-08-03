import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { apiRoutes, type RagChatMessage, type RagChatResponse } from '@firebuddy/shared';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Database,
  Download,
  Filter,
  Grid2X2,
  HelpCircle,
  Home,
  Lock,
  LogOut,
  Maximize2,
  MessageSquare,
  Minimize2,
  MoreHorizontal,
  Moon,
  PanelLeft,
  Pencil,
  Plus,
  Search,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  TrendingUp,
  User,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react';
import {
  CHAT_ACTIVE_TOPIC_STORAGE_KEY,
  CHAT_GREETING,
  CHAT_PROMPTS,
  CHAT_TOPICS_STORAGE_KEY,
  accountTypeLabel,
  categoryColors,
  categoryIconOptions,
  colors,
  describeDonutSegment,
  fireData,
  formatDateLabel,
  formatSGD,
  getAccountMeta,
  getCategoryIcon,
  getDeviceDateKey,
  getDeviceMonthKey,
  legacyCategoryIconIds,
  polarPoint,
  sortTransactionsNewestFirst,
  useFireBuddy,
  type Account,
  type AccountType,
  type Category,
  type ChatTopic,
  type Transaction,
} from '../app/FireBuddyProvider';

const Insights = lazy(() => import('./Insights'));
const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/categories', icon: Grid2X2, label: 'Categories' },
  { path: '/insights', icon: Download, label: 'Insights' },
] as const;
const categoryBudgetInputPattern = /^\d{0,8}(?:\.\d{0,2})?$/;

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

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

  function openAddTransaction() {
    navigate('/add', {
      state: {
        backgroundPath: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }

  return (
    <div className="figma-app-root">
      <aside className="desktop-sidebar">
        <div className="sidebar-logo">
          <h1>FireBuddy</h1>
          <p>SG FIRE Tracker</p>
        </div>

        <nav className="desktop-nav" aria-label="Primary">
          {navItems.map((item) => (
            <SidebarNavItem key={item.path} {...item} />
          ))}
        </nav>

        <button className="sidebar-add-button button-press" type="button" onClick={openAddTransaction}>
          <Plus size={16} strokeWidth={2} />
          Add Transaction
        </button>
        <button className="sidebar-profile-button" type="button" onClick={() => navigate('/profile')}>
          <User size={16} strokeWidth={1.8} />
          Profile
        </button>
      </aside>

      <div className="app-container">
        <div className="content-wrapper">
          <div className="scroll-area">
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="categories" element={<Categories />} />
              <Route path="profile" element={<Profile />} />
              <Route path="insights" element={<Suspense fallback={<InsightsFallback />}><Insights /></Suspense>} />
              <Route path="analytics" element={<Navigate to="/insights" replace />} />
              <Route path="accounts" element={<Accounts />} />
            </Routes>
          </div>
          <MobileNav />
        </div>
      </div>
      <ChatWidget />
      <CrudToast />
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
}: {
  path: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) => `desktop-nav-link ${isActive ? 'desktop-nav-link-active' : ''}`}
      end={path === '/'}
    >
      <Icon size={18} strokeWidth={1.7} />
      <span>{label}</span>
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
        {navItems.slice(0, 2).map((item) => (
          <MobileTabItem key={item.path} {...item} />
        ))}
      </div>
      <div className="mobile-fab-spacer" />
      <div className="mobile-nav-group">
        {navItems.slice(2).map((item) => (
          <MobileTabItem key={item.path} {...item} />
        ))}
      </div>
      <button className="mobile-fab button-press fab-pulse" type="button" onClick={openAddTransaction}>
        <Plus size={24} strokeWidth={2.4} />
      </button>
    </nav>
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

function Dashboard() {
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
    .filter((transaction) => transaction.amount < 0)
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
  const totalIncome = monthTransactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((total, transaction) => total + transaction.amount, 0);
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
            <h2>{fireData.name}</h2>
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
            <button className="icon-button translucent" type="button" aria-label="Notifications">
              <Bell size={22} strokeWidth={1.6} />
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
              <p className="card-label">Total Balance</p>
              <h1>{formatSGD(fireData.currentNetWorth, 0)}</h1>
            </div>
            <button className="plain-icon-button" type="button" aria-label="More">
              <MoreHorizontal size={22} />
            </button>
          </div>

          <div className="balance-stats">
            <div className="balance-stat">
              <span className="round-icon">
                <ArrowDownLeft size={18} />
              </span>
              <div className="balance-income">
                <p>Income</p>
                <strong>{formatSGD(totalIncome, 0)}</strong>
              </div>
            </div>
            <div className="balance-stat">
              <span className="round-icon">
                <ArrowUpRight size={18} />
              </span>
              <div className="balance-expenses">
                <p>Expenses</p>
                <strong>{formatSGD(totalExpenses, 0)}</strong>
              </div>
            </div>
          </div>
        </article>

        <div className="dashboard-top-grid">
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
                <p className="eyebrow">FIRE progress</p>
                <h3>Target snapshot</h3>
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
        </div>

        <section className="content-section transactions-history-section">
          <div className="section-title-row">
            <h3>Transactions History</h3>
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
  const amountClass = transaction.amount > 0 ? 'amount-positive' : 'amount-negative';
  const className = variant === 'compact' ? 'transaction-item' : 'transaction-card';
  const content = (
    <>
      <CategoryAvatar category={category} />
      <div className="transaction-copy">
        <strong>{transaction.description}</strong>
        <span>
          {formatDateLabel(transaction.date)} {'\u00B7'} {category?.name ?? 'Category'} {'\u00B7'} {getAccountMeta(account)}
        </span>
      </div>
      <div className="transaction-amount-actions">
        <strong className={amountClass}>
          {transaction.amount > 0 ? '+ ' : '- '}
          {formatSGD(transaction.amount)}
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
    .filter((category) => category.id !== 'income')
    .map((category) => ({
      name: category.name,
      value: transactions
        .filter((transaction) => transaction.category === category.id && transaction.amount < 0)
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('month');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  const [transactionDeleteError, setTransactionDeleteError] = useState<string | null>(null);

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
    .filter((transaction) => transaction.amount < 0)
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

  return (
    <main className="page">
      <section className="screen-header">
        <div className="header-row">
          <h2>Transactions</h2>
          <div className="header-actions">
            <button className="pill-button inverse" type="button" onClick={() => navigate('/accounts')}>
              <Wallet size={14} />
              Accounts
            </button>
            <button
              className="pill-button inverse-white"
              type="button"
              onClick={() =>
                navigate('/add', {
                  state: {
                    backgroundPath: `${location.pathname}${location.search}${location.hash}`,
                  },
                })
              }
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>

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
          {(['month', 'week', 'all'] as const).map((filter) => (
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
      </section>

      <section className="screen-content">
        <article className="summary-strip">
          <div>
            <span>Filtered spend</span>
            <strong>{formatSGD(monthTotal)}</strong>
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
          {groupedTransactions.map(([date, dateTransactions]) => (
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
          ))}
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
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-transaction-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="delete-transaction-title">Delete transaction?</h3>
            <p>
              Delete <strong>{activeDeletingTransaction.description}</strong>? This action cannot be undone.
            </p>
            {transactionDeleteError ? <p className="form-error">{transactionDeleteError}</p> : null}
            <div className="sheet-actions">
              <button
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
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const availableCategories = useMemo(
    () =>
      session
        ? categories.filter((item) => item.isDefault || /^[0-9a-f-]{36}$/i.test(item.id) || /^\d+$/.test(item.id))
        : categories,
    [categories, session],
  );
  const selectedCategory = availableCategories.find((item) => item.id === category);
  const isIncome = selectedCategory?.name.toLowerCase() === 'income';
  const isBusy = isSaving || isDeleting;

  useEffect(() => {
    if (!category && availableCategories[0]) {
      setCategory(availableCategories[0].id);
      return;
    }

    if (category && !availableCategories.some((item) => item.id === category)) {
      setCategory(availableCategories[0]?.id ?? '');
    }
  }, [availableCategories, category]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0 || !category || isBusy) {
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await onSave({
        description: description.trim() || 'Unnamed expense',
        amount: isIncome ? Math.abs(numericAmount) : -Math.abs(numericAmount),
        category,
        date,
        account,
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
      <aside className="center-sheet transaction-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <h3>Edit transaction</h3>
          <button className="plain-icon-button" type="button" onClick={onClose} disabled={isBusy}>
            <X size={18} />
          </button>
        </div>

        <form className="sheet-body" onSubmit={save}>
          <label className="form-field">
            <span>Description</span>
            <input
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
            <button className="primary-button" type="submit" disabled={isBusy || syncStatus === 'loading'}>
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
  const expenseCategories = categories.filter((category) => category.id !== 'income');
  const totalSpend = transactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);

  return (
    <main className="page">
      <section className="screen-header slim">
        <div className="header-row">
          <h2>Categories</h2>
          <button className="pill-button inverse-white" type="button" onClick={() => setIsAdding(true)}>
            <Plus size={14} />
            Add
          </button>
        </div>
        <p className="header-subtitle">Manage your spend buckets and monthly budgets.</p>
      </section>

      <section className="screen-content">
        <div className="category-grid">
          {expenseCategories.map((category) => {
            const spend = getMonthlySpend(category.id);
            const percent = category.monthlyBudget > 0 ? Math.min((spend / category.monthlyBudget) * 100, 100) : 0;

            return (
              <article className="category-card" key={category.id}>
                <div className="category-top-row">
                  <CategoryAvatar category={category} variant="category-card" />
                  <button className="plain-icon-button muted" type="button" onClick={() => setEditingCategory(category)}>
                    <Pencil size={16} />
                  </button>
                </div>
                <h3>{category.name}</h3>
                <p>{formatSGD(spend, 0)} this month</p>
                <div className="progress-bar light">
                  <span style={{ width: `${percent}%`, backgroundColor: category.color }} />
                </div>
                <span className="category-budget">
                  {category.monthlyBudget > 0 ? `${percent.toFixed(0)}% of ${formatSGD(category.monthlyBudget, 0)}` : 'No budget'}
                </span>
              </article>
            );
          })}
        </div>

        <section className="content-section">
          <div className="section-title-row">
            <h3>Full breakdown</h3>
            <Filter size={18} color={colors.textMuted} />
          </div>
          <div className="category-breakdown">
            {expenseCategories.map((category) => {
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
        </section>
      </section>

      {isAdding ? (
        <CategorySheet
          mode="add"
          initial={{ icon: 'others', color: categoryColors[0], monthlyBudget: 0 }}
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

function CategorySheet({
  mode,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  mode: 'add' | 'edit';
  initial: Partial<Category>;
  onSave: (data: Partial<Category>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name ?? '');
  const [icon, setIcon] = useState(legacyCategoryIconIds[initial.icon ?? ''] ?? initial.icon ?? 'others');
  const [color, setColor] = useState(initial.color ?? categoryColors[0]);
  const [monthlyBudget, setMonthlyBudget] = useState(String(initial.monthlyBudget ?? 0));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const isBusy = isSaving || isDeleting;

  async function save() {
    if (!name.trim() || isBusy) {
      return;
    }

    const normalizedBudget = monthlyBudget.trim();
    if (
      normalizedBudget === '.' ||
      !categoryBudgetInputPattern.test(normalizedBudget) ||
      Number(normalizedBudget || 0) > 99999999.99
    ) {
      setBudgetError('Enter a budget up to 99,999,999.99 with no more than two decimal places.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await onSave({
        name: name.trim(),
        icon,
        color,
        monthlyBudget: Number(normalizedBudget) || 0,
        isDefault: initial.isDefault,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save category.');
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!onDelete || isBusy) {
      return;
    }

    setIsDeleting(true);
    setFormError(null);

    try {
      await onDelete();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete category.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={isBusy ? undefined : onClose}>
      <aside className="center-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <h3>{mode === 'add' ? 'New category' : 'Edit category'}</h3>
          <button className="plain-icon-button" type="button" onClick={onClose} disabled={isBusy}>
            <X size={18} />
          </button>
        </div>

        <div className="sheet-body">
          <label className="form-field">
            <span>Category name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dining out" disabled={isBusy} />
          </label>

          <div className="form-field">
            <span>Icon</span>
            <div className="icon-option-grid">
              {categoryIconOptions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={`icon-option ${icon === item.id ? 'icon-option-active' : ''}`}
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    disabled={isBusy}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                  </button>
                );
              })}
            </div>
          </div>

          <label className="form-field">
            <span>Monthly budget</span>
            <input
              value={monthlyBudget}
              onChange={(event) => {
                const nextValue = event.target.value.startsWith('.') ? `0${event.target.value}` : event.target.value;
                if (categoryBudgetInputPattern.test(nextValue)) {
                  setMonthlyBudget(nextValue);
                  setBudgetError(null);
                } else {
                  setBudgetError('Use numbers only, with up to two decimal places.');
                }
              }}
              inputMode="decimal"
              aria-invalid={Boolean(budgetError)}
              disabled={isBusy}
            />
          </label>
          {budgetError ? <p className="form-error">{budgetError}</p> : null}

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

          {showDeleteConfirm ? (
            <div className="delete-confirm">
              <p>Delete this category?</p>
              <button type="button" onClick={confirmDelete} disabled={isBusy}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ) : null}

          {formError ? <p className="form-error">{formError}</p> : null}

          <div className="sheet-actions">
            {onDelete ? (
              <button className="danger-button" type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isBusy}>
                <Trash2 size={15} />
                Delete
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

function Profile() {
  const navigate = useNavigate();
  const { session, signOut, themeMode, toggleTheme } = useFireBuddy();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const settings = [
    { icon: User, label: 'Account info', danger: false },
    { icon: Bell, label: 'Notifications', danger: false },
    { icon: Shield, label: 'Login and security', danger: false },
    { icon: Lock, label: 'Data and privacy', danger: false },
    { icon: HelpCircle, label: 'Help & feedback', danger: false },
    { icon: Database, label: 'Clear all data', danger: true },
    { icon: LogOut, label: 'Sign out', danger: true },
  ];

  function clearAllData() {
    window.localStorage.removeItem('firebuddy_web_transactions_v2');
    window.localStorage.removeItem('firebuddy_web_categories_v2');
    window.localStorage.removeItem('firebuddy_web_accounts_v2');
    window.location.reload();
  }

  return (
    <main className="page">
      <section className="profile-header">
        <div className="profile-avatar">{fireData.initials}</div>
        <h2>{fireData.name}</h2>
        <p>@{fireData.name.toLowerCase().replace(' ', '_')}</p>
      </section>

      <section className="profile-content">
        <article className="settings-card profile-account-card">
          <div className="setting-row setting-row-static">
            <span className="setting-icon">
              <User size={20} />
            </span>
            <strong>{session?.user.email ?? 'Signed in'}</strong>
          </div>
        </article>

        <article className="settings-card">
          <button
            className="setting-row setting-row-toggle"
            type="button"
            onClick={toggleTheme}
            aria-pressed={themeMode === 'dark'}
          >
            <span className="setting-icon">{themeMode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</span>
            <strong>Dark mode</strong>
            <span className="setting-state">{themeMode === 'dark' ? 'On' : 'Off'}</span>
          </button>
          {settings.map((setting) => (
            <button
              className={`setting-row ${setting.danger ? 'setting-row-danger' : ''}`}
              key={setting.label}
              type="button"
              onClick={() => {
                if (setting.label === 'Clear all data') {
                  setShowClearDialog(true);
                  return;
                }

                if (setting.label === 'Sign out') {
                  void signOut();
                  return;
                }

                if ('route' in setting && setting.route) {
                  navigate(setting.route);
                }
              }}
            >
              <span className="setting-icon">
                <setting.icon size={20} />
              </span>
              <strong>{setting.label}</strong>
              {!setting.danger ? <ChevronRight size={20} /> : null}
            </button>
          ))}
        </article>
      </section>

      {showClearDialog ? (
        <div className="sheet-backdrop">
          <aside className="confirm-dialog">
            <h3>Clear all local data?</h3>
            <p>This resets demo transactions, categories, and accounts.</p>
            <div className="sheet-actions">
              <button className="secondary-button" type="button" onClick={() => setShowClearDialog(false)}>
                Cancel
              </button>
              <button className="danger-button" type="button" onClick={clearAllData}>
                Clear
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

function createChatTopic(seedTitle = 'New chat'): ChatTopic {
  const now = new Date().toISOString();

  return {
    id: `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title: seedTitle,
    messages: [
      {
        role: 'assistant',
        content: CHAT_GREETING,
      },
    ],
    sources: [],
    createdAt: now,
    updatedAt: now,
  };
}

function loadChatTopics(): ChatTopic[] {
  const fallback = [createChatTopic()];

  try {
    const stored = window.localStorage.getItem(CHAT_TOPICS_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as ChatTopic[]) : fallback;

    return parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getTopicTitle(question: string) {
  const compact = question.replace(/\s+/g, ' ').trim();
  return compact.length > 42 ? `${compact.slice(0, 39)}...` : compact;
}

function ChatWidget() {
  const [topics, setTopics] = useState<ChatTopic[]>(() => loadChatTopics());
  const [activeTopicId, setActiveTopicId] = useState<string>(() => {
    const storedId = window.localStorage.getItem(CHAT_ACTIVE_TOPIC_STORAGE_KEY);
    const loadedTopics = loadChatTopics();
    return storedId && loadedTopics.some((topic) => topic.id === storedId) ? storedId : loadedTopics[0].id;
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTopicListOpen, setIsTopicListOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0];
  const canAsk = question.trim().length > 0 && !isAsking;

  useEffect(() => {
    if (!topics.some((topic) => topic.id === activeTopicId)) {
      setActiveTopicId(topics[0].id);
    }
  }, [activeTopicId, topics]);

  useEffect(() => {
    window.localStorage.setItem(CHAT_TOPICS_STORAGE_KEY, JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    window.localStorage.setItem(CHAT_ACTIVE_TOPIC_STORAGE_KEY, activeTopicId);
  }, [activeTopicId]);

  function updateActiveTopic(updater: (topic: ChatTopic) => ChatTopic) {
    setTopics((current) => current.map((topic) => (topic.id === activeTopic.id ? updater(topic) : topic)));
  }

  function startNewChat(seedQuestion?: string) {
    const nextTopic = createChatTopic(seedQuestion ? getTopicTitle(seedQuestion) : 'New chat');
    setTopics((current) => [nextTopic, ...current]);
    setActiveTopicId(nextTopic.id);
    setQuestion(seedQuestion ?? '');
    setError(null);
    setIsOpen(true);
  }

  async function askAdvisor(event?: FormEvent<HTMLFormElement>, overrideQuestion?: string) {
    event?.preventDefault();

    const trimmedQuestion = (overrideQuestion ?? question).trim();

    if (!trimmedQuestion || isAsking || !activeTopic) {
      return;
    }

    const userMessage: RagChatMessage = {
      role: 'user',
      content: trimmedQuestion,
    };
    const history = activeTopic.messages;

    updateActiveTopic((topic) => {
      const isUntitled = topic.title === 'New chat';
      return {
        ...topic,
        title: isUntitled ? getTopicTitle(trimmedQuestion) : topic.title,
        messages: [...topic.messages, userMessage],
        sources: [],
        updatedAt: new Date().toISOString(),
      };
    });
    setQuestion('');
    setError(null);
    setIsAsking(true);

    try {
      const response = await fetch(`${apiBaseUrl}${apiRoutes.financialAdvisorChat}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG service returned ${response.status}`);
      }

      const payload = (await response.json()) as RagChatResponse;

      if (!payload.answer) {
        throw new Error('RAG service returned an empty answer');
      }

      updateActiveTopic((topic) => ({
        ...topic,
        messages: [
          ...topic.messages,
          {
            role: 'assistant',
            content: payload.answer,
          },
        ],
        sources: payload.sources ?? [],
        updatedAt: new Date().toISOString(),
      }));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to reach the RAG service.';

      setError(
        `${message}. Start the backend RAG endpoint at ${apiRoutes.financialAdvisorChat}, or set VITE_API_BASE_URL if it is running elsewhere.`,
      );
      updateActiveTopic((topic) => ({
        ...topic,
        messages: topic.messages.filter((messageItem) => messageItem !== userMessage),
      }));
    } finally {
      setIsAsking(false);
    }
  }

  if (!isOpen) {
    return (
      <button className="chat-launcher button-press" type="button" onClick={() => setIsOpen(true)} aria-label="Open FireBuddy chat">
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className={isFullscreen ? 'chat-widget chat-widget-fullscreen' : 'chat-widget'}>
      <aside className={`chat-topic-panel ${isTopicListOpen || isFullscreen ? 'chat-topic-panel-open' : ''}`}>
        <div className="chat-topic-header">
          <strong>Chat topics</strong>
          <button className="chat-icon-button" type="button" onClick={() => startNewChat()}>
            <Plus size={16} />
          </button>
        </div>
        <div className="chat-topic-list">
          {topics.map((topic) => (
            <button
              className={`chat-topic-item ${topic.id === activeTopic.id ? 'chat-topic-item-active' : ''}`}
              key={topic.id}
              type="button"
              onClick={() => {
                setActiveTopicId(topic.id);
                setError(null);
                if (!isFullscreen) {
                  setIsTopicListOpen(false);
                }
              }}
            >
              <strong>{topic.title}</strong>
              <span>{new Date(topic.updatedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-shell" aria-label="FireBuddy financial advisor">
        <header className="chat-header">
          <button className="chat-icon-button" type="button" onClick={() => setIsTopicListOpen((current) => !current)} aria-label="Toggle chat topics">
            <PanelLeft size={18} />
          </button>
          <div className="chat-title-block">
            <span>FireBuddy advisor</span>
            <strong>{activeTopic.title}</strong>
          </div>
          <div className="chat-header-actions">
            <button className="chat-icon-button" type="button" onClick={() => setIsFullscreen((current) => !current)} aria-label={isFullscreen ? 'Exit fullscreen chat' : 'Expand chat'}>
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button className="chat-icon-button" type="button" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="chat-messages" aria-live="polite">
          {activeTopic.messages.map((message, index) => (
            <div className={`advisor-message advisor-message-${message.role}`} key={`${message.role}-${index}`}>
              <span>{message.role === 'user' ? 'You' : 'FireBuddy'}</span>
              <p>{message.content}</p>
            </div>
          ))}

          {isAsking ? (
            <div className="advisor-message advisor-message-assistant">
              <span>FireBuddy</span>
              <p>Searching the knowledge base...</p>
            </div>
          ) : null}
        </div>

        {activeTopic.sources.length > 0 ? (
          <div className="advisor-sources chat-sources">
            <strong>Sources</strong>
            <ul>
              {activeTopic.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="advisor-error">{error}</p> : null}

        {activeTopic.messages.length <= 1 ? (
          <div className="chat-prompts">
            {CHAT_PROMPTS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => askAdvisor(undefined, suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <form className="advisor-form chat-form" onSubmit={askAdvisor}>
          <label htmlFor="floating-advisor-question">Question</label>
          <textarea
            id="floating-advisor-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about CPF, SRS, HDB grants, or FIRE planning"
            rows={isFullscreen ? 3 : 2}
          />
          <div className="advisor-form-actions">
            <button className="secondary-button" type="button" onClick={() => startNewChat()}>
              New chat
            </button>
            <button className="primary-button" type="submit" disabled={!canAsk}>
              {isAsking ? 'Asking...' : 'Ask'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}


function InsightsFallback() {
  return <main className="page" />;
}
const accountTypes: {
  id: AccountType;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}[] = [
  { id: 'bank', label: 'Bank', icon: Building2 },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { id: 'debit_card', label: 'Debit Card', icon: WalletCards },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'ewallet', label: 'E-Wallet', icon: Smartphone },
];

function Accounts() {
  const navigate = useNavigate();
  const { accounts, transactions, addAccount, updateAccount, deleteAccount } = useFireBuddy();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <main className="page">
      <section className="analytics-header">
        <button className="plain-icon-button" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h2>Accounts</h2>
        <button className="plain-icon-button" type="button" onClick={() => setIsAdding(true)}>
          <Plus size={20} />
        </button>
      </section>

      <section className="screen-content">
        <div className="account-list">
          {accounts.map((account) => {
            const usageCount = transactions.filter((transaction) => transaction.account === account.id).length;
            const typeConfig = accountTypes.find((item) => item.id === account.type) ?? accountTypes[0];
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
                    {account.lastFour ? ` \u00B7 ${account.lastFour}` : ''} {'\u00B7'} {usageCount} transactions
                  </span>
                </div>
                <button className="plain-icon-button muted" type="button" onClick={() => setEditingAccount(account)}>
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
          onSave={(account) => {
            addAccount(account as Omit<Account, 'id'>);
            setIsAdding(false);
          }}
        />
      ) : null}

      {editingAccount ? (
        <AccountSheet
          mode="edit"
          initial={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={(updates) => {
            updateAccount(editingAccount.id, updates);
            setEditingAccount(null);
          }}
          onDelete={() => {
            deleteAccount(editingAccount.id);
            setEditingAccount(null);
          }}
        />
      ) : null}
    </main>
  );
}

function AccountSheet({
  mode,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  mode: 'add' | 'edit';
  initial: Partial<Account>;
  onSave: (data: Partial<Account>) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name ?? '');
  const [type, setType] = useState<AccountType>(initial.type ?? 'bank');
  const [color, setColor] = useState(initial.color ?? categoryColors[0]);
  const [lastFour, setLastFour] = useState(initial.lastFour ?? '');

  function save() {
    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      type,
      color,
      lastFour: lastFour.trim() || undefined,
    });
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside className="center-sheet account-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3>{mode === 'add' ? 'New account' : 'Edit account'}</h3>
          <button className="plain-icon-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body">
          <div className="type-chip-grid">
            {accountTypes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={`type-chip ${type === item.id ? 'type-chip-active' : ''}`}
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>
          <label className="form-field">
            <span>Account name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="DBS Savings" />
          </label>
          <label className="form-field">
            <span>Last four digits</span>
            <input value={lastFour} onChange={(event) => setLastFour(event.target.value)} maxLength={4} placeholder="4521" />
          </label>
          <div className="swatch-grid">
            {categoryColors.map((item) => (
              <button
                className={`swatch ${item === color ? 'swatch-active' : ''}`}
                key={item}
                style={{ backgroundColor: item }}
                type="button"
                onClick={() => setColor(item)}
                aria-label={item}
              >
                {item === color ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
              </button>
            ))}
          </div>
          <div className="sheet-actions">
            {onDelete ? (
              <button className="danger-button" type="button" onClick={onDelete}>
                <Trash2 size={15} />
                Delete
              </button>
            ) : null}
            <button className="primary-button" type="button" onClick={save}>
              Save
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}


export default Layout;
