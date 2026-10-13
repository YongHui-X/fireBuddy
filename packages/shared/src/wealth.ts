import { calculateDebtPayoff, requiredPaymentForTarget } from './debt';
import { formatShortMonthLabel } from './format';
import { formatMoney } from './region';
import type {
  Account,
  CreateWealthPositionInput,
  FirePathPoint,
  Transaction,
  WealthContribution,
  WealthPosition,
  WealthPositionSnapshot,
  WealthPositionType,
} from './types';

/**
 * Pure balance-sheet helpers shared by the web Wealth page and the mobile Wealth screen.
 * Everything here reads positions and their dated snapshots; nothing touches storage or UI.
 */

export const wealthTypeLabels: Record<WealthPositionType, string> = {
  cash: 'Cash',
  investment: 'Investment',
  property: 'Property',
  cpf: 'CPF',
  mortgage: 'Mortgage',
  loan: 'Loan',
  credit_card: 'Credit card',
  other: 'Other',
};

export const assetPositionTypes: readonly WealthPositionType[] = ['cash', 'investment', 'property', 'cpf', 'other'];
export const liabilityPositionTypes: readonly WealthPositionType[] = ['mortgage', 'loan', 'credit_card', 'other'];

/** The classification columns implied by a type and the locked flag. CPF is always locked. */
export function classifyWealthPosition(positionType: WealthPositionType, locked: boolean): Pick<CreateWealthPositionInput, 'liquidityClass' | 'restrictionType'> {
  if (positionType === 'cpf') return { liquidityClass: 'restricted', restrictionType: 'cpf' };
  if (locked) return { liquidityClass: 'restricted', restrictionType: 'other_restricted' };
  return { liquidityClass: positionType === 'cash' || positionType === 'credit_card' ? 'liquid' : 'less_liquid', restrictionType: 'none' };
}

export function isLockedPosition(position: WealthPosition) {
  return position.positionType === 'cpf' || position.restrictionType !== 'none' || position.liquidityClass === 'restricted';
}

/** The newest snapshot per position dated on or before `asOf` (all snapshots when omitted). */
/**
 * Each position's latest value on or before `asOf`. Two values on the same date resolve to the one
 * saved last (by `updatedAt`, then `createdAt`, then list order), so editing a balance twice in a
 * day shows the newer figure instead of snapping back to the first.
 */
export function latestSnapshotByPosition(snapshots: readonly WealthPositionSnapshot[], asOf?: string) {
  const result = new Map<string, WealthPositionSnapshot>();
  snapshots
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !asOf || item.valueDate <= asOf)
    .sort((a, b) => b.item.valueDate.localeCompare(a.item.valueDate)
      || (b.item.updatedAt ?? '').localeCompare(a.item.updatedAt ?? '')
      || (b.item.createdAt ?? '').localeCompare(a.item.createdAt ?? '')
      || b.index - a.index)
    .forEach(({ item }) => {
      if (!result.has(item.wealthPositionId)) result.set(item.wealthPositionId, item);
    });
  return result;
}

/**
 * One value per position per date, keeping the one saved last (the same rule as
 * `latestSnapshotByPosition`). Cleans up duplicates saved before re-saving a date replaced it.
 * Returns the same array when there is nothing to remove.
 */
export function dedupeSameDaySnapshots<T extends WealthPositionSnapshot>(snapshots: readonly T[]): readonly T[] {
  const keep = new Map<string, { item: T; index: number }>();
  snapshots.forEach((item, index) => {
    const key = `${item.wealthPositionId}|${item.valueDate}`;
    const current = keep.get(key);
    const newer = !current
      || (item.updatedAt ?? '').localeCompare(current.item.updatedAt ?? '') > 0
      || ((item.updatedAt ?? '') === (current.item.updatedAt ?? '') && ((item.createdAt ?? '').localeCompare(current.item.createdAt ?? '') > 0
        || (item.createdAt ?? '') === (current.item.createdAt ?? '')));
    if (newer) keep.set(key, { item, index });
  });
  if (keep.size === snapshots.length) return snapshots;
  const kept = new Set([...keep.values()].map((entry) => entry.index));
  return snapshots.filter((_, index) => kept.has(index));
}

