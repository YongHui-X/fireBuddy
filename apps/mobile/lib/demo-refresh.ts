import {
  createDemoRetirementPlan,
  createDemoTransactions,
  createDemoWealth,
  sortTransactionsNewestFirst,
  type RetirementPlan,
  type Transaction,
  type WealthContribution,
  type WealthPosition,
  type WealthPositionSnapshot,
} from '@firebuddy/shared';

export interface DemoSlices {
  transactions: Transaction[];
  positions: WealthPosition[];
  snapshots: WealthPositionSnapshot[];
  contributions: WealthContribution[];
  retirementPlan: RetirementPlan | null;
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Carry edits to demo fields forward while moving untouched dates with the calendar. */
function mergeDemoRow<T extends { id: string }>(stored: T, previous: T, next: T): T {
  const merged = { ...next } as Record<string, unknown>;
  const old = stored as Record<string, unknown>;
  const baseline = previous as Record<string, unknown>;
  for (const key of Object.keys(merged)) {
    if (!sameValue(old[key], baseline[key])) merged[key] = old[key];
  }
  return merged as T;
}

function refreshRows<T extends { id: string }>(stored: T[], previous: T[], next: T[], preserve?: (row: T) => boolean): T[] {
  const oldById = new Map(previous.map((row) => [row.id, row]));
  const nextById = new Map(next.map((row) => [row.id, row]));
  return stored.map((row) => {
    if (preserve?.(row)) return row;
    const oldRow = oldById.get(row.id);
    const nextRow = nextById.get(row.id);
    return oldRow && nextRow ? mergeDemoRow(row, oldRow, nextRow) : row;
  });
}

/** Recover a pre-marker seed date from the month and dates of its original demo rows. */
function inferLegacySeedDate(records: DemoSlices, todayKey: string) {
  const currentMonth = todayKey.slice(0, 7);
  const currentIds = new Set(createDemoTransactions(todayKey)
    .filter((row) => row.date.startsWith(currentMonth))
    .map((row) => row.id));
  const counts = new Map<string, number>();
  for (const row of records.transactions) {
    if (!currentIds.has(row.id)) continue;
    const month = row.date.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  const month = [...counts].sort((left, right) => right[1] - left[1])[0]?.[0]
    ?? records.retirementPlan?.spendingMonth
    ?? todayKey.slice(0, 7);
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  const storedById = new Map(records.transactions.map((row) => [row.id, row]));
  let bestDate = `${month}-01`;
  let bestMatches = -1;
  for (let day = 1; day <= days; day += 1) {
    const candidate = `${month}-${String(day).padStart(2, '0')}`;
    const matches = createDemoTransactions(candidate).filter((row) => storedById.get(row.id)?.date === row.date).length;
    if (matches > bestMatches) {
      bestDate = candidate;
      bestMatches = matches;
    }
  }
  return bestDate;
}

/** Seeded demo transactions share this id prefix; locally created rows never do. */
const DEMO_TRANSACTION_ID_PREFIX = '00000000-0000-4000-9000-';

/** Whether a ledger still contains rows from the demo dataset (a restored backup may hold none). */
export function hasDemoTransactions(transactions: readonly { id: string }[]) {
  return transactions.some((row) => row.id.startsWith(DEMO_TRANSACTION_ID_PREFIX));
}

/**
 * Re-date only seeded demo records when the month changes, leaving local records and edits intact.
 * A ledger persisted by an older demo generation (different seeded ids, so nothing can be matched
 * and re-dated) is replaced wholesale, keeping only the user's own rows.
 */
export function refreshDemoSlices(records: DemoSlices, storedSeedDate: string | null | undefined, todayKey: string) {
  const nextLedger = createDemoTransactions(todayKey);
  const nextIds = new Set(nextLedger.map((row) => row.id));
  const staleGeneration = !records.transactions.some((row) => nextIds.has(row.id));

  if (!staleGeneration && storedSeedDate?.slice(0, 7) === todayKey.slice(0, 7)) {
    return { ...records, seededOn: storedSeedDate };
  }

  const previousDate = storedSeedDate && /^\d{4}-\d{2}-\d{2}$/.test(storedSeedDate)
    ? storedSeedDate
    : inferLegacySeedDate(records, todayKey);
  const previousWealth = createDemoWealth(previousDate);
  const nextWealth = createDemoWealth(todayKey);
  const previousPlan = createDemoRetirementPlan(previousDate);
  const demoSnapshotIds = new Set(previousWealth.snapshots.map((row) => row.id));
  const latestDemoValueDate = new Map<string, string>();
  for (const row of previousWealth.snapshots) {
    const latest = latestDemoValueDate.get(row.wealthPositionId) ?? '';
    if (row.valueDate > latest) latestDemoValueDate.set(row.wealthPositionId, row.valueDate);
  }
  // A later local snapshot must remain the latest value of its demo position.
  const positionsWithLocalValues = new Set(records.snapshots
    .filter((row) => !demoSnapshotIds.has(row.id) && row.valueDate >= (latestDemoValueDate.get(row.wealthPositionId) ?? todayKey))
    .map((row) => row.wealthPositionId));

  return {
    transactions: sortTransactionsNewestFirst(staleGeneration
      ? [...records.transactions.filter((row) => !row.id.startsWith(DEMO_TRANSACTION_ID_PREFIX)), ...nextLedger]
      : refreshRows(records.transactions, createDemoTransactions(previousDate), nextLedger)),
    positions: refreshRows(records.positions, previousWealth.positions, nextWealth.positions),
    snapshots: refreshRows(records.snapshots, previousWealth.snapshots, nextWealth.snapshots,
      (row) => demoSnapshotIds.has(row.id) && positionsWithLocalValues.has(row.wealthPositionId)),
    contributions: refreshRows(records.contributions, previousWealth.contributions, nextWealth.contributions),
    retirementPlan: records.retirementPlan && sameValue(records.retirementPlan, previousPlan)
      ? createDemoRetirementPlan(todayKey)
      : records.retirementPlan,
    seededOn: todayKey,
  };
}
