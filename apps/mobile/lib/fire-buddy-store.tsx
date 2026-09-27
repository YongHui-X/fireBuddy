import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDemoTransactions,
  createLocalTransaction,
  demoAccounts,
  demoCategories,
  demoProfile,
  demoTags,
  demoUserId,
  type Account,
  type Category,
  type CreateCategoryInput,
  type CreateTransactionInput,
  type Tag,
  type Transaction,
  type UpdateCategoryInput,
  type UpdateTransactionInput,
} from '@firebuddy/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';

import { DEMO_STORAGE_KEYS, STORAGE_KEYS } from './storage-keys';

/**
 * Local demo state for the native app: the same Singapore saver the web shows in demo mode,
 * persisted to AsyncStorage so edits survive a restart. Business rules stay in the shared
 * package; this file only owns the records and their persistence.
 */

interface StoreState {
  hydrated: boolean;
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  tags: Tag[];
  notification: { id: number; message: string } | null;
}

type Action =
  | { type: 'hydrate'; payload: Pick<StoreState, 'categories' | 'accounts' | 'transactions' | 'tags'> }
  | { type: 'addTransaction'; transaction: Transaction }
  | { type: 'updateTransaction'; id: string; updates: UpdateTransactionInput }
  | { type: 'deleteTransaction'; id: string }
  | { type: 'addCategory'; category: Category }
  | { type: 'updateCategory'; id: string; updates: UpdateCategoryInput }
  | { type: 'deleteCategory'; id: string }
  | { type: 'addTag'; tag: Tag }
  | { type: 'notify'; message: string }
  | { type: 'dismissNotification' };

function seedState(): Pick<StoreState, 'categories' | 'accounts' | 'transactions' | 'tags'> {
  return {
    categories: [...demoCategories],
    accounts: [...demoAccounts],
    transactions: createDemoTransactions(),
    tags: [...demoTags],
  };
}

function reducer(state: StoreState, action: Action): StoreState {
  const now = new Date().toISOString();
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.payload, hydrated: true };
    case 'addTransaction':
      return { ...state, transactions: [action.transaction, ...state.transactions] };
    case 'updateTransaction':
      return {
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === action.id ? { ...transaction, ...action.updates, updatedAt: now } : transaction,
        ),
      };
    case 'deleteTransaction':
      return { ...state, transactions: state.transactions.filter((transaction) => transaction.id !== action.id) };
    case 'addCategory':
      return { ...state, categories: [...state.categories, action.category] };
    case 'updateCategory':
      return {
        ...state,
        categories: state.categories.map((category) => (category.id === action.id ? { ...category, ...action.updates } : category)),
      };
    case 'deleteCategory':
      return {
        ...state,
        categories: state.categories.filter((category) => category.id !== action.id),
        // Orphaned transactions keep their history and become uncategorised, as on the web.
        transactions: state.transactions.map((transaction) =>
          transaction.categoryId === action.id ? { ...transaction, categoryId: null, updatedAt: now } : transaction,
        ),
      };
    case 'addTag':
      return { ...state, tags: [...state.tags, action.tag] };
    case 'notify':
      return { ...state, notification: { id: Date.now(), message: action.message } };
    case 'dismissNotification':
      return { ...state, notification: null };
    default:
      return state;
  }
}

function parseStored<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface FireBuddyStore extends StoreState {
  demoMode: true;
  profile: typeof demoProfile;
  addTransaction: (input: CreateTransactionInput) => Transaction;
  updateTransaction: (id: string, updates: UpdateTransactionInput) => void;
  deleteTransaction: (id: string) => void;
  duplicateTransaction: (id: string) => Transaction | null;
  addCategory: (input: CreateCategoryInput) => Category;
  updateCategory: (id: string, updates: UpdateCategoryInput) => void;
  deleteCategory: (id: string) => void;
  addTag: (name: string) => Tag;
  getCategoryById: (id: string | null | undefined) => Category | undefined;
  getAccountById: (id: string | null | undefined) => Account | undefined;
  notify: (message: string) => void;
  dismissNotification: () => void;
  clearDemoData: () => Promise<void>;
}

const StoreContext = createContext<FireBuddyStore | null>(null);

