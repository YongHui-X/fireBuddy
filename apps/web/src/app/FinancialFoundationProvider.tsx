import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  type CreateWealthContributionInput,
  type CreateWealthPositionInput,
  type CreateWealthSnapshotInput,
  type FinancialSummary,
  type FireProfile,
  type FireScenarioRequest,
  type UpdateFireProfileInput,
  type UpdateWealthPositionInput,
  type WealthContribution,
  type WealthPosition,
  type WealthPositionSnapshot,
} from '@firebuddy/shared';

import {
  calculateFireScenario,
  createWealthContribution,
  createWealthPosition,
  createWealthSnapshot,
  deleteWealthContribution,
  deleteWealthPosition,
  deleteWealthSnapshot,
  getEssentialCategories,
  getFinancialSummary,
  getFireProfile,
  getWealthContributions,
  getWealthPositions,
  getWealthSnapshotHistory,
  saveEssentialCategories,
  saveFireProfile,
  updateWealthPosition,
} from '../api';
import { useFireBuddy } from './fireBuddyContext';
import { buildDemoFinancialSummary, localDate } from './demoFinancialSummary';
import { FinancialFoundationContext, type FoundationStatus } from './financialFoundationContext';
import { recordEmberAppAction } from './emberAppContext';
import {
  ESSENTIAL_CATEGORIES_STORAGE_KEY,
  FIRE_PROFILE_STORAGE_KEY,
  WEALTH_CONTRIBUTIONS_STORAGE_KEY,
  WEALTH_POSITIONS_STORAGE_KEY,
  WEALTH_SNAPSHOTS_STORAGE_KEY,
} from './demoStorage';

const demoUserId = '00000000-0000-4000-8000-00000000f100';

function monthsAgo(months: number, day = 1) {
  const value = new Date();
  value.setMonth(value.getMonth() - months, day);
  return localDate(value);
}

function timestamp() {
  return new Date().toISOString();
}

function demoPosition(id: string, name: string, values: Partial<WealthPosition>): WealthPosition {
  return {
    id, userId: demoUserId, name, positionKind: 'asset', positionType: 'cash', liquidityClass: 'liquid',
    includeInFi: false, isEmergencyFund: false, restrictionType: 'none', currency: 'SGD',
    interestRate: null, monthlyPayment: null, nextPaymentDate: null, originalPrincipal: null, isArchived: false,
    archivedAt: null, latestSnapshot: null, createdAt: timestamp(), updatedAt: timestamp(), ...values,
  };
}

const defaultPositions: WealthPosition[] = [
  demoPosition('00000000-0000-4000-8000-00000000f101', 'Cash reserve', { includeInFi: true, isEmergencyFund: true }),
  demoPosition('00000000-0000-4000-8000-00000000f102', 'Brokerage', { positionType: 'investment', liquidityClass: 'less_liquid', includeInFi: true }),
  demoPosition('00000000-0000-4000-8000-00000000f103', 'Home', { positionType: 'property', liquidityClass: 'less_liquid' }),
  demoPosition('00000000-0000-4000-8000-00000000f104', 'Mortgage', { positionKind: 'liability', positionType: 'mortgage', liquidityClass: 'less_liquid', interestRate: '0.0260', monthlyPayment: '1650.00', nextPaymentDate: monthsAgo(-1), originalPrincipal: '380000.00' }),
];

const defaultSnapshots: WealthPositionSnapshot[] = [
  // About S$80,000 of net worth: S$18k cash, S$47k invested, and an HDB flat with S$15k of equity.
  ['00000000-0000-4000-8000-00000000f101', '18000'],
  ['00000000-0000-4000-8000-00000000f102', '47000'],
  ['00000000-0000-4000-8000-00000000f103', '380000'],
  ['00000000-0000-4000-8000-00000000f104', '365000'],
].flatMap(([wealthPositionId, amount], index) => [6, 3, 0].map((age) => ({
  id: `00000000-0000-4000-8000-${String(200 + index * 10 + age).padStart(12, '0')}`,
  userId: demoUserId, wealthPositionId, valueDate: monthsAgo(age),
  // The mortgage shrinks over time while assets grow, so the history reads the right way round.
  amount: age === 0 ? amount : (Number(amount) * (wealthPositionId === '00000000-0000-4000-8000-00000000f104' ? (age === 6 ? 1.016 : 1.008) : age === 6 ? 0.94 : 0.97)).toFixed(2),
  createdAt: timestamp(), updatedAt: timestamp(),
})));

