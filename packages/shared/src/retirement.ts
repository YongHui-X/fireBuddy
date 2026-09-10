import type { FireCalculationResult, RetirementPlan } from './types';

export const CALCULATION_VERSION = 'sg-monthly.v2' as const;
/** Convert a Singapore calendar month to an integer without timezone arithmetic. */
export function monthIndex(month: string): number {
  const [year, value] = month.slice(0, 7).split('-').map(Number);
  return year * 12 + value - 1;
}
export function calendarMonth(index: number): string {
  return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
}
const money = (value: number) => (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);

/** Validate confirmed inputs before any projection or activation. */
export function validateRetirementPlan(plan: RetirementPlan, asOf: string): string | null {
  const month = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
  if (plan.version !== 2 || !month(plan.birthMonth) || !month(plan.retirementMonth)) return 'Enter a valid birth and retirement month.';
  if (!month(plan.spendingMonth) || plan.spendingMonth > asOf.slice(0, 7)) return 'Confirm the month used for today’s spending values.';
  const now = monthIndex(asOf), birth = monthIndex(plan.birthMonth), retirement = monthIndex(plan.retirementMonth);
  if (birth >= now || !Number.isInteger(plan.endAge) || plan.endAge < 50 || plan.endAge > 120 || retirement < now || retirement >= birth + plan.endAge * 12 || birth + plan.endAge * 12 - now > 1440) return 'Retirement must be this month or later and before the planning end age.';
  if (![plan.monthlySpending, plan.monthlyContribution].every(v => Number.isFinite(v) && v >= 0 && v <= 99999999)) return 'Enter valid spending and contribution amounts.';
  if (![plan.beforeReturn, plan.afterReturn].every(v => Number.isFinite(v) && v >= -0.2 && v <= 0.3) || !Number.isFinite(plan.inflation) || plan.inflation < 0 || plan.inflation > 0.2) return 'Returns must be between -20% and 30%, inflation between 0% and 20%.';
  if (!['unknown', 'standard', 'escalating', 'basic'].includes(plan.cpfPlan) || !Number.isInteger(plan.cpfStartAge) || plan.cpfStartAge < 65 || plan.cpfStartAge > 70 || !Number.isFinite(plan.cpfMonthlyPayout) || plan.cpfMonthlyPayout < 0) return 'Review CPF payout and commencement age.';
  if (plan.portfolioOverride !== null && (!Number.isFinite(plan.portfolioOverride.amount) || plan.portfolioOverride.amount < 0 || plan.portfolioOverride.amount > 99999999 || !/^\d{4}-\d{2}-\d{2}$/.test(plan.portfolioOverride.date) || !Number.isFinite(Date.parse(plan.portfolioOverride.date)) || new Date(plan.portfolioOverride.date).toISOString().slice(0, 10) !== plan.portfolioOverride.date || plan.portfolioOverride.date > asOf)) return 'Enter a nonnegative portfolio total dated on or before today.';
  if (plan.otherIncome.length > 20 || plan.otherIncome.some(i => !month(i.startMonth) || !month(i.endMonth) || i.endMonth <= i.startMonth || !Number.isFinite(i.monthlyAmount) || i.monthlyAmount < 0 || !Number.isFinite(i.annualGrowth) || i.annualGrowth < -0.2 || i.annualGrowth > 0.3)) return 'Review other income amounts, dates and growth.';
  return null;
}

