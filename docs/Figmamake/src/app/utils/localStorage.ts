import { Transaction, Category, Account } from '../data/mockData';

const STORAGE_KEYS = {
  TRANSACTIONS: 'firebuddy_transactions',
  CATEGORIES: 'firebuddy_categories',
  ACCOUNTS: 'firebuddy_accounts',
  FIRE_DATA: 'firebuddy_fire_data',
};

// Generic localStorage helpers
export function saveToStorage<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) {
      return fallback;
    }
    return JSON.parse(serialized) as T;
  } catch (error) {
    console.error(`Error loading from localStorage (${key}):`, error);
    return fallback;
  }
}

export function clearStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing localStorage (${key}):`, error);
  }
}

// App-specific storage functions
export function saveTransactions(transactions: Transaction[]): void {
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
}

export function loadTransactions(fallback: Transaction[]): Transaction[] {
  return loadFromStorage(STORAGE_KEYS.TRANSACTIONS, fallback);
}

export function saveCategories(categories: Category[]): void {
  saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
}

export function loadCategories(fallback: Category[]): Category[] {
  return loadFromStorage(STORAGE_KEYS.CATEGORIES, fallback);
}

export function saveAccounts(accounts: Account[]): void {
  saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
}

export function loadAccounts(fallback: Account[]): Account[] {
  return loadFromStorage(STORAGE_KEYS.ACCOUNTS, fallback);
}

// Clear all app data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => clearStorage(key));
}

// Check if user has any saved data
export function hasExistingData(): boolean {
  return localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) !== null;
}
