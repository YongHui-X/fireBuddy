import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';
import type { Session } from '@supabase/supabase-js';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
  Clapperboard,
  CreditCard,
  Database,
  Download,
  Filter,
  Grid2X2,
  HelpCircle,
  HeartPulse,
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
  Plane,
  Plus,
  ReceiptText,
  Search,
  Shield,
  ShoppingBag,
  Smartphone,
  Sun,
  Trash2,
  Train,
  TrendingUp,
  Utensils,
  User,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react';
import {
  apiRoutes,
  type Category as ApiCategory,
  type Expense as ApiExpense,
  type RagChatMessage,
  type RagChatResponse,
} from '@firebuddy/shared';

import { createExpense, getCategories, getExpenses } from './api';
import { supabase } from './supabase';

const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true';

type AccountType = 'bank' | 'credit_card' | 'debit_card' | 'cash' | 'ewallet';
type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>;

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  account?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthlyBudget: number;
  isDefault?: boolean;
}

interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  lastFour?: string;
}

interface AppContextValue {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  themeMode: ThemeMode;
  session: Session | null;
  authLoading: boolean;
  authError: string | null;
  syncStatus: 'idle' | 'loading' | 'ready' | 'error';
  syncError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  getCategoryById: (id: string) => Category | undefined;
  getAccountById: (id: string) => Account | undefined;
  getMonthlySpend: (categoryId: string, month?: string) => number;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

type ThemeMode = 'light' | 'dark';

interface ChatTopic {
  id: string;
  title: string;
  messages: RagChatMessage[];
  sources: string[];
  createdAt: string;
  updatedAt: string;
}

function getDeviceDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDeviceMonthKey(dateKey = getDeviceDateKey()) {
  return dateKey.slice(0, 7);
}

const colors = {
  primary: '#3C8A61',
  primaryDark: '#25543D',
  primarySoft: '#DCEBDD',
  secondary: '#67B47C',
  background: '#F5F8F4',
  card: '#FFFFFF',
  muted: '#EEF5EF',
  border: '#D7E3D8',
  text: '#1F3D2E',
  textMuted: '#6B8577',
  danger: '#D64545',
  gold: '#E5B24A',
};

const fireData = {
  name: 'Alex Tan',
  initials: 'AT',
  currentNetWorth: 124850,
  targetNetWorth: 1800000,
  invested: 98400,
  cash: 26450,
  projectedFireYear: 2043,
  emergencyMonths: 8.2,
};

const categoryColors = [
  '#3C8A61',
  '#67B47C',
  '#E5B24A',
  '#7BAA90',
  '#2E9B57',
  '#8BB89D',
  '#25543D',
  '#A8D3B7',
];

const categoryIconOptions = [
  { id: 'food', label: 'Food & Drink', icon: Utensils },
  { id: 'transport', label: 'Transport', icon: Train },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'utilities', label: 'Bills & Utilities', icon: ReceiptText },
  { id: 'health', label: 'Healthcare', icon: HeartPulse },
  { id: 'entertainment', label: 'Entertainment', icon: Clapperboard },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'others', label: 'Others', icon: CircleHelp },
  { id: 'income', label: 'Income', icon: TrendingUp },
] as const satisfies readonly { id: string; label: string; icon: IconComponent }[];

const categoryIconsById = new Map<string, IconComponent>(
  categoryIconOptions.map((option) => [option.id, option.icon]),
);

const legacyCategoryIconIds: Record<string, string> = {
  FD: 'food',
  TR: 'transport',
  SH: 'shopping',
  BU: 'utilities',
  HC: 'health',
  EN: 'entertainment',
  TV: 'travel',
  OT: 'others',
  IN: 'income',
  NW: 'others',
};

