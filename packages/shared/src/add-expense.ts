export type AccountType = 'bank' | 'credit_card' | 'debit_card' | 'cash' | 'ewallet';

export interface AccountOption {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  lastFour?: string;
}

export interface ExpenseCategoryOption {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface AddExpenseDraft {
  amount: string;
  date: string;
  accountId: string;
  categoryId: string;
  description: string;
}

export type AddExpenseFieldName = keyof AddExpenseDraft;

export type AddExpenseErrors = Partial<Record<AddExpenseFieldName, string>>;

export interface LocalExpenseRecord {
  id: string;
  amount: string;
  date: string;
  accountId: string;
  categoryId: string;
  description: string;
  displayDescription: string;
}

export const expenseCategories: readonly ExpenseCategoryOption[] = [
  { id: 'food_drink', name: 'Food & Drink', color: '#67B47C', emoji: '🍜' },
  { id: 'transport', name: 'Transport', color: '#5E9F88', emoji: '🚇' },
  { id: 'shopping', name: 'Shopping', color: '#E5B24A', emoji: '🛍️' },
  { id: 'bills_utilities', name: 'Bills & Utilities', color: '#7BAA90', emoji: '⚡' },
  { id: 'healthcare', name: 'Healthcare', color: '#2E9B57', emoji: '💊' },
  { id: 'entertainment', name: 'Entertainment', color: '#8BB89D', emoji: '🎬' },
  { id: 'travel', name: 'Travel', color: '#25543D', emoji: '✈️' },
  { id: 'others', name: 'Others', color: '#A8D3B7', emoji: '🧾' },
] as const;

export const expenseAccounts: readonly AccountOption[] = [
  { id: 'dbs_savings', name: 'DBS Savings', type: 'bank', color: '#3C8A61', lastFour: '4521' },
  { id: 'ocbc_360', name: 'OCBC 360', type: 'bank', color: '#5E9F88', lastFour: '8834' },
  {
    id: 'dbs_altitude',
    name: 'DBS Altitude',
    type: 'credit_card',
    color: '#7BAA90',
    lastFour: '1234',
  },
  { id: 'grabpay', name: 'GrabPay', type: 'ewallet', color: '#67B47C' },
  { id: 'cash_wallet', name: 'Cash', type: 'cash', color: '#E5B24A' },
] as const;

export const accountTypeLabels: Record<AccountType, string> = {
  bank: 'Bank',
  credit_card: 'Credit card',
  debit_card: 'Debit card',
  cash: 'Cash',
  ewallet: 'E-wallet',
};

export const accountTypeBadges: Record<AccountType, string> = {
  bank: 'BNK',
  credit_card: 'CRD',
  debit_card: 'DBT',
  cash: 'CSH',
  ewallet: 'EWL',
};

export function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function createInitialAddExpenseDraft(
  accounts: readonly AccountOption[] = expenseAccounts,
  categories: readonly ExpenseCategoryOption[] = expenseCategories,
): AddExpenseDraft {
  return {
    amount: '',
    date: getTodayDate(),
    accountId: accounts[0]?.id ?? '',
    categoryId: categories[0]?.id ?? '',
    description: '',
  };
}

export function validateAddExpenseDraft(values: AddExpenseDraft): AddExpenseErrors {
  const errors: AddExpenseErrors = {};

  if (!values.amount.trim()) {
    errors.amount = 'Enter an amount.';
  } else {
    const numericAmount = Number(values.amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      errors.amount = 'Enter a valid amount above 0.';
    }
  }

  if (!values.date) {
    errors.date = 'Choose a date.';
  }

  if (!values.accountId) {
    errors.accountId = 'Select an account.';
  }

  if (!values.categoryId) {
    errors.categoryId = 'Pick a category.';
  }

  return errors;
}

export function isPositiveAmount(value: string) {
  const numericAmount = Number(value);
  return !Number.isNaN(numericAmount) && numericAmount > 0;
}

export function formatExpenseAmountDisplay(value: string) {
  const numericAmount = Number(value);

  if (!value.trim() || Number.isNaN(numericAmount)) {
    return 'S$ 0.00';
  }

  return `S$ ${numericAmount.toFixed(2)}`;
}

export function createLocalExpenseRecord(values: AddExpenseDraft): LocalExpenseRecord {
  const description = values.description.trim();

  return {
    id: `local-expense-${Date.now()}`,
    amount: Number(values.amount).toFixed(2),
    date: values.date,
    accountId: values.accountId,
    categoryId: values.categoryId,
    description,
    displayDescription: description || 'Unnamed expense',
  };
}

export function getAccountById(
  accountId: string,
  accounts: readonly AccountOption[] = expenseAccounts,
) {
  return accounts.find((account) => account.id === accountId);
}

export function getCategoryById(
  categoryId: string,
  categories: readonly ExpenseCategoryOption[] = expenseCategories,
) {
  return categories.find((category) => category.id === categoryId);
}
