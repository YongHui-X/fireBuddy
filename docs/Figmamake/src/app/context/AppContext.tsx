import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  INITIAL_TRANSACTIONS, CATEGORIES, INITIAL_ACCOUNTS,
  Transaction, Category, Account,
} from '../data/mockData';
import {
  loadTransactions,
  saveTransactions,
  loadCategories,
  saveCategories,
  loadAccounts,
  saveAccounts,
} from '../utils/localStorage';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getCategoryById: (id: string) => Category | undefined;
  getAccountById: (id: string) => Account | undefined;
  getMonthlySpend: (categoryId: string, month?: string) => number;
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
}

const AppContext = createContext<AppContextType>({
  transactions: [],
  categories: [],
  accounts: [],
  addTransaction: () => {},
  updateTransaction: () => {},
  deleteTransaction: () => {},
  getCategoryById: () => undefined,
  getAccountById: () => undefined,
  getMonthlySpend: () => 0,
  addCategory: () => {},
  updateCategory: () => {},
  deleteCategory: () => {},
  addAccount: () => {},
  updateAccount: () => {},
  deleteAccount: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  // Load from localStorage on initialization
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadTransactions(INITIAL_TRANSACTIONS)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    loadCategories(CATEGORIES)
  );
  const [accounts, setAccounts] = useState<Account[]>(() =>
    loadAccounts(INITIAL_ACCOUNTS)
  );

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...t, id: String(Date.now()) };
    setTransactions(prev =>
      [newTx, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
        .sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const getCategoryById = (id: string) => categories.find(c => c.id === id);
  const getAccountById = (id: string) => accounts.find(a => a.id === id);

  const getMonthlySpend = (categoryId: string, month = '2026-04') => {
    return transactions
      .filter(t => t.category === categoryId && t.date.startsWith(month) && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const addCategory = (c: Omit<Category, 'id'>) => {
    const id = c.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    setCategories(prev => [...prev, { ...c, id, isDefault: false }]);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const addAccount = (a: Omit<Account, 'id'>) => {
    const id = 'acc_' + Date.now();
    setAccounts(prev => [...prev, { ...a, id }]);
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        transactions,
        categories,
        accounts,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getCategoryById,
        getAccountById,
        getMonthlySpend,
        addCategory,
        updateCategory,
        deleteCategory,
        addAccount,
        updateAccount,
        deleteAccount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
