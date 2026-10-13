import { CPF_RETIREMENT_SUMS, cpfRetirementSum, standardCpfLifePayout, withCpfEstimate, type CpfRetirementSum } from './cpf-life';
import { calendarMonth, monthIndex } from './retirement';
import type { RetirementPlan, WealthPosition, WealthPositionSnapshot } from './types';

/**
 * CPF balances projected month by month to CPF LIFE (PRD 6.6.1, rule 24). Checked on 10 Oct 2026:
 * - Contribution rates from 1 Jan 2026: cpf.gov.sg "What are the changes to the CPF contribution
 *   rates for senior workers from 1 January 2026".
 * - Allocation from 1 Jan 2026: CPF Board "CPF Allocation Rates from 1 January 2026" (PDF). MediSave
 *   is computed first, then the Special or Retirement Account; the rest goes to the Ordinary Account.
 * - PR graduated (G/G) rates for the first two years: unchanged since 1 Jan 2016 per CPF; the table by
 *   age is from cpfcalculatorsg.com and needs a yearly recheck.
 * - Ceilings: S$8,000 a month on ordinary wages from 2026 (the last planned rise), S$102,000 a year.
 * - Interest: OA 2.5%; SA, MA and RA 4% (floor to 31 Dec 2027). Extra 1% on the first S$60,000
 *   combined (at most S$20,000 from OA); from 55, extra 2% on the first S$30,000 and 1% on the next
 *   S$30,000. Extra interest goes to SA, or RA from 55.
 * - Basic Healthcare Sum: S$79,000 in 2026.
 * Simplifications, stated in the app: interest is credited monthly (CPF credits it yearly); after
 * 2026 pay, ceilings and the BHS grow with the plan's inflation; MediSave spent on premiums or bills
 * and OA used for anything but the home loan are not modelled.
 */
export const CPF_PROJECTION_SOURCE_DATE = '2026-10-10';

const RATES_YEAR = 2026;
const OW_CEILING = 8000;
const ANNUAL_CEILING = 102000;
const BHS = 79000;
const OA_RATE = 0.025;
const SMRA_RATE = 0.04;
const EXTRA_CAP = 60000;
const EXTRA_OA_CAP = 20000;

/** [above this age, total rate, employee rate], as fractions of wage. */
type RateBand = readonly [above: number, total: number, employee: number];
/** Citizens and third-year-onward PRs. */
const FULL_RATES: readonly RateBand[] = [[70, 0.125, 0.05], [65, 0.165, 0.075], [60, 0.25, 0.125], [55, 0.34, 0.18], [0, 0.37, 0.2]];
/** PRs in their first year (graduated G/G). */
const PR_YEAR_1: readonly RateBand[] = [[60, 0.085, 0.05], [0, 0.09, 0.05]];
/** PRs in their second year (graduated G/G). */
const PR_YEAR_2: readonly RateBand[] = [[65, 0.085, 0.05], [60, 0.11, 0.075], [55, 0.185, 0.125], [0, 0.24, 0.15]];

/** [above this age, SA or RA ratio, MA ratio] of each contribution; OA takes the rest. */
const ALLOCATION: readonly (readonly [above: number, saOrRa: number, ma: number])[] = [
  [70, 0.08, 0.84], [65, 0.303, 0.6363], [60, 0.44, 0.42], [55, 0.3382, 0.3088],
  [50, 0.3108, 0.2837], [45, 0.2162, 0.2702], [35, 0.1891, 0.2432], [0, 0.1621, 0.2162],
];

const PLAN_FACTOR: Readonly<Record<RetirementPlan['cpfPlan'], number>> = { standard: 1, escalating: 0.8, basic: 0.9, unknown: 1 };

/** The band for an age in months: "above 55" starts the month after the 55th birthday month. */
const bandFor = <T extends readonly [number, ...unknown[]]>(bands: readonly T[], ageMonths: number) =>
  bands.find(([above]) => ageMonths > above * 12) ?? bands[bands.length - 1]!;

