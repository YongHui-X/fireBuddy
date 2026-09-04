import type {
  FireCalculationResult,
  FirePathPoint,
  FireWarning,
  SpendingBaseline,
} from './types';

export interface FireProjectionInput {
  effectiveDate: string;
  currentInvestableAssets: number | null;
  annualRetirementSpending: number | null;
  monthlyContribution: number;
  nominalAnnualReturn: number;
  inflationRate: number;
  withdrawalRate: number;
  targetDate?: string | null;
  actualPath?: FirePathPoint[];
  spendingBaseline?: SpendingBaseline;
}

const money = (value: number) => value.toFixed(2);
const rate = (value: number) => value.toFixed(6);

/** Calculate a transparent, month-end contribution FIRE projection for demo mode. */
export function calculateFireProjection(input: FireProjectionInput): FireCalculationResult {
  const emptyBaseline: SpendingBaseline = input.spendingBaseline ?? {
    status: 'insufficient_data',
    source: 'none',
    startDate: null,
    endDate: null,
    completedMonths: 0,
    expenseTotal: null,
    annualisedSpending: null,
  };
  const warnings: FireWarning[] = [];

  if (input.currentInvestableAssets === null || input.annualRetirementSpending === null || input.withdrawalRate <= 0) {
    return {
      status: 'insufficient_data',
      effectiveDate: input.effectiveDate,
      currentInvestableAssets: input.currentInvestableAssets === null ? null : money(input.currentInvestableAssets),
      fiTarget: null,
      progressRate: null,
      progressRateCapped: null,
      estimatedMonths: null,
      estimatedFiYear: null,
      requiredMonthlyInvestment: null,
      assumptions: null,
      spendingBaseline: emptyBaseline,
      actualPath: input.actualPath ?? [],
      projectedPath: [],
      warnings: [{ code: 'missing_fire_inputs', message: 'Add wealth values and FIRE spending assumptions to calculate a projection.' }],
    };
  }

  const target = input.annualRetirementSpending / input.withdrawalRate;
  const progress = target === 0 ? 1 : input.currentInvestableAssets / target;
  const realAnnualReturn = (1 + input.nominalAnnualReturn) / (1 + input.inflationRate) - 1;
  const monthlyRate = Math.pow(1 + realAnnualReturn, 1 / 12) - 1;
  const assumptions = {
    monthlyContribution: money(input.monthlyContribution),
    nominalAnnualReturn: rate(input.nominalAnnualReturn),
    inflationRate: rate(input.inflationRate),
    realAnnualReturn: rate(realAnnualReturn),
    withdrawalRate: rate(input.withdrawalRate),
    contributionTiming: 'month_end' as const,
    horizonMonths: 1200,
  };

  if (input.currentInvestableAssets >= target) {
    return {
      status: 'already_reached', effectiveDate: input.effectiveDate,
      currentInvestableAssets: money(input.currentInvestableAssets), fiTarget: money(target),
      progressRate: rate(progress), progressRateCapped: '1.000000', estimatedMonths: 0,
      estimatedFiYear: Number(input.effectiveDate.slice(0, 4)), requiredMonthlyInvestment: '0.00',
      assumptions, spendingBaseline: emptyBaseline, actualPath: input.actualPath ?? [], projectedPath: [], warnings,
    };
  }

  let balance = input.currentInvestableAssets;
  let months: number | null = null;
  const projectedPath: FirePathPoint[] = [];
  const start = new Date(`${input.effectiveDate}T00:00:00Z`);
  for (let month = 1; month <= 1200; month += 1) {
    balance = balance * (1 + monthlyRate) + input.monthlyContribution;
    if (month === 1 || month % 12 === 0 || balance >= target) {
      const pointDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + month, 1));
      projectedPath.push({ date: pointDate.toISOString().slice(0, 10), amount: money(balance), kind: 'projected' });
    }
    if (balance >= target) {
      months = month;
      break;
    }
    if (balance <= 0 && monthlyRate <= 0 && input.monthlyContribution <= 0) {
      break;
    }
  }

  let requiredMonthlyInvestment: number | null = null;
  const targetDate = input.targetDate
    ? new Date(`${input.targetDate}T00:00:00Z`)
    : new Date(Date.UTC(start.getUTCFullYear() + 16, start.getUTCMonth(), 1));
  const requiredMonths = Math.max(1, Math.round((targetDate.getTime() - start.getTime()) / 2_629_746_000));
  if (Math.abs(monthlyRate) < 1e-12) {
    requiredMonthlyInvestment = Math.max(0, (target - input.currentInvestableAssets) / requiredMonths);
  } else {
    const growth = Math.pow(1 + monthlyRate, requiredMonths);
    requiredMonthlyInvestment = Math.max(0, ((target - input.currentInvestableAssets * growth) * monthlyRate) / (growth - 1));
  }

  if (months === null) {
    warnings.push({ code: 'unreachable_horizon', message: 'The FI target is not reached within the 100 year projection horizon.' });
  }
  return {
    status: months === null ? 'unreachable' : 'projected', effectiveDate: input.effectiveDate,
    currentInvestableAssets: money(input.currentInvestableAssets), fiTarget: money(target),
    progressRate: rate(progress), progressRateCapped: rate(Math.min(progress, 1)), estimatedMonths: months,
    estimatedFiYear: months === null ? null : start.getUTCFullYear() + Math.floor((start.getUTCMonth() + months) / 12),
    requiredMonthlyInvestment: requiredMonthlyInvestment === null ? null : money(requiredMonthlyInvestment),
    assumptions, spendingBaseline: emptyBaseline, actualPath: input.actualPath ?? [], projectedPath, warnings,
  };
}

/** Return the savings rate only when positive income makes the ratio meaningful. */
export function calculateSavingsRate(income: number, spending: number): number | null {
  return income > 0 ? (income - spending) / income : null;
}