/** Whether a position can follow an account's transactions: cash assets only, for now (PRD 6.4.1). */
export function isLinkablePosition(position: Pick<WealthPosition, 'positionKind' | 'positionType'>) {
  return position.positionKind === 'asset' && position.positionType === 'cash';
}

/** Prefix of the ids of computed account-linked values, which are never stored. */
export const LINKED_VALUE_ID_PREFIX = 'linked:';

/**
 * The snapshots with account-linked balances filled in (PRD 6.4.1). For each active cash asset
 * linked to an account, every date up to `today` with a transaction on that account gets a
 * computed value: the latest entered balance on or before that date, plus income and minus
 * expenses on the account that the balance does not already include. A balance includes the
 * transactions dated before it, and those on its own date that were saved before it; one saved
 * later the same day still counts, so an expense logged after linking or after typing a balance
 * moves the value straight away. Transactions before the first entered balance are ignored.
 * Nothing is stored: pass the result to `summariseWealth`, `latestSnapshotByPosition` and
 * `buildActualPath` so every screen reads the same value. Returns `snapshots` unchanged when
 * nothing is linked.
 */
export function withLinkedBalances(
  positions: readonly WealthPosition[],
  snapshots: readonly WealthPositionSnapshot[],
  transactions: readonly (Pick<Transaction, 'accountId' | 'date' | 'amount' | 'transactionType'> & { createdAt?: string })[],
  today: string,
): readonly WealthPositionSnapshot[] {
  const linked = positions.filter((item) => !item.isArchived && item.linkedAccountId && isLinkablePosition(item));
  if (!linked.length) return snapshots;
  const computed: WealthPositionSnapshot[] = [];
  for (const position of linked) {
    const entered = dedupeSameDaySnapshots(snapshots.filter((item) => item.wealthPositionId === position.id))
      .slice()
      .sort((a, b) => a.valueDate.localeCompare(b.valueDate));
    if (!entered.length) continue;
    const moves = transactions.filter((item) => item.accountId === position.linkedAccountId && item.date <= today && item.date >= entered[0].valueDate);
    for (const date of [...new Set(moves.map((item) => item.date))].sort()) {
      const base = [...entered].reverse().find((item) => item.valueDate <= date)!;
      const savedAt = base.updatedAt ?? base.createdAt ?? '';
      const counted = moves.filter((item) => item.date <= date
        && (item.date > base.valueDate || (item.date === base.valueDate && (item.createdAt ?? '') > savedAt)));
      if (!counted.length) continue;
      const change = counted.reduce((sum, item) => sum + (item.transactionType === 'income' ? 1 : -1) * (Number(item.amount) || 0), 0);
      // Stamped no earlier than the newest counted transaction, so on a balance's own date the
      // computed value (which adds the later entries) wins over the entered one.
      const stamp = counted.reduce((latest, item) => ((item.createdAt ?? '') > latest ? item.createdAt! : latest), savedAt);
      computed.push({
        ...base,
        id: `${LINKED_VALUE_ID_PREFIX}${position.id}:${date}`,
        valueDate: date,
        amount: (Number(base.amount) + change).toFixed(2),
        updatedAt: stamp,
      });
    }
  }
  return computed.length ? [...snapshots, ...computed] : snapshots;
}

/** Prefix of the ids of automatic account balances, which are never stored. */
export const ACCOUNT_BALANCE_ID_PREFIX = 'account-balance:';

export function isAccountBalancePosition(position: Pick<WealthPosition, 'id'>) {
  return position.id.startsWith(ACCOUNT_BALANCE_ID_PREFIX);
}

