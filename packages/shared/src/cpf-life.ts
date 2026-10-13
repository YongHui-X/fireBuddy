import type { RetirementPlan } from './types';

/**
 * CPF LIFE payout estimates for people who do not know their payout (PRD 6.6.1, rule 18).
 * Checked against the CPF Board on 10 Oct 2026:
 * - Retirement sums by the year a member turns 55: cpf.gov.sg "What is the CPF retirement sum"
 *   and "How the CPF retirement sum affects your payouts" (updated 21 Sep 2026). Sums after 2027
 *   have not been announced.
 * - Standard plan payouts: cpf.gov.sg "How much CPF payouts can I get every month" (updated
 *   16 Jun 2026), a male member who turns 55 in 2026, payouts from 65 and from 70.
 * - Escalating starts "about 20% lower" than Standard (CPF, DBS, POSB). CPF publishes no Basic
 *   figure; older CPF illustrations and calculators put it about 10% below Standard (rough).
 */
export const CPF_LIFE_SOURCE_DATE = '2026-10-10';

export type CpfRetirementSum = 'brs' | 'frs' | 'ers';

export const CPF_RETIREMENT_SUMS: Readonly<Record<number, Readonly<Record<CpfRetirementSum, number>>>> = {
  2024: { brs: 102900, frs: 205800, ers: 308700 },
  2025: { brs: 106500, frs: 213000, ers: 426000 },
  2026: { brs: 110200, frs: 220400, ers: 440800 },
  2027: { brs: 114100, frs: 228200, ers: 456400 },
};
const FIRST_SUM_YEAR = 2024;
const LAST_SUM_YEAR = 2027;
/** The cohort the payout table describes. */
const PAYOUT_TABLE_YEAR = 2026;

/** Retirement account balance at 55 → Standard plan monthly payout from 65 and from 70. */
const STANDARD_PAYOUTS: readonly (readonly [balance: number, at65: number, at70: number])[] = [
  [50000, 490, 670],
  [110200, 950, 1280],
  [150000, 1250, 1670],
  [220400, 1780, 2380],
  [300000, 2380, 3170],
  [440800, 3440, 4580],
];

const PLAN_FACTOR: Readonly<Record<'standard' | 'escalating' | 'basic', number>> = { standard: 1, escalating: 0.8, basic: 0.9 };

/**
 * The retirement sum for the year a member turns 55. Announced years come from the table; later
 * years grow from 2027 with the plan's inflation, and earlier years use 2024, the first in the table.
 */
export function cpfRetirementSum(sum: CpfRetirementSum, yearTurning55: number, inflation: number): number {
  if (yearTurning55 <= FIRST_SUM_YEAR) return CPF_RETIREMENT_SUMS[FIRST_SUM_YEAR]![sum];
  if (yearTurning55 <= LAST_SUM_YEAR) return CPF_RETIREMENT_SUMS[yearTurning55]![sum];
  return CPF_RETIREMENT_SUMS[LAST_SUM_YEAR]![sum] * (1 + inflation) ** (yearTurning55 - LAST_SUM_YEAR);
}

/**
 * Standard plan payout for a balance at 55 in 2026 money, starting at `startAge` (65 to 70).
 * Balances interpolate linearly between CPF's points (scaled beyond them); start ages between
 * 65 and 70 grow at the table's compound rate, about 6% a year rather than a flat 7%.
 */
export function standardCpfLifePayout(balanceAt55: number, startAge: number): number {
  const points = STANDARD_PAYOUTS;
  const at = (column: 1 | 2) => {
    if (balanceAt55 <= points[0]![0]) return points[0]![column] * (balanceAt55 / points[0]![0]);
    const last = points[points.length - 1]!;
    if (balanceAt55 >= last[0]) return last[column] * (balanceAt55 / last[0]);
    const upper = points.findIndex((point) => point[0] >= balanceAt55);
    const low = points[upper - 1]!, high = points[upper]!;
    return low[column] + ((balanceAt55 - low[0]) / (high[0] - low[0])) * (high[column] - low[column]);
  };
  const from65 = at(1), from70 = at(2);
  const age = Math.min(70, Math.max(65, startAge));
  return from65 * (from70 / from65) ** ((age - 65) / 5);
}

export interface CpfLifeEstimateInput {
  cpfPlan: RetirementPlan['cpfPlan'];
  sum: CpfRetirementSum;
  /** YYYY-MM. */
  birthMonth: string;
  startAge: number;
  inflation: number;
}

/**
 * Estimated first monthly CPF LIFE payout, in the dollars of the year payouts start (the unit
 * `cpfMonthlyPayout` uses). The cohort's sum is read against CPF's 2026 table through the same
 * sum in 2026, so a later cohort's payout rises with its sum. 'unknown' is estimated as Standard,
 * CPF's default plan. Null without a valid birth year.
 */
export function estimateCpfLifePayout({ cpfPlan, sum, birthMonth, startAge, inflation }: CpfLifeEstimateInput): number | null {
  const birthYear = Number(birthMonth.slice(0, 4));
  if (!/^\d{4}-\d{2}$/.test(birthMonth) || !Number.isFinite(birthYear) || !Number.isFinite(startAge) || !Number.isFinite(inflation)) return null;
  const cohort = cpfRetirementSum(sum, birthYear + 55, inflation);
  const tableSum = CPF_RETIREMENT_SUMS[PAYOUT_TABLE_YEAR]![sum];
  const payout = standardCpfLifePayout(tableSum, startAge) * (cohort / tableSum);
  const factor = cpfPlan === 'unknown' ? 1 : PLAN_FACTOR[cpfPlan];
  return Math.round(payout * factor);
}

/** The plan with its CPF LIFE payout re-estimated when it was saved as an estimate. */
export function withCpfEstimate(plan: RetirementPlan): RetirementPlan {
  if (!plan.cpfEstimate) return plan;
  const payout = estimateCpfLifePayout({ cpfPlan: plan.cpfPlan, sum: plan.cpfEstimate.sum, birthMonth: plan.birthMonth, startAge: plan.cpfStartAge, inflation: plan.inflation });
  return payout === null ? plan : { ...plan, cpfMonthlyPayout: payout };
}
