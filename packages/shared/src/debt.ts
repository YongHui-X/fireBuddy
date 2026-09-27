import type { DebtPayoffSummary, DebtSummary, WealthPosition } from './types';

/**
 * Deterministic debt payoff maths shared by the web demo mode and the FastAPI backend.
 *
 * `apps/backend/services/debt_calculator.py` mirrors this file step for step and
 * `packages/shared/fixtures/debt.json` proves both produce identical output. Keep the
 * two in sync: every rounding decision here has a Decimal counterpart there.
 */

/** Months after which a projection is treated as never finishing (50 years). */
export const MAX_PAYOFF_MONTHS = 600;

/** Annual rate above which a liability is flagged for early repayment. */
export const HIGH_INTEREST_THRESHOLD = 0.06;

/** Round half away from zero to cents, matching Python's ROUND_HALF_UP on Decimal. */
export function roundCents(value: number): number {
  const scaled = Math.abs(value) * 100;
  // Nudge by a tiny epsilon so binary floats such as 2.675 * 100 = 267.49999 round up like the decimal would.
  const rounded = Math.floor(scaled + 0.5 + 1e-9);
  return (value < 0 ? -rounded : rounded) / 100;
}

const monthKey = (year: number, monthIndex: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

export interface DebtPayoffResult {
  payoffMonth: string | null;
  monthsRemaining: number | null;
  totalInterest: string | null;
  status: DebtPayoffSummary['status'];
}

/**
 * Project when a balance reaches zero under monthly compounding and a fixed payment.
 *
 * The first payment is applied one month after `asOf`, so a balance recorded this month
 * with a payment that clears it lands on next month's key. Interest is rounded to cents
 * every month before it is added, as a lender's statement would.
 */
export function calculateDebtPayoff(balance: number, annualRate: number, monthlyPayment: number, asOf: string): DebtPayoffResult {
  if (balance <= 0) return { payoffMonth: null, monthsRemaining: 0, totalInterest: '0.00', status: 'paid_off' };
  if (monthlyPayment <= 0 || !Number.isFinite(annualRate) || annualRate < 0) {
    return { payoffMonth: null, monthsRemaining: null, totalInterest: null, status: 'missing_terms' };
  }
  const monthlyRate = annualRate / 12;
  if (roundCents(balance * monthlyRate) >= monthlyPayment) {
    return { payoffMonth: null, monthsRemaining: null, totalInterest: null, status: 'payment_below_interest' };
  }
  let remaining = roundCents(balance);
  let interestTotal = 0;
  let months = 0;
  let year = Number(asOf.slice(0, 4));
  let monthIndex = Number(asOf.slice(5, 7)) - 1;
  while (remaining > 0 && months < MAX_PAYOFF_MONTHS) {
    const interest = roundCents(remaining * monthlyRate);
    interestTotal = roundCents(interestTotal + interest);
    remaining = roundCents(remaining + interest - monthlyPayment);
    months += 1;
    monthIndex += 1;
    if (monthIndex === 12) { monthIndex = 0; year += 1; }
  }
  if (remaining > 0) return { payoffMonth: null, monthsRemaining: null, totalInterest: null, status: 'payment_below_interest' };
  return { payoffMonth: monthKey(year, monthIndex), monthsRemaining: months, totalInterest: interestTotal.toFixed(2), status: 'projected' };
}

type LiabilityLike = Pick<WealthPosition, 'id' | 'name' | 'positionKind' | 'isArchived' | 'interestRate' | 'monthlyPayment'>;

/** Summarise every active liability and the household's monthly debt service. */
export function buildDebtSummary(
  positions: LiabilityLike[],
  latestAmounts: Map<string, string> | Record<string, string>,
  monthlyIncome: number | null,
  asOf: string,
): DebtSummary {
  const amountFor = (id: string) => (latestAmounts instanceof Map ? latestAmounts.get(id) : latestAmounts[id]);
  const liabilities: DebtPayoffSummary[] = positions
    .filter((item) => item.positionKind === 'liability' && !item.isArchived)
    .map((item) => {
      const balanceText = amountFor(item.id);
      const balance = balanceText == null ? null : Number(balanceText);
      const rate = item.interestRate == null ? null : Number(item.interestRate);
      const payment = item.monthlyPayment == null ? null : Number(item.monthlyPayment);
      const payoff = balance === null || rate === null || payment === null
        ? { payoffMonth: null, monthsRemaining: null, totalInterest: null, status: 'missing_terms' as const }
        : calculateDebtPayoff(balance, rate, payment, asOf);
      return {
        positionId: item.id, name: item.name, balance: balance === null ? null : balance.toFixed(2),
        interestRate: rate === null ? null : rate.toFixed(4), monthlyPayment: payment === null ? null : payment.toFixed(2),
        ...payoff,
      };
    });
  const service = roundCents(liabilities.reduce((sum, item) => sum + Number(item.monthlyPayment ?? 0), 0));
  const rates = liabilities.flatMap((item) => (item.interestRate === null ? [] : [Number(item.interestRate)]));
  const highest = rates.length ? Math.max(...rates) : null;
  return {
    totalMonthlyDebtService: service.toFixed(2),
    highestInterestRate: highest === null ? null : highest.toFixed(4),
    debtToIncome: monthlyIncome && monthlyIncome > 0 ? (service / monthlyIncome).toFixed(6) : null,
    liabilities,
  };
}

/** The liability that should be paid down first, or null when none charges more than the threshold. */
export function highestInterestLiability(summary: DebtSummary): DebtPayoffSummary | null {
  const candidates = summary.liabilities.filter((item) =>
    item.interestRate !== null && Number(item.interestRate) > HIGH_INTEREST_THRESHOLD && item.balance !== null && Number(item.balance) > 0);
  if (!candidates.length) return null;
  return candidates.reduce((best, item) => (Number(item.interestRate) > Number(best.interestRate) ? item : best));
}