/**
 * Automatic balances for accounts nothing in Wealth follows yet (PRD 6.4.1, item 5a): all income
 * minus all expenses on the account up to `today`, from zero, as a cash asset named after the
 * account. An account is skipped when an active Wealth balance follows it, when the user turned
 * its balance off (`trackBalance: false`, the demo data only), or when it has no transactions.
 * After `balanceFrom`, only transactions saved from that moment count. A hand-entered cash
 * asset with no link is separate money and does not stop accounts counting. Nothing is stored.
 */
export function accountBalances(
  accounts: readonly Pick<Account, 'id' | 'name' | 'trackBalance' | 'balanceFrom' | 'createdAt'>[],
  positions: readonly WealthPosition[],
  transactions: readonly (Pick<Transaction, 'accountId' | 'date' | 'amount' | 'transactionType'> & { createdAt?: string })[],
  today: string,
): { positions: WealthPosition[]; snapshots: WealthPositionSnapshot[] } {
  const result: { positions: WealthPosition[]; snapshots: WealthPositionSnapshot[] } = { positions: [], snapshots: [] };
  const followed = new Set(positions.filter((item) => !item.isArchived && item.linkedAccountId).map((item) => item.linkedAccountId));
  for (const account of accounts) {
    if (account.trackBalance === false || followed.has(account.id)) continue;
    const moves = new Map<string, number>();
    for (const transaction of transactions) {
      if (transaction.accountId !== account.id || transaction.date > today) continue;
      // Saved before the restart means already gone with the old balance. A record with no save
      // time falls back to its date, so one dated before the restart day never sneaks back in.
      if (account.balanceFrom && (transaction.createdAt ?? transaction.date) < account.balanceFrom) continue;
      const signed = (transaction.transactionType === 'income' ? 1 : -1) * Number(transaction.amount);
      if (Number.isFinite(signed)) moves.set(transaction.date, (moves.get(transaction.date) ?? 0) + signed);
    }
    if (!moves.size) continue;
    const id = `${ACCOUNT_BALANCE_ID_PREFIX}${account.id}`;
    result.positions.push({
      id,
      userId: '',
      name: account.name,
      positionKind: 'asset',
      positionType: 'cash',
      liquidityClass: 'liquid',
      includeInFi: false,
      isEmergencyFund: false,
      restrictionType: 'none',
      currency: 'SGD',
      interestRate: null,
      monthlyPayment: null,
      nextPaymentDate: null,
      originalPrincipal: null,
      linkedAccountId: account.id,
      isArchived: false,
      archivedAt: null,
      latestSnapshot: null,
      createdAt: account.createdAt,
      updatedAt: account.createdAt,
    });
    let running = 0;
    for (const date of [...moves.keys()].sort()) {
      running += moves.get(date)!;
      result.snapshots.push({ id: `${id}:${date}`, userId: '', wealthPositionId: id, valueDate: date, amount: running.toFixed(2), createdAt: account.createdAt, updatedAt: account.createdAt });
    }
  }
  return result;
}

export interface WealthSummary {
  active: WealthPosition[];
  assets: WealthPosition[];
  liabilities: WealthPosition[];
  latest: Map<string, WealthPositionSnapshot>;
  assetTotal: number;
  liabilityTotal: number;
  netWorth: number;
  /** Active positions with no dated value yet. */
  missingValues: number;
}

/** Totals at the latest recorded values on or before `asOf`. */
export function summariseWealth(positions: readonly WealthPosition[], snapshots: readonly WealthPositionSnapshot[], asOf?: string): WealthSummary {
  const latest = latestSnapshotByPosition(snapshots, asOf);
  const active = positions.filter((item) => !item.isArchived);
  const assets = active.filter((item) => item.positionKind === 'asset');
  const liabilities = active.filter((item) => item.positionKind === 'liability');
  const total = (items: WealthPosition[]) => items.reduce((sum, item) => sum + Number(latest.get(item.id)?.amount ?? 0), 0);
  const assetTotal = total(assets);
  const liabilityTotal = total(liabilities);
  return {
    active,
    assets,
    liabilities,
    latest,
    assetTotal,
    liabilityTotal,
    netWorth: assetTotal - liabilityTotal,
    missingValues: active.filter((item) => !latest.has(item.id)).length,
  };
}

