import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDemoRetirementPlan,
  createDemoTransactions,
  createDemoWealth,
  createLocalTransaction,
  demoAccounts,
  demoCategories,
  demoCategoryIds,
  demoProfile,
  demoTags,
  demoUserId,
  getDeviceDateKey,
  type Account,
  type Category,
  type CreateAccountInput,
  type CreateCategoryInput,
  type CreateTransactionInput,
  type CreateWealthContributionInput,
  type CreateWealthPositionInput,
  type CreateWealthSnapshotInput,
  type RetirementPlan,
  type Tag,
  type Transaction,
  type UpdateAccountInput,
  type UpdateCategoryInput,
  type UpdateTransactionInput,
  type UpdateWealthPositionInput,
  type WealthContribution,
  type WealthPosition,
  type WealthPositionSnapshot,
} from '@firebuddy/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { refreshDemoSlices } from './demo-refresh';
import { DEMO_STORAGE_KEYS, STORAGE_KEYS } from './storage-keys';

/**
 * Local demo state for the native app: the same Singapore saver the web shows in demo mode,
 * persisted to AsyncStorage so edits survive a restart. Business rules stay in the shared
 * package; this file only owns the records and their persistence.
 */

export interface Records {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  tags: Tag[];
  positions: WealthPosition[];
  snapshots: WealthPositionSnapshot[];
  contributions: WealthContribution[];
  retirementPlan: RetirementPlan | null;
  /** Expense categories the emergency reserve must cover; drives the Plan screen and runway maths. */
  essentialCategoryIds: string[];
}

const RECORD_KEYS: readonly (keyof Records)[] = ['categories', 'accounts', 'transactions', 'tags', 'positions', 'snapshots', 'contributions', 'retirementPlan', 'essentialCategoryIds'];

/** Shape check for a restored backup: every array slice present, plan an object or null. */
export function isStoredRecords(value: unknown): value is Records {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return RECORD_KEYS.every((key) => (key === 'retirementPlan'
    ? candidate[key] === null || (typeof candidate[key] === 'object' && candidate[key] !== null)
    : Array.isArray(candidate[key])));
}

interface StoreState extends Records {
  seededOn: string;
  hydrated: boolean;
  notification: { id: number; message: string } | null;
}

type Action =
  | { type: 'hydrate'; payload: Records & { seededOn: string } }
  | { type: 'addTransaction'; transaction: Transaction }
  | { type: 'updateTransaction'; id: string; updates: UpdateTransactionInput }
  | { type: 'deleteTransaction'; id: string }
  | { type: 'addCategory'; category: Category }
  | { type: 'updateCategory'; id: string; updates: UpdateCategoryInput }
  | { type: 'deleteCategory'; id: string }
  | { type: 'addTag'; tag: Tag }
  | { type: 'renameTag'; id: string; name: string }
  | { type: 'deleteTag'; id: string }
  | { type: 'addAccount'; account: Account }
  | { type: 'updateAccount'; id: string; updates: UpdateAccountInput }
  | { type: 'deleteAccount'; id: string }
  | { type: 'setEssentialCategoryIds'; ids: string[] }
  | { type: 'addPosition'; position: WealthPosition; snapshot: WealthPositionSnapshot }
  | { type: 'updatePosition'; id: string; updates: UpdateWealthPositionInput }
  | { type: 'archivePosition'; id: string }
  | { type: 'addSnapshot'; snapshot: WealthPositionSnapshot }
  | { type: 'deleteSnapshot'; id: string }
  | { type: 'addContribution'; contribution: WealthContribution }
  | { type: 'deleteContribution'; id: string }
  | { type: 'setRetirementPlan'; plan: RetirementPlan | null }
  | { type: 'notify'; message: string }
  | { type: 'dismissNotification' };

