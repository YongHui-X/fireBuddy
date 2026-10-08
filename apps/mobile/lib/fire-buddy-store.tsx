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
  dedupeSameDaySnapshots,
  deleteAccountMoving,
  demoUserId,
  getDeviceDateKey,
  initialDataset,
  materialiseRecurring,
  createRecurringRule,
  type RecurringFrequency,
  type RecurringRule,
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
  upgradeDefaultCategoryColors,
} from '@firebuddy/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { hasDemoTransactions, refreshDemoSlices } from './demo-refresh';
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
  /** Expense categories the emergency reserve must cover; drives the Budgets screen and runway maths. */
  essentialCategoryIds: string[];
  /** Repeating transactions (salary, rent, subscriptions); due copies are added when the app opens. */
  recurringRules: RecurringRule[];
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
  | { type: 'applyAccountDeletion'; accounts: Account[]; transactions: Transaction[]; recurringRules?: RecurringRule[] }
  | { type: 'runRecurring'; today: string }
  | { type: 'addRecurringRule'; rule: RecurringRule }
  | { type: 'updateRecurringRule'; rule: RecurringRule }
  | { type: 'deleteRecurringRule'; id: string }
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

/**
 * `seededOn` value for a dataset the person started empty ("Start fresh" in Profile). The demo
 * calendar refresh skips it, so the sample transactions never come back on their own.
 */
export const FRESH_DATASET = 'fresh';

