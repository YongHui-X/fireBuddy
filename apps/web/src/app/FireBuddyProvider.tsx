import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Award,
  Banknote,
  Briefcase,
  Bus,
  Camera,
  Car,
  CircleHelp,
  Clapperboard,
  FileText,
  Coffee,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  MapPin,
  Plane,
  Percent,
  Shapes,
  Shirt,
  ShoppingBag,
  Smartphone,
  Train,
  TrendingUp,
  Utensils,
} from 'lucide-react';
import {
  type Account as ApiAccount,
  type AccountType as ApiAccountType,
  type Category as ApiCategory,
  type Transaction as ApiTransaction,
  type TransactionType,
} from '@firebuddy/shared';

import {
  createAccount,
  createCategory,
  createTransaction,
  deleteAccount as deleteApiAccount,
  deleteCategory as deleteApiCategory,
  deleteTransaction as deleteApiTransaction,
  getCategories,
  getAccounts,
  getTransactions,
  updateAccount as updateApiAccount,
  updateCategory as updateApiCategory,
  updateTransaction as updateApiTransaction,
} from '../api';
import { hasSupabaseConfig, supabase } from '../supabase';
import {
  ACCOUNTS_STORAGE_KEY,
  CATEGORIES_STORAGE_KEY,
  TRANSACTIONS_STORAGE_KEY,
} from './demoStorage';
import { clearEmberAppActions, recordEmberAppAction } from './emberAppContext';
type AccountType = ApiAccountType;
type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>;

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  account: string;
  transactionType: TransactionType;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthlyBudget: number;
  categoryType: TransactionType;
  isDefault?: boolean;
}

interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  lastFour?: string;
  isDefault?: boolean;
}

interface AppNotification {
  id: number;
  message: string;
}

interface AppContextValue {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  themeMode: ThemeMode;
  notification: AppNotification | null;
  session: Session | null;
  authLoading: boolean;
  authError: string | null;
  syncStatus: 'idle' | 'loading' | 'ready' | 'error';
  syncError: string | null;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getAccountById: (id: string) => Account | undefined;
  getMonthlySpend: (categoryId: string, month?: string) => number;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  notify: (message: string) => void;
  dismissNotification: () => void;
}

type ThemeMode = 'light' | 'dark';

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
  '#2A9D8F',
  '#3A86A8',
  '#4F6DB8',
  '#7B61A8',
  '#B85C8A',
  '#D65A5A',
  '#D97745',
  '#7A869A',
];

const categoryIconOptions = [
  { id: 'food', label: 'Food & Drink', icon: Utensils },
  { id: 'coffee', label: 'Coffee', icon: Coffee },
  { id: 'transport', label: 'Transport', icon: Train },
  { id: 'bus', label: 'Bus', icon: Bus },
  { id: 'car', label: 'Car', icon: Car },
  { id: 'fuel', label: 'Fuel', icon: Fuel },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'clothing', label: 'Clothing', icon: Shirt },
  { id: 'utilities', label: 'Bills & Utilities', icon: FileText },
  { id: 'housing', label: 'Housing', icon: House },
  { id: 'phone', label: 'Phone & Internet', icon: Smartphone },
  { id: 'health', label: 'Healthcare', icon: HeartPulse },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'entertainment', label: 'Entertainment', icon: Clapperboard },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'places', label: 'Places', icon: MapPin },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'gifts', label: 'Gifts', icon: Gift },
  { id: 'tech', label: 'Tech', icon: Laptop },
  { id: 'banking', label: 'Banking', icon: Landmark },
  { id: 'others', label: 'Others', icon: CircleHelp },
  { id: 'shapes', label: 'Others', icon: Shapes },
  { id: 'salary', label: 'Salary', icon: Briefcase },
  { id: 'bonus', label: 'Bonus', icon: Award },
  { id: 'dividends', label: 'Dividends', icon: TrendingUp },
  { id: 'interest', label: 'Interest', icon: Percent },
  { id: 'income', label: 'Other income', icon: Banknote },
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
  OT: 'shapes',
  NW: 'others',
};

