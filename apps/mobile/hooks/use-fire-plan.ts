import {
  buildActualPath,
  calculateRetirement,
  calendarMonth,
  eligibleAssetTotal,
  getDeviceDateKey,
  latestSnapshotByPosition,
  monthIndex,
  type FireCalculationResult,
  type RetirementCashFlow,
  type RetirementPlan,
} from '@firebuddy/shared';
import { useMemo } from 'react';

import { useFireBuddy } from '@/lib/fire-buddy-store';

/** Overrides the temporary scenario sheet can apply without saving the plan. */
export type PlanOverrides = Partial<Pick<RetirementPlan, 'retirementMonth' | 'monthlyContribution' | 'monthlySpending' | 'beforeReturn' | 'afterReturn' | 'inflation'>>;

/** "September 2042" for a YYYY-MM key. */
export const fireMonthLabel = (month: string | null | undefined) =>
  month ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }) : '';

/** Print a decimal rate as a percentage without binary float noise such as 7.000000000000001. */
export const pct = (rate: number, digits = 2) => `${Number((rate * 100).toFixed(digits))}%`;

/** Completed age in the given calendar month. */
export const ageAt = (plan: RetirementPlan, month: string) => Math.floor((monthIndex(month) - monthIndex(plan.birthMonth)) / 12);

/** "this month", "8 months away", "16 years away" or "16 years 2 months away" for a count of months. */
export function timeUntil(months: number) {
  if (months <= 0) return 'this month';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years ? `${years} year${years === 1 ? '' : 's'}` : '';
  const m = rest ? `${rest} month${rest === 1 ? '' : 's'}` : '';
  return `${[y, m].filter(Boolean).join(' ')} away`;
}

export interface YearRow {
  year: string;
  age: number;
  contribution: number;
  income: number;
  expenses: number;
  balance: number;
}

/** Headline facts read straight from the authoritative monthly rows, without recalculating anything. */
export function describeFire(fire: FireCalculationResult) {
  const plan = fire.plan!;
  const rows: RetirementCashFlow[] = fire.monthlyCashFlows ?? [];
  const depletion = rows.find((row) => row.phase === 'retirement' && Number(row.balance) < 0)?.month ?? null;
  const required = fire.requiredMonthlyInvestment == null ? null : Number(fire.requiredMonthlyInvestment);
  const cpfMonth = calendarMonth(monthIndex(plan.birthMonth) + plan.cpfStartAge * 12);
  const years: YearRow[] = [...new Set(rows.map((row) => row.month.slice(0, 4)))].map((year) => {
    const items = rows.filter((row) => row.month.startsWith(year));
    const total = (key: 'contribution' | 'expenses' | 'cpf' | 'otherIncome') => items.reduce((sum, row) => sum + Number(row[key]), 0);
    return { year, age: ageAt(plan, `${year}-12`), contribution: total('contribution'), expenses: total('expenses'), income: total('cpf') + total('otherIncome'), balance: Number(items[items.length - 1]!.balance) };
  });
  return {
    plan,
    rows,
    depletion,
    funded: fire.fundingStatus === 'funded',
    retirementAge: ageAt(plan, plan.retirementMonth),
    earliestAge: fire.earliestRetirementMonth ? ageAt(plan, fire.earliestRetirementMonth) : null,
    progress: Number(fire.progressRate ?? 0),
    contributionDelta: required === null ? null : required - plan.monthlyContribution,
    peak: rows.reduce((max, row) => Math.max(max, Number(row.balance)), 0),
    monthsToRetirement: monthIndex(plan.retirementMonth) - monthIndex(fire.effectiveDate),
    firstRetirement: rows.find((row) => row.phase === 'retirement') ?? null,
    firstCpf: rows.find((row) => row.phase === 'retirement' && row.month >= cpfMonth) ?? null,
    cpfIncluded: ['standard', 'escalating'].includes(plan.cpfPlan),
    years,
  };
}

/**
 * Run the shared retirement engine over the saved plan and the latest values of its chosen
 * assets. Pass overrides to preview a scenario; the saved plan and records are never changed.
 */
export function useFireProjection(overrides?: PlanOverrides) {
  const { positions, snapshots, retirementPlan } = useFireBuddy();
  const today = useMemo(() => getDeviceDateKey(), []);
  const overrideKey = JSON.stringify(overrides ?? null);

  return useMemo(() => {
    const parsed = JSON.parse(overrideKey) as PlanOverrides | null;
    const plan = retirementPlan ? { ...retirementPlan, ...parsed } : null;
    const latest = latestSnapshotByPosition(snapshots, today);
    const startingAssets = plan ? eligibleAssetTotal(positions, latest, plan.assetIds) : null;
    let result: FireCalculationResult;
    try {
      result = calculateRetirement(plan, startingAssets, today);
    } catch {
      result = calculateRetirement(null, startingAssets, today);
      result.warnings.push({ code: 'calculation_failed', message: 'The projection could not be verified. Review the plan inputs.' });
    }
    if (plan && !parsed && !plan.portfolioOverride) result.actualPath = buildActualPath(positions, snapshots, plan.assetIds, today);
    return {
      plan,
      result,
      startingAssets,
      ready: Boolean(plan) && result.fundingStatus !== 'review_required',
      today,
    };
  }, [positions, snapshots, retirementPlan, today, overrideKey]);
}