/** Project accumulation and drawdown with one nominal, month end cash flow schedule. */
export function calculateRetirement(plan: RetirementPlan | null | undefined, assets: number | null, effectiveDate: string): FireCalculationResult {
  const result: FireCalculationResult = {
    calculationVersion: CALCULATION_VERSION, effectiveDate, plan: plan ?? null, status: 'insufficient_data', fundingStatus: 'review_required',
    currentInvestableAssets: assets === null ? null : money(assets), fiTarget: null, progressRate: null, progressRateCapped: null,
    estimatedMonths: null, estimatedFiYear: null, earliestRetirementMonth: null, requiredMonthlyInvestment: null,
    projectedPortfolio: null, fundingGap: null, targetToday: null, portfolioToday: null, assumptions: null,
    spendingBaseline: { status: 'insufficient_data', source: 'none', startDate: null, endDate: null, completedMonths: 0, expenseTotal: null, annualisedSpending: null },
    actualPath: [], projectedPath: [], monthlyCashFlows: [], warnings: [],
  };
  const warn = (code: string, message: string) => result.warnings.push({ code, message });
  if (!plan) { warn('review_required', 'Review required: confirm the five setup steps to activate a retirement plan.'); return result; }
  const invalid = validateRetirementPlan(plan, effectiveDate);
  if (invalid) { warn('invalid_plan', invalid); return result; }
  const starting = plan.portfolioOverride?.amount ?? assets;
  if (starting === null) { warn('missing_portfolio', 'Confirm eligible asset snapshots or a dated planning-only total.'); return result; }
  result.currentInvestableAssets = money(starting);
  const now = monthIndex(effectiveDate), birth = monthIndex(plan.birthMonth), end = birth + plan.endAge * 12;
  const retirement = monthIndex(plan.retirementMonth), cpfStart = birth + plan.cpfStartAge * 12;
  const before = (1 + plan.beforeReturn) ** (1 / 12), after = (1 + plan.afterReturn) ** (1 / 12);
  const inflation = (1 + plan.inflation) ** (1 / 12);
  // Cash flows occur at the end of each labelled month; end age is exclusive.
  const schedule = Array.from({ length: end - now }, (_, offset) => {
    const index = now + offset;
    const cpf = index >= cpfStart && ['standard', 'escalating'].includes(plan.cpfPlan)
      ? plan.cpfMonthlyPayout * (plan.cpfPlan === 'escalating' ? 1.02 ** Math.floor((index - cpfStart) / 12) : 1) : 0;
    const other = plan.otherIncome.reduce((sum, income) => index >= monthIndex(income.startMonth) && index < monthIndex(income.endMonth)
      ? sum + income.monthlyAmount * (1 + income.annualGrowth) ** ((index - monthIndex(income.startMonth)) / 12) : sum, 0);
    return { month: calendarMonth(index), expenses: plan.monthlySpending * inflation ** (index - monthIndex(plan.spendingMonth) + 1), cpf, other };
  });
  // A nonnegative requirement each month prevents later income funding an earlier deficit.
  const targets = new Array<number>(schedule.length + 1).fill(0);
  for (let i = schedule.length - 1; i >= 0; i--) targets[i] = Math.max(0, (targets[i + 1] + schedule[i].expenses - schedule[i].cpf - schedule[i].other) / after);
  const n = retirement - now, target = targets[n];
  let accumulated = starting, factor = 0, earliest: number | null = null;
  for (let i = 0; i < schedule.length; i++) {
    if (earliest === null && accumulated + 1e-7 >= targets[i]) earliest = i;
    if (i < n) factor = factor * before + 1;
    accumulated = accumulated * before + plan.monthlyContribution;
  }
  const portfolio = starting * before ** n + plan.monthlyContribution * factor;
  const required = n === 0 ? (starting + 1e-7 >= target ? 0 : null) : Math.max(0, (target - starting * before ** n) / factor);
  let balance = starting, verification = target;
  for (let i = 0; i < schedule.length; i++) {
    const row = schedule[i], retired = i >= n;
    const growth = balance * ((retired ? after : before) - 1);
    const contribution = retired ? 0 : plan.monthlyContribution;
    const expenses = retired ? row.expenses : 0, cpf = retired ? row.cpf : 0, otherIncome = retired ? row.other : 0;
    balance += growth + contribution + cpf + otherIncome - expenses;
    if (retired) { verification = verification * after + cpf + otherIncome - expenses; if (verification < -0.01) throw new Error('Retirement target failed forward verification'); }
    result.monthlyCashFlows!.push({ month: row.month, phase: retired ? 'retirement' : 'accumulation', growth: money(growth), contribution: money(contribution), expenses: money(expenses), cpf: money(cpf), otherIncome: money(otherIncome), balance: money(balance) });
    if (i === 0 || i === n || i % 12 === 0 || i === schedule.length - 1) result.projectedPath.push({ date: `${row.month}-01`, amount: money(balance), kind: 'projected' });
  }
  const funded = portfolio + 1e-7 >= target;
  Object.assign(result, { status: earliest === 0 ? 'already_reached' : earliest === null ? 'unreachable' : 'projected', fundingStatus: funded ? 'funded' : 'shortfall',
    fiTarget: money(target), projectedPortfolio: money(portfolio), fundingGap: money(Math.max(0, target - portfolio)),
    targetToday: money(target / inflation ** n), portfolioToday: money(portfolio / inflation ** n),
    progressRate: target === 0 ? '1.000000' : (portfolio / target).toFixed(6), progressRateCapped: target === 0 ? '1.000000' : Math.min(1, portfolio / target).toFixed(6),
    requiredMonthlyInvestment: required === null ? null : money(Math.ceil(required * 100) / 100), estimatedMonths: earliest,
    earliestRetirementMonth: earliest === null ? null : calendarMonth(now + earliest), estimatedFiYear: earliest === null ? null : Math.floor((now + earliest) / 12) });
  warn('smooth_returns', 'Smooth returns do not capture market sequence risk or guarantee funding beyond the selected end age. Negative balances show unfunded cash flows, not available borrowing.');
  warn('excluded_assets', 'CPF, SRS and other restricted resources, property and designated emergency reserves are excluded, regardless of legacy FI flags. CPF principal is never counted alongside payouts.');
  if (plan.cpfPlan === 'unknown' || plan.cpfPlan === 'basic') warn('cpf_not_included', plan.cpfPlan === 'basic' ? 'CPF income not included: Basic declining payouts are not modelled.' : 'CPF income not included: payout is not yet known.');
  if (plan.portfolioOverride && (Date.parse(effectiveDate) - Date.parse(plan.portfolioOverride.date)) / 86400000 > 35) warn('stale_snapshot', 'The planning-only portfolio total is older than 35 days; it is not automatically grown to today.');
  return result;
}