const defaultContributions: WealthContribution[] = [{
  id: '00000000-0000-4000-8000-00000000f301', userId: demoUserId,
  wealthPositionId: '00000000-0000-4000-8000-00000000f102', contributionDate: monthsAgo(0, 5),
  amount: '2000.00', note: 'Monthly investment', createdAt: timestamp(), updatedAt: timestamp(),
}];

const defaultProfile: FireProfile = {
  id: '00000000-0000-4000-8000-00000000f401', userId: demoUserId,
  monthlyContribution: '2000.00', expectedReturnRate: '0.070000', inflationRate: '0.030000',
  withdrawalRate: '0.040000', retirementSpendingOverride: '3500.00',
  targetFiDate: `${new Date().getFullYear() + 28}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
  birthYear: 1994, createdAt: timestamp(), updatedAt: timestamp(),
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random()}`;
}

/** Discard all financial state and pending callbacks when the authenticated owner changes. */
export function FinancialFoundationProvider({ children }: { children: ReactNode }) {
  const { session, demoMode } = useFireBuddy();
  return <FinancialFoundationSessionProvider key={demoMode ? 'demo' : session?.user.id ?? 'anonymous'}>{children}</FinancialFoundationSessionProvider>;
}

function FinancialFoundationSessionProvider({ children }: { children: ReactNode }) {
  const { session, demoMode, transactions, categories } = useFireBuddy();
  const [positions, setPositions] = useState<WealthPosition[]>(() => demoMode ? loadStored(WEALTH_POSITIONS_STORAGE_KEY, defaultPositions) : []);
  const [snapshots, setSnapshots] = useState<WealthPositionSnapshot[]>(() => demoMode ? loadStored(WEALTH_SNAPSHOTS_STORAGE_KEY, defaultSnapshots) : []);
  const [contributions, setContributions] = useState<WealthContribution[]>(() => demoMode ? loadStored(WEALTH_CONTRIBUTIONS_STORAGE_KEY, defaultContributions) : []);
  const [profile, setProfile] = useState<FireProfile | null>(() => demoMode ? loadStored(FIRE_PROFILE_STORAGE_KEY, defaultProfile) : null);
  const [essentialCategoryIds, setEssentialCategoryIds] = useState<string[]>(() => demoMode
    ? loadStored(ESSENTIAL_CATEGORIES_STORAGE_KEY, categories.filter((item) => ['Food & Drink', 'Bills & Utilities', 'Healthcare'].includes(item.name)).map((item) => item.id)) : []);
  const [remoteSummary, setRemoteSummary] = useState<FinancialSummary | null>(null);
  const [recordsStatus, setRecordsStatus] = useState<FoundationStatus>(demoMode ? 'ready' : 'loading');
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<FoundationStatus>(demoMode ? 'ready' : 'loading');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [historyRequested, setHistoryRequested] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const recordsRequest = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const token = session?.access_token;
  // Supabase rotates the access token roughly hourly. Loads are keyed on the owner, not the
  // token, so a refresh does not refetch every record; requests read the newest token from the ref.
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const ownerId = session?.user.id;
  const status: FoundationStatus = recordsStatus === 'error' || summaryStatus === 'error' ? 'error'
    : recordsStatus === 'loading' || summaryStatus === 'loading' ? 'loading' : 'ready';
  const error = recordsError ?? summaryError ?? historyError;

  const summary = useMemo(() => demoMode
    ? buildDemoFinancialSummary(positions, snapshots, contributions, profile, transactions, essentialCategoryIds)
    : remoteSummary, [contributions, demoMode, essentialCategoryIds, positions, profile, remoteSummary, snapshots, transactions]);

  /** Refresh source records once; transaction changes only reload the derived summary. */
  const refresh = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || !mounted.current || demoMode) return;
    recordsRequest.current?.abort();
    const controller = new AbortController();
    recordsRequest.current = controller;
    setRecordsStatus('loading'); setRecordsError(null);
    try {
      const [nextPositions, nextContributions, profileEnvelope, essentials] = await Promise.all([
        getWealthPositions(token, controller.signal), getWealthContributions(token, controller.signal), getFireProfile(token, controller.signal),
        getEssentialCategories(token, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setPositions(nextPositions); setSnapshots(nextPositions.flatMap(item => item.latestSnapshot ? [item.latestSnapshot] : [])); setContributions(nextContributions);
      setProfile(profileEnvelope.profile); setEssentialCategoryIds(essentials.categoryIds); setRecordsStatus('ready');
    } catch (caught) {
      if (controller.signal.aborted) return;
      setRecordsError(caught instanceof Error ? caught.message : 'Unable to load financial foundation data.'); setRecordsStatus('error');
    }
  }, [demoMode, ownerId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; recordsRequest.current?.abort(); };
  }, [refresh]);

  // Cleanup also guards against mocks or transports that resolve after cancellation.
  useEffect(() => {
    const token = tokenRef.current;
    if (demoMode || !token || recordsStatus !== 'ready') return;
    const controller = new AbortController();
    setRemoteSummary(null); setSummaryStatus('loading'); setSummaryError(null);
    void getFinancialSummary(token, undefined, controller.signal).then(nextSummary => {
      if (controller.signal.aborted) return;
      setRemoteSummary(nextSummary); setSummaryStatus('ready');
    }).catch((caught: unknown) => {
      if (controller.signal.aborted) return;
      setSummaryError(caught instanceof Error ? caught.message : 'Unable to load financial summary.'); setSummaryStatus('error');
    });
    return () => controller.abort();
  }, [demoMode, ownerId, recordsStatus, positions, contributions, profile, essentialCategoryIds, transactions, categories]);

  /** Request full history only for the wealth management screen. */
  const loadSnapshotHistory = useCallback(() => setHistoryRequested(true), []);
  useEffect(() => {
    const token = tokenRef.current;
    if (demoMode || !token || !historyRequested || recordsStatus !== 'ready') return;
    const controller = new AbortController();
    setHistoryError(null);
    void getWealthSnapshotHistory(token, controller.signal).then(history => {
      if (!controller.signal.aborted) setSnapshots(history);
    }).catch((caught: unknown) => {
      if (!controller.signal.aborted) setHistoryError(caught instanceof Error ? caught.message : 'Unable to load wealth history.');
    });
    return () => controller.abort();
  }, [demoMode, ownerId, historyRequested, recordsStatus, positions]);

  useEffect(() => { if (demoMode) window.localStorage.setItem(WEALTH_POSITIONS_STORAGE_KEY, JSON.stringify(positions)); }, [demoMode, positions]);
  useEffect(() => { if (demoMode) window.localStorage.setItem(WEALTH_SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots)); }, [demoMode, snapshots]);
  useEffect(() => { if (demoMode) window.localStorage.setItem(WEALTH_CONTRIBUTIONS_STORAGE_KEY, JSON.stringify(contributions)); }, [contributions, demoMode]);
  useEffect(() => { if (demoMode) window.localStorage.setItem(FIRE_PROFILE_STORAGE_KEY, JSON.stringify(profile)); }, [demoMode, profile]);
  useEffect(() => { if (demoMode) window.localStorage.setItem(ESSENTIAL_CATEGORIES_STORAGE_KEY, JSON.stringify(essentialCategoryIds)); }, [demoMode, essentialCategoryIds]);

  async function addPosition(input: CreateWealthPositionInput, initialSnapshot?: CreateWealthSnapshotInput) {
    if (demoMode) {
      const position: WealthPosition = {
        interestRate: null, monthlyPayment: null, nextPaymentDate: null, originalPrincipal: null, ...input,
        id: newId(), userId: demoUserId, isArchived: false, archivedAt: null, latestSnapshot: null, createdAt: timestamp(), updatedAt: timestamp(),
      };
      setPositions((current) => [...current, position]);
      if (initialSnapshot) await addSnapshot(position.id, initialSnapshot);
    } else if (session) {
      const position = await createWealthPosition(session.access_token, input); setPositions((current) => [...current, position]);
      if (initialSnapshot) await createWealthSnapshot(session.access_token, position.id, initialSnapshot); await refresh();
    }
    if (demoMode || session) recordEmberAppAction('create', 'Added a wealth position');
  }
  async function editPosition(id: string, input: UpdateWealthPositionInput) {
    if (demoMode) setPositions((current) => current.map((item) => item.id === id ? { ...item, ...input, updatedAt: timestamp() } : item));
    else if (session) { await updateWealthPosition(session.access_token, id, input); await refresh(); }
    if (demoMode || session) recordEmberAppAction('update', 'Updated a wealth position');
  }
  async function removePosition(id: string) {
    if (demoMode) {
      const hasHistory = snapshots.some((item) => item.wealthPositionId === id) || contributions.some((item) => item.wealthPositionId === id);
      setPositions((current) => hasHistory ? current.map((item) => item.id === id ? { ...item, isArchived: true, archivedAt: timestamp() } : item) : current.filter((item) => item.id !== id));
    } else if (session) { await deleteWealthPosition(session.access_token, id); await refresh(); }
    if (demoMode || session) recordEmberAppAction('delete', 'Removed or archived a wealth position');
  }
  async function addSnapshot(positionId: string, input: CreateWealthSnapshotInput) {
    if (demoMode) setSnapshots((current) => [...current.filter((item) => !(item.wealthPositionId === positionId && item.valueDate === input.valueDate)), { id: newId(), userId: demoUserId, wealthPositionId: positionId, ...input, createdAt: timestamp(), updatedAt: timestamp() }]);
    else if (session) { await createWealthSnapshot(session.access_token, positionId, input); await refresh(); }
    if (demoMode || session) recordEmberAppAction('create', 'Added a wealth snapshot');
  }
  async function removeSnapshot(positionId: string, snapshotId: string) {
    if (demoMode) setSnapshots((current) => current.filter((item) => item.id !== snapshotId));
    else if (session) { await deleteWealthSnapshot(session.access_token, positionId, snapshotId); await refresh(); }
    if (demoMode || session) recordEmberAppAction('delete', 'Deleted a wealth snapshot');
  }
  async function addContribution(input: CreateWealthContributionInput) {
    if (demoMode) setContributions((current) => [...current, { id: newId(), userId: demoUserId, ...input, createdAt: timestamp(), updatedAt: timestamp() }]);
    else if (session) { await createWealthContribution(session.access_token, input); await refresh(); }
    if (demoMode || session) recordEmberAppAction('create', 'Added a wealth contribution');
  }
  async function removeContribution(id: string) {
    if (demoMode) setContributions((current) => current.filter((item) => item.id !== id));
    else if (session) { await deleteWealthContribution(session.access_token, id); await refresh(); }
    if (demoMode || session) recordEmberAppAction('delete', 'Deleted a wealth contribution');
  }
  async function updateProfile(input: UpdateFireProfileInput) {
    if (demoMode) {
      const next = { id: profile?.id ?? newId(), userId: demoUserId, ...profile, ...input, createdAt: profile?.createdAt ?? timestamp(), updatedAt: timestamp() };
      // A failed local write must not activate a plan only in memory.
      window.localStorage.setItem(FIRE_PROFILE_STORAGE_KEY, JSON.stringify(next));
      setProfile(next);
    }
    else if (session) { setProfile(await saveFireProfile(session.access_token, input)); await refresh(); }
    if (demoMode || session) recordEmberAppAction('update', 'Updated FIRE assumptions');
  }
  async function updateEssentialCategories(ids: string[]) {
    if (demoMode) setEssentialCategoryIds(ids);
    else if (session) { setEssentialCategoryIds((await saveEssentialCategories(session.access_token, ids)).categoryIds); await refresh(); }
    if (demoMode || session) recordEmberAppAction('update', 'Updated essential expense categories');
  }
  async function runScenario(input: FireScenarioRequest) {
    if (demoMode) {
      const result = buildDemoFinancialSummary(positions, snapshots, contributions, profile, transactions, essentialCategoryIds, input.asOf, input).fire;
      recordEmberAppAction('calculate', 'Calculated a temporary FIRE scenario');
      return result;
    }
    if (!session) throw new Error('Sign in to calculate a scenario.');
    const result = await calculateFireScenario(session.access_token, input);
    recordEmberAppAction('calculate', 'Calculated a temporary FIRE scenario');
    return result;
  }

  // The parent context changes on every toast and theme toggle. Memoising the value keeps those
  // from re-rendering every foundation consumer. The dependency list covers everything the
  // mutators close over, so no memoised function can see stale state.
  const value = useMemo(() => ({ positions, snapshots, contributions, profile, essentialCategoryIds, summary, status, error, demoMode, refresh, loadSnapshotHistory, addPosition, editPosition, removePosition, addSnapshot, removeSnapshot, addContribution, removeContribution, updateProfile, updateEssentialCategories, runScenario }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the mutators are plain closures over the listed state
    [contributions, demoMode, error, essentialCategoryIds, loadSnapshotHistory, positions, profile, refresh, session, snapshots, status, summary, transactions]);

  return <FinancialFoundationContext.Provider value={value}>{children}</FinancialFoundationContext.Provider>;
}
