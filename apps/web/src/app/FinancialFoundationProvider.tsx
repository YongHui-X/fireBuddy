import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  calculateRetirement,
  calculateSavingsRate,
  type CreateWealthContributionInput,
  type CreateWealthPositionInput,
  type CreateWealthSnapshotInput,
  type FinancialSummary,
  type FireCalculationResult,
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
import { useFireBuddy } from './FireBuddyProvider';
import { recordEmberAppAction } from './emberAppContext';
import {
  ESSENTIAL_CATEGORIES_STORAGE_KEY,
  FIRE_PROFILE_STORAGE_KEY,
  WEALTH_CONTRIBUTIONS_STORAGE_KEY,
  WEALTH_POSITIONS_STORAGE_KEY,
  WEALTH_SNAPSHOTS_STORAGE_KEY,
} from './demoStorage';

type FoundationStatus = 'loading' | 'ready' | 'error';

interface FinancialFoundationContextValue {
  positions: WealthPosition[];
  snapshots: WealthPositionSnapshot[];
  contributions: WealthContribution[];
  profile: FireProfile | null;
  essentialCategoryIds: string[];
  summary: FinancialSummary | null;
  status: FoundationStatus;
  error: string | null;
  demoMode: boolean;
  refresh: () => Promise<void>;
  loadSnapshotHistory: () => void;
  addPosition: (input: CreateWealthPositionInput, snapshot?: CreateWealthSnapshotInput) => Promise<void>;
  editPosition: (id: string, input: UpdateWealthPositionInput) => Promise<void>;
  removePosition: (id: string) => Promise<void>;
  addSnapshot: (positionId: string, input: CreateWealthSnapshotInput) => Promise<void>;
  removeSnapshot: (positionId: string, snapshotId: string) => Promise<void>;
  addContribution: (input: CreateWealthContributionInput) => Promise<void>;
  removeContribution: (id: string) => Promise<void>;
  updateProfile: (input: UpdateFireProfileInput) => Promise<void>;
  updateEssentialCategories: (ids: string[]) => Promise<void>;
  runScenario: (input: FireScenarioRequest) => Promise<FireCalculationResult>;
}

const FinancialFoundationContext = createContext<FinancialFoundationContextValue | null>(null);
const demoUserId = '00000000-0000-4000-8000-00000000f100';

function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

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
    includeInFi: false, isEmergencyFund: false, restrictionType: 'none', currency: 'SGD', isArchived: false,
    archivedAt: null, latestSnapshot: null, createdAt: timestamp(), updatedAt: timestamp(), ...values,
  };
}

const defaultPositions: WealthPosition[] = [
  demoPosition('00000000-0000-4000-8000-00000000f101', 'Cash reserve', { includeInFi: true, isEmergencyFund: true }),
  demoPosition('00000000-0000-4000-8000-00000000f102', 'Brokerage', { positionType: 'investment', liquidityClass: 'less_liquid', includeInFi: true }),
  demoPosition('00000000-0000-4000-8000-00000000f103', 'Home', { positionType: 'property', liquidityClass: 'less_liquid' }),
  demoPosition('00000000-0000-4000-8000-00000000f104', 'Mortgage', { positionKind: 'liability', positionType: 'mortgage', liquidityClass: 'less_liquid' }),
];

const defaultSnapshots: WealthPositionSnapshot[] = [
  ['00000000-0000-4000-8000-00000000f101', '31200'],
  ['00000000-0000-4000-8000-00000000f102', '192000'],
  ['00000000-0000-4000-8000-00000000f103', '120000'],
  ['00000000-0000-4000-8000-00000000f104', '56800'],
].flatMap(([wealthPositionId, amount], index) => [6, 3, 0].map((age) => ({
  id: `00000000-0000-4000-8000-${String(200 + index * 10 + age).padStart(12, '0')}`,
  userId: demoUserId, wealthPositionId, valueDate: monthsAgo(age),
  amount: age === 0 ? amount : (Number(amount) * (age === 6 ? 0.94 : 0.97)).toFixed(2),
  createdAt: timestamp(), updatedAt: timestamp(),
})));

const defaultContributions: WealthContribution[] = [{
  id: '00000000-0000-4000-8000-00000000f301', userId: demoUserId,
  wealthPositionId: '00000000-0000-4000-8000-00000000f102', contributionDate: monthsAgo(0, 5),
  amount: '2480.00', note: 'Monthly investment', createdAt: timestamp(), updatedAt: timestamp(),
}];

