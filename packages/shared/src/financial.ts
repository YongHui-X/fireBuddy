import type {
  FireCalculationResult,
  FirePathPoint,
  RetirementPlan,
  SpendingBaseline,
} from './types';
import { calculateRetirement } from './retirement';

export interface FireProjectionInput {
  plan?: RetirementPlan | null;
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

/** Legacy entry point now requires a confirmed versioned plan, never a withdrawal-rate target. */
export function calculateFireProjection(input: FireProjectionInput): FireCalculationResult {
  const result = calculateRetirement(input.plan, input.currentInvestableAssets, input.effectiveDate);
  if (input.spendingBaseline) result.spendingBaseline = input.spendingBaseline;
  return result;
}

/** Return the savings rate only when positive income makes the ratio meaningful. */
export function calculateSavingsRate(income: number, spending: number): number | null {
  return income > 0 ? (income - spending) / income : null;
}
