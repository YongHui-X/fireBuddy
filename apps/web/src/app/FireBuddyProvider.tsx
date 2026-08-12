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
  Shirt,
  ShoppingBag,
  Smartphone,
  Train,
  TrendingUp,
  Utensils,
} from 'lucide-react';
import {
  type Category as ApiCategory,
  type Expense as ApiExpense,
  type RagChatMessage,
  type RagChatSource,
} from '@firebuddy/shared';

import {
  createCategory,
  createExpense,
  deleteCategory as deleteApiCategory,
  deleteExpense as deleteApiExpense,
  getCategories,
  getExpenses,
  updateCategory as updateApiCategory,
  updateExpense as updateApiExpense,
} from '../api';
import { hasSupabaseConfig, supabase } from '../supabase';
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  getCategoryById: (id: string) => Category | undefined;
  getAccountById: (id: string) => Account | undefined;
  getMonthlySpend: (categoryId: string, month?: string) => number;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  notify: (message: string) => void;
  dismissNotification: () => void;
}

type ThemeMode = 'light' | 'dark';

interface ChatTopic {
  id: string;
  title: string;
  messages: RagChatMessage[];
  sources: string[];
  sourceDetails: RagChatSource[];
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

function mapApiCategory(category: ApiCategory): Category {
  return {
    id: category.id,
    name: category.name,
    color: category.color || colors.primary,
    icon: category.icon || 'others',
    monthlyBudget: Number(category.monthlyBudget) || 0,
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
const skipAuth = import.meta.env.VITE_SKIP_AUTH === 'true';
const missingSupabaseConfigMessage =
  'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Add them to apps/web/.env.local, or set VITE_SKIP_AUTH=true for local demo mode.';

const AppContext = createContext<AppContextValue | null>(null);

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  } catch {
    return 'light';
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

function getAuthErrorMessage(message: string) {
  if (message.toLowerCase().includes('email address') && message.toLowerCase().includes('invalid')) {
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
    sortTransactionsNewestFirst(loadStored('firebuddy_web_transactions_v2', initialTransactions)),
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    loadStored('firebuddy_web_categories_v2', initialCategories),
  );
  const [accounts, setAccounts] = useState<Account[]>(() =>
    loadStored('firebuddy_web_accounts_v2', initialAccounts),
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [notification, setNotification] = useState<AppNotification | null>(null);

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
      signIn: async (email, password) => {
        setAuthError(null);
        if (!supabase) {
          setAuthError(missingSupabaseConfigMessage);
          throw new Error(missingSupabaseConfigMessage);
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          setAuthError(getAuthErrorMessage(error.message));
          throw error;
        }
      },
      signUp: async (email, password) => {
        setAuthError(null);
        if (!supabase) {
          setAuthError(missingSupabaseConfigMessage);
          throw new Error(missingSupabaseConfigMessage);
        }

        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
          setAuthError(getAuthErrorMessage(error.message));
          throw error;
        }
      },
      signOut: async () => {
        setAuthError(null);
        if (!supabase) {
          setSession(null);
          return;
        }

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
        notify('Transaction has been added.');
      },
      updateTransaction: async (id, updates) => {
        if (session) {
          const currentTransaction = transactions.find((transaction) => transaction.id === id);

          if (!currentTransaction) {
            throw new Error('Transaction not found.');
          }

          const nextTransaction = { ...currentTransaction, ...updates };
          const savedExpense = await updateApiExpense(session.access_token, id, {
            categoryId: nextTransaction.category || null,
            description: nextTransaction.description,
            amount: Math.abs(nextTransaction.amount).toFixed(2),
            date: nextTransaction.date,
          });
          const syncedTransaction = {
            ...mapApiExpense(savedExpense),
            account: nextTransaction.account,
          };

          setTransactions((current) =>
            sortTransactionsNewestFirst(
              current.map((transaction) => (transaction.id === id ? syncedTransaction : transaction)),
            ),
          );
          notify('Transaction has been updated.');
          return;
        }

        setTransactions((current) =>
          sortTransactionsNewestFirst(
            current.map((transaction) => (transaction.id === id ? { ...transaction, ...updates } : transaction)),
          ),
        );
        notify('Transaction has been updated.');
      },
      deleteTransaction: async (id) => {
        if (session) {
          await deleteApiExpense(session.access_token, id);
        }

        setTransactions((current) => current.filter((transaction) => transaction.id !== id));
        notify('Transaction has been deleted.');
      },
      addCategory: async (category) => {
        if (session) {
          const savedCategory = await createCategory(session.access_token, {
            name: category.name,
            icon: category.icon,
            color: category.color,
            monthlyBudget: String(category.monthlyBudget),
          });

          setCategories((current) => [...current, mapApiCategory(savedCategory)]);
          notify('Category has been added.');
          return;
        }

        setCategories((current) => [
          ...current,
          {
            ...category,
            id: `${category.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
            isDefault: false,
          },
        ]);
        notify('Category has been added.');
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
          return;
        }

        setCategories((current) =>
          current.map((category) => (category.id === id ? { ...category, ...updates } : category)),
        );
        notify('Category has been updated.');
      },
      deleteCategory: async (id) => {
        if (id === 'income') {
          return;
        }

        if (session) {
          await deleteApiCategory(session.access_token, id);
        }

        setCategories((current) => current.filter((category) => category.id !== id));
        notify('Category has been deleted.');
      },
      addAccount: (account) => {
        setAccounts((current) => [...current, { ...account, id: `acc_${Date.now()}` }]);
        notify('Account has been added.');
      },
      updateAccount: (id, updates) => {
        setAccounts((current) => current.map((account) => (account.id === id ? { ...account, ...updates } : account)));
        notify('Account has been updated.');
      },
      deleteAccount: (id) => {
        setAccounts((current) => current.filter((account) => account.id !== id));
        notify('Account has been deleted.');
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
  formatTooltipValue,
  getAccountMeta,
  getCategoryIcon,
  getDeviceDateKey,
  getDeviceMonthKey,
  initialCategories,
  monthlyCashflow,
  netWorthHistory,
  polarPoint,
  legacyCategoryIconIds,
  sortTransactionsNewestFirst,
  useFireBuddy,
};

export type { Account, AccountType, AppContextValue, AppNotification, Category, ChatTopic, IconComponent, ThemeMode, Transaction };
