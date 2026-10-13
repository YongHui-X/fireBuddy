import type { FireCalculationResult, FireType, RetirementPlan } from './types';

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
  if (plan.version !== 2 || !month(plan.birthMonth)) return 'Enter your birth year and month.';
  if (!month(plan.retirementMonth)) return 'Enter the age you would like to retire at.';
  if (!month(plan.spendingMonth) || plan.spendingMonth > asOf.slice(0, 7)) return 'Confirm the month used for today’s spending values.';
  const now = monthIndex(asOf), birth = monthIndex(plan.birthMonth), retirement = monthIndex(plan.retirementMonth);
  // One message per rule, so the person knows which field to fix.
  if (birth >= now) return 'Your birth month must be in the past.';
  if (!Number.isInteger(plan.endAge) || plan.endAge < 50 || plan.endAge > 120) return 'Plan through an age between 50 and 120.';
  if (retirement < now) return 'Your retirement age has already passed. Choose an age from this month onwards.';
  if (retirement >= birth + plan.endAge * 12) return 'Retire before the age you plan through.';
  if (birth + plan.endAge * 12 - now > 1440) return 'The plan can look at most 120 years ahead. Lower the age you plan through.';
  if (![plan.monthlySpending, plan.monthlyContribution].every(v => Number.isFinite(v) && v >= 0 && v <= 99999999)) return 'Enter valid spending and contribution amounts.';
  if (![plan.beforeReturn, plan.afterReturn].every(v => Number.isFinite(v) && v >= -0.2 && v <= 0.3) || !Number.isFinite(plan.inflation) || plan.inflation < 0 || plan.inflation > 0.2) return 'Returns must be between -20% and 30%, inflation between 0% and 20%.';
  if (!['unknown', 'standard', 'escalating', 'basic'].includes(plan.cpfPlan) || !Number.isInteger(plan.cpfStartAge) || plan.cpfStartAge < 65 || plan.cpfStartAge > 70 || !Number.isFinite(plan.cpfMonthlyPayout) || plan.cpfMonthlyPayout < 0) return 'Review CPF payout and commencement age.';
  if (plan.portfolioOverride !== null && (!Number.isFinite(plan.portfolioOverride.amount) || plan.portfolioOverride.amount < 0 || plan.portfolioOverride.amount > 99999999 || !/^\d{4}-\d{2}-\d{2}$/.test(plan.portfolioOverride.date) || !Number.isFinite(Date.parse(plan.portfolioOverride.date)) || new Date(plan.portfolioOverride.date).toISOString().slice(0, 10) !== plan.portfolioOverride.date || plan.portfolioOverride.date > asOf)) return 'Enter a nonnegative portfolio total dated on or before today.';
  if (plan.otherIncome.length > 20 || plan.otherIncome.some(i => !month(i.startMonth) || !month(i.endMonth) || i.endMonth <= i.startMonth || !Number.isFinite(i.monthlyAmount) || i.monthlyAmount < 0 || !Number.isFinite(i.annualGrowth) || i.annualGrowth < -0.2 || i.annualGrowth > 0.3 || (i.priceMonth !== undefined && !month(i.priceMonth)))) return 'Review other income amounts, dates and growth.';
  if (plan.coastMonth !== undefined && (!month(plan.coastMonth) || monthIndex(plan.coastMonth) <= birth)) return 'Enter the age you’ll stop investing.';
  if (plan.contributionGrowth !== undefined && (!Number.isFinite(plan.contributionGrowth) || plan.contributionGrowth < 0 || plan.contributionGrowth > 0.3)) return 'The yearly increase in your investment must be between 0% and 30%.';
  const lumps = plan.lumpSums ?? [];
  // 20 typed amounts plus the phone's own CPF withdrawal at 55 and home cash (PRD 6.6.1, 24 and 31).
  if (lumps.length > 22 || lumps.some(l => !month(l.month) || !month(l.priceMonth) || !['in', 'out'].includes(l.direction) || !Number.isFinite(l.amount) || l.amount < 0 || l.amount > 99999999)) return 'Review your big costs and money coming in: each needs a year and an amount.';
  if (lumps.some(l => monthIndex(l.month) < now || monthIndex(l.month) >= birth + plan.endAge * 12)) return 'Each big cost or payment needs a year from this year to the end of your plan.';
  const amount = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 99999999;
  const health = plan.healthcare;
  if (health && (!amount(health.monthlyAmount) || (health.insurance !== undefined && !amount(health.insurance)) || (health.medical !== undefined && !amount(health.medical)) || !Number.isFinite(health.growth) || health.growth < 0 || health.growth > 0.2 || !month(health.priceMonth))) return 'Insurance and healthcare needs an amount, and a yearly rise between 0% and 20%.';
  if (plan.cpfBalancesSource !== undefined && !['wealth', 'typed'].includes(plan.cpfBalancesSource)) return 'Choose where your CPF balances come from.';
  if (plan.residency !== undefined && !['citizen', 'pr', 'foreigner'].includes(plan.residency)) return 'Choose whether you are a citizen, a PR or neither.';
  if (plan.prSinceYear !== undefined && (!Number.isInteger(plan.prSinceYear) || plan.prSinceYear < 1950 || plan.prSinceYear > Math.floor(now / 12))) return 'Enter the year you became a PR.';
  if (plan.pay && (!amount(plan.pay.grossMonthly) || !Number.isFinite(plan.pay.bonusMonths) || plan.pay.bonusMonths < 0 || plan.pay.bonusMonths > 24)) return 'Enter your monthly pay, and bonus months between 0 and 24.';
  if (plan.currentSpending !== undefined && !amount(plan.currentSpending)) return 'Enter what you spend now each month.';
  const cpf = plan.cpfBalances;
  if (cpf && (![cpf.oa, cpf.sa, cpf.ma].every(amount) || !month(cpf.month))) return 'Enter your CPF OA, SA and MA balances.';
  const home = plan.property;
  if (home && ([home.budget, home.oaDownpayment, home.cashUpfront].some((value) => value !== undefined && !amount(value)))) return 'Review your home budget and downpayment amounts.';
  if (home && (!['own', 'plan', 'none'].includes(home.status) || !amount(home.oaMonthly) || (home.status !== 'none' && home.oaMonthly > 0 && (!month(home.fromMonth) || !month(home.untilMonth) || home.untilMonth <= home.fromMonth)))) return 'Review the CPF you use for your home loan: an amount and the years it starts and stops.';
  return null;
}