const demoCategoryIds = {
  food: '00000000-0000-4000-8000-000000000001',
  transport: '00000000-0000-4000-8000-000000000002',
  shopping: '00000000-0000-4000-8000-000000000003',
  utilities: '00000000-0000-4000-8000-000000000004',
  health: '00000000-0000-4000-8000-000000000005',
  entertainment: '00000000-0000-4000-8000-000000000006',
  travel: '00000000-0000-4000-8000-000000000007',
  others: '00000000-0000-4000-8000-000000000008',
  salary: '00000000-0000-4000-8000-000000000009',
  bonus: '00000000-0000-4000-8000-000000000010',
  dividends: '00000000-0000-4000-8000-000000000011',
  interest: '00000000-0000-4000-8000-000000000012',
  otherIncome: '00000000-0000-4000-8000-000000000013',
} as const;

const initialCategories: Category[] = [
  { id: demoCategoryIds.food, name: 'Food & Drink', color: '#3C8A61', icon: 'food', monthlyBudget: 600, categoryType: 'expense', isDefault: true },
  { id: demoCategoryIds.transport, name: 'Transport', color: '#67B47C', icon: 'transport', monthlyBudget: 250, categoryType: 'expense', isDefault: true },
  { id: demoCategoryIds.shopping, name: 'Shopping', color: '#E5B24A', icon: 'shopping', monthlyBudget: 300, categoryType: 'expense', isDefault: true },
  { id: demoCategoryIds.utilities, name: 'Bills & Utilities', color: '#7BAA90', icon: 'utilities', monthlyBudget: 150, categoryType: 'expense', isDefault: true },
  { id: demoCategoryIds.health, name: 'Healthcare', color: '#2E9B57', icon: 'health', monthlyBudget: 150, categoryType: 'expense', isDefault: true },
  { id: demoCategoryIds.entertainment, name: 'Entertainment', color: '#8BB89D', icon: 'entertainment', monthlyBudget: 200, categoryType: 'expense', isDefault: true },
  { id: demoCategoryIds.travel, name: 'Travel', color: '#25543D', icon: 'travel', monthlyBudget: 400, categoryType: 'expense', isDefault: true },
  { id: demoCategoryIds.others, name: 'Others', color: '#A8D3B7', icon: 'shapes', monthlyBudget: 200, categoryType: 'expense', isDefault: true },
  { id: demoCategoryIds.salary, name: 'Salary', color: '#3C8A61', icon: 'salary', monthlyBudget: 0, categoryType: 'income', isDefault: true },
  { id: demoCategoryIds.bonus, name: 'Bonus', color: '#E5B24A', icon: 'bonus', monthlyBudget: 0, categoryType: 'income', isDefault: true },
  { id: demoCategoryIds.dividends, name: 'Dividends', color: '#67B47C', icon: 'dividends', monthlyBudget: 0, categoryType: 'income', isDefault: true },
  { id: demoCategoryIds.interest, name: 'Interest', color: '#7BAA90', icon: 'interest', monthlyBudget: 0, categoryType: 'income', isDefault: true },
  { id: demoCategoryIds.otherIncome, name: 'Other income', color: '#A8D3B7', icon: 'income', monthlyBudget: 0, categoryType: 'income', isDefault: true },
];

const initialAccounts: Account[] = [
  { id: 'dbs_savings', name: 'DBS Savings', type: 'bank', color: '#3C8A61', lastFour: '4521' },
  { id: 'ocbc_360', name: 'OCBC 360', type: 'bank', color: '#67B47C', lastFour: '8834' },
  { id: 'dbs_altitude', name: 'DBS Altitude', type: 'credit_card', color: '#7BAA90', lastFour: '1234' },
  { id: 'grabpay', name: 'GrabPay', type: 'ewallet', color: '#2E9B57' },
  { id: 'cash_wallet', name: 'Cash', type: 'cash', color: '#E5B24A' },
];