const initialCategories: Category[] = [
  { id: 'food', name: 'Food & Drink', color: '#3C8A61', icon: 'food', monthlyBudget: 600, isDefault: true },
  { id: 'transport', name: 'Transport', color: '#67B47C', icon: 'transport', monthlyBudget: 250, isDefault: true },
  { id: 'shopping', name: 'Shopping', color: '#E5B24A', icon: 'shopping', monthlyBudget: 300, isDefault: true },
  { id: 'utilities', name: 'Bills & Utilities', color: '#7BAA90', icon: 'utilities', monthlyBudget: 150, isDefault: true },
  { id: 'health', name: 'Healthcare', color: '#2E9B57', icon: 'health', monthlyBudget: 150, isDefault: true },
  { id: 'entertainment', name: 'Entertainment', color: '#8BB89D', icon: 'entertainment', monthlyBudget: 200, isDefault: true },
  { id: 'travel', name: 'Travel', color: '#25543D', icon: 'travel', monthlyBudget: 400, isDefault: true },
  { id: 'others', name: 'Others', color: '#A8D3B7', icon: 'others', monthlyBudget: 200, isDefault: true },
  { id: 'income', name: 'Income', color: '#25543D', icon: 'income', monthlyBudget: 0, isDefault: true },
];

const initialAccounts: Account[] = [
  { id: 'dbs_savings', name: 'DBS Savings', type: 'bank', color: '#3C8A61', lastFour: '4521' },
  { id: 'ocbc_360', name: 'OCBC 360', type: 'bank', color: '#67B47C', lastFour: '8834' },
  { id: 'dbs_altitude', name: 'DBS Altitude', type: 'credit_card', color: '#7BAA90', lastFour: '1234' },
  { id: 'grabpay', name: 'GrabPay', type: 'ewallet', color: '#2E9B57' },
  { id: 'cash_wallet', name: 'Cash', type: 'cash', color: '#E5B24A' },
];

const initialTransactions: Transaction[] = [
  { id: '1', description: 'Hawker Centre lunch', amount: -8.5, category: 'food', date: '2026-04-14', account: 'grabpay' },
  { id: '2', description: 'MRT Bishan to City Hall', amount: -1.82, category: 'transport', date: '2026-04-14', account: 'dbs_savings' },
  { id: '3', description: 'April salary', amount: 6500, category: 'income', date: '2026-04-14', account: 'dbs_savings' },
  { id: '4', description: 'Cold Storage groceries', amount: -67.4, category: 'food', date: '2026-04-13', account: 'dbs_altitude' },
  { id: '5', description: 'Grab ride home', amount: -12.5, category: 'transport', date: '2026-04-13', account: 'grabpay' },
  { id: '6', description: 'Netflix subscription', amount: -10.98, category: 'entertainment', date: '2026-04-13', account: 'dbs_altitude' },
  { id: '7', description: 'Watsons pharmacy', amount: -22.9, category: 'health', date: '2026-04-12', account: 'dbs_altitude' },
  { id: '8', description: 'Uniqlo Orchard', amount: -79, category: 'shopping', date: '2026-04-12', account: 'dbs_altitude' },
  { id: '9', description: 'SP utilities bill', amount: -98.4, category: 'utilities', date: '2026-04-11', account: 'ocbc_360' },
  { id: '10', description: 'Dividends STI ETF', amount: 248.5, category: 'income', date: '2026-04-01', account: 'dbs_savings' },
];

const categoryVisualsByName = new Map(
  initialCategories.map((category) => [
    category.name.toLowerCase(),
    {
      color: category.color,
      icon: category.icon,
      monthlyBudget: category.monthlyBudget,
    },
  ]),
);

function mapApiCategory(category: ApiCategory): Category {
  const visuals = categoryVisualsByName.get(category.name.toLowerCase());

  return {
    id: category.id,
    name: category.name,
    color: visuals?.color ?? colors.primary,
    icon: visuals?.icon ?? category.name.slice(0, 2).toUpperCase(),
    monthlyBudget: visuals?.monthlyBudget ?? 0,
    isDefault: category.isDefault,
  };
}