/**
 * One month of the plan's nominal cash flows, before any growth. `lump` is signed: in minus out.
 * `expenses` includes `health`, the insurance and healthcare line (rule 25).
 */
export interface ScheduleRow { month: string; expenses: number; cpf: number; other: number; lump: number; health: number }

/**
 * The validated plan's month-end cash flows from `effectiveDate` to the end age, shared by the
 * projection and its checks. `n` is the retirement offset.
 */
export function buildSchedule(plan: RetirementPlan, effectiveDate: string) {
  const now = monthIndex(effectiveDate), birth = monthIndex(plan.birthMonth), end = birth + plan.endAge * 12;
  const cpfStart = birth + plan.cpfStartAge * 12;
  const inflation = (1 + plan.inflation) ** (1 / 12);
  // The monthly investment steps up once a year from now (PRD 6.6.1, 2); weight 1 when it never grows.
  const stepUp = plan.contributionGrowth ?? 0;
  const weight = (offset: number) => (1 + stepUp) ** Math.floor(offset / 12);
  const lumps = (plan.lumpSums ?? []).map(l => ({ index: monthIndex(l.month), sign: l.direction === 'in' ? 1 : -1, amount: l.amount, price: monthIndex(l.priceMonth) }));
  const healthcare = plan.healthcare && plan.healthcare.monthlyAmount > 0
    ? { amount: plan.healthcare.monthlyAmount, growth: (1 + plan.healthcare.growth) ** (1 / 12), price: monthIndex(plan.healthcare.priceMonth) } : null;
  // Cash flows occur at the end of each labelled month; end age is exclusive.
  const rows: ScheduleRow[] = Array.from({ length: end - now }, (_, offset) => {
    const index = now + offset;
    // Basic counts as a level payout since 10 Oct 2026 (PRD 6.6.1, 19); it falls only once CPF balances drop below S$60,000.
    const cpf = index >= cpfStart && ['standard', 'escalating', 'basic'].includes(plan.cpfPlan)
      ? plan.cpfMonthlyPayout * (plan.cpfPlan === 'escalating' ? 1.02 ** Math.floor((index - cpfStart) / 12) : 1) : 0;
    // An income typed in today's money is first inflated to its start month, then grows by its own rate.
    const other = plan.otherIncome.reduce((sum, income) => index >= monthIndex(income.startMonth) && index < monthIndex(income.endMonth)
      ? sum + income.monthlyAmount * (income.priceMonth ? inflation ** (monthIndex(income.startMonth) - monthIndex(income.priceMonth)) : 1) * (1 + income.annualGrowth) ** ((index - monthIndex(income.startMonth)) / 12) : sum, 0);
    // A one-off amount is in today's money like spending, so it is inflated the same way.
    const lump = lumps.reduce((sum, l) => l.index === index ? sum + l.sign * l.amount * inflation ** (index - l.price + 1) : sum, 0);
    // Insurance and healthcare grow at their own rate from the month they were typed (PRD 6.6.1, 25).
    const health = healthcare ? healthcare.amount * healthcare.growth ** (index - healthcare.price + 1) : 0;
    return { month: calendarMonth(index), expenses: plan.monthlySpending * inflation ** (index - monthIndex(plan.spendingMonth) + 1) + health, cpf, other, lump, health };
  });
  const n = monthIndex(plan.retirementMonth) - now;
  // Coast FIRE stops investing at the Coast age (PRD 6.6.1, 33); a Coast age past retirement or before now
  // is clamped. Without one, contributions run on, as the earliest-date search expects.
  const coast = plan.coastMonth ? Math.max(0, Math.min(n, monthIndex(plan.coastMonth) - now)) : rows.length;
  const contributions = rows.map((_, offset) => (offset < coast ? plan.monthlyContribution * weight(offset) : 0));
  return { now, n, coast, rows, contributions, weight, inflation };
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
  const { now, n, coast, rows: schedule, contributions, weight, inflation } = buildSchedule(plan, effectiveDate);
  const before = (1 + plan.beforeReturn) ** (1 / 12), after = (1 + plan.afterReturn) ** (1 / 12);
  const hasLumps = (plan.lumpSums ?? []).length > 0;
  const hasHealth = (plan.healthcare?.monthlyAmount ?? 0) > 0;
  // A nonnegative requirement each month prevents later income funding an earlier deficit.
  const targets = new Array<number>(schedule.length + 1).fill(0);
  for (let i = schedule.length - 1; i >= 0; i--) targets[i] = Math.max(0, (targets[i + 1] + schedule[i].expenses - schedule[i].cpf - schedule[i].other - schedule[i].lump) / after);
  const target = targets[n];
  // `lumps` is what the one-off amounts before retirement are worth at retirement.
  let accumulated = starting, factor = 0, lumps = 0, earliest: number | null = null;
  for (let i = 0; i < schedule.length; i++) {
    if (earliest === null && accumulated + 1e-7 >= targets[i]) earliest = i;
    if (i < n) { factor = factor * before + (i < coast ? weight(i) : 0); lumps = lumps * before + schedule[i].lump; }
    accumulated = accumulated * before + contributions[i] + schedule[i].lump;
  }
  const portfolio = starting * before ** n + plan.monthlyContribution * factor + lumps;
  // No months of investing (retiring now, or coasting from now): only growth can reach the target.
  const required = factor === 0 ? (starting * before ** n + lumps + 1e-7 >= target ? 0 : null) : Math.max(0, (target - starting * before ** n - lumps) / factor);
  let balance = starting, verification = target;
  for (let i = 0; i < schedule.length; i++) {
    const row = schedule[i], retired = i >= n;
    const growth = balance * ((retired ? after : before) - 1);
    const contribution = retired ? 0 : contributions[i];
    const expenses = retired ? row.expenses : 0, cpf = retired ? row.cpf : 0, otherIncome = retired ? row.other : 0;
    balance += growth + contribution + cpf + otherIncome - expenses + row.lump;
    if (retired) { verification = verification * after + cpf + otherIncome + row.lump - expenses; if (verification < -0.01) throw new Error('Retirement target failed forward verification'); }
    result.monthlyCashFlows!.push({ month: row.month, phase: retired ? 'retirement' : 'accumulation', growth: money(growth), contribution: money(contribution), expenses: money(expenses), cpf: money(cpf), otherIncome: money(otherIncome), ...(hasLumps ? { lumpSum: money(row.lump) } : {}), ...(hasHealth ? { healthcare: money(retired ? row.health : 0) } : {}), balance: money(balance) });
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
  warn('selected_assets', 'Only the assets you selected in setup count as retirement capital. Check that restricted resources, property and emergency reserves you included can really be spent.');
  if (plan.cpfPlan === 'unknown') warn('cpf_not_included', 'CPF income not included: payout is not yet known.');
  if (plan.cpfPlan === 'basic') warn('cpf_basic_level', 'Basic payouts fall once your CPF balances drop below S$60,000, usually late in life. The plan treats them as level.');
  if (plan.portfolioOverride && (Date.parse(effectiveDate) - Date.parse(plan.portfolioOverride.date)) / 86400000 > 35) warn('stale_snapshot', 'The planning-only portfolio total is older than 35 days; it is not automatically grown to today.');
  return result;
}

/** The FIRE types the planner offers. Lean, Regular and Fat scale recent spending; the rest are explained. */
export const FIRE_TYPES: readonly { key: FireType; label: string; ratio: number | null; blurb: string }[] = [
  { key: 'lean', label: 'Lean FIRE', ratio: 0.6, blurb: 'A frugal retirement on about 60% of what you spend now.' },
  { key: 'regular', label: 'Regular FIRE', ratio: 1, blurb: 'Keep your current lifestyle in retirement.' },
  { key: 'fat', label: 'Fat FIRE', ratio: 1.5, blurb: 'A more comfortable retirement on about 150% of what you spend now.' },
  { key: 'coast', label: 'Coast FIRE', ratio: null, blurb: 'Invest enough early, then stop adding: growth alone carries the pot to your retirement age.' },
  { key: 'barista', label: 'Barista FIRE', ratio: null, blurb: 'Retire from full-time work but keep some part-time income, so you need a smaller pot.' },
  { key: 'custom', label: 'Custom', ratio: null, blurb: 'Your own spending figure.' },
];

/**
 * Spending for a Lean, Regular or Fat preset. `base` is recent average spending; without recorded
 * expenses the current figure is the base, read back through the current type's share so that
 * switching Lean to Fat and back returns the same number.
 */
export function presetSpending(type: FireType, recordedAverage: number | null, currentSpending: number, currentType: FireType): number | null {
  const ratio = FIRE_TYPES.find((item) => item.key === type)?.ratio ?? null;
  if (ratio === null) return null;
  const currentRatio = FIRE_TYPES.find((item) => item.key === currentType)?.ratio ?? 1;
  const base = recordedAverage ?? (Number.isFinite(currentSpending) && currentSpending > 0 ? currentSpending / currentRatio : null);
  return base === null ? null : Math.ceil(base * ratio);
}

/**
 * Coast FIRE number: what the portfolio must hold today to grow, with no further contributions,
 * into `targetAtRetirement` by retirement at `beforeReturn` a year (compounded monthly, as the
 * engine does). Null when the inputs cannot give a sensible figure.
 */
export function coastNumber(targetAtRetirement: number, monthsToRetirement: number, beforeReturn: number): number | null {
  if (!Number.isFinite(targetAtRetirement) || targetAtRetirement < 0 || !Number.isFinite(monthsToRetirement) || monthsToRetirement < 0 || !Number.isFinite(beforeReturn) || beforeReturn <= -1) return null;
  const monthly = (1 + beforeReturn) ** (1 / 12);
  return Math.ceil(targetAtRetirement / monthly ** monthsToRetirement);
}
