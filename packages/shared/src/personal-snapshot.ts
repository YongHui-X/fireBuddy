import { buildDebtSummary } from './debt';
import { summariseEssentialSpending } from './essential';
import { getDeviceDateKey, shiftMonthKey } from './format';
import { getMonthSummary, summariseSpendingByCategory, transactionMagnitude } from './ledger';
import { calculateRetirement } from './retirement';
import type {
  Category,
  FireCalculationResult,
  RetirementPlan,
  Transaction,
  WealthContribution,
  WealthPosition,
  WealthPositionSnapshot,
} from './types';
import { eligibleAssetTotal, latestSnapshotByPosition, summariseWealth } from './wealth';

/**
 * The aggregate snapshot Ember personalises answers with, computed on the device that holds
 * the records. Mirrors the key set of `apps/backend/services/ember_personal_context.py` so the
 * same prompt wording and masking rules apply, and never includes descriptions, ids or names.
 */

export interface PersonalSnapshotInput {
  transactions: readonly Transaction[];
  categories: readonly Category[];
  positions: readonly WealthPosition[];
  snapshots: readonly WealthPositionSnapshot[];
  contributions: readonly WealthContribution[];
  retirementPlan: RetirementPlan | null;
  essentialCategoryIds: readonly string[];
  /** A projection already computed by the planner hook; computed here when omitted. */
  fire?: FireCalculationResult | null;
  todayKey?: string;
}

export interface PersonalSnapshot {
  effectiveDate: string;
  facts: Record<string, unknown>;
}

const STALE_AFTER_DAYS = 35;
const TOP_CATEGORY_COUNT = 5;

const money = (value: number | null | undefined) => (value == null || !Number.isFinite(value) ? null : value.toFixed(2));

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000);
}

function spendingBlock(transactions: readonly Transaction[], categories: readonly Category[], monthKey: string, todayKey: string, limit: number) {
  const rows = transactions.filter((item) => item.transactionType === 'expense' && item.date.startsWith(monthKey) && item.date <= todayKey);
  const breakdown = summariseSpendingByCategory(rows, categories);
  const total = rows.reduce((sum, item) => sum + transactionMagnitude(item), 0);
  const end = monthKey === todayKey.slice(0, 7) ? todayKey : getDeviceDateKey(new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0));
  return {
    period: `${monthKey}-01 to ${end}`,
    total: total.toFixed(2),
    topCategories: breakdown.slice(0, limit).map((row) => ({ category: row.name, amount: row.amount.toFixed(2) })),
  };
}

export function buildPersonalSnapshot(input: PersonalSnapshotInput): PersonalSnapshot {
  const todayKey = input.todayKey ?? getDeviceDateKey();
  const monthKey = todayKey.slice(0, 7);
  const wealth = summariseWealth(input.positions, input.snapshots, todayKey);
  const latest = latestSnapshotByPosition(input.snapshots, todayKey);
  const latestAmounts = new Map([...latest].map(([id, snapshot]) => [id, snapshot.amount]));
  const pulse = getMonthSummary(input.transactions.filter((item) => item.date <= todayKey), monthKey);
  const debt = buildDebtSummary(wealth.active, latestAmounts, pulse.income > 0 ? pulse.income : null, todayKey);
  const essential = summariseEssentialSpending(input.transactions, input.essentialCategoryIds, todayKey);

  const stale = wealth.active.some((position) => {
    const snapshot = latest.get(position.id);
    return snapshot ? daysBetween(snapshot.valueDate, todayKey) > STALE_AFTER_DAYS : false;
  });
  const snapshotStatus = wealth.active.length === 0 || wealth.missingValues > 0 ? 'missing' : stale ? 'stale' : 'current';
  const complete = wealth.active.length > 0 && wealth.missingValues === 0;

  const emergencyFund = wealth.assets
    .filter((position) => position.isEmergencyFund)
    .reduce((sum, position) => sum + Number(latest.get(position.id)?.amount ?? 0), 0);
  const runway = essential.averageEssential && essential.averageEssential > 0 ? emergencyFund / essential.averageEssential : null;
  const investable = wealth.assets.filter((position) => position.includeInFi).reduce((sum, position) => sum + Number(latest.get(position.id)?.amount ?? 0), 0);

  let fire = input.fire ?? null;
  if (fire === null) {
    const starting = input.retirementPlan ? eligibleAssetTotal(input.positions, latest, input.retirementPlan.assetIds) : null;
    try {
      fire = calculateRetirement(input.retirementPlan, starting, todayKey);
    } catch {
      fire = null;
    }
  }

  const facts: Record<string, unknown> = {
    effectiveDate: todayKey,
    snapshotStatus,
    netWorth: complete ? money(wealth.netWorth) : null,
    liabilityTotal: complete ? money(wealth.liabilityTotal) : null,
    monthlyDebtService: debt.totalMonthlyDebtService,
    investableAssets: money(investable),
    emergencyRunwayMonths: runway === null ? null : runway.toFixed(6),
    averageMonthlyEssentialSpending: money(essential.averageEssential),
    derived: {
      emergencyFundTarget3Months: essential.averageEssential == null ? null : money(essential.averageEssential * 3),
      emergencyFundTarget6Months: essential.averageEssential == null ? null : money(essential.averageEssential * 6),
    },
    monthlyPulse: {
      month: monthKey,
      income: pulse.income.toFixed(2),
      spending: pulse.expenses.toFixed(2),
      savingsAmount: pulse.savings.toFixed(2),
      savingsRate: pulse.savingsRate === null ? null : pulse.savingsRate.toFixed(6),
      completeness: pulse.transactionCount < 3 ? 'limited' : 'complete',
    },
    fire: fire
      ? {
          fundingStatus: fire.fundingStatus ?? null,
          fiTarget: fire.fiTarget,
          progressRate: fire.progressRate,
          requiredMonthlyInvestment: fire.requiredMonthlyInvestment,
          estimatedFiYear: fire.estimatedFiYear,
          earliestRetirementMonth: fire.earliestRetirementMonth ?? null,
        }
      : null,
    recommendedAction: null,
    anomalyCounts: { possible_duplicate: 0, high_category_amount: 0 },
    warningCodes: (fire?.warnings ?? []).map((warning) => warning.code).slice(0, 6),
    spending: {
      currentMonth: spendingBlock(input.transactions, input.categories, monthKey, todayKey, TOP_CATEGORY_COUNT),
      previousMonth: spendingBlock(input.transactions, input.categories, shiftMonthKey(monthKey, -1), todayKey, 3),
    },
  };

  return { effectiveDate: todayKey, facts };
}