const defaultProfile: FireProfile = {
  id: '00000000-0000-4000-8000-00000000f401', userId: demoUserId,
  monthlyContribution: '2500.00', expectedReturnRate: '0.070000', inflationRate: '0.020000',
  withdrawalRate: '0.040000', retirementSpendingOverride: '4000.00',
  targetFiDate: `${new Date().getFullYear() + 16}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
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

function latestByPosition(snapshots: WealthPositionSnapshot[], asOf: string) {
  const result = new Map<string, WealthPositionSnapshot>();
  [...snapshots].filter((item) => item.valueDate <= asOf).sort((a, b) => b.valueDate.localeCompare(a.valueDate)).forEach((item) => {
    if (!result.has(item.wealthPositionId)) result.set(item.wealthPositionId, item);
  });
  return result;
}

/** Calculate the local demo with the same disclosed formulas as the backend service. */
export function buildDemoFinancialSummary(
  positions: WealthPosition[], snapshots: WealthPositionSnapshot[], contributions: WealthContribution[],
  profile: FireProfile | null, transactions: ReturnType<typeof useFireBuddy>['transactions'], essentialIds: string[],
  asOf = localDate(), scenario: FireScenarioRequest = {},
): FinancialSummary {
  const active = positions.filter((item) => !item.isArchived);
  const latest = latestByPosition(snapshots, asOf);
  const complete = active.length > 0 && active.every((item) => latest.has(item.id));
  const total = (kind: 'asset' | 'liability') => active.filter((item) => item.positionKind === kind)
    .reduce((sum, item) => sum + Number(latest.get(item.id)?.amount ?? 0), 0);
  const assets = total('asset');
  const liabilities = total('liability');
  const investable = complete ? active.filter((item) => item.positionKind === 'asset' && item.includeInFi)
    .reduce((sum, item) => sum + Number(latest.get(item.id)?.amount ?? 0), 0) : null;
  const emergency = complete ? active.filter((item) => item.isEmergencyFund)
    .reduce((sum, item) => sum + Number(latest.get(item.id)?.amount ?? 0), 0) : null;
  const month = asOf.slice(0, 7);
  const current = transactions.filter((item) => item.date.slice(0, 7) === month && item.date <= asOf);
  const income = current.filter((item) => item.transactionType === 'income').reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const spending = current.filter((item) => item.transactionType === 'expense').reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const savingsRate = calculateSavingsRate(income, spending);
  const invested = contributions.filter((item) => item.contributionDate.slice(0, 7) === month && item.contributionDate <= asOf)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const historicalExpenses = transactions.filter((item) => item.transactionType === 'expense' && item.date.slice(0, 7) < month);
  const asOfDate = new Date(`${asOf}T00:00:00`);
  const completedEnd = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 0);
  const earliestAllowed = new Date(completedEnd.getFullYear(), completedEnd.getMonth() - 11, 1);
  const firstExpense = historicalExpenses.length ? new Date(`${[...historicalExpenses].sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 7)}-01T00:00:00`) : null;
  const baselineStart = firstExpense && firstExpense > earliestAllowed ? firstExpense : earliestAllowed;
  const completedMonths = firstExpense
    ? (completedEnd.getFullYear() - baselineStart.getFullYear()) * 12 + completedEnd.getMonth() - baselineStart.getMonth() + 1
    : 0;
  const baselineStartKey = localDate(baselineStart).slice(0, 7);
  const periodExpenses = historicalExpenses.filter((item) => item.date.slice(0, 7) >= baselineStartKey);
  const expenseTotal = periodExpenses.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const essentialTotal = periodExpenses.filter((item) => essentialIds.includes(item.category)).reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const essentialAverage = completedMonths > 0 && essentialIds.length > 0 ? essentialTotal / completedMonths : null;
  const plan = profile?.activePlan ? { ...profile.activePlan, ...scenario.planOverrides,
    ...(scenario.monthlyContribution !== undefined ? { monthlyContribution: Number(scenario.monthlyContribution) } : {}),
    ...(scenario.retirementSpending !== undefined ? { monthlySpending: Number(scenario.retirementSpending) } : {}),
  } : null;
  const eligible = active.filter(item => item.positionKind === 'asset' && plan?.assetIds.includes(item.id));
  const completePortfolio = plan && plan.assetIds.every(id => eligible.some(item => item.id === id) && latest.has(id));
  const spendable = completePortfolio ? eligible.reduce((sum, item) => sum + Number(latest.get(item.id)!.amount), 0) : null;
  const fire = calculateRetirement(plan, spendable, asOf);
  if (plan && !plan.portfolioOverride) {
    fire.actualPath = [...new Set(snapshots.filter(item => item.valueDate <= asOf).map(item => item.valueDate.slice(0, 7)))].sort().flatMap(pathMonth => {
      const values = latestByPosition(snapshots, pathMonth === month ? asOf : `${pathMonth}-31`);
      if (!eligible.length || !eligible.every(item => values.has(item.id))) return [];
      return [{ date: `${pathMonth}-01`, amount: eligible.reduce((sum, item) => sum + Number(values.get(item.id)!.amount), 0).toFixed(2), kind: 'actual' as const }];
    });
  }
  fire.spendingBaseline = {
    status: completedMonths === 12 ? 'available' : completedMonths > 0 ? 'limited' : 'insufficient_data',
    source: completedMonths > 0 ? 'transactions' : 'none', startDate: completedMonths > 0 ? `${baselineStartKey}-01` : null,
    endDate: completedMonths > 0 ? localDate(completedEnd) : null, completedMonths,
    expenseTotal: completedMonths ? expenseTotal.toFixed(2) : null,
    annualisedSpending: completedMonths ? (expenseTotal / completedMonths * 12).toFixed(2) : null,
  };
  if (completedMonths < 12) fire.warnings.push({ code: 'limited_history', message: 'Fewer than 12 completed months of recorded expenses. Missing records do not prove zero spending.' });
  const recordedIncome = transactions.filter(item => item.transactionType === 'income' && item.date.slice(0, 7) >= baselineStartKey && item.date.slice(0, 7) < month).reduce((sum, item) => sum + Math.abs(item.amount), 0);
  if (completedMonths && plan && plan.monthlyContribution > (recordedIncome - expenseTotal) / completedMonths) fire.warnings.push({ code: 'contribution_above_savings', message: 'Confirmed investment contributions exceed recorded average savings. Review affordability and incomplete records.' });
  const snapshotDates = [...latest.values()].map((item) => item.valueDate);
  const stale = snapshotDates.some((value) => (new Date(`${asOf}T00:00:00`).getTime() - new Date(`${value}T00:00:00`).getTime()) / 86_400_000 > 35);
  if (stale) fire.warnings.push({ code: 'stale_snapshot', message: 'At least one wealth value is older than 35 days.' });
  const snapshotStatus = !complete ? 'missing' : stale ? 'stale' : new Set(snapshotDates).size > 1 ? 'mixed' : 'current';
  let recommendedAction: FinancialSummary['recommendedAction'] = null;
  if (!active.length) recommendedAction = action('add_position', 'Add your first wealth position', 'Net worth needs a dated asset or liability value.', '/wealth', 'foundation.v1.add_position');
  else if (!complete) recommendedAction = action('add_snapshot', 'Complete your wealth values', 'One or more positions has no current value.', '/wealth', 'foundation.v1.missing_snapshot');
  else if (stale) recommendedAction = action('refresh_snapshot', 'Refresh a stale wealth value', 'A value is older than 35 days.', '/wealth', 'foundation.v1.stale_snapshot');
  else if (!active.some((item) => item.isEmergencyFund)) recommendedAction = action('designate_emergency_fund', 'Designate an emergency fund', 'Runway needs one eligible liquid asset.', '/wealth', 'foundation.v1.emergency_fund');
  else if (!essentialIds.length) recommendedAction = action('select_essentials', 'Choose essential categories', 'Runway needs confirmed essential expenses.', '/plan', 'foundation.v1.essential_categories');
  return {
    effectiveDate: asOf, dataMode: 'demo', netWorth: complete ? (assets - liabilities).toFixed(2) : null,
    assetTotal: complete ? assets.toFixed(2) : null, liabilityTotal: complete ? liabilities.toFixed(2) : null,
    priorMonthNetWorth: null, monthlyNetWorthChange: null, investableAssets: investable?.toFixed(2) ?? null,
    emergencyEligibleAssets: emergency?.toFixed(2) ?? null,
    averageMonthlyEssentialSpending: essentialAverage?.toFixed(2) ?? null,
    emergencyRunwayMonths: emergency !== null && essentialAverage ? (emergency / essentialAverage).toFixed(6) : null,
    latestSnapshotDate: snapshotDates.sort().at(-1) ?? null, snapshotStatus,
    pulse: { month, income: income.toFixed(2), spending: spending.toFixed(2), savingsAmount: (income - spending).toFixed(2),
      savingsRate: savingsRate?.toFixed(6) ?? null, savingsRateStatus: savingsRate === null ? 'unavailable' : 'available',
      investedAmount: invested.toFixed(2), completeness: current.length ? 'complete' : 'limited' },
    fire, recommendedAction, transactionAnomalies: [], warnings: stale ? [{ code: 'stale_snapshot', message: 'At least one wealth value is older than 35 days.' }] : [],
  };
}

function action(actionType: string, title: string, rationale: string, destination: string, ruleId: string) {
  return { actionType, title, rationale, destination, ruleId, evidence: localDate(), limitations: null };
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
  const status = recordsStatus === 'error' || summaryStatus === 'error' ? 'error'
    : recordsStatus === 'loading' || summaryStatus === 'loading' ? 'loading' : 'ready';
  const error = recordsError ?? summaryError ?? historyError;

  const summary = useMemo(() => demoMode
    ? buildDemoFinancialSummary(positions, snapshots, contributions, profile, transactions, essentialCategoryIds)
    : remoteSummary, [contributions, demoMode, essentialCategoryIds, positions, profile, remoteSummary, snapshots, transactions]);

  /** Refresh source records once; transaction changes only reload the derived summary. */
  const refresh = useCallback(async () => {
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
  }, [demoMode, token]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; recordsRequest.current?.abort(); };
  }, [refresh]);

  // Cleanup also guards against mocks or transports that resolve after cancellation.
  useEffect(() => {
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
  }, [demoMode, token, recordsStatus, positions, contributions, profile, essentialCategoryIds, transactions, categories]);

  /** Request full history only for the wealth management screen. */
  const loadSnapshotHistory = useCallback(() => setHistoryRequested(true), []);
  useEffect(() => {
    if (demoMode || !token || !historyRequested || recordsStatus !== 'ready') return;
    const controller = new AbortController();
    setHistoryError(null);
    void getWealthSnapshotHistory(token, controller.signal).then(history => {
      if (!controller.signal.aborted) setSnapshots(history);
    }).catch((caught: unknown) => {
      if (!controller.signal.aborted) setHistoryError(caught instanceof Error ? caught.message : 'Unable to load wealth history.');
    });
    return () => controller.abort();
  }, [demoMode, token, historyRequested, recordsStatus, positions]);

  useEffect(() => { if (demoMode) window.localStorage.setItem(WEALTH_POSITIONS_STORAGE_KEY, JSON.stringify(positions)); }, [demoMode, positions]);
  useEffect(() => { if (demoMode) window.localStorage.setItem(WEALTH_SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots)); }, [demoMode, snapshots]);
  useEffect(() => { if (demoMode) window.localStorage.setItem(WEALTH_CONTRIBUTIONS_STORAGE_KEY, JSON.stringify(contributions)); }, [contributions, demoMode]);
  useEffect(() => { if (demoMode) window.localStorage.setItem(FIRE_PROFILE_STORAGE_KEY, JSON.stringify(profile)); }, [demoMode, profile]);
  useEffect(() => { if (demoMode) window.localStorage.setItem(ESSENTIAL_CATEGORIES_STORAGE_KEY, JSON.stringify(essentialCategoryIds)); }, [demoMode, essentialCategoryIds]);

  async function addPosition(input: CreateWealthPositionInput, initialSnapshot?: CreateWealthSnapshotInput) {
    if (demoMode) {
      const position: WealthPosition = { ...input, id: newId(), userId: demoUserId, isArchived: false, archivedAt: null, latestSnapshot: null, createdAt: timestamp(), updatedAt: timestamp() };
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

  return <FinancialFoundationContext.Provider value={{ positions, snapshots, contributions, profile, essentialCategoryIds, summary, status, error, demoMode, refresh, loadSnapshotHistory, addPosition, editPosition, removePosition, addSnapshot, removeSnapshot, addContribution, removeContribution, updateProfile, updateEssentialCategories, runScenario }}>{children}</FinancialFoundationContext.Provider>;
}

export function useFinancialFoundation() {
  const context = useContext(FinancialFoundationContext);
  if (!context) throw new Error('useFinancialFoundation must be used inside FinancialFoundationProvider');
  return context;
}