function mapApiExpense(expense: ApiExpense): Transaction {
  return {
    id: expense.id,
    description: expense.description || 'Unnamed expense',
    amount: -Math.abs(Number(expense.amount)),
    category: expense.categoryId ?? '',
    date: expense.date,
  };
}

function resolveCategoryIconId(category?: Category) {
  if (!category?.icon) {
    return category?.id ?? 'others';
  }

  return legacyCategoryIconIds[category.icon] ?? category.icon;
}

function getCategoryIcon(category?: Category): IconComponent {
  return categoryIconsById.get(resolveCategoryIconId(category)) ?? CircleHelp;
}

function sortTransactionsNewestFirst(items: Transaction[]) {
  return [...items].sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date);

    if (dateOrder !== 0) {
      return dateOrder;
    }

    return right.id.localeCompare(left.id);
  });
}

function getAccountMeta(account?: Account) {
  if (!account) {
    return 'Account';
  }

  return `${account.name} · ${accountTypeLabel(account.type)}`;
}

const netWorthHistory = [
  { month: 'Nov', netWorth: 113800, invested: 89300, cash: 24500 },
  { month: 'Dec', netWorth: 117200, invested: 91800, cash: 25400 },
  { month: 'Jan', netWorth: 119600, invested: 93600, cash: 26000 },
  { month: 'Feb', netWorth: 121300, invested: 95400, cash: 25900 },
  { month: 'Mar', netWorth: 123100, invested: 96900, cash: 26200 },
  { month: 'Apr', netWorth: 124850, invested: 98400, cash: 26450 },
];

const monthlyCashflow = [
  { month: 'Nov', income: 7520, expenses: 3810, savings: 3710 },
  { month: 'Dec', income: 8240, expenses: 4220, savings: 4020 },
  { month: 'Jan', income: 7800, expenses: 3640, savings: 4160 },
  { month: 'Feb', income: 7800, expenses: 3490, savings: 4310 },
  { month: 'Mar', income: 8050, expenses: 3720, savings: 4330 },
  { month: 'Apr', income: 8048, expenses: 2448, savings: 5600 },
];

const CHAT_TOPICS_STORAGE_KEY = 'firebuddy_chat_topics_v1';
const CHAT_ACTIVE_TOPIC_STORAGE_KEY = 'firebuddy_chat_active_topic_v1';
const THEME_STORAGE_KEY = 'firebuddy_theme_v1';
const CHAT_GREETING =
  'Ask me about CPF, SRS, HDB grants, retirement sums, Singapore Savings Bonds, or FIRE planning in Singapore.';
const CHAT_PROMPTS = [
  'What are the CPF contribution rates for 2026?',
  'How do Basic, Full, and Enhanced Retirement Sum differ?',
  'Can I use CPFIS to invest my CPF savings?',
  'What should a Singapore FIRE plan consider before age 55?',
];