/** Contribution rates for the plan's person in calendar month `index`; null without CPF. */
function ratesAt(plan: Pick<RetirementPlan, 'residency' | 'prSinceYear' | 'birthMonth'>, index: number): RateBand | null {
  if (plan.residency === 'foreigner') return null;
  const ageMonths = index - monthIndex(plan.birthMonth);
  if (plan.residency === 'pr' && plan.prSinceYear) {
    const prMonths = index - plan.prSinceYear * 12;
    if (prMonths < 12) return bandFor(PR_YEAR_1, ageMonths);
    if (prMonths < 24) return bandFor(PR_YEAR_2, ageMonths);
  }
  return bandFor(FULL_RATES, ageMonths);
}

/** The person's own CPF contribution this month on today's pay, for the take-home figure (rule 23). */
export function employeeCpfNow(plan: RetirementPlan, effectiveDate: string): number {
  const rates = plan.pay ? ratesAt(plan, monthIndex(effectiveDate)) : null;
  if (!rates || !plan.pay) return 0;
  return Math.min(plan.pay.grossMonthly, OW_CEILING) * rates[2];
}

export interface CpfProjection {
  /** YYYY-MM of the 55th birthday month. */
  month55: string;
  /** RA set aside at 55 plus later RA inflows discounted at 4% to 55: the balance CPF's payout table reads. */
  raAt55: number;
  /** Nominal balances the month payouts start. */
  raAtPayout: number;
  oaAtPayout: number;
  /** OA (and leftover SA) above the chosen sum at 55, nominal; 0 when already past 55. */
  withdrawableAt55: number;
  /** First monthly CPF LIFE payout for the plan's type, in the dollars of the year it starts. */
  monthlyPayout: number;
  /** OA the month a planned home is bought, before its downpayment, nominal; null without one in range. */
  oaAtPurchase: number | null;
}

/**
 * Project the plan's CPF balances from `cpfBalances` (dated this month) until CPF LIFE starts, and
 * estimate the first payout. Null without balances, for a non-resident, or once payouts have started.
 */