/** Plain-language tags for a position row, instead of the raw liquidity class. */
export function wealthPositionTags(position: WealthPosition): string[] {
  const tags = [wealthTypeLabels[position.positionType]];
  if (position.positionKind === 'liability') {
    if (position.interestRate !== null) tags.push(`${Number((Number(position.interestRate) * 100).toFixed(2))}% a year`);
    return tags;
  }
  if (isLockedPosition(position)) tags.push(position.positionType === 'cpf' ? 'Locked in CPF' : 'Locked until retirement');
  if (position.includeInFi) tags.push('Counts toward FI');
  if (position.isEmergencyFund) tags.push('Emergency fund');
  return tags;
}

export interface DebtPayoffLine {
  text: string;
  warning: boolean;
  /** "2031-03" when a payoff month is projected. */
  payoffMonth: string | null;
}

/**
 * One-line payoff outlook for a liability from its latest balance and saved terms. `formatAmount`
 * writes the interest figure, so callers can use the user's currency and hide amounts when asked.
 */
export function describeDebtPayoff(
  position: WealthPosition,
  balance: number | null,
  asOf: string,
  formatAmount: (value: number) => string = (value) => formatMoney(value, 'SGD', 0),
): DebtPayoffLine {
  if (balance === null) return { text: 'Add a dated balance to see payoff', warning: false, payoffMonth: null };
  if (position.interestRate === null || position.monthlyPayment === null) return { text: 'Add rate and payment to see payoff', warning: false, payoffMonth: null };
  const payoff = calculateDebtPayoff(balance, Number(position.interestRate), Number(position.monthlyPayment), asOf);
  if (payoff.status === 'paid_off') return { text: 'Paid off', warning: false, payoffMonth: null };
  if (payoff.status === 'payment_below_interest') return { text: 'Payment does not cover monthly interest', warning: true, payoffMonth: null };
  if (payoff.status === 'missing_terms') return { text: 'Add rate and payment to see payoff', warning: false, payoffMonth: null };
  const interest = Number(payoff.totalInterest);
  return {
    // Read after "Paid off by <month> · ", so it says what the interest is: the total still to pay on top of the balance.
    text: `${formatAmount(Math.round(interest))} more in interest until then`,
    warning: false,
    payoffMonth: payoff.payoffMonth,
  };
}

/**
 * How much of a loan is repaid: the original amount borrowed minus what is still owed, in cents-safe
 * money, with the share of the original. Null when the original is missing or not above zero.
 * Never negative: a balance above the original (fees, redraws) counts as nothing repaid yet.
 */
export function repaidSoFar(original: number | null | undefined, balance: number | null | undefined): { amount: number; share: number } | null {
  if (original == null || !Number.isFinite(original) || original <= 0 || balance == null || !Number.isFinite(balance)) return null;
  const amount = Math.max(0, Math.round((original - balance) * 100) / 100);
  return { amount, share: Math.min(1, amount / original) };
}

export interface DebtGoalLine {
  text: string;
  /** True when the current payment already clears the debt by the goal month. */
  onTrack: boolean;
  /** Payment needed per month to hit the goal, or null when it cannot be worked out. */
  requiredPayment: number | null;
}

/**
 * The "pay it off by" line for a debt with a goal month: what it takes each month, how that compares
 * with today's payment, or what is missing. Null when there is no goal or nothing is owed.
 */