const AppContext = createContext<AppContextValue | null>(null);

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatSGD(value: number, digits = 2) {
  return `S$${Math.abs(value).toLocaleString('en-SG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatTooltipValue(value: unknown) {
  return typeof value === 'number' ? formatSGD(value, 0) : String(value ?? '');
}

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  const today = new Date(`${getDeviceDateKey()}T00:00:00`);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (parsed.toDateString() === today.toDateString()) {
    return 'Today';
  }

  if (parsed.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return parsed.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

function polarPoint(centerX: number, centerY: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

function describeDonutSegment(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  const outerStart = polarPoint(centerX, centerY, outerRadius, endAngle);
  const outerEnd = polarPoint(centerX, centerY, outerRadius, startAngle);
  const innerStart = polarPoint(centerX, centerY, innerRadius, startAngle);
  const innerEnd = polarPoint(centerX, centerY, innerRadius, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

function accountTypeLabel(type: AccountType) {
  const labels: Record<AccountType, string> = {
    bank: 'Bank',
    credit_card: 'Credit card',
    debit_card: 'Debit card',
    cash: 'Cash',
    ewallet: 'E-wallet',
  };

  return labels[type];
}

function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    sortTransactionsNewestFirst(loadStored('firebuddy_web_transactions_v2', initialTransactions)),
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    loadStored('firebuddy_web_categories_v2', initialCategories),
  );
  const [accounts, setAccounts] = useState<Account[]>(() =>
    loadStored('firebuddy_web_accounts_v2', initialAccounts),
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadStored(THEME_STORAGE_KEY, 'light'));
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError(null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setSyncStatus('idle');
      setSyncError(null);
      return;
    }

    let isActive = true;
    setSyncStatus('loading');
    setSyncError(null);

    Promise.all([getCategories(session.access_token), getExpenses(session.access_token)])
      .then(([apiCategories, apiExpenses]) => {
        if (!isActive) {
          return;
        }

        setCategories(apiCategories.map(mapApiCategory));
        setTransactions(sortTransactionsNewestFirst(apiExpenses.map(mapApiExpense)));
        setSyncStatus('ready');
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setSyncError(error instanceof Error ? error.message : 'Unable to sync FireBuddy data.');
        setSyncStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, [session]);

  useEffect(() => {
    window.localStorage.setItem('firebuddy_web_transactions_v2', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    window.localStorage.setItem('firebuddy_web_categories_v2', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    window.localStorage.setItem('firebuddy_web_accounts_v2', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const value = useMemo<AppContextValue>(() => {
    function getCategoryById(id: string) {
      return categories.find((category) => category.id === id);
    }

    function getAccountById(id: string) {
      return accounts.find((account) => account.id === id);
    }

    return {
      transactions,
      categories,
      accounts,
      session,
      authLoading,
      authError,
      syncStatus,
      syncError,
      signIn: async (email, password) => {
        setAuthError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          setAuthError(error.message);
          throw error;
        }
      },
      signUp: async (email, password) => {
        setAuthError(null);
        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
          setAuthError(error.message);
          throw error;
        }
      },
      signOut: async () => {
        setAuthError(null);
        const { error } = await supabase.auth.signOut();

        if (error) {
          setAuthError(error.message);
          throw error;
        }
      },
      addTransaction: async (transaction) => {
        let nextTransaction = { ...transaction, id: `txn_${Date.now()}` };

        if (session) {
          const savedExpense = await createExpense(session.access_token, {
            categoryId: transaction.category || null,
            description: transaction.description,
            amount: Math.abs(transaction.amount).toFixed(2),
            date: transaction.date,
          });

          nextTransaction = mapApiExpense(savedExpense);
        }

        setTransactions((current) => sortTransactionsNewestFirst([nextTransaction, ...current]));
      },
      updateTransaction: (id, updates) => {
        setTransactions((current) =>
          sortTransactionsNewestFirst(
            current.map((transaction) => (transaction.id === id ? { ...transaction, ...updates } : transaction)),
          ),
        );
      },
      deleteTransaction: (id) => {
        setTransactions((current) => current.filter((transaction) => transaction.id !== id));
      },
      addCategory: (category) => {
        setCategories((current) => [
          ...current,
          {
            ...category,
            id: `${category.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
            isDefault: false,
          },
        ]);
      },
      updateCategory: (id, updates) => {
        setCategories((current) =>
          current.map((category) => (category.id === id ? { ...category, ...updates } : category)),
        );
      },
      deleteCategory: (id) => {
        if (id === 'income') {
          return;
        }

        setCategories((current) => current.filter((category) => category.id !== id));
      },
      addAccount: (account) => {
        setAccounts((current) => [...current, { ...account, id: `acc_${Date.now()}` }]);
      },
      updateAccount: (id, updates) => {
        setAccounts((current) => current.map((account) => (account.id === id ? { ...account, ...updates } : account)));
      },
      deleteAccount: (id) => {
        setAccounts((current) => current.filter((account) => account.id !== id));
      },
      getCategoryById,
      getAccountById,
      getMonthlySpend: (categoryId, month = getDeviceMonthKey()) =>
        transactions
          .filter((transaction) => transaction.category === categoryId && transaction.date.startsWith(month))
          .filter((transaction) => transaction.amount < 0)
          .reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
      themeMode,
      setThemeMode,
      toggleTheme: () => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark')),
    };
  }, [accounts, authError, authLoading, categories, session, syncError, syncStatus, transactions, themeMode]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function useFireBuddy() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useFireBuddy must be used within AppProvider');
  }

  return context;
}

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/categories', icon: Grid2X2, label: 'Categories' },
  { path: '/profile', icon: User, label: 'Profile' },
] as const;