export function projectCpf(plan: RetirementPlan, effectiveDate: string, sum: CpfRetirementSum): CpfProjection | null {
  const balances = plan.cpfBalances;
  if (!balances || plan.residency === 'foreigner' || !/^\d{4}-\d{2}$/.test(plan.birthMonth)) return null;
  const now = monthIndex(effectiveDate), birth = monthIndex(plan.birthMonth);
  const at55 = birth + 55 * 12, payoutStart = birth + plan.cpfStartAge * 12, stopWork = monthIndex(plan.retirementMonth);
  if (!(payoutStart > now) || !Number.isFinite(plan.inflation)) return null;
  const birthYear = Math.floor(birth / 12);
  const chosenSum = cpfRetirementSum(sum, birthYear + 55, plan.inflation);
  const frs = cpfRetirementSum('frs', birthYear + 55, plan.inflation);
  // After 2026 the ceilings and the BHS grow with inflation, a stated assumption.
  const grown = (index: number) => (1 + plan.inflation) ** Math.max(0, Math.floor(index / 12) - RATES_YEAR);
  // Pay is typed in today's money and keeps pace with inflation.
  const payGrowth = (index: number) => (1 + plan.inflation) ** ((index - now) / 12);
  const discount55 = (index: number) => (1 + SMRA_RATE) ** ((index - at55) / 12);
  // Balances typed in an earlier month are projected from that month; a future month reads as now.
  const typed = /^\d{4}-(0[1-9]|1[0-2])$/.test(balances.month) ? monthIndex(balances.month) : now;
  const start = Math.min(now, typed);
  const pastFiftyFive = start > at55;

  let oa = balances.oa, sa = pastFiftyFive ? 0 : balances.sa, ma = balances.ma, ra = pastFiftyFive ? balances.sa : 0;
  // What the payout table reads: the RA in 55's dollars, without the interest CPF's table already assumes.
  let raAt55 = pastFiftyFive ? ra / discount55(start) : 0;
  let withdrawableAt55 = 0;
  let oaAtPurchase: number | null = null;
  const buyIndex = plan.property?.status === 'plan' && /^\d{4}-\d{2}$/.test(plan.property.fromMonth) ? Math.max(monthIndex(plan.property.fromMonth), start) : null;
  const home = plan.property && plan.property.status !== 'none' && plan.property.oaMonthly > 0 ? plan.property : null;
  const toRa = (amount: number, index: number) => {
    // RA takes money up to the FRS whichever sum was set aside at 55; the rest goes to OA (CPF
    // allocation PDF, note 1). Reaching the ERS takes voluntary top-ups, which are not modelled.
    const room = Math.max(0, frs - ra);
    const into = Math.min(room, amount);
    ra += into; oa += amount - into;
    raAt55 += into / discount55(index);
  };

  for (let index = start; index < payoutStart; index++) {
    const after55 = index > at55;
    // 1. Contributions while working: ordinary wages each month, the bonus in December.
    const rates = index < stopWork && plan.pay ? ratesAt(plan, index) : null;
    if (rates && plan.pay) {
      const ordinary = Math.min(plan.pay.grossMonthly * payGrowth(index), OW_CEILING * grown(index));
      let wage = ordinary;
      if (index % 12 === 11 && plan.pay.bonusMonths > 0) {
        const additionalCeiling = Math.max(0, ANNUAL_CEILING * grown(index) - ordinary * 12);
        wage += Math.min(plan.pay.bonusMonths * plan.pay.grossMonthly * payGrowth(index), additionalCeiling);
      }
      const total = wage * rates[1];
      const [, saShare, maShare] = bandFor(ALLOCATION, index - birth);
      const toMa = total * maShare, toSaOrRa = total * saShare;
      oa += total - toMa - toSaOrRa;
      ma += toMa;
      if (after55) toRa(toSaOrRa, index); else sa += toSaOrRa;
    }
    // 2. MediSave above the BHS overflows: to SA (OA once SA holds the FRS) before 55, to RA from 55.
    const bhs = BHS * grown(Math.min(index, birth + 65 * 12));
    if (ma > bhs) {
      const spill = ma - bhs;
      ma = bhs;
      if (after55) toRa(spill, index);
      else { const into = Math.min(spill, Math.max(0, frs - sa)); sa += into; oa += spill - into; }
    }
    // 3. OA used for a planned home's downpayment in the year it is bought, then the home loan from OA.
    // The downpayment is typed in today's money, so it is grown with inflation to the month of purchase.
    if (index === buyIndex) {
      oaAtPurchase = oa;
      oa = Math.max(0, oa - (plan.property?.oaDownpayment ?? 0) * payGrowth(index));
    }
    if (home && index >= monthIndex(home.fromMonth) && index < monthIndex(home.untilMonth)) oa = Math.max(0, oa - home.oaMonthly);
    // 4. Interest, with extra interest on the first S$60,000 (at most S$20,000 from OA).
    const combined = Math.min(EXTRA_CAP, Math.min(oa, EXTRA_OA_CAP) + sa + ma + ra);
    const extra = after55 || index === at55 ? Math.min(combined, 30000) * 0.02 + Math.max(0, combined - 30000) * 0.01 : combined * 0.01;
    oa *= 1 + OA_RATE / 12;
    sa *= 1 + SMRA_RATE / 12;
    ma *= 1 + SMRA_RATE / 12;
    ra *= 1 + SMRA_RATE / 12;
    if (after55 || index === at55) ra += extra / 12; else sa += extra / 12;
    // 5. At 55 the SA closes: the RA is formed from SA then OA up to the chosen sum, the rest of SA moves to OA.
    if (index === at55) {
      const fromSa = Math.min(sa, chosenSum);
      const fromOa = Math.min(oa, chosenSum - fromSa);
      ra += fromSa + fromOa;
      raAt55 += fromSa + fromOa;
      oa += sa - fromSa - fromOa;
      sa = 0;
      withdrawableAt55 = oa;
      if (plan.cpfWithdrawAt55) oa = 0;
    }
  }
  // CPF's table is for the 2026 cohort; another cohort's balance is read through the FRS ratio, as
  // the retirement-sum estimate does (cpf-life.ts), and the payout scaled back.
  const scale = frs / CPF_RETIREMENT_SUMS[RATES_YEAR]!.frs;
  const standard = standardCpfLifePayout(raAt55 / scale, plan.cpfStartAge) * scale;
  return {
    month55: calendarMonth(at55),
    raAt55,
    raAtPayout: ra,
    oaAtPayout: oa,
    withdrawableAt55,
    monthlyPayout: Math.round(standard * PLAN_FACTOR[plan.cpfPlan]),
    oaAtPurchase,
  };
}

