import { calculateDebtPayoff } from './debt';
import type {
  CreateWealthPositionInput,
  FirePathPoint,
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
export function latestSnapshotByPosition(snapshots: readonly WealthPositionSnapshot[], asOf?: string) {
  const result = new Map<string, WealthPositionSnapshot>();
  [...snapshots]
    .filter((item) => !asOf || item.valueDate <= asOf)
    .sort((a, b) => b.valueDate.localeCompare(a.valueDate))
    .forEach((item) => {
      if (!result.has(item.wealthPositionId)) result.set(item.wealthPositionId, item);
    });
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

/** One-line payoff outlook for a liability from its latest balance and saved terms. */
export function describeDebtPayoff(position: WealthPosition, balance: number | null, asOf: string): DebtPayoffLine {
  if (balance === null) return { text: 'Add a dated balance to see payoff', warning: false, payoffMonth: null };
  if (position.interestRate === null || position.monthlyPayment === null) return { text: 'Add rate and payment to see payoff', warning: false, payoffMonth: null };
  const payoff = calculateDebtPayoff(balance, Number(position.interestRate), Number(position.monthlyPayment), asOf);
  if (payoff.status === 'paid_off') return { text: 'Paid off', warning: false, payoffMonth: null };
  if (payoff.status === 'payment_below_interest') return { text: 'Payment does not cover monthly interest', warning: true, payoffMonth: null };
  if (payoff.status === 'missing_terms') return { text: 'Add rate and payment to see payoff', warning: false, payoffMonth: null };
  const interest = Number(payoff.totalInterest);
  return {
    text: `S$${Math.round(interest).toLocaleString('en-SG')} interest left`,
    warning: false,
    payoffMonth: payoff.payoffMonth,
  };
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