const initialTransactions: Transaction[] = [
  { id: '00000000-0000-4000-9000-000000001000', description: 'Monthly salary', amount: 5200, category: demoCategoryIds.salary, date: '2026-04-15', account: 'dbs_savings', transactionType: 'income' },
  { id: '00000000-0000-4000-9000-000000001001', description: 'Hawker Centre lunch', amount: -8.5, category: demoCategoryIds.food, date: '2026-04-14', account: 'grabpay', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001002', description: 'MRT Bishan to City Hall', amount: -1.82, category: demoCategoryIds.transport, date: '2026-04-14', account: 'dbs_savings', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001004', description: 'Cold Storage groceries', amount: -67.4, category: demoCategoryIds.food, date: '2026-04-13', account: 'dbs_altitude', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001005', description: 'Grab ride home', amount: -12.5, category: demoCategoryIds.transport, date: '2026-04-13', account: 'grabpay', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001006', description: 'Netflix subscription', amount: -10.98, category: demoCategoryIds.entertainment, date: '2026-04-13', account: 'dbs_altitude', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001007', description: 'Watsons pharmacy', amount: -22.9, category: demoCategoryIds.health, date: '2026-04-12', account: 'dbs_altitude', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001008', description: 'Uniqlo Orchard', amount: -79, category: demoCategoryIds.shopping, date: '2026-04-12', account: 'dbs_altitude', transactionType: 'expense' },
  { id: '00000000-0000-4000-9000-000000001009', description: 'SP utilities bill', amount: -98.4, category: demoCategoryIds.utilities, date: '2026-04-11', account: 'ocbc_360', transactionType: 'expense' },
];

function mapApiCategory(category: ApiCategory): Category {
  return {
    id: category.id,
    name: category.name,
    color: category.color || colors.primary,
    icon: category.icon || 'others',
    monthlyBudget: Number(category.monthlyBudget) || 0,
    categoryType: category.categoryType,
    isDefault: category.isDefault,
  };
}

function mapApiTransaction(transaction: ApiTransaction): Transaction {
  return {
    id: transaction.id,
    description: transaction.description || `Unnamed ${transaction.transactionType}`,
    amount: transaction.transactionType === 'income' ? Math.abs(Number(transaction.amount)) : -Math.abs(Number(transaction.amount)),
    category: transaction.categoryId ?? '',
    date: transaction.date,
    account: transaction.accountId,
    transactionType: transaction.transactionType,
  };
}

function mapApiAccount(account: ApiAccount): Account {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    color: account.color,
    lastFour: account.lastFour ?? undefined,
    isDefault: account.isDefault,
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

  return `${account.name} \u00B7 ${accountTypeLabel(account.type)}`;
}

const netWorthHistory = [
  { month: 'Nov', netWorth: 113800, invested: 89300, cash: 24500 },
  { month: 'Dec', netWorth: 117200, invested: 91800, cash: 25400 },
  { month: 'Jan', netWorth: 119600, invested: 93600, cash: 26000 },
  { month: 'Feb', netWorth: 121300, invested: 95400, cash: 25900 },
  { month: 'Mar', netWorth: 123100, invested: 96900, cash: 26200 },
  { month: 'Apr', netWorth: 124850, invested: 98400, cash: 26450 },
];

const THEME_STORAGE_KEY = 'firebuddy_theme_v1';
const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true';
const missingSupabaseConfigMessage =
  'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Add them to apps/web/.env.local, or set VITE_SKIP_AUTH=true for local demo mode.';
const demoAccountResetMessage = 'Password resets are disabled for the FireBuddy demo account.';

const AppContext = createContext<AppContextValue | null>(null);

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Restores an explicit choice first, then follows the device preference on a first visit.
function loadThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }

    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

// Keeps the shared demo account credentials unchanged throughout FireBuddy's recovery UI.
function isDemoAccountEmail(email: string | null | undefined) {
  const demoAccountEmail = (import.meta.env.VITE_DEMO_ACCOUNT_EMAIL ?? '').trim().toLowerCase();
  return Boolean(demoAccountEmail) && email?.trim().toLowerCase() === demoAccountEmail;
}

function normalizeStoredTransactions(items: Transaction[]): Transaction[] {
  return items.map((transaction) => ({
    ...transaction,
    transactionType: transaction.transactionType ?? (transaction.amount > 0 ? 'income' : 'expense'),
  }));
}