function Layout() {
  const navigate = useNavigate();

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
          <SidebarNavItem path="/insights" icon={Download} label="Insights" />
        </nav>

        <button className="sidebar-add-button button-press" type="button" onClick={() => navigate('/add')}>
          <Plus size={16} strokeWidth={2} />
          Add Transaction
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
              <Route path="insights" element={<Insights />} />
              <Route path="analytics" element={<Navigate to="/insights" replace />} />
              <Route path="accounts" element={<Accounts />} />
            </Routes>
          </div>
          <MobileNav />
        </div>
      </div>
      <ChatWidget />
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
      <button className="mobile-fab button-press fab-pulse" type="button" onClick={() => navigate('/add')}>
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
  const { transactions, getCategoryById, getAccountById, themeMode, toggleTheme } = useFireBuddy();
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
                />
              );
            })}
          </div>
        </section>
      </section>
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

function CategoryAvatar({ category }: { category?: Category }) {
  const Icon = getCategoryIcon(category);

  return (
    <span className="category-avatar" style={{ backgroundColor: `${category?.color ?? colors.primary}22`, color: category?.color }}>
      <Icon size={21} strokeWidth={1.9} />
    </span>
  );
}

function TransactionRow({
  transaction,
  category,
  account,
  variant = 'card',
  onClick,
}: {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  variant?: 'compact' | 'card';
  onClick?: () => void;
}) {
  const amountClass = transaction.amount > 0 ? 'amount-positive' : 'amount-negative';
  const className = variant === 'compact' ? 'transaction-item' : 'transaction-card';
  const content = (
    <>
      <CategoryAvatar category={category} />
      <div className="transaction-copy">
        <strong>{transaction.description}</strong>
        <span>
          {formatDateLabel(transaction.date)} · {category?.name ?? 'Category'} · {getAccountMeta(account)}
        </span>
      </div>
      <strong className={amountClass}>
        {transaction.amount > 0 ? '+ ' : '- '}
        {formatSGD(transaction.amount)}
      </strong>
    </>
  );

  if (onClick) {
    return (
      <button className={className} type="button" onClick={onClick}>
        {content}
      </button>
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
  const { transactions, accounts, categories, getCategoryById, getAccountById } = useFireBuddy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('month');

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
            <button className="pill-button inverse-white" type="button" onClick={() => navigate('/add')}>
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
          <div>
            <span>Transactions</span>
            <strong>{filteredTransactions.length}</strong>
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
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
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
                  <CategoryAvatar category={category} />
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
          onSave={(category) => {
            addCategory(category as Omit<Category, 'id'>);
            setIsAdding(false);
          }}
        />
      ) : null}

      {editingCategory ? (
        <CategorySheet
          mode="edit"
          initial={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={(updates) => {
            updateCategory(editingCategory.id, updates);
            setEditingCategory(null);
          }}
          onDelete={() => {
            deleteCategory(editingCategory.id);
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
  onSave: (data: Partial<Category>) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name ?? '');
  const [icon, setIcon] = useState(legacyCategoryIconIds[initial.icon ?? ''] ?? initial.icon ?? 'others');
  const [color, setColor] = useState(initial.color ?? categoryColors[0]);
  const [monthlyBudget, setMonthlyBudget] = useState(String(initial.monthlyBudget ?? 0));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function save() {
    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      icon,
      color,
      monthlyBudget: Number(monthlyBudget) || 0,
      isDefault: initial.isDefault,
    });
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside className="center-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <h3>{mode === 'add' ? 'New category' : 'Edit category'}</h3>
          <button className="plain-icon-button" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="sheet-body">
          <label className="form-field">
            <span>Category name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dining out" />
          </label>

          <label className="form-field">
            <span>Icon</span>
            <select value={icon} onChange={(event) => setIcon(event.target.value)}>
              {categoryIconOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Monthly budget</span>
            <input value={monthlyBudget} onChange={(event) => setMonthlyBudget(event.target.value)} inputMode="numeric" />
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

          {showDeleteConfirm ? (
            <div className="delete-confirm">
              <p>Delete this category?</p>
              <button type="button" onClick={onDelete}>
                Delete
              </button>
            </div>
          ) : null}

          <div className="sheet-actions">
            {onDelete ? (
              <button className="danger-button" type="button" onClick={() => setShowDeleteConfirm(true)}>
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

function Insights() {
  const { transactions, categories } = useFireBuddy();
  const navigate = useNavigate();
  const [range, setRange] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Day');
  const firePercent = (fireData.currentNetWorth / fireData.targetNetWorth) * 100;
  const categoryData = categories
    .filter((category) => category.id !== 'income')
    .map((category) => ({
      name: category.name,
      value: transactions
        .filter((transaction) => transaction.category === category.id && transaction.amount < 0)
        .reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
      color: category.color,
    }))
    .filter((entry) => entry.value > 0);

  const topSpending = transactions.filter((transaction) => transaction.amount < 0).slice(0, 4);

  return (
    <main className="page">
      <section className="analytics-header">
        <button className="plain-icon-button" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h2>Insights</h2>
        <Download size={20} />
      </section>

      <section className="analytics-content">
        <div className="range-tabs">
          {(['Day', 'Week', 'Month', 'Year'] as const).map((item) => (
            <button
              className={range === item ? 'range-tab-active' : ''}
              key={item}
              type="button"
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="chart-toolbar">
          <span />
          <button className="select-button" type="button">
            Expense
            <ChevronDown size={16} />
          </button>
        </div>

        <article className="chart-card transparent">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthlyCashflow}>
              <defs>
                <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={formatTooltipValue} />
              <Area dataKey="expenses" stroke={colors.primary} strokeWidth={2.2} fill="url(#expenseFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="white-card">
          <div className="section-title-row">
            <h3>FIRE projection</h3>
            <strong>{firePercent.toFixed(1)}%</strong>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={netWorthHistory}>
              <CartesianGrid vertical={false} stroke={colors.border} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={formatTooltipValue} />
              <Bar dataKey="netWorth" fill={colors.primary} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="white-card">
          <div className="section-title-row">
            <h3>Top Spending</h3>
            <Filter size={18} />
          </div>
          <div className="transaction-list card-list">
            {topSpending.map((transaction, index) => {
              const category = categories.find((item) => item.id === transaction.category);
              return (
                <article className={index === 1 ? 'transaction-card highlighted' : 'transaction-card'} key={transaction.id}>
                  <CategoryAvatar category={category} />
                  <div className="transaction-copy">
                    <strong>{transaction.description}</strong>
                    <span>{formatDateLabel(transaction.date)}</span>
                  </div>
                  <strong className="amount-negative">- {formatSGD(transaction.amount)}</strong>
                </article>
              );
            })}
          </div>
        </article>

        <article className="white-card">
          <div className="section-title-row">
            <h3>Category share</h3>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" innerRadius={54} outerRadius={82} paddingAngle={4}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} />
            </PieChart>
          </ResponsiveContainer>
        </article>
      </section>
    </main>
  );
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
                    {account.lastFour ? ` · ${account.lastFour}` : ''} · {usageCount} transactions
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

function AddExpense() {
  const navigate = useNavigate();
  const { addTransaction, categories, accounts, syncStatus } = useFireBuddy();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => getDeviceDateKey());
  const [category, setCategory] = useState(categories[0]?.id ?? '');
  const [account, setAccount] = useState(accounts[0]?.id ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const selectedCategory = categories.find((item) => item.id === category);
  const isIncome = selectedCategory?.name.toLowerCase() === 'income';

  useEffect(() => {
    if (!category && categories[0]) {
      setCategory(categories[0].id);
      return;
    }

    if (category && !categories.some((item) => item.id === category)) {
      setCategory(categories[0]?.id ?? '');
    }
  }, [categories, category]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0 || !category || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await addTransaction({
        description: description.trim() || 'Unnamed expense',
        amount: isIncome ? Math.abs(numericAmount) : -Math.abs(numericAmount),
        category,
        date,
        account,
      });
      navigate('/');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save transaction.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="add-route" onClick={() => navigate(-1)}>
      <form className="add-panel" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <header className="add-header">
          <button className="plain-icon-button inverse-plain" type="button" onClick={() => navigate(-1)}>
            <ChevronLeft size={24} />
          </button>
          <h2>Add {isIncome ? 'Income' : 'Expense'}</h2>
          <MoreHorizontal size={24} />
        </header>

        <section className="add-card">
          <label className="form-field add-name-field">
            <span>Name</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Netflix" />
          </label>

          <label className="amount-field add-amount-field">
            <span>Amount</span>
            <div>
              <strong>S$</strong>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <button type="button" onClick={() => setAmount('')}>
                Clear
              </button>
            </div>
          </label>

          <label className="form-field add-date-field">
            <span>Date</span>
            <input value={date} onChange={(event) => setDate(event.target.value)} type="date" />
          </label>

          <label className="form-field add-category-field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={syncStatus === 'loading'}>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field add-account-field">
            <span>Account</span>
            <select value={account} onChange={(event) => setAccount(event.target.value)}>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {accountTypeLabel(item.type)}
                </option>
              ))}
            </select>
          </label>

          <button className="invoice-button" type="button">
            <Plus size={18} />
            Add Invoice
          </button>

          {saveError ? <p className="form-error">{saveError}</p> : null}

          <button className="primary-button full-width" type="submit" disabled={isSaving || syncStatus === 'loading'}>
            {isSaving ? 'Saving...' : 'Save transaction'}
          </button>
        </section>
      </form>
    </main>
  );
}

function AuthScreen() {
  const { authError, signIn, signUp } = useFireBuddy();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const isSignUp = mode === 'sign-up';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);

    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        setNotice('Account created. Check your email if Supabase asks for confirmation.');
      } else {
        await signIn(email.trim(), password);
      }
    } catch {
      // The provider stores the user-facing error message.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <Wallet size={28} />
          <div>
            <h1>FireBuddy</h1>
            <p>Singapore FIRE tracker</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div>
            <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
            <p>{isSignUp ? 'Start tracking expenses against your FIRE plan.' : 'Sign in to sync expenses through Supabase.'}</p>
          </div>

          <label className="form-field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>

          {authError ? <p className="form-error">{authError}</p> : null}
          {notice ? <p className="form-notice">{notice}</p> : null}

          <button className="primary-button full-width" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          className="auth-mode-button"
          type="button"
          onClick={() => {
            setMode(isSignUp ? 'sign-in' : 'sign-up');
            setNotice(null);
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : 'New to FireBuddy? Create an account'}
        </button>
      </section>
    </main>
  );
}

function AppRoutes() {
  const { authLoading, session, syncError, syncStatus } = useFireBuddy();

  if (!skipAuth && authLoading) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-brand">
            <Wallet size={28} />
            <div>
              <h1>FireBuddy</h1>
              <p>Loading your session...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!skipAuth && !session) {
    return <AuthScreen />;
  }

  return (
    <>
      {syncStatus === 'error' && syncError ? <div className="sync-banner">{syncError}</div> : null}
      <Routes>
        <Route path="/add" element={<AddExpense />} />
        <Route path="/*" element={<Layout />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