export function describeDebtGoal(
  position: Pick<WealthPosition, 'interestRate' | 'monthlyPayment' | 'payoffTargetMonth'>,
  balance: number | null,
  asOf: string,
  formatAmount: (value: number) => string = (value) => formatMoney(value, 'SGD', 0),
): DebtGoalLine | null {
  const target = position.payoffTargetMonth;
  if (!target || balance === null || balance <= 0) return null;
  const by = formatShortMonthLabel(target);
  const result = requiredPaymentForTarget(balance, position.interestRate === null ? null : Number(position.interestRate), asOf, target);
  if (result.status === 'paid_off') return null;
  if (result.status === 'missing_rate') return { text: `Add the interest rate to plan paying it off by ${by}.`, onTrack: false, requiredPayment: null };
  if (result.status !== 'ok') {
    const tooFar = target > asOf.slice(0, 7);
    return { text: tooFar ? 'Pick a pay-off month within the next 50 years.' : 'Pick a pay-off month after this one.', onTrack: false, requiredPayment: null };
  }
  const current = position.monthlyPayment === null ? null : Number(position.monthlyPayment);
  if (current !== null && current >= result.monthlyPayment) {
    return { text: `On track to be debt-free by ${by}: your ${formatAmount(current)} a month already does it.`, onTrack: true, requiredPayment: result.monthlyPayment };
  }
  const gap = current === null ? '' : ` (${formatAmount(Math.ceil(result.monthlyPayment - current))} more than now)`;
  return { text: `To be debt-free by ${by}: ${formatAmount(Math.ceil(result.monthlyPayment))} a month${gap}.`, onTrack: false, requiredPayment: result.monthlyPayment };
}

/** Share of the original principal already repaid, or null when the terms are unknown. */
export function debtRepaidShare(position: WealthPosition, balance: number | null): number | null {
  const principal = position.originalPrincipal ? Number(position.originalPrincipal) : null;
  if (!principal || principal <= 0 || balance === null) return null;
  return Math.min(Math.max(1 - balance / principal, 0), 1);
}

/** Sum of the latest values of the chosen assets, or null when any of them has no value yet. */
export function eligibleAssetTotal(positions: readonly WealthPosition[], latest: Map<string, WealthPositionSnapshot>, assetIds: readonly string[]): number | null {
  const chosen = positions.filter((item) => !item.isArchived && item.positionKind === 'asset' && assetIds.includes(item.id));
  if (chosen.length !== assetIds.length || !chosen.every((item) => latest.has(item.id))) return null;
  return chosen.reduce((sum, item) => sum + Number(latest.get(item.id)!.amount), 0);
}

/** Recorded month-end totals of the chosen assets, for the "actual" line on the projection chart. */
export function buildActualPath(positions: readonly WealthPosition[], snapshots: readonly WealthPositionSnapshot[], assetIds: readonly string[], asOf: string): FirePathPoint[] {
  const chosen = positions.filter((item) => !item.isArchived && item.positionKind === 'asset' && assetIds.includes(item.id));
  if (!chosen.length) return [];
  const currentMonth = asOf.slice(0, 7);
  const months = [...new Set(snapshots.filter((item) => item.valueDate <= asOf).map((item) => item.valueDate.slice(0, 7)))].sort();
  return months.flatMap((month) => {
    const values = latestSnapshotByPosition(snapshots, month === currentMonth ? asOf : `${month}-31`);
    if (!chosen.every((item) => values.has(item.id))) return [];
    const amount = chosen.reduce((sum, item) => sum + Number(values.get(item.id)!.amount), 0);
    return [{ date: `${month}-01`, amount: amount.toFixed(2), kind: 'actual' as const }];
  });
}

export interface WealthHistoryEntry {
  id: string;
  kind: 'value' | 'contribution';
  positionId: string;
  date: string;
  amount: string;
}

/** The most recent dated values and contributions, newest first. */
export function recentWealthHistory(snapshots: readonly WealthPositionSnapshot[], contributions: readonly WealthContribution[], limit = 10): WealthHistoryEntry[] {
  return [
    ...snapshots.map((item) => ({ id: item.id, kind: 'value' as const, positionId: item.wealthPositionId, date: item.valueDate, amount: item.amount })),
    ...contributions.map((item) => ({ id: item.id, kind: 'contribution' as const, positionId: item.wealthPositionId, date: item.contributionDate, amount: item.amount })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, limit);
}