/** Label of the CPF withdrawal at 55 the phone adds to the plan's lump sums (rule 24). */
export const CPF_WITHDRAWAL_LABEL = 'CPF withdrawal at 55';

/**
 * The Singapore plan as the engine should run it: no CPF for a non-resident (rule 22), the payout
 * projected from CPF balances (rule 24) or estimated from the retirement sum (rule 18), and the
 * optional withdrawal at 55 added as money coming in. A typed payout is left alone.
 */
export function withCpfProjection(plan: RetirementPlan, effectiveDate: string): RetirementPlan {
  if (plan.residency === 'foreigner') return { ...plan, cpfPlan: 'unknown', cpfMonthlyPayout: 0, cpfEstimate: undefined };
  if (plan.cpfEstimate?.source !== 'balances') return withCpfEstimate(plan);
  const projection = projectCpf(plan, effectiveDate, plan.cpfEstimate.sum);
  if (!projection) return withCpfEstimate(plan);
  // Any withdrawal from an earlier run is replaced, never added twice.
  const lumps = (plan.lumpSums ?? []).filter((item) => item.label !== CPF_WITHDRAWAL_LABEL);
  const projected = { ...plan, cpfMonthlyPayout: projection.monthlyPayout, lumpSums: lumps };
  const now = monthIndex(effectiveDate), at55 = monthIndex(projection.month55);
  // The withdrawal joins the lump sums in today's money, dated this month, like a typed one.
  if (plan.cpfWithdrawAt55 && projection.withdrawableAt55 > 0 && at55 >= now && at55 < monthIndex(plan.birthMonth) + plan.endAge * 12) {
    const monthly = (1 + plan.inflation) ** (1 / 12);
    const amount = Math.round(projection.withdrawableAt55 / monthly ** (at55 - now + 1));
    projected.lumpSums = [...lumps, { label: CPF_WITHDRAWAL_LABEL, month: projection.month55, amount, direction: 'in', priceMonth: calendarMonth(now) }];
  }
  return projected;
}

/** OA, SA (or RA) and MA added up from CPF positions in Wealth (PRD 6.6.1, 29). */
export interface WealthCpfBalances {
  oa: number;
  sa: number;
  ma: number;
  /** CPF positions with a value but no account chosen, left out of the three totals. */
  untagged: number;
  /** At least one CPF position with an account and a value. */
  found: boolean;
}

/** The latest value of each active CPF position in Wealth, added up by CPF account. */
export function cpfBalancesFromWealth(
  positions: readonly Pick<WealthPosition, 'id' | 'positionType' | 'positionKind' | 'isArchived' | 'cpfAccount'>[],
  latest: ReadonlyMap<string, Pick<WealthPositionSnapshot, 'amount'>>,
): WealthCpfBalances {
  const totals: WealthCpfBalances = { oa: 0, sa: 0, ma: 0, untagged: 0, found: false };
  for (const position of positions) {
    if (position.isArchived || position.positionKind !== 'asset' || position.positionType !== 'cpf') continue;
    const value = latest.get(position.id);
    if (!value) continue;
    if (!position.cpfAccount) { totals.untagged += 1; continue; }
    totals[position.cpfAccount] += Number(value.amount);
    totals.found = true;
  }
  return totals;
}

/**
 * The plan with today's CPF balances from Wealth when it reads them from there (rule 29), so the
 * projection follows Wealth as values are updated. Without tagged CPF positions the saved balances stay.
 */
export function withWealthCpfBalances(
  plan: RetirementPlan,
  positions: Parameters<typeof cpfBalancesFromWealth>[0],
  latest: Parameters<typeof cpfBalancesFromWealth>[1],
  effectiveDate: string,
): RetirementPlan {
  if (plan.cpfBalancesSource !== 'wealth') return plan;
  const wealth = cpfBalancesFromWealth(positions, latest);
  if (!wealth.found) return plan;
  return { ...plan, cpfBalances: { oa: wealth.oa, sa: wealth.sa, ma: wealth.ma, month: effectiveDate.slice(0, 7) } };
}