function normalizeStoredCategories(items: Category[]): Category[] {
  return items.map((category) => ({
    ...category,
    categoryType: category.categoryType ?? 'expense',
    icon: category.name === 'Others' && category.icon === 'others' ? 'shapes' : category.icon,
  }));
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

// Converts Supabase and browser network errors into safe, actionable auth messages.
function getAuthErrorMessage(error: unknown) {
  const message = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'Authentication failed. Please try again.';
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';
  const normalizedMessage = message.toLowerCase();

  if (code === 'invalid_credentials' || normalizedMessage.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (code === 'email_not_confirmed' || normalizedMessage.includes('email not confirmed')) {
    return 'Confirm your email before signing in.';
  }

  if (
    code === 'over_request_rate_limit' ||
    normalizedMessage.includes('rate limit') ||
    normalizedMessage.includes('too many requests')
  ) {
    return 'Too many sign-in attempts. Wait a moment and try again.';
  }

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('fetch failed') ||
    normalizedMessage.includes('network request failed')
  ) {
    return 'Unable to reach FireBuddy right now. Check your connection and try again.';
  }

  if (normalizedMessage.includes('email address') && normalizedMessage.includes('invalid')) {
    return 'Supabase rejected that email address. Try another email address you can access.';
  }

  return message;
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
    skipAuth
      ? sortTransactionsNewestFirst(normalizeStoredTransactions(loadStored(TRANSACTIONS_STORAGE_KEY, initialTransactions)))
      : [],
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    skipAuth ? normalizeStoredCategories(loadStored(CATEGORIES_STORAGE_KEY, initialCategories)) : [],
  );
  const [accounts, setAccounts] = useState<Account[]>(() =>
    skipAuth ? loadStored(ACCOUNTS_STORAGE_KEY, initialAccounts) : [],
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const authenticatedUserId = session?.user.id ?? null;

  function notify(message: string) {
    setNotification({
      id: Date.now(),
      message,
    });
  }

  function dismissNotification() {
    setNotification(null);
  }

  useEffect(() => {
    if (skipAuth) {
      return;
    }

    // Clear app-owned state whenever the authenticated identity changes.
    setTransactions([]);
    setCategories([]);
    setAccounts([]);
    window.localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    window.localStorage.removeItem(CATEGORIES_STORAGE_KEY);
    window.localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
  }, [authenticatedUserId]);

  useEffect(() => {
    if (skipAuth || !supabase) {
      setAuthError(hasSupabaseConfig ? null : missingSupabaseConfigMessage);
      setAuthLoading(false);
      return;
    }

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

    Promise.all([
      getCategories(session.access_token),
      getAccounts(session.access_token),
      getTransactions(session.access_token),
    ])
      .then(([apiCategories, apiAccounts, apiTransactions]) => {
        if (!isActive) {
          return;
        }

        setCategories(apiCategories.map(mapApiCategory));
        setAccounts(apiAccounts.map(mapApiAccount));
        setTransactions(sortTransactionsNewestFirst(apiTransactions.map(mapApiTransaction)));
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
    if (skipAuth) {
      window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    if (skipAuth) {
      window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    }
  }, [categories]);

  useEffect(() => {
    if (skipAuth) {
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
  }, [accounts]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotification(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notification]);

  const value = useMemo<AppContextValue>(() => {
    function getCategoryById(id: string) {
      return categories.find((category) => category.id === id);
    }

    function getAccountById(id: string) {
      return accounts.find((account) => account.id === id);
    }

    // Applies the same friendly error handling to every Supabase auth request.
    async function runAuthRequest<T extends { error: unknown }>(request: () => Promise<T>) {
      try {
        const result = await request();

        if (result.error) {
          throw result.error;
        }

        return result;
      } catch (error) {
        setAuthError(getAuthErrorMessage(error));
        throw error;
      }
    }

    return {
      transactions,
      categories,
      accounts,
      notification,
      session,
      authLoading,
      authError,
      syncStatus,
      syncError,
      demoMode: skipAuth,
      signIn: async (email, password) => {
        setAuthError(null);
        if (!supabase) {
          setAuthError(missingSupabaseConfigMessage);
          throw new Error(missingSupabaseConfigMessage);
        }

        const auth = supabase.auth;
        await runAuthRequest(() => auth.signInWithPassword({ email, password }));
        notify('You have successfully signed in.');
      },
      signUp: async (email, password) => {
        setAuthError(null);
        if (!supabase) {
          setAuthError(missingSupabaseConfigMessage);
          throw new Error(missingSupabaseConfigMessage);
        }

        const auth = supabase.auth;
        await runAuthRequest(() => auth.signUp({ email, password }));
      },
      requestPasswordReset: async (email) => {
        setAuthError(null);
        if (!supabase) {
          setAuthError(missingSupabaseConfigMessage);
          throw new Error(missingSupabaseConfigMessage);
        }

        if (isDemoAccountEmail(email)) {
          setAuthError(demoAccountResetMessage);
          throw new Error(demoAccountResetMessage);
        }

        const auth = supabase.auth;
        await runAuthRequest(() => auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        }));
      },
      updatePassword: async (password) => {
        setAuthError(null);
        if (!supabase) {
          setAuthError(missingSupabaseConfigMessage);
          throw new Error(missingSupabaseConfigMessage);
        }

        if (!session) {
          const message = 'This password reset link is invalid or has expired.';
          setAuthError(message);
          throw new Error(message);
        }

        if (isDemoAccountEmail(session.user.email)) {
          setAuthError(demoAccountResetMessage);
          throw new Error(demoAccountResetMessage);
        }

        const auth = supabase.auth;
        await runAuthRequest(() => auth.updateUser({ password }));
      },
      signOut: async () => {
        setAuthError(null);
        if (!supabase) {
          setSession(null);
          clearEmberAppActions();
          return;
        }

        const auth = supabase.auth;
        await runAuthRequest(() => auth.signOut());
        clearEmberAppActions();
      },
      clearAuthError: () => setAuthError(null),
      addTransaction: async (transaction) => {
        let nextTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };

        if (session) {
          const savedTransaction = await createTransaction(session.access_token, {
            categoryId: transaction.category || null,
            accountId: transaction.account,
            description: transaction.description,
            amount: Math.abs(transaction.amount).toFixed(2),
            date: transaction.date,
            transactionType: transaction.transactionType,
          });

          nextTransaction = mapApiTransaction(savedTransaction);
        }

        setTransactions((current) => sortTransactionsNewestFirst([nextTransaction, ...current]));
        notify('Transaction has been added.');
        recordEmberAppAction('create', 'Added a transaction');
        return nextTransaction;
      },
      updateTransaction: async (id, updates) => {
        if (session) {
          const currentTransaction = transactions.find((transaction) => transaction.id === id);

          if (!currentTransaction) {
            throw new Error('Transaction not found.');
          }

          const nextTransaction = { ...currentTransaction, ...updates };
          const savedTransaction = await updateApiTransaction(session.access_token, id, {
            categoryId: nextTransaction.category || null,
            accountId: nextTransaction.account,
            description: nextTransaction.description,
            amount: Math.abs(nextTransaction.amount).toFixed(2),
            date: nextTransaction.date,
            transactionType: nextTransaction.transactionType,
          });
          const syncedTransaction = mapApiTransaction(savedTransaction);

          setTransactions((current) =>
            sortTransactionsNewestFirst(
              current.map((transaction) => (transaction.id === id ? syncedTransaction : transaction)),
            ),
          );
          notify('Transaction has been updated.');
          recordEmberAppAction('update', 'Updated a transaction');
          return;
        }

        setTransactions((current) =>
          sortTransactionsNewestFirst(
            current.map((transaction) => (transaction.id === id ? { ...transaction, ...updates } : transaction)),
          ),
        );
        notify('Transaction has been updated.');
        recordEmberAppAction('update', 'Updated a transaction');
      },
      deleteTransaction: async (id) => {
        if (session) {
          await deleteApiTransaction(session.access_token, id);
        }

        setTransactions((current) => current.filter((transaction) => transaction.id !== id));
        notify('Transaction has been deleted.');
        recordEmberAppAction('delete', 'Deleted a transaction');
      },
      addCategory: async (category) => {
        if (session) {
          const savedCategory = await createCategory(session.access_token, {
            name: category.name,
            icon: category.icon,
            color: category.color,
            monthlyBudget: String(category.monthlyBudget),
            categoryType: category.categoryType,
          });

          const nextCategory = mapApiCategory(savedCategory);
          setCategories((current) => [...current, nextCategory]);
          notify('Category has been added.');
          recordEmberAppAction('create', 'Added a category');
          return nextCategory;
        }

        const nextCategory = { ...category, id: crypto.randomUUID(), isDefault: false };
        setCategories((current) => [...current, nextCategory]);
        notify('Category has been added.');
        recordEmberAppAction('create', 'Added a category');
        return nextCategory;
      },
      updateCategory: async (id, updates) => {
        if (session) {
          const currentCategory = categories.find((category) => category.id === id);
          if (!currentCategory) {
            throw new Error('Category not found.');
          }

          const savedCategory = await updateApiCategory(session.access_token, id, {
            name: updates.name?.trim() || currentCategory.name,
            icon: updates.icon ?? currentCategory.icon,
            color: updates.color ?? currentCategory.color,
            monthlyBudget: String(updates.monthlyBudget ?? currentCategory.monthlyBudget),
            categoryType: updates.categoryType ?? currentCategory.categoryType,
          });

          setCategories((current) =>
            current.map((category) =>
              category.id === id
                ? {
                    ...category,
                    ...mapApiCategory(savedCategory),
                  }
                : category,
            ),
          );
          notify('Category has been updated.');
          recordEmberAppAction('update', 'Updated a category');
          return;
        }

        setCategories((current) =>
          current.map((category) => (category.id === id ? { ...category, ...updates } : category)),
        );
        notify('Category has been updated.');
        recordEmberAppAction('update', 'Updated a category');
      },
      deleteCategory: async (id) => {
        const category = categories.find((item) => item.id === id);
        if (category?.isDefault) {
          return;
        }

        if (session) {
          await deleteApiCategory(session.access_token, id);
        }

        setCategories((current) => current.filter((category) => category.id !== id));
        notify('Category has been deleted.');
        recordEmberAppAction('delete', 'Deleted a category');
      },
      addAccount: async (account) => {
        if (session) {
          const savedAccount = await createAccount(session.access_token, {
            name: account.name,
            type: account.type,
            color: account.color,
            lastFour: account.lastFour ?? null,
          });
          const nextAccount = mapApiAccount(savedAccount);
          setAccounts((current) => [...current, nextAccount]);
          notify('Account has been added.');
          recordEmberAppAction('create', 'Added an account');
          return nextAccount;
        }

        const nextAccount = { ...account, id: crypto.randomUUID(), isDefault: false };
        setAccounts((current) => [...current, nextAccount]);
        notify('Account has been added.');
        recordEmberAppAction('create', 'Added an account');
        return nextAccount;
      },
      updateAccount: async (id, updates) => {
        if (session) {
          const savedAccount = await updateApiAccount(session.access_token, id, {
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...(updates.type !== undefined ? { type: updates.type } : {}),
            ...(updates.color !== undefined ? { color: updates.color } : {}),
            ...(updates.lastFour !== undefined ? { lastFour: updates.lastFour || null } : {}),
          });
          setAccounts((current) =>
            current.map((account) => (account.id === id ? mapApiAccount(savedAccount) : account)),
          );
          notify('Account has been updated.');
          recordEmberAppAction('update', 'Updated an account');
          return;
        }

        setAccounts((current) => current.map((account) => (account.id === id ? { ...account, ...updates } : account)));
        notify('Account has been updated.');
        recordEmberAppAction('update', 'Updated an account');
      },
      deleteAccount: async (id) => {
        if (session) {
          await deleteApiAccount(session.access_token, id);
        }

        setAccounts((current) => current.filter((account) => account.id !== id));
        notify('Account has been deleted.');
        recordEmberAppAction('delete', 'Deleted an account');
      },
      getCategoryById,
      getAccountById,
      getMonthlySpend: (categoryId, month = getDeviceMonthKey()) =>
        transactions
          .filter(
            (transaction) =>
              transaction.category === categoryId &&
              transaction.transactionType === 'expense' &&
              transaction.date.startsWith(month),
          )
          .reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
      themeMode,
      setThemeMode,
      toggleTheme: () => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark')),
      notify,
      dismissNotification,
    };
  }, [accounts, authError, authLoading, categories, notification, session, syncError, syncStatus, transactions, themeMode]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function useFireBuddy() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useFireBuddy must be used within AppProvider');
  }

  return context;
}


export {
  AppProvider,
  accountTypeLabel,
  categoryColors,
  categoryIconOptions,
  colors,
  describeDonutSegment,
  fireData,
  formatDateLabel,
  formatSGD,
  formatTooltipValue,
  getAccountMeta,
  getCategoryIcon,
  getDeviceDateKey,
  getDeviceMonthKey,
  netWorthHistory,
  polarPoint,
  legacyCategoryIconIds,
  sortTransactionsNewestFirst,
  useFireBuddy,
};

export type { Account, AccountType, AppContextValue, AppNotification, Category, IconComponent, ThemeMode, Transaction };