export function FireBuddyStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    hydrated: false,
    categories: [],
    accounts: [],
    transactions: [],
    tags: [],
    notification: null,
  });
  const skipPersist = useRef(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet(DEMO_STORAGE_KEYS)
      .then((entries) => {
        if (cancelled) return;
        const stored = Object.fromEntries(entries) as Partial<Record<string, string | null>>;
        const seed = seedState();
        dispatch({
          type: 'hydrate',
          payload: {
            categories: parseStored(stored[STORAGE_KEYS.categories], seed.categories),
            accounts: parseStored(stored[STORAGE_KEYS.accounts], seed.accounts),
            transactions: parseStored(stored[STORAGE_KEYS.transactions], seed.transactions),
            tags: parseStored(stored[STORAGE_KEYS.tags], seed.tags),
          },
        });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'hydrate', payload: seedState() });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist each slice after hydration; the first post-hydration render is the loaded data itself.
  useEffect(() => {
    if (!state.hydrated) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    AsyncStorage.multiSet([
      [STORAGE_KEYS.transactions, JSON.stringify(state.transactions)],
      [STORAGE_KEYS.categories, JSON.stringify(state.categories)],
      [STORAGE_KEYS.accounts, JSON.stringify(state.accounts)],
      [STORAGE_KEYS.tags, JSON.stringify(state.tags)],
    ]).catch(() => undefined);
  }, [state.hydrated, state.transactions, state.categories, state.accounts, state.tags]);

  const { categories, accounts, transactions } = state;

  const getCategoryById = useCallback((id: string | null | undefined) => categories.find((category) => category.id === id), [categories]);
  const getAccountById = useCallback((id: string | null | undefined) => accounts.find((account) => account.id === id), [accounts]);
  const notify = useCallback((message: string) => dispatch({ type: 'notify', message }), []);
  const dismissNotification = useCallback(() => dispatch({ type: 'dismissNotification' }), []);

  const addTransaction = useCallback((input: CreateTransactionInput) => {
    const transaction = createLocalTransaction(input, demoUserId);
    dispatch({ type: 'addTransaction', transaction });
    return transaction;
  }, []);

  const updateTransaction = useCallback((id: string, updates: UpdateTransactionInput) => dispatch({ type: 'updateTransaction', id, updates }), []);
  const deleteTransaction = useCallback((id: string) => dispatch({ type: 'deleteTransaction', id }), []);

  const duplicateTransaction = useCallback(
    (id: string) => {
      const source = transactions.find((transaction) => transaction.id === id);
      if (!source) return null;
      const copy = createLocalTransaction(
        {
          categoryId: source.categoryId,
          accountId: source.accountId,
          description: source.description,
          amount: source.amount,
          date: source.date,
          transactionType: source.transactionType,
          tagIds: [...source.tagIds],
        },
        demoUserId,
      );
      dispatch({ type: 'addTransaction', transaction: copy });
      return copy;
    },
    [transactions],
  );

  const addCategory = useCallback((input: CreateCategoryInput) => {
    const category: Category = {
      id: `local-category-${Date.now()}`,
      userId: demoUserId,
      isDefault: false,
      createdAt: new Date().toISOString(),
      ...input,
    };
    dispatch({ type: 'addCategory', category });
    return category;
  }, []);

  const updateCategory = useCallback((id: string, updates: UpdateCategoryInput) => dispatch({ type: 'updateCategory', id, updates }), []);
  const deleteCategory = useCallback((id: string) => dispatch({ type: 'deleteCategory', id }), []);

  const addTag = useCallback((name: string) => {
    const timestamp = new Date().toISOString();
    const tag: Tag = { id: `local-tag-${Date.now()}`, userId: demoUserId, name: name.trim(), usageCount: 0, createdAt: timestamp, updatedAt: timestamp };
    dispatch({ type: 'addTag', tag });
    return tag;
  }, []);

  const clearDemoData = useCallback(async () => {
    await AsyncStorage.multiRemove(DEMO_STORAGE_KEYS).catch(() => undefined);
    dispatch({ type: 'hydrate', payload: seedState() });
    dispatch({ type: 'notify', message: 'Local demo data reset.' });
  }, []);

  const value = useMemo<FireBuddyStore>(
    () => ({
      ...state,
      demoMode: true,
      profile: demoProfile,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      duplicateTransaction,
      addCategory,
      updateCategory,
      deleteCategory,
      addTag,
      getCategoryById,
      getAccountById,
      notify,
      dismissNotification,
      clearDemoData,
    }),
    [state, addTransaction, updateTransaction, deleteTransaction, duplicateTransaction, addCategory, updateCategory, deleteCategory, addTag, getCategoryById, getAccountById, notify, dismissNotification, clearDemoData],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useFireBuddy() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useFireBuddy must be used within FireBuddyStoreProvider');
  }
  return context;
}