/** An empty start for a new user: standard categories, one Cash account, nothing recorded yet. */
function freshState(): Records & { seededOn: string } {
  const cash = demoAccounts.find((account) => account.type === 'cash');
  return {
    seededOn: FRESH_DATASET,
    categories: [...demoCategories],
    accounts: cash ? [{ ...cash, isDefault: true }] : [],
    transactions: [],
    tags: [],
    positions: [],
    snapshots: [],
    contributions: [],
    retirementPlan: null,
    essentialCategoryIds: [demoCategoryIds.food, demoCategoryIds.utilities, demoCategoryIds.health],
    recurringRules: [],
  };
}

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
    recurringRules: [],
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
        recurringRules: state.recurringRules.map((rule) =>
          rule.template.categoryId === action.id ? { ...rule, template: { ...rule.template, categoryId: null }, updatedAt: now } : rule,
        ),
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
        recurringRules: state.recurringRules.map((rule) =>
          rule.template.tagIds.includes(action.id) ? { ...rule, template: { ...rule.template, tagIds: rule.template.tagIds.filter((id) => id !== action.id) }, updatedAt: now } : rule,
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
    case 'applyAccountDeletion':
      return { ...state, accounts: action.accounts, transactions: action.transactions, recurringRules: action.recurringRules ?? state.recurringRules };
    case 'runRecurring': {
      // Silent on purpose (owner, 6 Oct 2026): due copies simply appear in the ledger.
      const result = materialiseRecurring(state.recurringRules, action.today, now);
      if (result.inputs.length === 0) return state;
      const added = result.inputs.map((input) => createLocalTransaction(input, demoUserId));
      return { ...state, recurringRules: result.rules, transactions: [...added.reverse(), ...state.transactions] };
    }
    case 'addRecurringRule':
      return { ...state, recurringRules: [...state.recurringRules, action.rule] };
    case 'updateRecurringRule':
      return { ...state, recurringRules: state.recurringRules.map((rule) => (rule.id === action.rule.id ? action.rule : rule)) };
    case 'deleteRecurringRule':
      return { ...state, recurringRules: state.recurringRules.filter((rule) => rule.id !== action.id) };
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
    case 'addSnapshot': {
      // One value per position per date: re-saving a date replaces that day's value.
      const sameDay = state.snapshots.find((item) => item.wealthPositionId === action.snapshot.wealthPositionId && item.valueDate === action.snapshot.valueDate);
      return sameDay
        ? { ...state, snapshots: state.snapshots.map((item) => (item.id === sameDay.id ? { ...item, amount: action.snapshot.amount, updatedAt: action.snapshot.updatedAt } : item)) }
        : { ...state, snapshots: [...state.snapshots, action.snapshot] };
    }
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
  deleteAccount: (id: string, moveTo?: string | null) => boolean;
  setDefaultAccount: (id: string) => void;
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
  /** Save a transaction and make it repeat; it becomes occurrence 0 of the new rule. */
  addRecurringTransaction: (input: CreateTransactionInput, frequency: RecurringFrequency, endDate: string | null) => { transaction: Transaction; rule: RecurringRule };
  /** Replace a rule (template, schedule, pause state); past copies are left as they are. */
  updateRecurringRule: (rule: RecurringRule) => void;
  /** Stop a rule. Copies already recorded stay in the ledger. */
  deleteRecurringRule: (id: string) => void;
  notify: (message: string) => void;
  dismissNotification: () => void;
  clearDemoData: () => Promise<void>;
  /** Empty every record for a clean start; `clearDemoData` brings the demo dataset back. */
  startFresh: () => Promise<void>;
  /** True when the records began from "Start fresh" rather than the demo dataset. */
  isFreshDataset: boolean;
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
    recurringRules: [],
    notification: null,
  });
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet(DEMO_STORAGE_KEYS)
      .then((entries) => {
        if (cancelled) return;
        const stored = Object.fromEntries(entries) as Partial<Record<string, string | null>>;
        const start = initialDataset({ hasStoredRecords: entries.some(([, value]) => value != null), isDev: __DEV__ });
        // A brand-new production install starts empty; development builds start on the demo data.
        const seed = start === 'fresh' ? freshState() : seedState();
        const records: Records = {
          // Default categories saved before the multi-colour chart palette move onto it once.
          categories: upgradeDefaultCategoryColors(parseStored(stored[STORAGE_KEYS.categories], seed.categories)),
          accounts: parseStored(stored[STORAGE_KEYS.accounts], seed.accounts),
          transactions: parseStored(stored[STORAGE_KEYS.transactions], seed.transactions),
          tags: parseStored(stored[STORAGE_KEYS.tags], seed.tags),
          positions: parseStored(stored[STORAGE_KEYS.positions], seed.positions),
          // Same-day duplicates from before re-saving a date replaced it collapse to the newest.
          snapshots: [...dedupeSameDaySnapshots(parseStored(stored[STORAGE_KEYS.snapshots], seed.snapshots))],
          contributions: parseStored(stored[STORAGE_KEYS.contributions], seed.contributions),
          retirementPlan: parseStoredObject(stored[STORAGE_KEYS.retirementPlan], seed.retirementPlan),
          essentialCategoryIds: parseStored(stored[STORAGE_KEYS.essentialCategories], seed.essentialCategoryIds),
          recurringRules: parseStored(stored[STORAGE_KEYS.recurringRules], seed.recurringRules),
        };
        // A fresh dataset is the person's own; only the demo dataset follows the calendar.
        const refreshed = start === 'fresh' || stored[STORAGE_KEYS.seededOn] === FRESH_DATASET
          ? { seededOn: FRESH_DATASET }
          : refreshDemoSlices(records, stored[STORAGE_KEYS.seededOn], seed.seededOn);
        dispatch({
          type: 'hydrate',
          payload: {
            ...records,
            ...refreshed,
          },
        });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'hydrate', payload: __DEV__ ? seedState() : freshState() });
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
      [STORAGE_KEYS.recurringRules, JSON.stringify(state.recurringRules)],
    ]).catch(() => undefined);
  }, [state.hydrated, state.seededOn, state.transactions, state.categories, state.accounts, state.tags, state.positions, state.snapshots, state.contributions, state.retirementPlan, state.essentialCategoryIds, state.recurringRules]);

  // Add due recurring copies once the records are loaded, and again whenever the app comes back
  // to the foreground (a new day may have started while it sat in the background).
  useEffect(() => {
    if (!state.hydrated) return undefined;
    dispatch({ type: 'runRecurring', today: getDeviceDateKey() });
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') dispatch({ type: 'runRecurring', today: getDeviceDateKey() });
    });
    return () => subscription.remove();
  }, [state.hydrated]);

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
  // Moves the account's transactions (and the default flag) to `moveTo` first when it needs a successor.
  const deleteAccount = useCallback((id: string, moveTo?: string | null) => {
    const now = new Date().toISOString();
    const result = deleteAccountMoving(accounts, transactions, id, moveTo, now, state.recurringRules.map((rule) => rule.template.accountId));
    if (!result) return false;
    // Rules follow their transactions, so no future copy is ever recorded on the deleted account.
    const recurringRules = moveTo
      ? state.recurringRules.map((rule) => (rule.template.accountId === id ? { ...rule, template: { ...rule.template, accountId: moveTo }, updatedAt: now } : rule))
      : state.recurringRules;
    dispatch({ type: 'applyAccountDeletion', accounts: result.accounts, transactions: result.transactions, recurringRules });
    return true;
  }, [accounts, transactions, state.recurringRules]);
  const setDefaultAccount = useCallback((id: string) => {
    const timestamp = new Date().toISOString();
    if (!accounts.some((account) => account.id === id)) return;
    dispatch({
      type: 'applyAccountDeletion',
      accounts: accounts.map((account) => (account.isDefault === (account.id === id) ? account : { ...account, isDefault: account.id === id, updatedAt: timestamp })),
      transactions,
    });
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

  const addRecurringTransaction = useCallback((input: CreateTransactionInput, frequency: RecurringFrequency, endDate: string | null) => {
    const now = new Date().toISOString();
    const rule = createRecurringRule(input, frequency, endDate, newId('recurring'), now);
    const transaction = createLocalTransaction({ ...input, recurringId: rule.id }, demoUserId);
    dispatch({ type: 'addTransaction', transaction });
    dispatch({ type: 'addRecurringRule', rule });
    // A start date in the past may already have later copies due.
    dispatch({ type: 'runRecurring', today: getDeviceDateKey() });
    return { transaction, rule };
  }, []);
  const updateRecurringRule = useCallback((rule: RecurringRule) => {
    dispatch({ type: 'updateRecurringRule', rule });
    dispatch({ type: 'runRecurring', today: getDeviceDateKey() });
  }, []);
  const deleteRecurringRule = useCallback((id: string) => dispatch({ type: 'deleteRecurringRule', id }), []);

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
    recurringRules: state.recurringRules,
  }), [state.categories, state.accounts, state.transactions, state.tags, state.positions, state.snapshots, state.contributions, state.retirementPlan, state.essentialCategoryIds, state.recurringRules]);

  const replaceRecords = useCallback(async (records: Records) => {
    // Restored rows keep their own dates; the seed marker moves to today so the calendar
    // refresh never re-dates them as if they were demo rows from an older month. A backup with
    // no demo rows at all is the person's own dataset, so it is marked fresh: otherwise the next
    // launch would treat it as an old demo generation and add the sample ledger to it.
    const seededOn = hasDemoTransactions(records.transactions) ? getDeviceDateKey() : FRESH_DATASET;
    // Backups made before recurring rules existed have none.
    const recurringRules = Array.isArray(records.recurringRules) ? records.recurringRules : [];
    dispatch({ type: 'hydrate', payload: { ...records, recurringRules, seededOn } });
  }, []);

  const clearDemoData = useCallback(async () => {
    await AsyncStorage.multiRemove(DEMO_STORAGE_KEYS).catch(() => undefined);
    dispatch({ type: 'hydrate', payload: seedState() });
    dispatch({ type: 'notify', message: 'Demo data loaded.' });
  }, []);

  const startFresh = useCallback(async () => {
    await AsyncStorage.multiRemove(DEMO_STORAGE_KEYS).catch(() => undefined);
    dispatch({ type: 'hydrate', payload: freshState() });
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
      setDefaultAccount,
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
      addRecurringTransaction,
      updateRecurringRule,
      deleteRecurringRule,
      notify,
      dismissNotification,
      clearDemoData,
      startFresh,
      isFreshDataset: state.seededOn === FRESH_DATASET,
    }),
    [state, addTransaction, updateTransaction, deleteTransaction, duplicateTransaction, addCategory, updateCategory, deleteCategory, addTag, renameTag, deleteTag, addAccount, updateAccount, deleteAccount, setDefaultAccount, setEssentialCategoryIds, exportRecords, replaceRecords, getCategoryById, getAccountById, addPosition, updatePosition, archivePosition, addSnapshot, deleteSnapshot, addContribution, deleteContribution, setRetirementPlan, addRecurringTransaction, updateRecurringRule, deleteRecurringRule, notify, dismissNotification, clearDemoData, startFresh],
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
