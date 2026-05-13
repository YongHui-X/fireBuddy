export interface Transaction {
  id: string;
  description: string;
  amount: number; // negative = expense, positive = income
  category: string;
  date: string; // YYYY-MM-DD
  account?: string; // account id
}

export interface Category {
  id: string;
  name: string;
  color: string;
  emoji: string;
  monthlyBudget: number;
  isDefault?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'credit_card' | 'debit_card' | 'cash' | 'ewallet';
  color: string;
  lastFour?: string;
}

export const CATEGORIES: Category[] = [
  { id: 'food',          name: 'Food & drink',   color: '#F4A97E', emoji: '🍜', monthlyBudget: 600,  isDefault: true },
  { id: 'transport',     name: 'Transport',       color: '#7FB5D5', emoji: '🚇', monthlyBudget: 250,  isDefault: true },
  { id: 'housing',       name: 'Housing',         color: '#D98FAD', emoji: '🏠', monthlyBudget: 2000, isDefault: true },
  { id: 'entertainment', name: 'Entertainment',   color: '#A98BD4', emoji: '🎬', monthlyBudget: 200,  isDefault: true },
  { id: 'health',        name: 'Health',          color: '#6FC08A', emoji: '💊', monthlyBudget: 150,  isDefault: true },
  { id: 'shopping',      name: 'Shopping',        color: '#E8C46A', emoji: '🛍', monthlyBudget: 300,  isDefault: true },
  { id: 'utilities',     name: 'Utilities',       color: '#82AECB', emoji: '⚡', monthlyBudget: 150,  isDefault: true },
  { id: 'income',        name: 'Income',          color: '#2D5A3D', emoji: '💵', monthlyBudget: 0,    isDefault: true },
];

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'dbs_savings',  name: 'DBS Savings',    type: 'bank',        color: '#C4855A', lastFour: '4521' },
  { id: 'ocbc_360',     name: 'OCBC 360',        type: 'bank',        color: '#6B8EA8', lastFour: '8834' },
  { id: 'dbs_altitude', name: 'DBS Altitude',    type: 'credit_card', color: '#9B7BA8', lastFour: '1234' },
  { id: 'grabpay',      name: 'GrabPay',         type: 'ewallet',     color: '#7A9B82' },
  { id: 'cash_wallet',  name: 'Cash',            type: 'cash',        color: '#B89A6B' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1',  description: 'Hawker Centre lunch',         amount: -8.50,    category: 'food',          date: '2026-04-14', account: 'grabpay'      },
  { id: '2',  description: 'MRT — Bishan to City Hall',   amount: -1.82,    category: 'transport',     date: '2026-04-14', account: 'dbs_savings'  },
  { id: '3',  description: 'April salary',                amount: 6500.00,  category: 'income',        date: '2026-04-14', account: 'dbs_savings'  },
  { id: '4',  description: 'Cold Storage groceries',      amount: -67.40,   category: 'food',          date: '2026-04-13', account: 'dbs_altitude' },
  { id: '5',  description: 'Grab — Buona Vista',          amount: -12.50,   category: 'transport',     date: '2026-04-13', account: 'grabpay'      },
  { id: '6',  description: 'Netflix subscription',        amount: -10.98,   category: 'entertainment', date: '2026-04-13', account: 'dbs_altitude' },
  { id: '7',  description: 'Ya Kun Kaya Toast',           amount: -5.80,    category: 'food',          date: '2026-04-12', account: 'cash_wallet'  },
  { id: '8',  description: 'Watsons pharmacy',            amount: -22.90,   category: 'health',        date: '2026-04-12', account: 'dbs_altitude' },
  { id: '9',  description: 'Uniqlo — Orchard',            amount: -79.00,   category: 'shopping',      date: '2026-04-12', account: 'dbs_altitude' },
  { id: '10', description: 'SP utilities bill',           amount: -98.40,   category: 'utilities',     date: '2026-04-11', account: 'ocbc_360'     },
  { id: '11', description: 'Koufu dinner',                amount: -9.20,    category: 'food',          date: '2026-04-11', account: 'cash_wallet'  },
  { id: '12', description: 'NTUC FairPrice',              amount: -45.60,   category: 'food',          date: '2026-04-10', account: 'dbs_altitude' },
  { id: '13', description: 'Spotify Premium',             amount: -9.90,    category: 'entertainment', date: '2026-04-10', account: 'dbs_altitude' },
  { id: '14', description: 'CPF top-up',                  amount: 1300.00,  category: 'income',        date: '2026-04-10', account: 'dbs_savings'  },
  { id: '15', description: 'HDB rental',                  amount: -2000.00, category: 'housing',       date: '2026-04-01', account: 'ocbc_360'     },
  { id: '16', description: 'Dividends — STI ETF',         amount: 248.50,   category: 'income',        date: '2026-04-01', account: 'dbs_savings'  },
  { id: '17', description: 'Bengawan Solo cake',          amount: -32.00,   category: 'food',          date: '2026-04-09', account: 'dbs_altitude' },
  { id: '18', description: 'Guardian health store',       amount: -18.40,   category: 'health',        date: '2026-04-09', account: 'dbs_altitude' },
  { id: '19', description: 'Cathay cinema tickets',       amount: -25.00,   category: 'entertainment', date: '2026-04-08', account: 'dbs_altitude' },
  { id: '20', description: 'Pokka drinks (7-Eleven)',     amount: -2.80,    category: 'food',          date: '2026-04-08', account: 'cash_wallet'  },
];

export const FIRE_DATA = {
  name: 'Alex Tan',
  initials: 'AT',
  monthlyIncome: 7800,
  targetNetWorth: 1800000,
  currentNetWorth: 124850,
  invested: 98400,
  cash: 26450,
  annualExpenses: 41400,
  projectedFireYear: 2043,
  emergencyMonths: 8.2,
  monthlySavings: 3600,
};

export const CATEGORY_COLORS = [
  '#F4A97E', '#7FB5D5', '#D98FAD', '#A98BD4',
  '#6FC08A', '#E8C46A', '#82AECB', '#2D5A3D',
  '#F0C4A0', '#90D4B8', '#E0A8C0', '#C4A8E0',
];

export const CATEGORY_EMOJIS = [
  '🍜','🥗','🍕','🍔','☕','🍷',
  '🚇','🚗','✈️','🚲','⛽','🛵',
  '🏠','🏥','🎬','🎮','🛍','👗',
  '💊','💪','⚡','💡','📱','💼',
  '🎓','🌿','🎁','💰','📈','💵',
];

export const ACCOUNT_COLORS = [
  '#C4855A', '#6B8EA8', '#9B7BA8', '#7A9B82',
  '#B89A6B', '#7A8B9B', '#2D5A3D', '#B85C5C',
  '#8B7A6B', '#C4A882', '#8B9B7A', '#A88B7A',
];