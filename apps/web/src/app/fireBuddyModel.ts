/**
 * View-model types, formatters, demo constants and icon lookups shared by the web screens.
 * They live apart from the provider so that file exports only a component and Vite can Fast
 * Refresh it. The mobile app mirrors the pure parts through `@firebuddy/shared`.
 */
import type { ComponentType } from 'react';
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
import type { AccountType as ApiAccountType, AiPreference, Tag as ApiTag, TransactionType, UserProfile } from '@firebuddy/shared';

export type AccountType = ApiAccountType;

export type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>;

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  account: string;
  transactionType: TransactionType;
  tagIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type Tag = ApiTag;

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthlyBudget: number;
  categoryType: TransactionType;
  isDefault?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  lastFour?: string;
  isDefault?: boolean;
}

export interface AppNotification {
  id: number;
  message: string;
}

export interface AppContextValue {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  tags: Tag[];
  themeMode: ThemeMode;
  notification: AppNotification | null;
  session: Session | null;
  authLoading: boolean;
  authError: string | null;
  syncStatus: 'idle' | 'loading' | 'ready' | 'error';
  syncError: string | null;
  demoMode: boolean;
  /** The signed-in user's profile, or null in demo mode and before it loads. */
  profile: UserProfile | null;
  /** How much the AI guide may see. `off` until the user consents. */
  aiPreference: AiPreference;
  aiPreferenceStatus: 'loading' | 'ready' | 'error';
  setAiPreference: (preference: AiPreference) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addTag: (name: string) => Promise<Tag>;
  updateTag: (id: string, name: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
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

export type ThemeMode = 'light' | 'dark';

export function getDeviceDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getDeviceMonthKey(dateKey = getDeviceDateKey()) {
  return dateKey.slice(0, 7);
}

export const colors = {
  primary: '#25543D',
  primaryDark: '#25543D',
  primarySoft: '#E7EFE8',
  secondary: '#46684F',
  background: '#F7F8F5',
  card: '#FFFFFF',
  muted: '#F0F3EE',
  border: '#D8DFD7',
  text: '#202820',
  textMuted: '#626B63',
  danger: '#B42318',
  gold: '#855509',
};

export const fireData = {
  currentNetWorth: 124850,
  targetNetWorth: 1800000,
  invested: 98400,
  cash: 26450,
  projectedFireYear: 2043,
  emergencyMonths: 8.2,
};

export const categoryColors = [
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

export const categoryIconOptions = [
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

export const categoryIconsById = new Map<string, IconComponent>(
  categoryIconOptions.map((option) => [option.id, option.icon]),
);

export const legacyCategoryIconIds: Record<string, string> = {
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

export function resolveCategoryIconId(category?: Category) {
  if (!category?.icon) {
    return category?.id ?? 'others';
  }

  return legacyCategoryIconIds[category.icon] ?? category.icon;
}

export function getCategoryIcon(category?: Category): IconComponent {
  return categoryIconsById.get(resolveCategoryIconId(category)) ?? CircleHelp;
}

export function sortTransactionsNewestFirst(items: Transaction[]) {
  return [...items].sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date);

    if (dateOrder !== 0) {
      return dateOrder;
    }

    return right.id.localeCompare(left.id);
  });
}

export function getAccountMeta(account?: Account) {
  if (!account) {
    return 'Account';
  }

  return `${account.name} \u00B7 ${accountTypeLabel(account.type)}`;
}

export const netWorthHistory = [
  { month: 'Nov', netWorth: 113800, invested: 89300, cash: 24500 },
  { month: 'Dec', netWorth: 117200, invested: 91800, cash: 25400 },
  { month: 'Jan', netWorth: 119600, invested: 93600, cash: 26000 },
  { month: 'Feb', netWorth: 121300, invested: 95400, cash: 25900 },
  { month: 'Mar', netWorth: 123100, invested: 96900, cash: 26200 },
  { month: 'Apr', netWorth: 124850, invested: 98400, cash: 26450 },
];

export function formatSGD(value: number, digits = 2) {
  return `S$${Math.abs(value).toLocaleString('en-SG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatTooltipValue(value: unknown) {
  return typeof value === 'number' ? formatSGD(value, 0) : String(value ?? '');
}

export function formatDateLabel(value: string) {
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

export function polarPoint(centerX: number, centerY: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

export function describeDonutSegment(
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

export function accountTypeLabel(type: AccountType) {
  const labels: Record<AccountType, string> = {
    bank: 'Bank',
    credit_card: 'Credit card',
    debit_card: 'Debit card',
    cash: 'Cash',
    ewallet: 'E-wallet',
  };

  return labels[type];
}