/** Build every dated demo slice from one device date so their refresh marker agrees. */
function seedState(todayKey = getDeviceDateKey()): Records & { seededOn: string } {
  const wealth = createDemoWealth(todayKey);
  return {
    seededOn: todayKey,
    categories: [...demoCategories],
    accounts: [...demoAccounts],
    transactions: createDemoTransactions(todayKey),
    tags: [...demoTags],
    positions: wealth.positions,
    snapshots: wealth.snapshots,
    contributions: wealth.contributions,
    retirementPlan: createDemoRetirementPlan(todayKey),
    // The same starting selection the web demo uses: food, bills and healthcare.
    essentialCategoryIds: [demoCategoryIds.food, demoCategoryIds.utilities, demoCategoryIds.health],
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
        essentialCategoryIds: state.essentialCategoryIds.filter((id) => id !== action.id),
      };
    case 'addTag':
      return { ...state, tags: [...state.tags, action.tag] };
    case 'renameTag':
      return { ...state, tags: state.tags.map((tag) => (tag.id === action.id ? { ...tag, name: action.name, updatedAt: now } : tag)) };
    case 'deleteTag':
      return {
        ...state,
        tags: state.tags.filter((tag) => tag.id !== action.id),
        // A removed tag detaches from its transactions; the transactions themselves stay.
        transactions: state.transactions.map((transaction) =>
          transaction.tagIds.includes(action.id) ? { ...transaction, tagIds: transaction.tagIds.filter((id) => id !== action.id), updatedAt: now } : transaction,
        ),
      };
    case 'addAccount':
      return { ...state, accounts: [...state.accounts, action.account] };
    case 'updateAccount':
      return {
        ...state,
        accounts: state.accounts.map((account) => (account.id === action.id ? { ...account, ...action.updates, updatedAt: now } : account)),
      };
    case 'deleteAccount':
      return { ...state, accounts: state.accounts.filter((account) => account.id !== action.id) };
    case 'setEssentialCategoryIds':
      return { ...state, essentialCategoryIds: action.ids };
    case 'addPosition':
      return { ...state, positions: [...state.positions, action.position], snapshots: [...state.snapshots, action.snapshot] };
    case 'updatePosition':
      return {
        ...state,
        positions: state.positions.map((position) => (position.id === action.id ? { ...position, ...action.updates, updatedAt: now } : position)),
      };
    case 'archivePosition':
      return {
        ...state,
        positions: state.positions.map((position) => (position.id === action.id ? { ...position, isArchived: true, archivedAt: now, updatedAt: now } : position)),
        // An archived asset can no longer fund the plan, so it drops out of the chosen set.
        retirementPlan: state.retirementPlan
          ? { ...state.retirementPlan, assetIds: state.retirementPlan.assetIds.filter((id) => id !== action.id) }
          : null,
      };
    case 'addSnapshot':
      return { ...state, snapshots: [...state.snapshots, action.snapshot] };
    case 'deleteSnapshot':
      return { ...state, snapshots: state.snapshots.filter((snapshot) => snapshot.id !== action.id) };
    case 'addContribution':
      return { ...state, contributions: [...state.contributions, action.contribution] };
    case 'deleteContribution':
      return { ...state, contributions: state.contributions.filter((contribution) => contribution.id !== action.id) };
    case 'setRetirementPlan':
      return { ...state, retirementPlan: action.plan };
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

function parseStoredObject<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed === null || (typeof parsed === 'object' && !Array.isArray(parsed)) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function newId(prefix: string) {
  return `local-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
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
  renameTag: (id: string, name: string) => void;
  deleteTag: (id: string) => void;
  addAccount: (input: CreateAccountInput) => Account;
  updateAccount: (id: string, updates: UpdateAccountInput) => void;
  /** Refuses the default account and any account still referenced by a transaction; returns whether it was removed. */
  deleteAccount: (id: string) => boolean;
  setEssentialCategoryIds: (ids: string[]) => void;
  /** Every record slice, for the encrypted backup file. */
  exportRecords: () => Records;
  /** Replace every slice with a restored backup and persist it. */
  replaceRecords: (records: Records) => Promise<void>;
  getCategoryById: (id: string | null | undefined) => Category | undefined;
  getAccountById: (id: string | null | undefined) => Account | undefined;
  /** Creates the position together with its first dated value. */
  addPosition: (input: CreateWealthPositionInput, snapshot: CreateWealthSnapshotInput) => WealthPosition;
  updatePosition: (id: string, updates: UpdateWealthPositionInput) => void;
  archivePosition: (id: string) => void;
  addSnapshot: (positionId: string, input: CreateWealthSnapshotInput) => WealthPositionSnapshot;
  deleteSnapshot: (id: string) => void;
  addContribution: (input: CreateWealthContributionInput) => WealthContribution;
  deleteContribution: (id: string) => void;
  setRetirementPlan: (plan: RetirementPlan | null) => void;
  notify: (message: string) => void;
  dismissNotification: () => void;
  clearDemoData: () => Promise<void>;
}

const StoreContext = createContext<FireBuddyStore | null>(null);

export function FireBuddyStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    seededOn: '',
    hydrated: false,
    categories: [],
    accounts: [],
    transactions: [],
    tags: [],
    positions: [],
    snapshots: [],
    contributions: [],
    retirementPlan: null,
    essentialCategoryIds: [],
    notification: null,
  });
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet(DEMO_STORAGE_KEYS)
      .then((entries) => {
        if (cancelled) return;
        const stored = Object.fromEntries(entries) as Partial<Record<string, string | null>>;
        const seed = seedState();
        const records: Records = {
          categories: parseStored(stored[STORAGE_KEYS.categories], seed.categories),
          accounts: parseStored(stored[STORAGE_KEYS.accounts], seed.accounts),
          transactions: parseStored(stored[STORAGE_KEYS.transactions], seed.transactions),
          tags: parseStored(stored[STORAGE_KEYS.tags], seed.tags),
          positions: parseStored(stored[STORAGE_KEYS.positions], seed.positions),
          snapshots: parseStored(stored[STORAGE_KEYS.snapshots], seed.snapshots),
          contributions: parseStored(stored[STORAGE_KEYS.contributions], seed.contributions),
          retirementPlan: parseStoredObject(stored[STORAGE_KEYS.retirementPlan], seed.retirementPlan),
          essentialCategoryIds: parseStored(stored[STORAGE_KEYS.essentialCategories], seed.essentialCategoryIds),
        };
        const refreshed = refreshDemoSlices(records, stored[STORAGE_KEYS.seededOn], seed.seededOn);
        dispatch({
          type: 'hydrate',
          payload: {
            ...records,
            ...refreshed,
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

  // Persist after hydration so a refreshed calendar seed is recorded before the next launch.
  useEffect(() => {
    if (!state.hydrated) return;
    AsyncStorage.multiSet([
      [STORAGE_KEYS.seededOn, state.seededOn],
      [STORAGE_KEYS.transactions, JSON.stringify(state.transactions)],
      [STORAGE_KEYS.categories, JSON.stringify(state.categories)],
      [STORAGE_KEYS.accounts, JSON.stringify(state.accounts)],
      [STORAGE_KEYS.tags, JSON.stringify(state.tags)],
      [STORAGE_KEYS.positions, JSON.stringify(state.positions)],
      [STORAGE_KEYS.snapshots, JSON.stringify(state.snapshots)],
      [STORAGE_KEYS.contributions, JSON.stringify(state.contributions)],
      [STORAGE_KEYS.retirementPlan, JSON.stringify(state.retirementPlan)],
      [STORAGE_KEYS.essentialCategories, JSON.stringify(state.essentialCategoryIds)],
    ]).catch(() => undefined);
  }, [state.hydrated, state.seededOn, state.transactions, state.categories, state.accounts, state.tags, state.positions, state.snapshots, state.contributions, state.retirementPlan, state.essentialCategoryIds]);

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

  const renameTag = useCallback((id: string, name: string) => dispatch({ type: 'renameTag', id, name: name.trim() }), []);
  const deleteTag = useCallback((id: string) => dispatch({ type: 'deleteTag', id }), []);

  const addAccount = useCallback((input: CreateAccountInput) => {
    const timestamp = new Date().toISOString();
    const account: Account = {
      id: newId('account'),
      userId: demoUserId,
      name: input.name.trim(),
      type: input.type,
      color: input.color,
      lastFour: input.lastFour || null,
      isDefault: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    dispatch({ type: 'addAccount', account });
    return account;
  }, []);

  const updateAccount = useCallback((id: string, updates: UpdateAccountInput) => dispatch({ type: 'updateAccount', id, updates }), []);
  const deleteAccount = useCallback((id: string) => {
    const account = accounts.find((item) => item.id === id);
    if (!account || account.isDefault || transactions.some((transaction) => transaction.accountId === id)) return false;
    dispatch({ type: 'deleteAccount', id });
    return true;
  }, [accounts, transactions]);
  const setEssentialCategoryIds = useCallback((ids: string[]) => dispatch({ type: 'setEssentialCategoryIds', ids }), []);

  const addPosition = useCallback((input: CreateWealthPositionInput, first: CreateWealthSnapshotInput) => {
    const timestamp = new Date().toISOString();
    const position: WealthPosition = {
      interestRate: null, monthlyPayment: null, nextPaymentDate: null, originalPrincipal: null,
      ...input,
      id: newId('position'), userId: demoUserId, isArchived: false, archivedAt: null, latestSnapshot: null, createdAt: timestamp, updatedAt: timestamp,
    };
    const snapshot: WealthPositionSnapshot = { id: newId('snapshot'), userId: demoUserId, wealthPositionId: position.id, ...first, createdAt: timestamp, updatedAt: timestamp };
    dispatch({ type: 'addPosition', position, snapshot });
    return position;
  }, []);

  const updatePosition = useCallback((id: string, updates: UpdateWealthPositionInput) => dispatch({ type: 'updatePosition', id, updates }), []);
  const archivePosition = useCallback((id: string) => dispatch({ type: 'archivePosition', id }), []);

  const addSnapshot = useCallback((positionId: string, input: CreateWealthSnapshotInput) => {
    const timestamp = new Date().toISOString();
    const snapshot: WealthPositionSnapshot = { id: newId('snapshot'), userId: demoUserId, wealthPositionId: positionId, ...input, createdAt: timestamp, updatedAt: timestamp };
    dispatch({ type: 'addSnapshot', snapshot });
    return snapshot;
  }, []);

  const deleteSnapshot = useCallback((id: string) => dispatch({ type: 'deleteSnapshot', id }), []);

  const addContribution = useCallback((input: CreateWealthContributionInput) => {
    const timestamp = new Date().toISOString();
    const contribution: WealthContribution = { id: newId('contribution'), userId: demoUserId, ...input, createdAt: timestamp, updatedAt: timestamp };
    dispatch({ type: 'addContribution', contribution });
    return contribution;
  }, []);

  const deleteContribution = useCallback((id: string) => dispatch({ type: 'deleteContribution', id }), []);
  const setRetirementPlan = useCallback((plan: RetirementPlan | null) => dispatch({ type: 'setRetirementPlan', plan }), []);

  const exportRecords = useCallback((): Records => ({
    categories: state.categories,
    accounts: state.accounts,
    transactions: state.transactions,
    tags: state.tags,
    positions: state.positions,
    snapshots: state.snapshots,
    contributions: state.contributions,
    retirementPlan: state.retirementPlan,
    essentialCategoryIds: state.essentialCategoryIds,
  }), [state.categories, state.accounts, state.transactions, state.tags, state.positions, state.snapshots, state.contributions, state.retirementPlan, state.essentialCategoryIds]);

  const replaceRecords = useCallback(async (records: Records) => {
    // Restored rows keep their own dates; the seed marker moves to today so the calendar
    // refresh never re-dates them as if they were demo rows from an older month.
    dispatch({ type: 'hydrate', payload: { ...records, seededOn: getDeviceDateKey() } });
  }, []);

  const clearDemoData = useCallback(async () => {
    await AsyncStorage.multiRemove(DEMO_STORAGE_KEYS).catch(() => undefined);
    dispatch({ type: 'hydrate', payload: seedState() });
    dispatch({ type: 'notify', message: 'Data reset to the starting dataset.' });
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
      renameTag,
      deleteTag,
      addAccount,
      updateAccount,
      deleteAccount,
      setEssentialCategoryIds,
      exportRecords,
      replaceRecords,
      getCategoryById,
      getAccountById,
      addPosition,
      updatePosition,
      archivePosition,
      addSnapshot,
      deleteSnapshot,
      addContribution,
      deleteContribution,
      setRetirementPlan,
      notify,
      dismissNotification,
      clearDemoData,
    }),
    [state, addTransaction, updateTransaction, deleteTransaction, duplicateTransaction, addCategory, updateCategory, deleteCategory, addTag, renameTag, deleteTag, addAccount, updateAccount, deleteAccount, setEssentialCategoryIds, exportRecords, replaceRecords, getCategoryById, getAccountById, addPosition, updatePosition, archivePosition, addSnapshot, deleteSnapshot, addContribution, deleteContribution, setRetirementPlan, notify, dismissNotification, clearDemoData],
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
