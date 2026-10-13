import {
  buildActualPath,
  calculateRetirement,
  calendarMonth,
  eligibleAssetTotal,
  getDeviceDateKey,
  latestSnapshotByPosition,
  monthIndex,
  fireTodaysMoney,
  employeeCpfNow,
  withCpfProjection,
  withWealthCpfBalances,
  type FireCalculationResult,
  type RetirementCashFlow,
  type RetirementPlan,
} from '@firebuddy/shared';
import { useMemo } from 'react';

import { useFireBuddy } from '@/lib/fire-buddy-store';
import { useRegion } from '@/lib/user-profile';

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

/** Today's money for every planner amount; see `fireTodaysMoney` (PRD 6.6.1, 4). */
export const todaysMoney = fireTodaysMoney;

/** Headline facts read straight from the authoritative monthly rows, without recalculating anything. */
export function describeFire(fire: FireCalculationResult) {
  const plan = fire.plan!;
  const rows: RetirementCashFlow[] = fire.monthlyCashFlows ?? [];
  const depletion = rows.find((row) => row.phase === 'retirement' && Number(row.balance) < 0)?.month ?? null;
  const required = fire.requiredMonthlyInvestment == null ? null : Number(fire.requiredMonthlyInvestment);
  const cpfMonth = calendarMonth(monthIndex(plan.birthMonth) + plan.cpfStartAge * 12);
  return {
    plan,
    rows,
    depletion,
    funded: fire.fundingStatus === 'funded',
    retirementAge: ageAt(plan, plan.retirementMonth),
    earliestAge: fire.earliestRetirementMonth ? ageAt(plan, fire.earliestRetirementMonth) : null,
    progress: Number(fire.progressRate ?? 0),
    contributionDelta: required === null ? null : required - plan.monthlyContribution,
    monthsToRetirement: monthIndex(plan.retirementMonth) - monthIndex(fire.effectiveDate),
    firstRetirement: rows.find((row) => row.phase === 'retirement') ?? null,
    firstCpf: rows.find((row) => row.phase === 'retirement' && row.month >= cpfMonth) ?? null,
    cpfIncluded: ['standard', 'escalating', 'basic'].includes(plan.cpfPlan) && plan.residency !== 'foreigner',
    cpfMonth,
    /** The plan's last month: the month before the end age. */
    endMonth: calendarMonth(monthIndex(plan.birthMonth) + plan.endAge * 12 - 1),
  };
}

/**
 * Run the shared retirement engine over the saved plan and the latest values of its chosen
 * assets. Pass overrides to preview a scenario; the saved plan and records are never changed.
 */
export function useFireProjection(overrides?: PlanOverrides) {
  const { positions, balanceSnapshots: snapshots, retirementPlan } = useFireBuddy();
  const { isSingapore } = useRegion();
  const today = useMemo(() => getDeviceDateKey(), []);
  const overrideKey = JSON.stringify(overrides ?? null);

  return useMemo(() => {
    const parsed = JSON.parse(overrideKey) as PlanOverrides | null;
    // CPF LIFE is Singapore's: a plan saved before the user moved to the general mode keeps its
    // CPF values on disk, but they never count while the app is in general mode.
    // An estimated CPF LIFE payout follows the plan's (or the scenario's) birth year, inflation and
    // retirement month: from CPF balances (PRD 6.6.1, 24) or the retirement sum (18). A non-resident has no CPF (22).
    const merged = retirementPlan ? { ...retirementPlan, ...parsed } : null;
    const latest = latestSnapshotByPosition(snapshots, today);
    // CPF balances read from Wealth follow its latest values (PRD 6.6.1, 29).
    const plan = merged ? (isSingapore ? withCpfProjection(withWealthCpfBalances(merged, positions, latest, today), today) : { ...merged, cpfPlan: 'unknown' as const, cpfMonthlyPayout: 0, cpfEstimate: undefined }) : null;
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
  }, [positions, snapshots, retirementPlan, today, overrideKey, isSingapore]);
}

/**
 * Pay facts for the planner's "What to do" card (PRD 6.6.1, 23): the share of take-home pay
 * invested, and what investing 10% more of gross pay (bonus spread over the year) does to the
 * earliest date the person could stop working. Null without pay. Take-home is gross pay minus the
 * person's own CPF; outside Singapore it is the gross figure as typed.
 */
export function usePayInsight(projection: Pick<ReturnType<typeof useFireProjection>, 'plan' | 'startingAssets' | 'today' | 'ready' | 'result'>) {
  const { plan, startingAssets, today, ready, result } = projection;
  const { isSingapore } = useRegion();
  return useMemo(() => {
    if (!ready || !plan?.pay || !(plan.pay.grossMonthly > 0)) return null;
    // CPF comes off pay only in Singapore, and never for a non-resident (inside employeeCpfNow).
    const takeHome = plan.pay.grossMonthly - (isSingapore ? employeeCpfNow(plan, today) : 0);
    const extra = Math.round((plan.pay.grossMonthly * (12 + plan.pay.bonusMonths)) / 12 * 0.1);
    let more: FireCalculationResult | null = null;
    try {
      more = calculateRetirement({ ...plan, monthlyContribution: plan.monthlyContribution + extra }, startingAssets, today);
    } catch {
      more = null;
    }
    const before = result.earliestRetirementMonth, after = more?.earliestRetirementMonth ?? null;
    return {
      savingsRate: takeHome > 0 ? plan.monthlyContribution / takeHome : null,
      extra,
      /** Months earlier the person could stop working; null when either date is out of reach. */
      monthsEarlier: before && after ? monthIndex(before) - monthIndex(after) : null,
      /** The earliest date with 10% more, when today's plan never gets there. */
      newEarliest: !before && after ? after : null,
      progressGain: more ? Number(more.progressRate ?? 0) - Number(result.progressRate ?? 0) : 0,
    };
  }, [plan, startingAssets, today, ready, result, isSingapore]);
}

/**
 * The most monthly retirement spending (today's money, to the nearest dollar) the current plan pays
 * for to the end age, everything else unchanged: the "spend less" action (PRD 6.6.1, 35). Null when
 * the plan is already funded or no spending level works (big costs or healthcare alone are too much).
 */
export function useAffordableSpending(projection: Pick<ReturnType<typeof useFireProjection>, 'plan' | 'startingAssets' | 'today' | 'ready' | 'result'>) {
  const { plan, startingAssets, today, ready, result } = projection;
  return useMemo(() => {
    if (!ready || !plan || result.fundingStatus === 'funded') return null;
    const funded = (spending: number) => {
      try {
        return calculateRetirement({ ...plan, monthlySpending: spending }, startingAssets, today).fundingStatus === 'funded';
      } catch {
        return false;
      }
    };
    if (!funded(0)) return null;
    // Funding falls as spending rises, so halve the gap until it is under a dollar.
    let low = 0, high = plan.monthlySpending;
    while (high - low > 1) {
      const mid = (low + high) / 2;
      if (funded(mid)) low = mid;
      else high = mid;
    }
    const spending = Math.floor(low);
    return spending > 0 ? spending : null;
  }, [plan, startingAssets, today, ready, result]);
}
